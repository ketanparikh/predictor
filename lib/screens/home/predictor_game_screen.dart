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
    
    // Validate that questions are loaded
    if (gameProvider.questions.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Questions are not loaded yet. Please wait...'),
          duration: Duration(seconds: 2),
        ),
      );
      return;
    }
    
    // Game is enabled until the first match starts (no freeze check needed)
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

    // Game is now available for all users
    return Consumer<GameProvider>(
      builder: (context, gameProvider, child) {
        // Ensure completed matches and playable tournaments are loaded for this user
        final auth = Provider.of<AuthProvider>(context);
        if (auth.user != null && gameProvider.tournamentsLoaded) {
          WidgetsBinding.instance.addPostFrameCallback((_) async {
            final gp = Provider.of<GameProvider>(context, listen: false);
            // Reload playable tournaments to get latest admin settings
            await gp.loadPlayableTournaments();
            if (gp.completedMatchIds.isEmpty) {
              await gp.loadCompletedMatchesForUser(auth.user!.uid);
            }
          });
        }

        // Main menu - show Game and Leaderboard cards
        if (!_showGameMode && gameProvider.selectedTournament == null) {
          return _buildMainMenu(context, gameProvider.tournamentsLoaded);
        }

        // Step 1: Choose Tournament (when game mode is active)
        if (gameProvider.selectedTournament == null) {
          // Show all tournaments, but grey out non-playable ones for non-admin users
          return _buildTournamentList(
              context, gameProvider.tournaments, gameProvider.tournamentsLoaded, adminProvider.isAdmin);
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
    final gameProvider = Provider.of<GameProvider>(context);

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

          // Countdown Timer for Next Day
          _buildCountdownTimer(context, gameProvider),

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

          const SizedBox(height: 16),

          // Rules Card
          _buildRulesCard(context),
        ],
      ),
    );
  }

  Widget _buildRulesCard(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      child: InkWell(
        onTap: () {
          _showRulesDialog(context);
        },
        borderRadius: BorderRadius.circular(20),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.blue.shade400,
                Colors.blue.shade700,
              ],
            ),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.rule,
                  color: Colors.white,
                  size: 28,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Game Rules',
                      style: theme.textTheme.titleLarge?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Read important game rules & guidelines',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: Colors.white.withOpacity(0.9),
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.arrow_forward_ios,
                color: Colors.white,
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showRulesDialog(BuildContext context) {
    final theme = Theme.of(context);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        title: Row(
          children: [
            Icon(Icons.rule, color: theme.colorScheme.primary),
            const SizedBox(width: 12),
            Text(
              'Game Rules',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildRuleItem(
                context,
                Icons.lock_clock,
                'Freeze Time',
                'Game submissions are frozen before the first match of the day starts. Once the first match begins, you cannot submit new predictions for that day. Submit predictions for all matches of the day before the freeze time.',
                Colors.orange,
              ),
              const SizedBox(height: 16),
              _buildRuleItem(
                context,
                Icons.block,
                'No Revisions',
                'Once you submit your predictions for a match, you cannot change or revert your answers. Make sure to review all your selections before submitting.',
                Colors.red,
              ),
              const SizedBox(height: 16),
              _buildRuleItem(
                context,
                Icons.stars,
                'Scoring',
                'Each correct answer earns you 10 points. Incorrect answers do not deduct points. Your total score is calculated based on all correct predictions.',
                Colors.green,
              ),
              const SizedBox(height: 16),
              _buildRuleItem(
                context,
                Icons.schedule,
                'Match Selection',
                'You can only play matches for days that are enabled by the admin. Days that have already started will be greyed out and unavailable.',
                Colors.blue,
              ),
              const SizedBox(height: 16),
              _buildRuleItem(
                context,
                Icons.quiz,
                'Questions',
                'Each match has 8 randomly selected questions.',
                Colors.purple,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(
              'Got it',
              style: TextStyle(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRuleItem(
    BuildContext context,
    IconData icon,
    String title,
    String description,
    Color color,
  ) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Color.lerp(color, Colors.black, 0.2) ?? color,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: Colors.grey[700],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCountdownTimer(BuildContext context, GameProvider gameProvider) {
    final theme = Theme.of(context);
    final nextMatchTime = gameProvider.getNextAvailableTournamentTime();
    
    if (nextMatchTime == null) {
      return const SizedBox.shrink();
    }
    
    return StreamBuilder<int>(
      stream: Stream.periodic(const Duration(seconds: 1), (i) => i),
      builder: (context, snapshot) {
        final now = DateTime.now();
        final difference = nextMatchTime.difference(now);
        
        if (difference.isNegative) {
          return const SizedBox.shrink();
        }
        
        final days = difference.inDays;
        final hours = difference.inHours % 24;
        final minutes = difference.inMinutes % 60;
        final seconds = difference.inSeconds % 60;
        
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.orange.shade400,
                Colors.deepOrange.shade600,
              ],
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.grey.withOpacity(0.3),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Icon(
                Icons.access_time,
                color: Colors.white,
                size: 24,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Time to submit for next day',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: Colors.white.withOpacity(0.9),
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        if (days > 0) ...[
                          _buildTimeUnit('${days}d', Colors.white),
                          const SizedBox(width: 4),
                        ],
                        _buildTimeUnit('${hours.toString().padLeft(2, '0')}h', Colors.white),
                        const SizedBox(width: 4),
                        _buildTimeUnit('${minutes.toString().padLeft(2, '0')}m', Colors.white),
                        const SizedBox(width: 4),
                        _buildTimeUnit('${seconds.toString().padLeft(2, '0')}s', Colors.white),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTimeUnit(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.2),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.bold,
          fontSize: 14,
        ),
      ),
    );
  }

  Widget _buildTournamentCountdown(BuildContext context, Tournament tournament, GameProvider gameProvider) {
    // Get the first match time for this tournament
    final firstMatchTime = gameProvider.getTournamentFirstMatchTime(tournament);
    
    if (firstMatchTime == null) {
      return const SizedBox.shrink();
    }
    
    return StreamBuilder<int>(
      stream: Stream.periodic(const Duration(seconds: 1), (i) => i),
      builder: (context, snapshot) {
        final now = DateTime.now();
        final difference = firstMatchTime!.difference(now);
        
        if (difference.isNegative) {
          return const SizedBox.shrink();
        }
        
        final hours = difference.inHours;
        final minutes = difference.inMinutes % 60;
        final seconds = difference.inSeconds % 60;
        
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.orange.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.orange.shade200),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.access_time,
                size: 14,
                color: Colors.orange.shade700,
              ),
              const SizedBox(width: 6),
              Text(
                '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}',
                style: TextStyle(
                  color: Colors.orange.shade700,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        );
      },
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
      BuildContext context, List<Tournament> tournaments, bool loaded, bool isAdmin) {
    final theme = Theme.of(context);
    // Use Consumer to rebuild when provider changes, ensuring time checks are current
    return Consumer<GameProvider>(
      builder: (context, gameProvider, child) {
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
                'Select Day',
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
              final isPast = gameProvider.isTournamentFirstMatchPast(t);
              
              // Check if tournament is playable (for non-admin users)
              final isPlayable = isAdmin || gameProvider.isTournamentPlayable(t);
              
              // Tournament should be greyed out if: past OR not playable
              final shouldGreyOut = isPast || !isPlayable;
              
              return Opacity(
                opacity: shouldGreyOut ? 0.4 : 1.0, // More visible grey-out
                child: Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  elevation: shouldGreyOut ? 1 : 3,
                  color: shouldGreyOut ? Colors.grey[300] : null, // More visible grey background
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: shouldGreyOut 
                        ? BorderSide(color: Colors.grey[400]!, width: 1)
                        : BorderSide.none,
                  ),
                  child: AbsorbPointer(
                    absorbing: shouldGreyOut, // Completely disable interaction when greyed out
                    child: InkWell(
                      borderRadius: BorderRadius.circular(20),
                      onTap: shouldGreyOut
                          ? null
                          : () {
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
                              gradient: shouldGreyOut
                                  ? null
                                  : LinearGradient(
                                      colors: [
                                        theme.colorScheme.primary,
                                        theme.colorScheme.secondary,
                                      ],
                                    ),
                              color: shouldGreyOut ? Colors.grey[400] : null,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(
                              shouldGreyOut ? Icons.lock_clock : Icons.emoji_events,
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
                                    color: shouldGreyOut ? Colors.grey[600] : null,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Icon(
                                      Icons.sports_cricket,
                                      size: 16,
                                      color: shouldGreyOut
                                          ? Colors.grey[500]
                                          : theme.colorScheme.secondary,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      '${t.matches.length} ${t.matches.length == 1 ? 'Match' : 'Matches'}',
                                      style: theme.textTheme.bodyMedium?.copyWith(
                                        color: shouldGreyOut
                                            ? Colors.grey[500]
                                            : Colors.grey[600],
                                      ),
                                    ),
                                    if (shouldGreyOut) ...[
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: Colors.orange.shade100,
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              isPast ? Icons.schedule : Icons.lock,
                                              size: 12,
                                              color: Colors.orange.shade800,
                                            ),
                                            const SizedBox(width: 4),
                                            Text(
                                              isPast ? 'Started' : 'Opening Soon',
                                              style: TextStyle(
                                                color: Colors.orange.shade800,
                                                fontSize: 11,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                if (!shouldGreyOut) ...[
                                  const SizedBox(height: 8),
                                  _buildTournamentCountdown(context, t, gameProvider),
                                ],
                              ],
                            ),
                          ),
                          Icon(
                            shouldGreyOut ? Icons.lock : Icons.arrow_forward_ios,
                            color: shouldGreyOut
                                ? Colors.grey[500]
                                : theme.colorScheme.primary,
                            size: 20,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                ),
              );
            },
          ),
        ),
      ],
    );
      },
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
              final hasStarted = gameProvider.isMatchStarted(m);
              
              // Allow play if match hasn't started (even if previously completed)
              // This allows users to resubmit predictions until the match starts
              final canPlay = !hasStarted;
              
              // Show "Done" only if completed AND match has started
              final showDone = completed && hasStarted;
              
              // Debug logging
              print('[MatchList] ${m.id}: completed=$completed, started=$hasStarted, canPlay=$canPlay, showDone=$showDone');
              
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                elevation: canPlay ? 4 : 2,
                child: InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: canPlay
                      ? () async {
                          final gp =
                              Provider.of<GameProvider>(context, listen: false);
                          await gp.selectMatch(m);
                        }
                      : null,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: hasStarted
                                ? (completed ? Colors.green.withOpacity(0.1) : Colors.orange.withOpacity(0.1))
                                : (completed ? Colors.blue.withOpacity(0.1) : theme.colorScheme.secondary.withOpacity(0.1)),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            hasStarted
                                ? (completed ? Icons.check_circle : Icons.lock_clock)
                                : (completed ? Icons.edit : Icons.sports_cricket),
                            color: hasStarted
                                ? (completed ? Colors.green : Colors.orange)
                                : (completed ? Colors.blue : theme.colorScheme.secondary),
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
                                  color: !canPlay ? Colors.grey[600] : null,
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
                                  if (m.time != null && m.time!.isNotEmpty && m.time != 'TBD') ...[
                                    const SizedBox(width: 8),
                                    Icon(
                                      Icons.access_time,
                                      size: 14,
                                      color: Colors.grey[600],
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      m.time!,
                                      style: theme.textTheme.bodySmall?.copyWith(
                                        color: Colors.grey[600],
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ],
                          ),
                        ),
                        if (showDone)
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
                        else if (hasStarted && !completed)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  Colors.orange.withOpacity(0.15),
                                  Colors.orange.withOpacity(0.08),
                                ],
                              ),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: Colors.orange.withOpacity(0.4),
                                width: 1.5,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.lock,
                                    size: 16, color: Colors.orange),
                                const SizedBox(width: 4),
                                const Text(
                                  'Started',
                                  style: TextStyle(
                                    color: Colors.orange,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          )
                        else if (completed && !hasStarted)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  Colors.blue.withOpacity(0.15),
                                  Colors.blue.withOpacity(0.08),
                                ],
                              ),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: Colors.blue.withOpacity(0.4),
                                width: 1.5,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.edit,
                                    size: 16, color: Colors.blue),
                                const SizedBox(width: 4),
                                const Text(
                                  'Edit',
                                  style: TextStyle(
                                    color: Colors.blue,
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
    return Column(
      children: [
        // Back button header
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 16, 0),
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () {
                  final gameProvider =
                      Provider.of<GameProvider>(context, listen: false);
                  gameProvider.clearMatchSelection();
                },
              ),
              Text(
                'Select Match',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
        // Match ready screen content
        Expanded(
          child: SingleChildScrollView(
            child: Center(
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
                                  color: Colors.grey[800],
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '${gameProvider.questions.length} Questions',
                                  style: TextStyle(
                                    color: Colors.grey[800],
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 32),
                          if (gameProvider.questions.isEmpty)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 16),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: theme.colorScheme.primary,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    'Loading questions...',
                                    style: TextStyle(
                                      color: Colors.grey[600],
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ElevatedButton.icon(
                            onPressed: gameProvider.questions.isEmpty
                                ? null
                                : () => _startGame(context),
                            icon: const Icon(Icons.play_arrow, size: 28),
                            label: const Text(
                              'Start Game',
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
            ),
          ),
        ),
      ],
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
    final theme = Theme.of(context);

    if (question == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return Column(
      children: [
        // Back button header
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 16, 0),
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () {
                  final gameProvider =
                      Provider.of<GameProvider>(context, listen: false);
                  gameProvider.clearMatchSelection();
                },
              ),
              Expanded(
                child: Text(
                  gameProvider.selectedMatch?.name ?? 'Match',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
        // Game screen content
        Expanded(
          child: SingleChildScrollView(
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
          ),
        ),
      ],
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
              onTap: () {
                // Allow changing the selected option until the user submits
                gameProvider.answerQuestion(question.id, option);
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
                  color: null,
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
                            : Colors.grey.shade200,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        selectedAnswer == option
                            ? Icons.check_circle
                            : Icons.radio_button_unchecked,
                        color: selectedAnswer == option
                            ? Colors.white
                            : Colors.grey,
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
    
    // No freeze logic needed - day-level control (greyed out days) is sufficient
    // Once a user selects a day, they can play without restrictions
    final isFrozen = false;

    return Column(
      children: [
        if (isFrozen)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: Colors.orange.shade50,
              border: Border.all(color: Colors.orange.shade300),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(Icons.lock_clock, color: Colors.orange.shade700, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Game is frozen until the first match of the day starts',
                    style: TextStyle(
                      color: Colors.orange.shade900,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        Row(
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
              onPressed: (selectedAnswer == null || isFrozen)
                  ? null
                  : () async {
                      final auth =
                          Provider.of<AuthProvider>(context, listen: false);
                      if (gameProvider.currentQuestionIndex <
                          gameProvider.questions.length - 1) {
                        gameProvider.nextQuestion();
                      } else {
                        // Final question answered: attempt to save predictions and mark match complete
                        final saved =
                            await _submitScore(context, gameProvider.totalScore);
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
        ),
      ],
    );
  }
}
