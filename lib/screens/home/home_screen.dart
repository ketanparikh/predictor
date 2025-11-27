import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/game_provider.dart';
import '../auth/login_screen.dart';
import 'predictor_game_screen.dart';
import 'jcpl_home_tab.dart';
import 'teams_tab.dart';
import 'schedule_tab.dart';
import '../admin/outcome_admin_screen.dart';
import '../../providers/admin_provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
import '../../models/tournament.dart';

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
    // Predictor tab is now index 3
    if (index == 3) {
      // Always show Game options (tournament list) when entering Predictor tab
      final gameProvider = Provider.of<GameProvider>(context, listen: false);
      gameProvider.clearTournamentSelection();
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final user = authProvider.user;
      if (user != null) {
        gameProvider.loadCompletedMatchesForUser(user.uid);
      }
    }
  }

  String _getAppBarTitle() {
    switch (_selectedIndex) {
      case 0:
        return 'JCPL-3';
      case 1:
        return 'Teams';
      case 2:
        return 'Schedule';
      case 3:
        return 'Predictor Game';
      default:
        return 'JCPL-3';
    }
  }

  IconData _getAppBarIcon() {
    switch (_selectedIndex) {
      case 0:
        return Icons.home;
      case 1:
        return Icons.groups;
      case 2:
        return Icons.calendar_month;
      case 3:
        return Icons.sports_cricket;
      default:
        return Icons.home;
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
    int deletedCount = 0;
    try {
      print('[CLEAR DATA] Starting leaderboard cleanup...');
      // Clean leaderboard
      final leaderboard = await db.collection('leaderboard').get();
      print(
          '[CLEAR DATA] Found ${leaderboard.docs.length} leaderboard entries');
      for (final doc in leaderboard.docs) {
        try {
          await doc.reference.delete();
          deletedCount++;
        } catch (e) {
          print('[CLEAR DATA] Failed to delete leaderboard ${doc.id}: $e');
        }
      }
      print('[CLEAR DATA] Deleted $deletedCount leaderboard entries');

      print('[CLEAR DATA] Starting tournaments cleanup...');
      // Clean tournaments, matches, preds, outcomes, scores
      try {
        // Try to get tournaments - but also check if we can see the collection at all
        print('[CLEAR DATA] Attempting to query tournaments collection...');
        final tSnap = await db.collection('tournaments').get();
        print(
            '[CLEAR DATA] Query completed. Found ${tSnap.docs.length} tournament documents');

        deletedCount = 0; // Reset counter for tournament cleanup

        // If empty, delete tournaments by ID from asset config (they may exist only as paths)
        if (tSnap.docs.isEmpty) {
          print('[CLEAR DATA] No tournament documents found at root level');
          print(
              '[CLEAR DATA] Attempting to delete tournaments by ID from asset config...');

          // Load tournament IDs from asset file
          try {
            final gameProvider =
                Provider.of<GameProvider>(context, listen: false);
            if (!gameProvider.tournamentsLoaded) {
              await gameProvider.loadTournaments();
            }
            final tournaments = gameProvider.tournaments;
            print(
                '[CLEAR DATA] Found ${tournaments.length} tournaments in config to check');

            for (final tournament in tournaments) {
              print(
                  '[CLEAR DATA] Attempting to delete tournament ${tournament.id} (${tournament.name})...');
              try {
                final tRef = db.collection('tournaments').doc(tournament.id);

                // Delete all matches and their subcollections using direct paths
                for (final match in tournament.matches) {
                  print(
                      '[CLEAR DATA] Cleaning match ${match.id} for tournament ${tournament.id}...');

                  // Use direct collection references (works even if match document doesn't exist)
                  final matchesColl = tRef.collection('matches');
                  final matchRef = matchesColl.doc(match.id);

                  try {
                    // Delete predictions - use direct collection reference
                    final predsColl = matchRef.collection('predictions');
                    final preds = await predsColl.get();
                    print(
                        '[CLEAR DATA] Found ${preds.docs.length} predictions to delete');
                    for (final p in preds.docs) {
                      try {
                        await p.reference.delete();
                        deletedCount++;
                      } catch (e) {
                        print(
                            '[CLEAR DATA] Failed to delete prediction ${p.id}: $e');
                      }
                    }

                    // Delete meta/outcome
                    try {
                      final metaColl = matchRef.collection('meta');
                      final meta = await metaColl.get();
                      print(
                          '[CLEAR DATA] Found ${meta.docs.length} meta docs to delete');
                      for (final m in meta.docs) {
                        try {
                          await m.reference.delete();
                          deletedCount++;
                          print('[CLEAR DATA] ✅ Deleted meta doc ${m.id}');
                        } catch (e) {
                          print(
                              '[CLEAR DATA] ❌ Failed to delete meta ${m.id}: $e');
                        }
                      }
                      // Also try to delete the outcome document directly by path
                      final outcomeRef = metaColl.doc('outcome');
                      try {
                        final outcomeDoc = await outcomeRef.get();
                        if (outcomeDoc.exists) {
                          await outcomeRef.delete();
                          deletedCount++;
                          print('[CLEAR DATA] ✅ Deleted outcome document');
                        } else {
                          print(
                              '[CLEAR DATA] Outcome document does not exist at meta/outcome');
                        }
                      } catch (e) {
                        print(
                            '[CLEAR DATA] ❌ Error deleting outcome document: $e');
                        // Try alternative: direct path deletion
                        try {
                          final directOutcomeRef = db
                              .collection('tournaments')
                              .doc(tournament.id)
                              .collection('matches')
                              .doc(match.id)
                              .collection('meta')
                              .doc('outcome');
                          final directDoc = await directOutcomeRef.get();
                          if (directDoc.exists) {
                            await directOutcomeRef.delete();
                            deletedCount++;
                            print(
                                '[CLEAR DATA] ✅ Deleted outcome via direct path');
                          }
                        } catch (e2) {
                          print(
                              '[CLEAR DATA] ❌ Direct path deletion also failed: $e2');
                        }
                      }
                    } catch (e) {
                      print(
                          '[CLEAR DATA] ❌ Error accessing meta collection: $e');
                    }

                    // Delete scores
                    try {
                      final scoresColl = matchRef.collection('scores');
                      final scores = await scoresColl.get();
                      print(
                          '[CLEAR DATA] Found ${scores.docs.length} scores to delete');
                      for (final s in scores.docs) {
                        try {
                          await s.reference.delete();
                          deletedCount++;
                          print('[CLEAR DATA] ✅ Deleted score doc ${s.id}');
                        } catch (e) {
                          print(
                              '[CLEAR DATA] ❌ Failed to delete score ${s.id}: $e');
                        }
                      }
                    } catch (e) {
                      print(
                          '[CLEAR DATA] ❌ Error accessing scores collection: $e');
                    }

                    // Try to delete match document (if it exists) - last step
                    try {
                      final matchDoc = await matchRef.get();
                      if (matchDoc.exists) {
                        await matchRef.delete();
                        deletedCount++;
                        print(
                            '[CLEAR DATA] ✅ Deleted match document ${match.id}');
                      } else {
                        print(
                            '[CLEAR DATA] Match document ${match.id} doesn\'t exist (only subcollections), which is fine');
                      }
                    } catch (e) {
                      print(
                          '[CLEAR DATA] Could not delete match document ${match.id}: $e (non-critical)');
                    }

                    print(
                        '[CLEAR DATA] ✅ Completed cleanup for match ${match.id}');
                  } catch (e) {
                    print(
                        '[CLEAR DATA] ❌ Error cleaning match ${match.id}: $e');
                  }
                }

                // Delete tournament document (only after all matches are cleaned up)
                // Note: If matches failed to delete due to permissions, tournament deletion will fail too
                // But we'll try anyway to clean up what we can
                print(
                    '[CLEAR DATA] Attempting to delete tournament document ${tournament.id}...');
                try {
                  await tRef.delete();
                  deletedCount++;
                  print(
                      '[CLEAR DATA] ✅ Successfully deleted tournament ${tournament.id}');
                } catch (e) {
                  print(
                      '[CLEAR DATA] ❌ Failed to delete tournament ${tournament.id}: $e');
                  print(
                      '[CLEAR DATA] This may be because matches still exist under this tournament.');
                }
              } catch (e) {
                print(
                    '[CLEAR DATA] ❌ Failed to delete tournament ${tournament.id}: $e');
              }
            }
          } catch (e) {
            print('[CLEAR DATA] Error loading tournaments from config: $e');
          }
        }

        // Process tournaments found by direct query (if any exist as documents)
        for (final tDoc in tSnap.docs) {
          print('[CLEAR DATA] Processing tournament ${tDoc.id}...');
          try {
            final matchesSnap =
                await tDoc.reference.collection('matches').get();
            print(
                '[CLEAR DATA] Found ${matchesSnap.docs.length} matches in tournament ${tDoc.id}');
            for (final mDoc in matchesSnap.docs) {
              try {
                // predictions
                final predSnap =
                    await mDoc.reference.collection('predictions').get();
                print(
                    '[CLEAR DATA] Deleting ${predSnap.docs.length} predictions for match ${mDoc.id}');
                for (final pDoc in predSnap.docs) {
                  try {
                    await pDoc.reference.delete();
                    deletedCount++;
                  } catch (e) {
                    print(
                        '[CLEAR DATA] ERROR deleting prediction ${pDoc.id}: $e');
                  }
                }
                // meta/outcome
                final metaSnap = await mDoc.reference.collection('meta').get();
                print(
                    '[CLEAR DATA] Deleting ${metaSnap.docs.length} meta docs for match ${mDoc.id}');
                for (final metaDoc in metaSnap.docs) {
                  try {
                    await metaDoc.reference.delete();
                    deletedCount++;
                  } catch (e) {
                    print('[CLEAR DATA] ERROR deleting meta ${metaDoc.id}: $e');
                  }
                }
                // scores
                final scoreSnap =
                    await mDoc.reference.collection('scores').get();
                print(
                    '[CLEAR DATA] Deleting ${scoreSnap.docs.length} scores for match ${mDoc.id}');
                for (final sDoc in scoreSnap.docs) {
                  try {
                    await sDoc.reference.delete();
                    deletedCount++;
                  } catch (e) {
                    print('[CLEAR DATA] ERROR deleting score ${sDoc.id}: $e');
                  }
                }
                // Delete match itself
                print(
                    '[CLEAR DATA] Attempting to delete match document ${mDoc.id}...');
                try {
                  await mDoc.reference.delete();
                  deletedCount++;
                  print('[CLEAR DATA] ✅ Successfully deleted match ${mDoc.id}');
                } catch (e) {
                  print('[CLEAR DATA] ❌ FAILED to delete match ${mDoc.id}: $e');
                  print(
                      '[CLEAR DATA] Match reference path: ${mDoc.reference.path}');
                }
              } catch (e) {
                print('[CLEAR DATA] ERROR processing match ${mDoc.id}: $e');
              }
            }
            // Delete tournament
            print(
                '[CLEAR DATA] Attempting to delete tournament document ${tDoc.id}...');
            try {
              await tDoc.reference.delete();
              deletedCount++;
              print(
                  '[CLEAR DATA] ✅ Successfully deleted tournament ${tDoc.id}');
            } catch (e, stackTrace) {
              print(
                  '[CLEAR DATA] ❌ FAILED to delete tournament ${tDoc.id}: $e');
              print(
                  '[CLEAR DATA] Tournament reference path: ${tDoc.reference.path}');
              print('[CLEAR DATA] StackTrace: $stackTrace');
              // Continue with other tournaments even if one fails
            }
          } catch (e, stackTrace) {
            print('[CLEAR DATA] ERROR processing tournament ${tDoc.id}: $e');
            print('[CLEAR DATA] StackTrace: $stackTrace');
          }
        }
        print(
            '[CLEAR DATA] Deleted $deletedCount tournament-related documents');
      } catch (e, stackTrace) {
        print('[CLEAR DATA] ERROR reading tournaments collection: $e');
        print('[CLEAR DATA] StackTrace: $stackTrace');
        rethrow;
      }

      print('[CLEAR DATA] Starting users/completedMatches cleanup...');
      // Clean all users/{uid}/completedMatches/* (collection group)
      final usersSnap = await db.collection('users').get();
      print('[CLEAR DATA] Found ${usersSnap.docs.length} users');
      deletedCount = 0;
      for (final userDoc in usersSnap.docs) {
        try {
          final completedMatchesSnap =
              await userDoc.reference.collection('completedMatches').get();
          print(
              '[CLEAR DATA] Deleting ${completedMatchesSnap.docs.length} completed matches for user ${userDoc.id}');
          for (final cmDoc in completedMatchesSnap.docs) {
            try {
              await cmDoc.reference.delete();
              deletedCount++;
            } catch (e) {
              print(
                  '[CLEAR DATA] Failed to delete completedMatch ${cmDoc.id} for user ${userDoc.id}: $e');
            }
          }
        } catch (e) {
          print('[CLEAR DATA] Failed to process user ${userDoc.id}: $e');
        }
      }
      print('[CLEAR DATA] Deleted $deletedCount completed match entries');

      // Final pass: Clean up any remaining scores and outcomes from asset config tournaments
      print(
          '[CLEAR DATA] Final pass: Cleaning remaining scores and outcomes...');
      try {
        // Load tournaments directly from asset (doesn't require context)
        final String response =
            await rootBundle.loadString('assets/config/tournaments.json');
        final data = json.decode(response);
        final tournaments = (data['tournaments'] as List)
            .map((t) => Tournament.fromJson(t))
            .toList();
        for (final tournament in tournaments) {
          for (final match in tournament.matches) {
            // Try to delete outcome
            final outcomeRef = db
                .collection('tournaments')
                .doc(tournament.id)
                .collection('matches')
                .doc(match.id)
                .collection('meta')
                .doc('outcome');
            try {
              final outcomeDoc = await outcomeRef.get();
              if (outcomeDoc.exists) {
                await outcomeRef.delete();
                print(
                    '[CLEAR DATA] ✅ Final pass: Deleted outcome for ${tournament.id}/${match.id}');
              }
            } catch (e) {
              print(
                  '[CLEAR DATA] Final pass: Could not delete outcome ${tournament.id}/${match.id}: $e');
            }

            // Try to delete all scores
            final scoresRef = db
                .collection('tournaments')
                .doc(tournament.id)
                .collection('matches')
                .doc(match.id)
                .collection('scores');
            try {
              final scores = await scoresRef.get();
              for (final s in scores.docs) {
                try {
                  await s.reference.delete();
                  print('[CLEAR DATA] ✅ Final pass: Deleted score ${s.id}');
                } catch (e) {
                  print(
                      '[CLEAR DATA] Final pass: Failed to delete score ${s.id}: $e');
                }
              }
            } catch (e) {
              print(
                  '[CLEAR DATA] Final pass: Could not access scores ${tournament.id}/${match.id}: $e');
            }
          }
        }
      } catch (e) {
        print('[CLEAR DATA] Final pass error: $e');
      }

      // Verification: Check what's left
      print('[CLEAR DATA] Verifying deletion...');
      final remainingLeaderboard = await db.collection('leaderboard').get();
      final remainingTournaments = await db.collection('tournaments').get();
      print(
          '[CLEAR DATA] VERIFICATION - Remaining: ${remainingLeaderboard.docs.length} leaderboard entries, ${remainingTournaments.docs.length} tournaments');

      if (remainingLeaderboard.docs.isNotEmpty ||
          remainingTournaments.docs.isNotEmpty) {
        print('[CLEAR DATA] WARNING: Some documents remain after deletion!');
      } else {
        print(
            '[CLEAR DATA] All data cleared successfully - verification passed');
      }
    } catch (e, stackTrace) {
      print('[CLEAR DATA] ERROR: $e');
      print('[CLEAR DATA] StackTrace: $stackTrace');
      rethrow;
    }
  }

  Widget _buildBody() {
    if (!_questionsLoaded) {
      return const Center(child: CircularProgressIndicator());
    }

    switch (_selectedIndex) {
      case 0:
        return JcplHomeTab(onNavigateToTab: _onItemTapped);
      case 1:
        return const TeamsTab();
      case 2:
        return const ScheduleTab();
      case 3:
        return const PredictorGameScreen();
      default:
        return JcplHomeTab(onNavigateToTab: _onItemTapped);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final theme = Theme.of(context);
    final adminProvider = Provider.of<AdminProvider>(context);

    // Debug admin status
    if (!adminProvider.loading) {
      print(
          '[HOME] Admin status - isAdmin: ${adminProvider.isAdmin}, userId: ${authProvider.user?.uid}');
    }

    final isMobile = MediaQuery.of(context).size.width < 600;
    final isSmallMobile = MediaQuery.of(context).size.width < 400;

    return Scaffold(
      appBar: AppBar(
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                theme.colorScheme.primary,
                theme.colorScheme.secondary,
                theme.colorScheme.primary.withOpacity(0.8),
              ],
              stops: const [0.0, 0.5, 1.0],
            ),
          ),
        ),
        title: Container(
          padding:
              EdgeInsets.symmetric(horizontal: isMobile ? 8 : 12, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.2),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: Colors.white.withOpacity(0.3),
              width: 1.5,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: EdgeInsets.all(isMobile ? 4 : 6),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.25),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  _getAppBarIcon(),
                  size: isMobile ? 18 : 22,
                  color: Colors.white,
                ),
              ),
              if (!isSmallMobile) ...[
                SizedBox(width: isMobile ? 6 : 10),
                Flexible(
                  child: Text(
                    _getAppBarTitle(),
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: isMobile ? 14 : 18,
                      color: Colors.white,
                      letterSpacing: 0.5,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ],
          ),
        ),
        actions: [
          // Debug: Show admin status (temporary)
          if (adminProvider.loading)
            const Padding(
              padding: EdgeInsets.all(8.0),
              child: SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          if (!adminProvider.loading && adminProvider.isAdmin) ...[
            if (isMobile)
              PopupMenuButton(
                icon: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.admin_panel_settings,
                      color: Colors.white),
                ),
                color: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                itemBuilder: (context) => [
                  PopupMenuItem(
                    child: const Row(
                      children: [
                        Icon(Icons.admin_panel_settings, size: 20),
                        SizedBox(width: 12),
                        Text('Admin Panel'),
                      ],
                    ),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                            builder: (_) => const OutcomeAdminScreen()),
                      );
                    },
                  ),
                  PopupMenuItem(
                    child: const Row(
                      children: [
                        Icon(Icons.refresh, size: 20),
                        SizedBox(width: 12),
                        Text('Unblock Matches'),
                      ],
                    ),
                    onTap: () async {
                      await Future.delayed(const Duration(milliseconds: 100));
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                            content: Text('Unblocking your matches...')),
                      );
                      bool ok = true;
                      try {
                        print(
                            '[ADMIN FORCE UNBLOCK] Clear local completed matches');
                        final gp =
                            Provider.of<GameProvider>(context, listen: false);
                        gp.clearCompletedMatches();
                        gp.setTestUnblock(true);
                        final auth =
                            Provider.of<AuthProvider>(context, listen: false);
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
                          print(
                              '[ADMIN FORCE UNBLOCK] Deleting completed: users/$uid/completedMatches/${cmDoc.id}');
                          await cmDoc.reference.delete();
                        }
                        await gp.loadCompletedMatchesForUser(uid);
                      } catch (e) {
                        print('[ADMIN FORCE UNBLOCK] ERROR: $e');
                        ok = false;
                      }
                      if (!context.mounted) return;
                      if (ok) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                            content: Text(
                                'Your match blocks cleared. You can play!')));
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content: Text(
                                    'Failed to clear your completed matches')));
                      }
                    },
                  ),
                  PopupMenuItem(
                    child: const Row(
                      children: [
                        Icon(Icons.delete_forever, size: 20),
                        SizedBox(width: 12),
                        Text('Clear All Data'),
                      ],
                    ),
                    onTap: () async {
                      await Future.delayed(const Duration(milliseconds: 100));
                      if (!context.mounted) return;
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('Clear ALL Game/Test Data?'),
                          content: const Text(
                              'This will remove ALL tournaments, matches, leaderboard entries, user predictions, and outcomes from database. Are you sure?'),
                          actions: [
                            TextButton(
                                onPressed: () => Navigator.pop(ctx, false),
                                child: const Text('Cancel')),
                            ElevatedButton(
                                onPressed: () => Navigator.pop(ctx, true),
                                child: const Text('Clear All')),
                          ],
                        ),
                      );
                      if (confirm == true && context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content:
                                    Text('Clearing all game/test data...')));
                        bool backendSuccess = true;
                        try {
                          await _clearAllGameData();
                        } catch (e, stackTrace) {
                          backendSuccess = false;
                          print('[ADMIN CLEAR] Failed with error: $e');
                          print('[ADMIN CLEAR] StackTrace: $stackTrace');
                        }
                        if (!context.mounted) return;
                        Provider.of<GameProvider>(context, listen: false)
                            .clearTournamentSelection();
                        Provider.of<GameProvider>(context, listen: false)
                            .clearCompletedMatches();
                        Provider.of<GameProvider>(context, listen: false)
                            .setTestUnblock(true);
                        await Provider.of<GameProvider>(context, listen: false)
                            .loadTournaments();
                        setState(() {});
                        final db = FirebaseFirestore.instance;
                        final verifyLeaderboard =
                            await db.collection('leaderboard').get();
                        final verifyTournaments =
                            await db.collection('tournaments').get();
                        if (!context.mounted) return;
                        if (backendSuccess &&
                            verifyLeaderboard.docs.isEmpty &&
                            verifyTournaments.docs.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content: Text(
                                    '✅ All game/test data cleared successfully!')),
                          );
                        } else {
                          final remaining =
                              'Leaderboard: ${verifyLeaderboard.docs.length}, Tournaments: ${verifyTournaments.docs.length}';
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                  '⚠️ Clear completed with issues. Remaining: $remaining. Check console for details. Local UI was reset.'),
                              duration: const Duration(seconds: 8),
                              backgroundColor: Colors.orange,
                            ),
                          );
                        }
                      }
                    },
                  ),
                ],
              )
            else ...[
              Tooltip(
                message: 'Force Unblock Matches',
                child: Container(
                  margin: const EdgeInsets.only(right: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.refresh, color: Colors.white),
                    onPressed: () async {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                            content: Text('Unblocking your matches...')),
                      );
                      bool ok = true;
                      try {
                        print(
                            '[ADMIN FORCE UNBLOCK] Clear local completed matches');
                        final gp =
                            Provider.of<GameProvider>(context, listen: false);
                        gp.clearCompletedMatches();
                        gp.setTestUnblock(true);

                        final auth =
                            Provider.of<AuthProvider>(context, listen: false);
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
                          print(
                              '[ADMIN FORCE UNBLOCK] Deleting completed: users/$uid/completedMatches/${cmDoc.id}');
                          await cmDoc.reference.delete();
                        }
                        // Refresh from backend (should be empty) but testUnblock keeps UI free regardless
                        await gp.loadCompletedMatchesForUser(uid);
                      } catch (e) {
                        print('[ADMIN FORCE UNBLOCK] ERROR: $e');
                        ok = false;
                      }
                      if (ok) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                            content: Text(
                                'Your match blocks cleared. You can play!')));
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content: Text(
                                    'Failed to clear your completed matches')));
                      }
                    },
                  ),
                ),
              ),
              Tooltip(
                message: 'Clear All Game Data',
                child: Container(
                  margin: const EdgeInsets.only(right: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.delete_forever, color: Colors.white),
                    onPressed: () async {
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('Clear ALL Game/Test Data?'),
                          content: const Text(
                              'This will remove ALL tournaments, matches, leaderboard entries, user predictions, and outcomes from database. Are you sure?'),
                          actions: [
                            TextButton(
                                onPressed: () => Navigator.pop(ctx, false),
                                child: const Text('Cancel')),
                            ElevatedButton(
                                onPressed: () => Navigator.pop(ctx, true),
                                child: const Text('Clear All')),
                          ],
                        ),
                      );
                      if (confirm == true) {
                        ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content:
                                    Text('Clearing all game/test data...')));
                        bool backendSuccess = true;
                        String? errorMsg;
                        try {
                          await _clearAllGameData();
                        } catch (e, stackTrace) {
                          backendSuccess = false;
                          errorMsg = e.toString();
                          print('[ADMIN CLEAR] Failed with error: $e');
                          print('[ADMIN CLEAR] StackTrace: $stackTrace');
                        }
                        // Always reset state/UI so matches are unblocked for the user
                        Provider.of<GameProvider>(context, listen: false)
                            .clearTournamentSelection();
                        Provider.of<GameProvider>(context, listen: false)
                            .clearCompletedMatches();
                        Provider.of<GameProvider>(context, listen: false)
                            .setTestUnblock(true);
                        print(
                            '[ADMIN CLEAR] Calling loadTournaments() after clear...');
                        await Provider.of<GameProvider>(context, listen: false)
                            .loadTournaments();
                        print(
                            '[ADMIN CLEAR] loadTournaments() complete. Forcing UI refresh.');
                        setState(() {});
                        // Always verify what's left after clear attempt
                        final db = FirebaseFirestore.instance;
                        final verifyLeaderboard =
                            await db.collection('leaderboard').get();
                        final verifyTournaments =
                            await db.collection('tournaments').get();

                        if (backendSuccess &&
                            verifyLeaderboard.docs.isEmpty &&
                            verifyTournaments.docs.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content: Text(
                                    '✅ All game/test data cleared successfully!')),
                          );
                        } else {
                          final remaining =
                              'Leaderboard: ${verifyLeaderboard.docs.length}, Tournaments: ${verifyTournaments.docs.length}';
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                  '⚠️ Clear completed with issues. Remaining: $remaining. Check console for details. Local UI was reset.'),
                              duration: const Duration(seconds: 8),
                              backgroundColor: Colors.orange,
                            ),
                          );
                          print(
                              '[ADMIN CLEAR] FINAL STATUS - Remaining entries: $remaining');
                        }
                      }
                    },
                  ),
                ),
              ),
              Tooltip(
                message: 'Admin Panel',
                child: Container(
                  margin: const EdgeInsets.only(right: 4),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Colors.orange.withOpacity(0.3),
                        Colors.orange.withOpacity(0.2),
                      ],
                    ),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.orange.withOpacity(0.4),
                      width: 1.5,
                    ),
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.admin_panel_settings,
                        color: Colors.white),
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                            builder: (_) => const OutcomeAdminScreen()),
                      );
                    },
                  ),
                ),
              ),
            ],
          ],
          // Home icon to jump to Home tab
          if (!isSmallMobile)
            Tooltip(
              message: 'Home',
              child: Container(
                margin: const EdgeInsets.only(right: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: IconButton(
                  icon: Icon(
                    Icons.home_outlined,
                    color: Colors.white,
                    size: isMobile ? 20 : 24,
                  ),
                  onPressed: () {
                    setState(() {
                      _selectedIndex = 0;
                    });
                  },
                ),
              ),
            ),
          // User profile section
          if (!isSmallMobile)
            Container(
              margin: const EdgeInsets.only(right: 8),
              padding: EdgeInsets.symmetric(
                horizontal: isMobile ? 8 : 12,
                vertical: 6,
              ),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(25),
                border: Border.all(
                  color: Colors.white.withOpacity(0.3),
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.white.withOpacity(0.3),
                          Colors.white.withOpacity(0.1),
                        ],
                      ),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.person,
                      color: Colors.white,
                      size: isMobile ? 16 : 18,
                    ),
                  ),
                  if (!isMobile) ...[
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        authProvider.user?.displayName ??
                            authProvider.user?.email?.split('@').first ??
                            'User',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                          fontSize: isMobile ? 12 : 14,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ],
              ),
            )
          else
            Container(
              margin: const EdgeInsets.only(right: 4),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: const Icon(Icons.person, color: Colors.white, size: 20),
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: const Text('User Info'),
                      content: Text(
                        authProvider.user?.displayName ??
                            authProvider.user?.email?.split('@').first ??
                            'User',
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: const Text('Close'),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          Tooltip(
            message: 'Logout',
            child: Container(
              margin: const EdgeInsets.only(right: 8),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: Icon(
                  Icons.logout,
                  color: Colors.white,
                  size: isMobile ? 20 : 24,
                ),
                onPressed: _logout,
              ),
            ),
          ),
        ],
        elevation: 0,
        scrolledUnderElevation: 4,
      ),
      body: _buildBody(),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: _onItemTapped,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.groups_outlined),
            selectedIcon: Icon(Icons.groups),
            label: 'Teams',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_month_outlined),
            selectedIcon: Icon(Icons.calendar_month),
            label: 'Schedule',
          ),
          NavigationDestination(
            icon: Icon(Icons.sports_cricket_outlined),
            selectedIcon: Icon(Icons.sports_cricket),
            label: 'Predictor',
          ),
        ],
      ),
    );
  }
}
