import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/game_provider.dart';
import '../auth/login_screen.dart';
import 'predictor_game_screen.dart';
import '../leaderboard/leaderboard_screen.dart';

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

    return Scaffold(
      appBar: AppBar(
        title: Text(
          _selectedIndex == 0 ? 'Predictor Game' : 'Leaderboard',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
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

