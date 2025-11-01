import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/game_provider.dart';
import '../auth/login_screen.dart';
import 'predictor_game_screen.dart';
import '../leaderboard/leaderboard_screen.dart';
import '../admin/outcome_admin_screen.dart';
import '../../providers/admin_provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;
  bool _questionsLoaded = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final gameProvider = Provider.of<GameProvider>(context, listen: false);
    await gameProvider.loadTournaments();
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final user = authProvider.user;
    if (user != null) {
      await gameProvider.loadCompletedMatchesForUser(user.uid);
    }
    setState(() => _questionsLoaded = true);
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
    if (index == 1) {
      // Always show Game options (tournament list) when entering Game tab
      final gameProvider = Provider.of<GameProvider>(context, listen: false);
      gameProvider.clearTournamentSelection();
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final user = authProvider.user;
      if (user != null) {
        gameProvider.loadCompletedMatchesForUser(user.uid);
      }
    }
  }

  Future<void> _logout() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    await authProvider.signOut();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  Future<void> _clearAllGameData() async {
    final db = FirebaseFirestore.instance;
    // Clean leaderboard
    final leaderboard = await db.collection('leaderboard').get();
    for (final doc in leaderboard.docs) {
      await doc.reference.delete();
    }
    // Clean tournaments, matches, preds, outcomes, scores
    final tSnap = await db.collection('tournaments').get();
    for (final tDoc in tSnap.docs) {
      final matchesSnap = await tDoc.reference.collection('matches').get();
      for (final mDoc in matchesSnap.docs) {
        // predictions
        final predSnap = await mDoc.reference.collection('predictions').get();
        for (final pDoc in predSnap.docs) {
          await pDoc.reference.delete();
        }
        // meta/outcome
        final metaSnap = await mDoc.reference.collection('meta').get();
        for (final metaDoc in metaSnap.docs) {
          await metaDoc.reference.delete();
        }
        // scores
        final scoreSnap = await mDoc.reference.collection('scores').get();
        for (final sDoc in scoreSnap.docs) {
          await sDoc.reference.delete();
        }
        await mDoc.reference.delete();
      }
      await tDoc.reference.delete();
    }
    // Clean all users/{uid}/completedMatches/* (collection group)
    final usersSnap = await db.collection('users').get();
    for (final userDoc in usersSnap.docs) {
      final completedMatchesSnap = await userDoc.reference.collection('completedMatches').get();
      for (final cmDoc in completedMatchesSnap.docs) {
        await cmDoc.reference.delete();
      }
    }
  }

  Widget _buildBody() {
    if (!_questionsLoaded) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_selectedIndex == 0) {
      return const PredictorGameScreen();
    } else {
      return const LeaderboardScreen();
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final theme = Theme.of(context);
    final adminProvider = Provider.of<AdminProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          _selectedIndex == 0 ? 'Predictor Game' : 'Leaderboard',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          if (adminProvider.isAdmin) ...[
            IconButton(
              tooltip: 'Force Unblock Matches',
              icon: const Icon(Icons.refresh),
              onPressed: () async {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Unblocking your matches...')),
                );
                bool ok = true;
                try {
                  print('[ADMIN FORCE UNBLOCK] Clear local completed matches');
                  final gp = Provider.of<GameProvider>(context, listen: false);
                  gp.clearCompletedMatches();
                  gp.setTestUnblock(true);

                  final auth = Provider.of<AuthProvider>(context, listen: false);
                  final uid = auth.user?.uid;
                  if (uid == null) {
                    throw Exception('Not signed in');
                  }
                  final db = FirebaseFirestore.instance;
                  final completedMatchesSnap = await db
                      .collection('users')
                      .doc(uid)
                      .collection('completedMatches')
                      .get();
                  for (final cmDoc in completedMatchesSnap.docs) {
                    print('[ADMIN FORCE UNBLOCK] Deleting completed: users/$uid/completedMatches/${cmDoc.id}');
                    await cmDoc.reference.delete();
                  }
                  // Refresh from backend (should be empty) but testUnblock keeps UI free regardless
                  await gp.loadCompletedMatchesForUser(uid);
                } catch (e) {
                  print('[ADMIN FORCE UNBLOCK] ERROR: $e');
                  ok = false;
                }
                if (ok) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Your match blocks cleared. You can play!')));
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to clear your completed matches')));
                }
              },
            ),
            IconButton(
              tooltip: 'Clear All Game Data',
              icon: const Icon(Icons.delete_forever),
              onPressed: () async {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Clear ALL Game/Test Data?'),
                    content: const Text('This will remove ALL tournaments, matches, leaderboard entries, user predictions, and outcomes from database. Are you sure?'),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                      ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Clear All')),
                    ],
                  ),
                );
                if (confirm == true) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Clearing all game/test data...')));
                  bool backendSuccess = true;
                  try {
                    await _clearAllGameData();
                  } catch (e) {
                    backendSuccess = false;
                  }
                  // Always reset state/UI so matches are unblocked for the user
                  Provider.of<GameProvider>(context, listen: false).clearTournamentSelection();
                  Provider.of<GameProvider>(context, listen: false).clearCompletedMatches();
                  Provider.of<GameProvider>(context, listen: false).setTestUnblock(true);
                  print('[ADMIN CLEAR] Calling loadTournaments() after clear...');
                  await Provider.of<GameProvider>(context, listen: false).loadTournaments();
                  print('[ADMIN CLEAR] loadTournaments() complete. Forcing UI refresh.');
                  setState(() {});
                  if (backendSuccess) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('All game/test data cleared.')));
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to clear data from database, but local UI was reset for retesting.')));
                  }
                }
              },
            ),
            IconButton(
              tooltip: 'Admin',
              icon: const Icon(Icons.admin_panel_settings),
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const OutcomeAdminScreen()),
                );
              },
            ),
          ],
          // Home icon to jump to Predictor screen
          IconButton(
            tooltip: 'Home',
            icon: const Icon(Icons.home),
            onPressed: () {
              setState(() {
                _selectedIndex = 0;
              });
              final gameProvider = Provider.of<GameProvider>(context, listen: false);
              gameProvider.clearTournamentSelection();
            },
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Icon(Icons.person, color: theme.colorScheme.onSurface),
                const SizedBox(width: 8),
                Text(
                  authProvider.user?.displayName ?? 
                  authProvider.user?.email?.split('@').first ?? 
                  'User',
                  style: theme.textTheme.titleSmall,
                ),
              ],
            ),
          ),
          PopupMenuButton(
            icon: const Icon(Icons.more_vert),
            itemBuilder: (context) => [
              PopupMenuItem(
                child: const Row(
                  children: [
                    Icon(Icons.logout),
                    SizedBox(width: 8),
                    Text('Logout'),
                  ],
                ),
                onTap: _logout,
              ),
            ],
          ),
        ],
        elevation: 2,
      ),
      body: _buildBody(),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: _onItemTapped,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.sports_cricket),
            label: 'Game',
          ),
          NavigationDestination(
            icon: Icon(Icons.leaderboard),
            label: 'Leaderboard',
          ),
        ],
      ),
    );
  }
}

