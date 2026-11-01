import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/live_score.dart';
import '../../models/tournament.dart';
import '../../providers/admin_provider.dart';
import '../../providers/game_provider.dart';
import '../../services/cricheroes_live_service.dart';
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
  final CricHeroesLiveService _cricheroes = CricHeroesLiveService();
  String _filter = 'all';
  CricHeroesLiveConfig _liveConfig = CricHeroesLiveConfig.empty;
  bool _configLoaded = false;
  Stream<LiveScore>? _feedStream;

  CricHeroesFeedMatch? get _testFeed =>
      _liveConfig.enabled && _liveConfig.matches.isNotEmpty
          ? _liveConfig.matches.first
          : null;

  @override
  void initState() {
    super.initState();
    _cricheroes.loadConfig().then((config) {
      if (!mounted) return;
      final feed = config.enabled && config.matches.isNotEmpty
          ? config.matches.first
          : null;
      setState(() {
        _liveConfig = config;
        _configLoaded = true;
        _feedStream = feed == null
            ? null
            : _cricheroes.watchMatch(
                feed.cricheroesMatchId,
                interval: config.pollInterval,
              );
      });
    });
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
          dayName: score.dayName ?? item.day.name,
          initial: score,
        ),
      ),
    );
  }

  _LiveMatch _feedItem(CricHeroesFeedMatch feed, LiveScore score) {
    return _LiveMatch(
      day: Tournament(
        id: 'cricheroes',
        name: score.dayName ?? feed.label ?? 'CricHeroes',
        matches: const [],
      ),
      match: MatchInfo(
        id: feed.matchId,
        name: '${score.team1} vs ${score.team2}',
        date: DateTime.now().toIso8601String(),
        questionFile: 'assets/config/prediction_bank.json',
        time: score.matchTime,
        category: 'cricheroes',
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final game = Provider.of<GameProvider>(context);
    final isAdmin = Provider.of<AdminProvider>(context).isAdmin;

    if (!game.tournamentsLoaded || !_configLoaded) {
      return const Center(child: CircularProgressIndicator());
    }

    return StreamBuilder<Map<String, LiveScore>>(
      stream: _scoreService.watchScores(),
      builder: (context, snapshot) {
        final scores = Map<String, LiveScore>.from(snapshot.data ?? {});
        final weekendMatches = scores.values
            .where((score) => score.isWeekendMatch)
            .toList()
          ..sort((a, b) => '${a.team1}${a.team2}'.compareTo('${b.team1}${b.team2}'));
        final sourceMatches = _liveConfig.includeAppFixtures
            ? _allMatches(game.tournaments, scores)
            : _allMatches(const [], scores);
        final matches = sourceMatches.where((item) {
          final score = _scoreFor(item, scores);
          if (score.isWeekendMatch && !score.weekendSheetsReady) return false;
          if (_filter == 'weekend') return false;
          if (_filter == 'all') return true;
          return score.status == _filter;
        }).toList();

        final seenIds = matches.map((item) => item.match.id).toSet();
        for (final score in scores.values) {
          if (!score.isCricHeroes || seenIds.contains(score.matchId)) continue;
          seenIds.add(score.matchId);
          matches.insert(
            0,
            _LiveMatch(
              day: Tournament(
                id: 'cricheroes',
                name: score.dayName ?? 'CricHeroes',
                matches: const [],
              ),
              match: MatchInfo(
                id: score.matchId,
                name: '${score.team1} vs ${score.team2}',
                date: DateTime.now().toIso8601String(),
                questionFile: 'assets/config/prediction_bank.json',
                time: score.matchTime,
                category: 'cricheroes',
              ),
            ),
          );
        }

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
                  : _buildMatchList(
                      theme: theme,
                      isAdmin: isAdmin,
                      matches: matches,
                      scores: scores,
                    ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildMatchList({
    required ThemeData theme,
    required bool isAdmin,
    required List<_LiveMatch> matches,
    required Map<String, LiveScore> scores,
  }) {
    final feed = _testFeed;
    if (feed == null) {
      if (matches.isEmpty) {
        return Center(
          child: Text(
            'No matches to show',
            style: theme.textTheme.bodyLarge?.copyWith(color: Colors.grey[600]),
          ),
        );
      }
      return ListView.builder(
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
      );
    }

    return StreamBuilder<LiveScore>(
      stream: _feedStream,
      builder: (context, snapshot) {
        final feedScore = snapshot.data;
        final cards = <Widget>[];
        if (snapshot.hasError && feedScore == null) {
          cards.add(
            Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: ListTile(
                leading: const Icon(Icons.wifi_off),
                title: Text(feed.label ?? 'CricHeroes live test'),
                subtitle: Text('Could not load live score. ${snapshot.error}'),
              ),
            ),
          );
        } else if (feedScore != null) {
          final statusOk = _filter == 'all' || feedScore.status == _filter;
          if (statusOk) {
            final item = _feedItem(feed, feedScore);
            cards.add(
              _ScoreCard(
                dayName: feedScore.dayName ?? feed.label ?? 'CricHeroes',
                match: item.match,
                score: feedScore,
                isAdmin: isAdmin,
                onOpen: () => _openMatch(item, feedScore),
              ),
            );
          }
        } else {
          cards.add(
            const Padding(
              padding: EdgeInsets.only(bottom: 16),
              child: Center(child: CircularProgressIndicator()),
            ),
          );
        }

        if (matches.isEmpty && cards.isEmpty) {
          return Center(
            child: Text(
              'No matches to show',
              style: theme.textTheme.bodyLarge?.copyWith(color: Colors.grey[600]),
            ),
          );
        }

        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          children: [
            ...cards,
            for (final item in matches)
              _ScoreCard(
                dayName: item.day.name,
                match: item.match,
                score: _scoreFor(item, scores),
                isAdmin: isAdmin,
                onOpen: () => _openMatch(item, _scoreFor(item, scores)),
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
                  if (score.isCricHeroes) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.teal.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.teal.shade200),
                      ),
                      child: Text(
                        'CRICHEROES',
                        style: TextStyle(
                          color: Colors.teal.shade800,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
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
                score.isCricHeroes
                    ? 'Open live CricHeroes scorecard'
                    : isAdmin
                        ? 'Open scoreboard to score'
                        : 'Open full scorecard',
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
