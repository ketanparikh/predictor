import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/game_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/admin_provider.dart';
import '../../services/prediction_service.dart';
import '../../models/tournament.dart';
import '../leaderboard/leaderboard_screen.dart';

class PredictorGameScreen extends StatefulWidget {
  const PredictorGameScreen({super.key});

  @override
  State<PredictorGameScreen> createState() => _PredictorGameScreenState();
}

class _PredictorGameScreenState extends State<PredictorGameScreen> {
  bool _showGameMode = false;

  void _startGame(BuildContext context) {
    final gameProvider = Provider.of<GameProvider>(context, listen: false);
    gameProvider.startGame();
  }

  Future<bool> _submitScore(BuildContext context, int score) async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final userId = authProvider.user?.uid;
    final userName = authProvider.user?.displayName ??
        authProvider.user?.email?.split('@').first ??
        'User';
    final tournamentId = Provider.of<GameProvider>(context, listen: false)
            .selectedTournament
            ?.id ??
        'unknown';
    final matchId =
        Provider.of<GameProvider>(context, listen: false).selectedMatch?.id ??
            'unknown';

    if (userId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Not signed in. Cannot submit.')),
      );
      return false;
    }

    try {
      // Save predictions for backend scoring
      final gp = Provider.of<GameProvider>(context, listen: false);
      final predictionService = PredictionService();
      await predictionService.saveUserPrediction(
        userId: userId,
        userName: userName,
        tournamentId: tournamentId,
        matchId: matchId,
        answers: Map<String, String>.from(gp.userAnswers),
        submittedAt: DateTime.now(),
      );
      return true;
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to save predictions: $e')),
      );
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final adminProvider = Provider.of<AdminProvider>(context);

    // Show Coming Soon for non-admin users
    if (!adminProvider.isAdmin) {
      return _buildComingSoon(context);
    }

    // Admin users get access to the full game
    return Consumer<GameProvider>(
      builder: (context, gameProvider, child) {
        // Ensure completed matches are loaded for this user
        final auth = Provider.of<AuthProvider>(context);
        if (auth.user != null &&
            gameProvider.completedMatchIds.isEmpty &&
            gameProvider.tournamentsLoaded) {
          WidgetsBinding.instance.addPostFrameCallback((_) async {
            await Provider.of<GameProvider>(context, listen: false)
                .loadCompletedMatchesForUser(auth.user!.uid);
          });
        }

        // Main menu - show Game and Leaderboard cards
        if (!_showGameMode && gameProvider.selectedTournament == null) {
          return _buildMainMenu(context, gameProvider.tournamentsLoaded);
        }

        // Step 1: Choose Tournament (when game mode is active)
        if (gameProvider.selectedTournament == null) {
          return _buildTournamentList(context, gameProvider.tournaments,
              gameProvider.tournamentsLoaded);
        }

        // Step 2: Choose Match within Tournament
        if (gameProvider.selectedMatch == null) {
          return _buildMatchSchedule(context, gameProvider.selectedTournament!);
        }

        // Step 3: Game flow (no in-app results)
        if (!gameProvider.gameStarted) {
          return _buildMatchReadyScreen(context);
        }

        return _buildGameScreen(context);
      },
    );
  }

  Widget _buildComingSoon(BuildContext context) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Column(
        children: [
          const SizedBox(height: 20),
          // Cricket ball icon with glow - same as Schedule page
          Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  theme.colorScheme.primary.withOpacity(0.15),
                  theme.colorScheme.secondary.withOpacity(0.15),
                ],
              ),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: theme.colorScheme.primary.withOpacity(0.2),
                  blurRadius: 20,
                  spreadRadius: 5,
                ),
              ],
            ),
            child: Icon(
              Icons.sports_cricket,
              size: 70,
              color: theme.colorScheme.primary,
            ),
          ),
          const SizedBox(height: 28),
          // Coming Soon Text - same as Schedule page
          ShaderMask(
            shaderCallback: (bounds) => LinearGradient(
              colors: [
                theme.colorScheme.primary,
                theme.colorScheme.secondary,
              ],
            ).createShader(bounds),
            child: const Text(
              'Coming Soon!',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.sports_cricket,
                  size: 20, color: theme.colorScheme.primary),
              const SizedBox(width: 8),
              Text(
                'Predictor Game',
                style: TextStyle(
                  fontSize: 18,
                  color: Colors.grey.shade700,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(width: 8),
              Icon(Icons.sports_cricket,
                  size: 20, color: theme.colorScheme.primary),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Get ready to predict match outcomes\nand win exciting prizes!',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade500,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 28),
          // Vibrant Tournament Date Badge - same orange as Schedule page
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFFFF6B35), // Vibrant orange
                  Color(0xFFFF8E53), // Light orange
                  Color(0xFFFFC371), // Golden orange
                ],
              ),
              borderRadius: BorderRadius.circular(30),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFFF6B35).withOpacity(0.4),
                  blurRadius: 15,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.25),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.sports_cricket,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'GAME STARTS',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      '10th January 2026',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 8),
                const Icon(
                  Icons.emoji_events,
                  color: Colors.white,
                  size: 28,
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          // Info cards
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildInfoBadge(Icons.quiz, 'Predict'),
              const SizedBox(width: 10),
              _buildInfoBadge(Icons.emoji_events, 'Win'),
              const SizedBox(width: 10),
              _buildInfoBadge(Icons.leaderboard, 'Compete'),
            ],
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildInfoBadge(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.orange.shade50,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.orange.shade200),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18, color: Colors.deepOrange),
          const SizedBox(width: 6),
          Text(
            text,
            style: TextStyle(
              color: Colors.deepOrange.shade700,
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMainMenu(BuildContext context, bool loaded) {
    final theme = Theme.of(context);

    if (!loaded) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(color: theme.colorScheme.primary),
            const SizedBox(height: 16),
            Text(
              'Loading...',
              style:
                  theme.textTheme.bodyMedium?.copyWith(color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Welcome text
          Text(
            'Predictor Game',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Predict match outcomes and win exciting prizes!',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 24),

          // Play Game Card
          _buildMenuCard(
            context,
            icon: Icons.sports_cricket,
            title: 'Play Game',
            subtitle: 'Predict match outcomes & win',
            gradientColors: [
              Colors.orange.shade400,
              Colors.deepOrange.shade600
            ],
            onTap: () => setState(() => _showGameMode = true),
          ),

          const SizedBox(height: 16),

          // Leaderboard Card
          _buildMenuCard(
            context,
            icon: Icons.leaderboard,
            title: 'Leaderboard',
            subtitle: 'See top predictors & your rank',
            gradientColors: [Colors.purple.shade400, Colors.purple.shade700],
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const LeaderboardScreen(),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildMenuCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required List<Color> gradientColors,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: gradientColors,
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: gradientColors[0].withOpacity(0.4),
              blurRadius: 15,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                icon,
                color: Colors.white,
                size: 40,
              ),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.9),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.arrow_forward_ios,
              color: Colors.white.withOpacity(0.8),
              size: 24,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTournamentList(
      BuildContext context, List<Tournament> tournaments, bool loaded) {
    final theme = Theme.of(context);
    if (!loaded) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(color: theme.colorScheme.primary),
            const SizedBox(height: 16),
            Text(
              'Loading tournaments...',
              style:
                  theme.textTheme.bodyMedium?.copyWith(color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }
    if (tournaments.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.emoji_events_outlined,
                size: 80, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'No tournaments available',
              style:
                  theme.textTheme.titleLarge?.copyWith(color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }
    return Column(
      children: [
        // Header with back button
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 16, 0),
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() => _showGameMode = false),
              ),
              Text(
                'Select Category',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        // Tournament list
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: tournaments.length,
            itemBuilder: (context, index) {
              final t = tournaments[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                elevation: 3,
                child: InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () {
                    final gameProvider =
                        Provider.of<GameProvider>(context, listen: false);
                    gameProvider.selectTournament(t);
                  },
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                theme.colorScheme.primary,
                                theme.colorScheme.secondary,
                              ],
                            ),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(
                            Icons.emoji_events,
                            color: Colors.white,
                            size: 32,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                t.name,
                                style: theme.textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(
                                    Icons.sports_cricket,
                                    size: 16,
                                    color: theme.colorScheme.secondary,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    '${t.matches.length} ${t.matches.length == 1 ? 'Match' : 'Matches'}',
                                    style: theme.textTheme.bodyMedium?.copyWith(
                                      color: Colors.grey[600],
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        Icon(
                          Icons.arrow_forward_ios,
                          color: theme.colorScheme.primary,
                          size: 20,
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildMatchSchedule(BuildContext context, Tournament tournament) {
    final theme = Theme.of(context);
    final gameProvider = Provider.of<GameProvider>(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () {
                  final gameProvider =
                      Provider.of<GameProvider>(context, listen: false);
                  gameProvider.clearTournamentSelection();
                },
              ),
              Text(
                tournament.name,
                style: theme.textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: tournament.matches.length,
            itemBuilder: (context, index) {
              final m = tournament.matches[index];
              final completed = gameProvider.isMatchCompleted(m.id);
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                elevation: completed ? 2 : 4,
                child: InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: completed
                      ? null
                      : () async {
                          final gp =
                              Provider.of<GameProvider>(context, listen: false);
                          await gp.selectMatch(m);
                        },
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: completed
                                ? Colors.green.withOpacity(0.1)
                                : theme.colorScheme.secondary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            completed
                                ? Icons.check_circle
                                : Icons.sports_cricket,
                            color: completed
                                ? Colors.green
                                : theme.colorScheme.secondary,
                            size: 28,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                m.name,
                                style: theme.textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: completed ? Colors.grey[600] : null,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(
                                    Icons.calendar_today,
                                    size: 14,
                                    color: Colors.grey[600],
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    m.date,
                                    style: theme.textTheme.bodySmall?.copyWith(
                                      color: Colors.grey[600],
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        if (completed)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  Colors.green.withOpacity(0.15),
                                  Colors.green.withOpacity(0.08),
                                ],
                              ),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: Colors.green.withOpacity(0.4),
                                width: 1.5,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.check,
                                    size: 16, color: Colors.green),
                                const SizedBox(width: 4),
                                const Text(
                                  'Done',
                                  style: TextStyle(
                                    color: Colors.green,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          )
                        else
                          Icon(
                            Icons.arrow_forward_ios,
                            color: theme.colorScheme.primary,
                            size: 20,
                          ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildMatchReadyScreen(BuildContext context) {
    final theme = Theme.of(context);
    final gameProvider = Provider.of<GameProvider>(context);
    final match = gameProvider.selectedMatch!;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Card(
          elevation: 8,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Colors.white,
                  theme.colorScheme.primary.withOpacity(0.05),
                ],
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          theme.colorScheme.primary,
                          theme.colorScheme.secondary,
                        ],
                      ),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: theme.colorScheme.primary.withOpacity(0.3),
                          blurRadius: 20,
                          spreadRadius: 5,
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.sports_cricket,
                      size: 64,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    match.name,
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.calendar_today,
                          size: 16, color: Colors.grey[600]),
                      const SizedBox(width: 6),
                      Text(
                        match.date,
                        style: theme.textTheme.bodyLarge
                            ?.copyWith(color: Colors.grey[600]),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.tertiary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: theme.colorScheme.tertiary.withOpacity(0.3),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.quiz,
                          size: 20,
                          color: theme.colorScheme.tertiary,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${gameProvider.questions.length} Questions Ready',
                          style: TextStyle(
                            color: theme.colorScheme.tertiary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  ElevatedButton.icon(
                    onPressed: () => _startGame(context),
                    icon: const Icon(Icons.play_arrow, size: 28),
                    label: const Text(
                      'Start Match',
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 40, vertical: 18),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStartScreen(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            theme.colorScheme.primary,
            theme.colorScheme.secondary,
            theme.colorScheme.tertiary,
          ],
          stops: const [0.0, 0.5, 1.0],
        ),
      ),
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Cricket Icon with Animation Effect
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.sports_cricket,
                  size: 100,
                  color: Colors.white,
                  shadows: [
                    Shadow(
                      color: Colors.black.withOpacity(0.3),
                      blurRadius: 30,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              // "Let's Play" Text
              Text(
                "Let's Play!",
                style: TextStyle(
                  fontSize: 48,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                  shadows: [
                    Shadow(
                      color: Colors.black.withOpacity(0.3),
                      blurRadius: 10,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              // Subtitle
              Text(
                'Test your cricket knowledge and\ncompete for the top spot!',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.white.withOpacity(0.95),
                  fontWeight: FontWeight.w500,
                  shadows: [
                    Shadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 5,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 48),
              // Start Button with vibrant design
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.white, Colors.white.withOpacity(0.9)],
                  ),
                  borderRadius: BorderRadius.circular(50),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: ElevatedButton.icon(
                  onPressed: () => _startGame(context),
                  icon: const Icon(
                    Icons.play_arrow,
                    size: 28,
                  ),
                  label: const Text(
                    'START',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    foregroundColor: theme.colorScheme.primary,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 48,
                      vertical: 18,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(50),
                    ),
                    elevation: 0,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              // Info badges
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildInfoChip(
                    context,
                    Icons.quiz,
                    '12 Questions',
                    Colors.white,
                  ),
                  const SizedBox(width: 16),
                  _buildInfoChip(
                    context,
                    Icons.emoji_events,
                    'Win Points',
                    Colors.white,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoChip(
      BuildContext context, IconData icon, String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(
          color: color.withOpacity(0.4),
          width: 1.5,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 8),
          Text(
            text,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGameScreen(BuildContext context) {
    final gameProvider = Provider.of<GameProvider>(context);
    final question = gameProvider.currentQuestion;

    if (question == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildProgressBar(context),
          const SizedBox(height: 24),
          _buildQuestionCard(context, question),
          const SizedBox(height: 24),
          _buildOptionsList(context, question),
          const SizedBox(height: 16),
          _buildNavigationButtons(context),
        ],
      ),
    );
  }

  Widget _buildProgressBar(BuildContext context) {
    final gameProvider = Provider.of<GameProvider>(context);
    final progress =
        (gameProvider.currentQuestionIndex + 1) / gameProvider.questions.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Question ${gameProvider.currentQuestionIndex + 1} of ${gameProvider.questions.length}',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        LinearProgressIndicator(
          value: progress,
          minHeight: 8,
          borderRadius: BorderRadius.circular(4),
        ),
      ],
    );
  }

  Widget _buildQuestionCard(BuildContext context, question) {
    final theme = Theme.of(context);
    return Card(
      elevation: 6,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.white,
              theme.colorScheme.primary.withOpacity(0.03),
            ],
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          theme.colorScheme.primary,
                          theme.colorScheme.secondary,
                        ],
                      ),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: theme.colorScheme.primary.withOpacity(0.3),
                          blurRadius: 8,
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.stars, size: 16, color: Colors.white),
                        const SizedBox(width: 4),
                        Text(
                          '${question.points} pts',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.tertiary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.category,
                            size: 14, color: theme.colorScheme.tertiary),
                        const SizedBox(width: 4),
                        Text(
                          question.category,
                          style: TextStyle(
                            color: theme.colorScheme.tertiary,
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Icon(
                    Icons.quiz,
                    color: theme.colorScheme.primary,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      question.question,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOptionsList(BuildContext context, question) {
    final gameProvider = Provider.of<GameProvider>(context);
    final selectedAnswer = gameProvider.userAnswers[question.id];

    return Column(
      children: [
        for (final option in question.options)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: InkWell(
              onTap: selectedAnswer != null
                  ? null
                  : () {
                      if (!gameProvider.isAnswerSelected(question.id)) {
                        gameProvider.answerQuestion(question.id, option);
                      }
                    },
              child: Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: selectedAnswer == option
                        ? Theme.of(context).colorScheme.primary
                        : Colors.grey.shade300,
                    width: selectedAnswer == option ? 2.5 : 1.5,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  gradient: selectedAnswer == option
                      ? LinearGradient(
                          colors: [
                            Theme.of(context)
                                .colorScheme
                                .primary
                                .withOpacity(0.15),
                            Theme.of(context)
                                .colorScheme
                                .secondary
                                .withOpacity(0.08),
                          ],
                        )
                      : null,
                  color: selectedAnswer != null && selectedAnswer != option
                      ? Theme.of(context).disabledColor.withOpacity(0.04)
                      : null,
                  boxShadow: selectedAnswer == option
                      ? [
                          BoxShadow(
                            color: Theme.of(context)
                                .colorScheme
                                .primary
                                .withOpacity(0.2),
                            blurRadius: 8,
                            spreadRadius: 1,
                          ),
                        ]
                      : null,
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: selectedAnswer == option
                            ? Theme.of(context).colorScheme.primary
                            : (selectedAnswer != null
                                ? Colors.grey[300]
                                : Colors.grey.shade200),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        selectedAnswer == option
                            ? Icons.check_circle
                            : (selectedAnswer != null
                                ? Icons.lock
                                : Icons.radio_button_unchecked),
                        color: selectedAnswer == option
                            ? Colors.white
                            : (selectedAnswer != null
                                ? Colors.grey[600]
                                : Colors.grey),
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Text(
                        option,
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: selectedAnswer == option
                              ? FontWeight.bold
                              : FontWeight.w500,
                          color: selectedAnswer == option
                              ? Theme.of(context).colorScheme.primary
                              : (selectedAnswer != null
                                  ? Colors.grey[700]
                                  : null),
                        ),
                      ),
                    ),
                    if (selectedAnswer == option)
                      Icon(
                        Icons.emoji_events,
                        color: Theme.of(context).colorScheme.tertiary,
                        size: 24,
                      ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildNavigationButtons(BuildContext context) {
    final gameProvider = Provider.of<GameProvider>(context);
    final question = gameProvider.currentQuestion;
    final selectedAnswer =
        question != null ? gameProvider.userAnswers[question.id] : null;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        if (gameProvider.currentQuestionIndex > 0)
          OutlinedButton(
            onPressed: () {
              gameProvider.resetGame();
            },
            child: const Text('Restart'),
          )
        else
          const SizedBox(),
        ElevatedButton(
          onPressed: selectedAnswer == null
              ? null
              : () async {
                  final auth =
                      Provider.of<AuthProvider>(context, listen: false);
                  if (gameProvider.currentQuestionIndex <
                      gameProvider.questions.length - 1) {
                    gameProvider.nextQuestion();
                  } else {
                    // Final question answered: attempt to save predictions and mark match complete
                    final saved = await _submitScore(context, 0);
                    if (saved && auth.user != null) {
                      final gp =
                          Provider.of<GameProvider>(context, listen: false);
                      // Turn off any test-unblock override so completion is respected
                      gp.setTestUnblock(false);
                      await gp.markCurrentMatchCompletedForUser(auth.user!.uid);
                    }
                    if (saved) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Responses submitted.')),
                      );
                      gameProvider.resetGame();
                      Provider.of<GameProvider>(context, listen: false)
                          .clearTournamentSelection();
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                            content: Text(
                                'Submission failed! Cleared local state for retry.')),
                      );
                      gameProvider.resetGame();
                      Provider.of<GameProvider>(context, listen: false)
                          .clearTournamentSelection();
                    }
                  }
                },
          child: Text(
            gameProvider.currentQuestionIndex <
                    gameProvider.questions.length - 1
                ? 'Next Question'
                : 'Submit',
          ),
        ),
      ],
    );
  }
}
