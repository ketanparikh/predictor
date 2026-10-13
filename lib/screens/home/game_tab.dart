import 'package:flutter/material.dart';

import '../../widgets/game_page.dart';
import 'bracket/bracket_tab.dart';
import 'fantasy/fantasy_tab.dart';
import 'predictor_game_screen.dart';

class GameTab extends StatelessWidget {
  const GameTab({super.key});

  void _open(BuildContext context, {required String title, required Widget body}) {
    pushGamePage(context, title: title, body: body);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        Text(
          'Games',
          style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        Text(
          'Pick a game to play. Each one has its own leaderboard and prizes.',
          style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey[600]),
        ),
        const SizedBox(height: 20),
        _GameTile(
          icon: Icons.quiz_outlined,
          title: 'Predictor',
          subtitle: 'Answer match questions and climb the board',
          colors: const [Color(0xFFFF6A00), Color(0xFFE10600)],
          onTap: () => _open(
            context,
            title: 'Predictor',
            body: const PredictorGameScreen(),
          ),
        ),
        const SizedBox(height: 14),
        _GameTile(
          icon: Icons.account_tree_outlined,
          title: 'Bracket Challenge',
          subtitle: 'Pick league winners and fill the knockout bracket',
          colors: const [Color(0xFF071A2B), Color(0xFF0B3D2E)],
          onTap: () => _open(
            context,
            title: 'Bracket Challenge',
            body: const BracketTab(),
          ),
        ),
        const SizedBox(height: 14),
        _GameTile(
          icon: Icons.groups_3_outlined,
          title: 'Fantasy League',
          subtitle: 'Build a Dream11-style XI for every match',
          colors: const [Color(0xFF00C853), Color(0xFF071A2B)],
          onTap: () => _open(
            context,
            title: 'Fantasy League',
            body: const FantasyTab(),
          ),
        ),
      ],
    );
  }
}

class _GameTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final List<Color> colors;
  final VoidCallback onTap;

  const _GameTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.colors,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Ink(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: colors,
            ),
            boxShadow: [
              BoxShadow(
                color: colors.last.withValues(alpha: 0.28),
                blurRadius: 12,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: Colors.white, size: 32),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.9),
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Colors.white, size: 28),
            ],
          ),
        ),
      ),
    );
  }
}
