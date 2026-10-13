import 'package:flutter/material.dart';

import '../../../widgets/game_page.dart';
import 'bracket_leaderboard_screen.dart';
import 'bracket_play_screen.dart';

class BracketTab extends StatelessWidget {
  const BracketTab({super.key});

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
          'Choose a category',
          style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        Text(
          'Pick winners on the schedule. Correct +10, wrong −5. Leaderboard totals every category.',
          style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey[600]),
        ),
        const SizedBox(height: 20),
        _HubTile(
          icon: Icons.sports_cricket,
          title: "Men's",
          subtitle: 'League matches, group table and knockout',
          colors: const [Color(0xFF1565C0), Color(0xFF0D47A1)],
          onTap: () => _open(
            context,
            title: "Men's Bracket",
            body: const BracketPlayScreen(categoryId: 'mens'),
          ),
        ),
        const SizedBox(height: 12),
        _HubTile(
          icon: Icons.sports_cricket,
          title: "Women's",
          subtitle: 'All scheduled matches and knockout',
          colors: const [Color(0xFFAD1457), Color(0xFF880E4F)],
          onTap: () => _open(
            context,
            title: "Women's Bracket",
            body: const BracketPlayScreen(categoryId: 'womens'),
          ),
        ),
        const SizedBox(height: 12),
        _HubTile(
          icon: Icons.sports_cricket,
          title: 'Boys',
          subtitle: 'All scheduled matches and knockout',
          colors: const [Color(0xFF2E7D32), Color(0xFF1B5E20)],
          onTap: () => _open(
            context,
            title: 'Boys Bracket',
            body: const BracketPlayScreen(categoryId: 'boys'),
          ),
        ),
        const SizedBox(height: 12),
        _HubTile(
          icon: Icons.sports_cricket,
          title: 'Girls',
          subtitle: 'All scheduled matches and knockout',
          colors: const [Color(0xFF6A1B9A), Color(0xFF4A148C)],
          onTap: () => _open(
            context,
            title: 'Girls Bracket',
            body: const BracketPlayScreen(categoryId: 'girls'),
          ),
        ),
        const SizedBox(height: 12),
        _HubTile(
          icon: Icons.leaderboard,
          title: 'Leaderboard',
          subtitle: 'Cumulative points from every selection',
          colors: const [Color(0xFFF59E0B), Color(0xFFB45309)],
          onTap: () => _open(
            context,
            title: 'Bracket Leaderboard',
            body: const BracketLeaderboardScreen(),
          ),
        ),
      ],
    );
  }
}

class _HubTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final List<Color> colors;
  final VoidCallback onTap;

  const _HubTile({
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
          padding: const EdgeInsets.all(18),
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
                child: Icon(icon, color: Colors.white, size: 28),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
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
