import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../models/fantasy.dart';
import '../../../models/live_score.dart';
import '../../../models/tournament.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/game_provider.dart';
import '../../../services/fantasy_engine.dart';
import '../../../services/fantasy_service.dart';
import '../../../services/live_score_service.dart';
import '../../../utils/match_teams.dart';
import 'fantasy_team_screen.dart';

class FantasyTab extends StatefulWidget {
  const FantasyTab({super.key});

  @override
  State<FantasyTab> createState() => _FantasyTabState();
}

class _FantasyTabState extends State<FantasyTab> {
  final _scores = LiveScoreService();
  final _fantasy = FantasyService();
  String _filter = 'all';

  List<_FantasyMatch> _matches(List<Tournament> tournaments) {
    final items = <_FantasyMatch>[];
    for (final day in tournaments) {
      for (final match in day.matches) {
        items.add(_FantasyMatch(day: day, match: match));
      }
    }
    return items;
  }

  LiveScore _scoreFor(_FantasyMatch item, Map<String, LiveScore> scores) {
    final existing = scores[item.match.id];
    if (existing != null) return existing;
    final parts = splitMatchTeams(item.match.name);
    return LiveScore(
      matchId: item.match.id,
      team1: parts.isNotEmpty ? parts.first : item.match.name,
      team2: parts.length > 1 ? parts[1] : 'TBD',
      dayName: item.day.name,
      matchTime: item.match.time,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final game = Provider.of<GameProvider>(context);
    final auth = Provider.of<AuthProvider>(context);

    if (!game.tournamentsLoaded) {
      return const Center(child: CircularProgressIndicator());
    }

    return StreamBuilder<Map<String, LiveScore>>(
      stream: _scores.watchScores(),
      builder: (context, snapshot) {
        final scores = snapshot.data ?? {};
        final matches = _matches(game.tournaments).where((item) {
          final score = _scoreFor(item, scores);
          if (_filter == 'all') return true;
          return score.status == _filter;
        }).toList()
          ..sort((a, b) {
            const order = {'live': 0, 'upcoming': 1, 'completed': 2};
            final as = order[_scoreFor(a, scores).status] ?? 3;
            final bs = order[_scoreFor(b, scores).status] ?? 3;
            if (as != bs) return as.compareTo(bs);
            return a.match.date.compareTo(b.match.date);
          });

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Fantasy League',
                    style: theme.textTheme.headlineSmall
                        ?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Pick 11 players, 100 credits. Captain scores 2x, vice-captain 1.5x. Points follow live scoring.',
                    style: theme.textTheme.bodyMedium
                        ?.copyWith(color: Colors.grey[600]),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    for (final filter in [
                      ('all', 'All', null),
                      ('upcoming', 'Open', Colors.orange),
                      ('live', 'Live', Colors.red),
                      ('completed', 'Completed', Colors.green),
                    ])
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(filter.$2),
                          selected: _filter == filter.$1,
                          selectedColor: (filter.$3 ?? theme.colorScheme.primary)
                              .withValues(alpha: 0.2),
                          onSelected: (_) => setState(() => _filter = filter.$1),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            Expanded(
              child: matches.isEmpty
                  ? Center(
                      child: Text(
                        'No matches to show',
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                      itemCount: matches.length,
                      itemBuilder: (context, index) {
                        final item = matches[index];
                        final score = _scoreFor(item, scores);
                        return _MatchCard(
                          item: item,
                          score: score,
                          userId: auth.user?.uid,
                          fantasy: _fantasy,
                          onOpen: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => FantasyTeamScreen(
                                  match: item.match,
                                  dayName: item.day.name,
                                  score: score,
                                ),
                              ),
                            );
                          },
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }
}

class _FantasyMatch {
  final Tournament day;
  final MatchInfo match;
  _FantasyMatch({required this.day, required this.match});
}

class _MatchCard extends StatelessWidget {
  final _FantasyMatch item;
  final LiveScore score;
  final String? userId;
  final FantasyService fantasy;
  final VoidCallback onOpen;

  const _MatchCard({
    required this.item,
    required this.score,
    required this.userId,
    required this.fantasy,
    required this.onOpen,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Color statusColor;
    switch (score.status) {
      case 'live':
        statusColor = Colors.red;
        break;
      case 'completed':
        statusColor = Colors.green;
        break;
      default:
        statusColor = Colors.orange;
    }

    Widget body({FantasyEntry? mine, double? points}) {
      return Card(
        margin: const EdgeInsets.only(bottom: 12),
        child: InkWell(
          onTap: onOpen,
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      item.day.name,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: Colors.grey[600],
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const Spacer(),
                    if (item.match.time != null)
                      Text(
                        item.match.time!,
                        style: theme.textTheme.bodySmall
                            ?.copyWith(color: Colors.grey[600]),
                      ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        score.status.toUpperCase(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  '${score.team1} vs ${score.team2}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  mine == null
                      ? (score.status == 'upcoming'
                          ? 'Pick your XI • 100 credits'
                          : 'No XI submitted')
                      : points == null
                          ? 'XI saved • C: ${mine.captain}'
                          : '${points.toStringAsFixed(1)} pts • C: ${mine.captain}',
                  style: TextStyle(color: Colors.grey[700]),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (userId == null) return body();

    return StreamBuilder<FantasyEntry?>(
      stream: fantasy.watchEntry(item.match.id, userId!),
      builder: (context, snap) {
        final mine = snap.data;
        double? points;
        if (mine != null && score.hasStarted) {
          points = FantasyEngine.score(score, mine).total;
        }
        return body(mine: mine, points: points);
      },
    );
  }
}
