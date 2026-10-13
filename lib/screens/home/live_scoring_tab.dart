import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/live_score.dart';
import '../../models/tournament.dart';
import '../../providers/admin_provider.dart';
import '../../providers/game_provider.dart';
import '../../services/live_score_service.dart';
import 'scoreboard/match_scoreboard_screen.dart';
import 'weekend/weekend_setup_view.dart';

class LiveScoringTab extends StatefulWidget {
  const LiveScoringTab({super.key});

  @override
  State<LiveScoringTab> createState() => _LiveScoringTabState();
}

class _LiveScoringTabState extends State<LiveScoringTab> {
  final LiveScoreService _scoreService = LiveScoreService();
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final game = Provider.of<GameProvider>(context, listen: false);
      if (!game.tournamentsLoaded) {
        game.loadTournaments();
      }
    });
  }

  List<_LiveMatch> _allMatches(
    List<Tournament> tournaments,
    Map<String, LiveScore> scores,
  ) {
    final matches = <_LiveMatch>[];
    final seen = <String>{};
    for (final tournament in tournaments) {
      for (final match in tournament.matches) {
        matches.add(_LiveMatch(day: tournament, match: match));
        seen.add(match.id);
      }
    }
    for (final score in scores.values) {
      if (!score.isWeekendMatch || seen.contains(score.matchId)) continue;
      matches.add(
        _LiveMatch(
          day: Tournament(
            id: 'weekend',
            name: score.dayName ?? 'Weekend',
            matches: const [],
          ),
          match: MatchInfo(
            id: score.matchId,
            name: '${score.team1} vs ${score.team2}',
            date: score.dayName ?? '',
            questionFile: 'assets/config/prediction_bank.json',
            time: score.matchTime,
            category: 'weekend',
          ),
        ),
      );
    }
    return matches;
  }

  LiveScore _scoreFor(_LiveMatch item, Map<String, LiveScore> scores) {
    final existing = scores[item.match.id];
    if (existing != null) return existing;
    final parts =
        item.match.name.split(RegExp(r'\s+vs\s+', caseSensitive: false));
    return LiveScore(
      matchId: item.match.id,
      team1: parts.isNotEmpty ? parts.first.trim() : item.match.name,
      team2: parts.length > 1 ? parts[1].trim() : 'TBD',
      dayName: item.day.name,
      matchTime: item.match.time,
    );
  }

  void _openMatch(_LiveMatch item, LiveScore score) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => MatchScoreboardScreen(
          match: item.match,
          dayName: item.day.name,
          initial: score,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final game = Provider.of<GameProvider>(context);
    final isAdmin = Provider.of<AdminProvider>(context).isAdmin;

    if (!game.tournamentsLoaded) {
      return const Center(child: CircularProgressIndicator());
    }

    return StreamBuilder<Map<String, LiveScore>>(
      stream: _scoreService.watchScores(),
      builder: (context, snapshot) {
        final scores = snapshot.data ?? {};
        final weekendMatches = scores.values
            .where((score) => score.isWeekendMatch)
            .toList()
          ..sort((a, b) => '${a.team1}${a.team2}'.compareTo('${b.team1}${b.team2}'));
        final matches = _allMatches(game.tournaments, scores).where((item) {
          final score = _scoreFor(item, scores);
          if (score.isWeekendMatch && !score.weekendSheetsReady) return false;
          if (_filter == 'weekend') return false;
          if (_filter == 'all') return true;
          return score.status == _filter;
        }).toList();

        matches.sort((a, b) {
          final aScore = _scoreFor(a, scores);
          final bScore = _scoreFor(b, scores);
          final aWeekend = aScore.isWeekendMatch && aScore.weekendSheetsReady;
          final bWeekend = bScore.isWeekendMatch && bScore.weekendSheetsReady;
          if (aWeekend != bWeekend) return aWeekend ? -1 : 1;
          const order = {'live': 0, 'upcoming': 1, 'completed': 2};
          final as = order[aScore.status] ?? 3;
          final bs = order[bScore.status] ?? 3;
          if (as != bs) return as.compareTo(bs);
          return a.match.date.compareTo(b.match.date);
        });

        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _FilterChip(
                      label: 'All',
                      selected: _filter == 'all',
                      onTap: () => setState(() => _filter = 'all'),
                    ),
                    _FilterChip(
                      label: 'Live',
                      selected: _filter == 'live',
                      color: Colors.red,
                      onTap: () => setState(() => _filter = 'live'),
                    ),
                    _FilterChip(
                      label: 'Upcoming',
                      selected: _filter == 'upcoming',
                      onTap: () => setState(() => _filter = 'upcoming'),
                    ),
                    _FilterChip(
                      label: 'Weekend',
                      selected: _filter == 'weekend',
                      color: Colors.indigo,
                      onTap: () => setState(() => _filter = 'weekend'),
                    ),
                    _FilterChip(
                      label: 'Completed',
                      selected: _filter == 'completed',
                      onTap: () => setState(() => _filter = 'completed'),
                    ),
                  ],
                ),
              ),
            ),
            Expanded(
              child: _filter == 'weekend'
                  ? WeekendSetupView(
                      matches: weekendMatches,
                      isAdmin: isAdmin,
                    )
                  : matches.isEmpty
                      ? Center(
                          child: Text(
                            'No matches to show',
                            style: theme.textTheme.bodyLarge
                                ?.copyWith(color: Colors.grey[600]),
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                          itemCount: matches.length,
                          itemBuilder: (context, index) {
                            final item = matches[index];
                            final score = _scoreFor(item, scores);
                            return _ScoreCard(
                              dayName: item.day.name,
                              match: item.match,
                              score: score,
                              isAdmin: isAdmin,
                              onOpen: () => _openMatch(item, score),
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

class _LiveMatch {
  final Tournament day;
  final MatchInfo match;
  _LiveMatch({required this.day, required this.match});
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final Color? color;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final active = color ?? theme.colorScheme.primary;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onTap(),
        selectedColor: active.withOpacity(0.2),
        labelStyle: TextStyle(
          color: selected ? active : Colors.grey[700],
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _ScoreCard extends StatelessWidget {
  final String dayName;
  final MatchInfo match;
  final LiveScore score;
  final bool isAdmin;
  final VoidCallback onOpen;

  const _ScoreCard({
    required this.dayName,
    required this.match,
    required this.score,
    required this.isAdmin,
    required this.onOpen,
  });

  Color _statusColor() {
    switch (score.status) {
      case 'live':
        return Colors.red;
      case 'completed':
        return Colors.green;
      default:
        return Colors.orange;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final statusColor = _statusColor();
    final inn = score.liveInnings;

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
                    dayName,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: Colors.grey[600],
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  if (match.time != null)
                    Text(
                      match.time!,
                      style: theme.textTheme.bodySmall
                          ?.copyWith(color: Colors.grey[600]),
                    ),
                  const SizedBox(width: 8),
                  if (score.isWeekendMatch) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.indigo.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.indigo.shade200),
                      ),
                      child: Text(
                        'WEEKEND',
                        style: TextStyle(
                          color: Colors.indigo.shade700,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
              const SizedBox(height: 12),
              _teamRow(
                score.team1,
                score.team1ScoreLine,
                batting: score.status == 'live' && score.battingSide == 1,
              ),
              const SizedBox(height: 8),
              _teamRow(
                score.team2,
                score.team2ScoreLine,
                batting: score.status == 'live' && score.battingSide == 2,
              ),
              if (inn != null && score.isLive) ...[
                const SizedBox(height: 8),
                Text(
                  '${inn.striker} ${inn.batterNamed(inn.striker)?.runs ?? 0}*  •  ${inn.currentBowler}',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: Colors.grey[700]),
                ),
              ],
              if (score.result != null && score.result!.isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(
                  score.result!,
                  style: TextStyle(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
              const SizedBox(height: 8),
              Text(
                isAdmin ? 'Open scoreboard to score' : 'Open full scorecard',
                style: theme.textTheme.bodySmall
                    ?.copyWith(color: Colors.grey[500]),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _teamRow(String name, String scoreLine, {required bool batting}) {
    return Row(
      children: [
        if (batting)
          const Padding(
            padding: EdgeInsets.only(right: 6),
            child: Icon(Icons.sports_cricket, size: 16, color: Colors.red),
          ),
        Expanded(
          child: Text(
            name,
            style: TextStyle(
              fontWeight: batting ? FontWeight.w800 : FontWeight.w600,
              fontSize: 15,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        Text(
          scoreLine,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
      ],
    );
  }
}
