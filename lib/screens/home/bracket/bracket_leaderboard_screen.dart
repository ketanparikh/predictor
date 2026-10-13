import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../models/bracket.dart';
import '../../../models/live_score.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/game_provider.dart';
import '../../../services/bracket_engine.dart';
import '../../../services/bracket_seed.dart';
import '../../../services/bracket_service.dart';
import '../../../services/live_score_service.dart';
import '../../../services/points_table_calculator.dart';

class BracketLeaderboardScreen extends StatefulWidget {
  const BracketLeaderboardScreen({super.key});

  @override
  State<BracketLeaderboardScreen> createState() =>
      _BracketLeaderboardScreenState();
}

class _BracketLeaderboardScreenState extends State<BracketLeaderboardScreen> {
  final _service = BracketService();
  final _scores = LiveScoreService();
  Map<String, List<Map<String, dynamic>>> _seed = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final game = Provider.of<GameProvider>(context, listen: false);
      if (!game.tournamentsLoaded) game.loadTournaments();
    });
    try {
      _seed = await loadBracketSeed();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  List<_BoardRow> _rows({
    required Map<String, List<BracketPicks>> byCategory,
    required Map<String, LiveScore> scores,
    required GameProvider game,
  }) {
    final live = PointsTableCalculator.merge(
      seedByCategory: _seed,
      scores: scores.values,
    );
    final totals = <String, _BoardRow>{};

    for (final layout in BracketLayout.categories) {
      final seed = _seed[layout.categoryId] ?? [];
      final matches = BracketEngine.categoryMatches(
        layout: layout,
        seed: seed,
        tournaments: game.tournaments,
      );
      final officialRanks = BracketEngine.officialRanks(
        layout,
        live[layout.categoryId] ?? seed,
      );
      final officialWinners = BracketEngine.officialWinners(
        layout: layout,
        ranks: officialRanks,
        scores: scores.values,
        adminWinners: const {},
      );
      for (final picks in byCategory[layout.categoryId] ?? const <BracketPicks>[]) {
        final score = BracketEngine.scorePicks(
          layout: layout,
          picks: picks,
          officialRankMap: officialRanks,
          officialWinnerMap: officialWinners,
          matches: matches,
          scores: scores,
        );
        final existing = totals[picks.userId];
        if (existing == null) {
          totals[picks.userId] = _BoardRow(
            userId: picks.userId,
            name: picks.userName,
            score: score,
          );
        } else {
          totals[picks.userId] = _BoardRow(
            userId: picks.userId,
            name: picks.userName.isNotEmpty ? picks.userName : existing.name,
            score: existing.score + score,
          );
        }
      }
    }

    final rows = totals.values.toList()
      ..sort((a, b) => b.score.points.compareTo(a.score.points));
    return rows;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final auth = Provider.of<AuthProvider>(context);
    final game = Provider.of<GameProvider>(context);

    if (_loading || !game.tournamentsLoaded) {
      return const Center(child: CircularProgressIndicator());
    }

    return StreamBuilder<Map<String, LiveScore>>(
      stream: _scores.watchScores(),
      builder: (context, scoreSnap) {
        final scores = scoreSnap.data ?? {};
        return StreamBuilder<Map<String, List<BracketPicks>>>(
          stream: _service.watchAllPicks(),
          builder: (context, picksSnap) {
            final rows = _rows(
              byCategory: picksSnap.data ?? const {},
              scores: scores,
              game: game,
            );
            if (rows.isEmpty) {
              return Center(
                child: Text(
                  'No bracket picks yet.\nPlay a category to appear here.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey[600]),
                ),
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
              itemCount: rows.length + 1,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, index) {
                if (index == 0) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      'Correct pick +10 • Wrong pick −5\nTotals include Men’s, Women’s, Boys and Girls.',
                      style: theme.textTheme.bodyMedium
                          ?.copyWith(color: Colors.grey[700]),
                    ),
                  );
                }
                final row = rows[index - 1];
                final mine = row.userId == auth.user?.uid;
                final sign = row.score.points > 0 ? '+' : '';
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: CircleAvatar(
                    backgroundColor: mine
                        ? theme.colorScheme.primary
                        : Colors.indigo.shade100,
                    foregroundColor:
                        mine ? Colors.white : Colors.indigo.shade900,
                    child: Text('$index'),
                  ),
                  title: Text(
                    row.name,
                    style: TextStyle(
                      fontWeight: mine ? FontWeight.w800 : FontWeight.w600,
                    ),
                  ),
                  subtitle: Text(
                    '${row.score.correct} correct • ${row.score.wrong} wrong',
                  ),
                  trailing: Text(
                    '$sign${row.score.points}',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: row.score.points < 0
                          ? Colors.red.shade700
                          : theme.colorScheme.primary,
                    ),
                  ),
                );
              },
            );
          },
        );
      },
    );
  }
}

class _BoardRow {
  final String userId;
  final String name;
  final BracketScore score;

  const _BoardRow({
    required this.userId,
    required this.name,
    required this.score,
  });
}
