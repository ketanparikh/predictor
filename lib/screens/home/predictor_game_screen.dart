import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/game_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/leaderboard_entry.dart';
import '../../services/leaderboard_service.dart';
import '../../models/tournament.dart';

class PredictorGameScreen extends StatelessWidget {
  const PredictorGameScreen({super.key});

  void _startGame(BuildContext context) {
    final gameProvider = Provider.of<GameProvider>(context, listen: false);
    gameProvider.startGame();
  }

  Future<void> _submitScore(BuildContext context, int score) async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final userId = authProvider.user?.uid;
    final userName = authProvider.user?.displayName ?? 
                     authProvider.user?.email?.split('@').first ?? 
                     'User';
    final tournamentId = Provider.of<GameProvider>(context, listen: false)
            .selectedTournament
            ?.id ??
        'unknown';

    if (userId != null) {
      final leaderboardService = LeaderboardService();
      await leaderboardService.saveScore(
        LeaderboardEntry(
          userId: userId,
          userName: userName,
          score: score,
          timestamp: DateTime.now(),
          tournamentId: tournamentId,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<GameProvider>(
      builder: (context, gameProvider, child) {
        // Ensure completed matches are loaded for this user
        final auth = Provider.of<AuthProvider>(context);
        if (auth.user != null && gameProvider.completedMatchIds.isEmpty && gameProvider.tournamentsLoaded) {
          WidgetsBinding.instance.addPostFrameCallback((_) async {
            await Provider.of<GameProvider>(context, listen: false)
                .loadCompletedMatchesForUser(auth.user!.uid);
          });
        }

        // Step 1: Choose Tournament
        if (gameProvider.selectedTournament == null) {
          return _buildTournamentList(context, gameProvider.tournaments, gameProvider.tournamentsLoaded);
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

  Widget _buildTournamentList(BuildContext context, List<Tournament> tournaments, bool loaded) {
    final theme = Theme.of(context);
    if (!loaded) {
      return const Center(child: CircularProgressIndicator());
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: tournaments.length,
      itemBuilder: (context, index) {
        final t = tournaments[index];
        return Card(
          child: ListTile(
            leading: Icon(Icons.emoji_events, color: theme.colorScheme.primary),
            title: Text(t.name, style: const TextStyle(fontWeight: FontWeight.w600)),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              final gameProvider = Provider.of<GameProvider>(context, listen: false);
              gameProvider.selectTournament(t);
            },
          ),
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
                  final gameProvider = Provider.of<GameProvider>(context, listen: false);
                  gameProvider.clearTournamentSelection();
                },
              ),
              Text(
                tournament.name,
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
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
              final completed = gameProvider.completedMatchIds.contains(m.id);
              return Card(
                child: ListTile(
                  leading: Icon(Icons.sports_cricket, color: theme.colorScheme.secondary),
                  title: Text(m.name),
                  subtitle: Text(m.date),
                  trailing: completed
                      ? Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.green.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.green.withOpacity(0.4)),
                          ),
                          child: const Text('Completed', style: TextStyle(color: Colors.green, fontWeight: FontWeight.w600)),
                        )
                      : const Icon(Icons.chevron_right),
                  enabled: !completed,
                  onTap: completed
                      ? null
                      : () async {
                          final gp = Provider.of<GameProvider>(context, listen: false);
                          await gp.selectMatch(m);
                        },
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
          elevation: 6,
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.sports_cricket, size: 72, color: theme.colorScheme.primary),
                const SizedBox(height: 12),
                Text(match.name, style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(match.date, style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey[600])),
                const SizedBox(height: 16),
                Text('Questions loaded from config: ${match.questionFile}', style: theme.textTheme.bodySmall),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () => _startGame(context),
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('Start Match'),
                ),
              ],
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

  Widget _buildInfoChip(BuildContext context, IconData icon, String text, Color color) {
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
    final progress = (gameProvider.currentQuestionIndex + 1) / 
                     gameProvider.questions.length;
    
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
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${question.points} pts',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  question.category,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              question.question,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
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
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: selectedAnswer == option
                        ? Theme.of(context).colorScheme.primary
                        : Colors.grey.shade300,
                    width: selectedAnswer == option ? 2 : 1,
                  ),
                  borderRadius: BorderRadius.circular(12),
                  color: selectedAnswer != null
                      ? Theme.of(context).disabledColor.withOpacity(0.06)
                      : (selectedAnswer == option
                          ? Theme.of(context).colorScheme.primary.withOpacity(0.1)
                          : null),
                ),
                child: Row(
                  children: [
                    Icon(
                      selectedAnswer == option
                          ? Icons.check_circle
                          : (selectedAnswer != null ? Icons.lock : Icons.radio_button_unchecked),
                      color: selectedAnswer == option
                          ? Theme.of(context).colorScheme.primary
                          : (selectedAnswer != null ? Colors.grey : Colors.grey),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        option,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: selectedAnswer == option ? FontWeight.w600 : FontWeight.normal,
                          color: selectedAnswer != null ? Colors.grey[700] : null,
                        ),
                      ),
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
    final selectedAnswer = question != null 
        ? gameProvider.userAnswers[question.id] 
        : null;

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
          onPressed: selectedAnswer == null ? null : () async {
            if (gameProvider.currentQuestionIndex < gameProvider.questions.length - 1) {
              gameProvider.nextQuestion();
            } else {
              // Final question answered: mark match complete and return to options
              final auth = Provider.of<AuthProvider>(context, listen: false);
              if (auth.user != null) {
                await Provider.of<GameProvider>(context, listen: false)
                    .markCurrentMatchCompletedForUser(auth.user!.uid);
              }
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Responses submitted.')),
              );
              gameProvider.resetGame();
              Provider.of<GameProvider>(context, listen: false).clearTournamentSelection();
            }
          },
          child: Text(
            gameProvider.currentQuestionIndex < gameProvider.questions.length - 1
                ? 'Next Question'
                : 'Submit',
          ),
        ),
      ],
    );
  }
}

