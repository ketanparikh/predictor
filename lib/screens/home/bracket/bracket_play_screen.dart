import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../models/bracket.dart';
import '../../../models/live_score.dart';
import '../../../providers/admin_provider.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/game_provider.dart';
import '../../../services/bracket_engine.dart';
import '../../../services/bracket_seed.dart';
import '../../../services/bracket_service.dart';
import '../../../services/live_score_service.dart';
import '../../../services/points_table_calculator.dart';
import '../../../utils/match_teams.dart';

class BracketPlayScreen extends StatefulWidget {
  final String categoryId;
  const BracketPlayScreen({super.key, required this.categoryId});

  @override
  State<BracketPlayScreen> createState() => _BracketPlayScreenState();
}

class _BracketPlayScreenState extends State<BracketPlayScreen> {
  final _service = BracketService();
  final _scores = LiveScoreService();
  Map<String, List<Map<String, dynamic>>> _seed = {};
  bool _loading = true;
  BracketPicks? _draft;
  bool _hydrated = false;
  bool _saving = false;

  BracketLayout get _layout => BracketLayout.forId(widget.categoryId);

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

  Future<void> _persist(BracketPicks picks) async {
    if (picks.userId.isEmpty) return;
    setState(() => _saving = true);
    try {
      await _service.savePicks(widget.categoryId, picks);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not save: $e')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final auth = Provider.of<AuthProvider>(context);
    final isAdmin = Provider.of<AdminProvider>(context).isAdmin;
    final game = Provider.of<GameProvider>(context);

    if (_loading || !game.tournamentsLoaded) {
      return const Center(child: CircularProgressIndicator());
    }

    return StreamBuilder<Map<String, LiveScore>>(
      stream: _scores.watchScores(),
      builder: (context, scoreSnap) {
        final scores = scoreSnap.data ?? {};
        final seed = _seed[widget.categoryId] ?? [];
        final schedule = BracketEngine.categoryMatches(
          layout: _layout,
          seed: seed,
          tournaments: game.tournaments,
        );
        final league = BracketEngine.leagueMatches(
          layout: _layout,
          seed: seed,
          tournaments: game.tournaments,
        );
        final live = PointsTableCalculator.merge(
          seedByCategory: _seed,
          scores: scores.values,
        );
        final officialStandings = live[widget.categoryId] ?? seed;

        return StreamBuilder<BracketConfig>(
          stream: _service.watchConfig(widget.categoryId),
          builder: (context, configSnap) {
            final config = configSnap.data ?? const BracketConfig();
            return StreamBuilder<List<BracketPicks>>(
              stream: _service.watchPicks(widget.categoryId),
              builder: (context, picksSnap) {
                if (picksSnap.connectionState == ConnectionState.waiting &&
                    !_hydrated) {
                  return const Center(child: CircularProgressIndicator());
                }
                final allPicks = picksSnap.data ?? [];
                BracketPicks? saved;
                for (final pick in allPicks) {
                  if (pick.userId == auth.user?.uid) saved = pick;
                }
                if (!_hydrated) {
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    if (!mounted || _hydrated) return;
                    setState(() {
                      _hydrated = true;
                      _draft = saved ??
                          BracketPicks(
                            userId: auth.user?.uid ?? '',
                            userName: auth.sessionDisplayName,
                          );
                    });
                  });
                  return const Center(child: CircularProgressIndicator());
                }
                final picks = _draft ??
                    BracketPicks(
                      userId: auth.user?.uid ?? '',
                      userName: auth.sessionDisplayName,
                    );
                final effectiveWinners = BracketEngine.effectiveMatchWinners(
                  matches: league,
                  picks: picks.matchWinners,
                  scores: scores,
                );
                final predictedStandings = BracketEngine.predictedTable(
                  categoryId: _layout.categoryId,
                  seed: seed,
                  matches: league,
                  matchWinners: effectiveWinners,
                );
                final predictedRanks = BracketEngine.officialRanks(
                  _layout,
                  predictedStandings,
                );
                final displayPicks = picks.copyWith(
                  matchWinners: {
                    ...picks.matchWinners,
                    ...effectiveWinners,
                  },
                  ranks: predictedRanks,
                  winners: BracketEngine.pruneWinners(
                    picks.winners,
                    predictedRanks,
                    _layout,
                  ),
                );
                final officialRanks = BracketEngine.officialRanks(
                  _layout,
                  officialStandings,
                );
                final officialWinners = BracketEngine.officialWinners(
                  layout: _layout,
                  ranks: officialRanks,
                  scores: scores.values,
                  adminWinners: config.winners,
                );
                final myScore = BracketEngine.scorePicks(
                  layout: _layout,
                  picks: displayPicks,
                  officialRankMap: officialRanks,
                  officialWinnerMap: officialWinners,
                  matches: schedule,
                  scores: scores,
                );

                Future<void> apply(BracketPicks next) async {
                  setState(() => _draft = next);
                  await _persist(next.copyWith(
                    matchWinners: BracketEngine.effectiveMatchWinners(
                      matches: schedule,
                      picks: next.matchWinners,
                      scores: scores,
                    ),
                  ));
                }

                String? lastDate;
                return ListView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                  children: [
                    _ScoreBanner(score: myScore, locked: config.locked),
                    if (_saving)
                      const Padding(
                        padding: EdgeInsets.only(top: 8),
                        child: LinearProgressIndicator(minHeight: 2),
                      ),
                    if (isAdmin)
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Lock this category'),
                        value: config.locked,
                        onChanged: (value) =>
                            _service.setLocked(widget.categoryId, value),
                      ),
                    const SizedBox(height: 16),
                    Text(
                      'Schedule',
                      style: theme.textTheme.titleLarge
                          ?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    Text(
                      'Tap a chip to pick the winner. Correct +10, wrong −5.',
                      style: theme.textTheme.bodySmall
                          ?.copyWith(color: Colors.grey[600]),
                    ),
                    const SizedBox(height: 8),
                    if (schedule.isEmpty)
                      Text(
                        'No scheduled matches found for this category yet.',
                        style: TextStyle(color: Colors.grey[600]),
                      )
                    else
                      ...schedule.map((match) {
                        final header = match.date != lastDate;
                        lastDate = match.date;
                        final official = BracketEngine.officialMatchWinner(
                          match,
                          scores,
                        );
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (header && match.date != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 12, bottom: 6),
                                child: Text(
                                  match.date!,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                            _LeagueMatchTile(
                              match: match,
                              selected: displayPicks.matchWinners[match.id] ??
                                  effectiveWinners[match.id],
                              official: official,
                              locked: config.locked || official != null,
                              onPick: (team) {
                                apply(BracketEngine.setMatchWinner(
                                  picks: displayPicks,
                                  layout: _layout,
                                  seed: seed,
                                  matches: league,
                                  scores: scores,
                                  matchId: match.id,
                                  team: team,
                                ));
                              },
                            ),
                          ],
                        );
                      }),
                    const SizedBox(height: 20),
                    Text(
                      'League table',
                      style: theme.textTheme.titleLarge
                          ?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    ..._layout.groups.map((group) {
                      final groupTable = predictedStandings.where((team) {
                        if (group == 'all') return true;
                        return '${team['group'] ?? ''}'.toUpperCase() == group;
                      }).toList();
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (_layout.grouped)
                            Padding(
                              padding: const EdgeInsets.only(top: 12, bottom: 6),
                              child: Text(
                                'Group $group',
                                style: const TextStyle(fontWeight: FontWeight.w700),
                              ),
                            ),
                          _StandingsTable(
                            teams: groupTable,
                            qualifyCount: _layout.qualifyCount,
                          ),
                        ],
                      );
                    }),
                    const SizedBox(height: 20),
                    Text(
                      'Knock Out Round',
                      style: theme.textTheme.titleLarge
                          ?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    Text(
                      _layout.grouped
                          ? 'Top 2 from each group: A1 vs B2 and B1 vs A2.'
                          : 'Pick winners on the bracket. Finalists appear after the semis.',
                      style: theme.textTheme.bodySmall
                          ?.copyWith(color: Colors.grey[600]),
                    ),
                    const SizedBox(height: 12),
                    _KnockoutBracket(
                      layout: _layout,
                      picks: displayPicks,
                      officialWinners: officialWinners,
                      locked: config.locked,
                      onPick: (slot, team) {
                        apply(BracketEngine.setWinner(
                          displayPicks,
                          _layout,
                          slot.id,
                          team,
                          ranks: predictedRanks,
                        ));
                      },
                    ),
                  ],
                );
              },
            );
          },
        );
      },
    );
  }
}

class _ScoreBanner extends StatelessWidget {
  final BracketScore score;
  final bool locked;
  const _ScoreBanner({required this.score, required this.locked});

  @override
  Widget build(BuildContext context) {
    final sign = score.points > 0 ? '+' : '';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.indigo.shade600, Colors.blue.shade400],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          const Icon(Icons.account_tree, color: Colors.white, size: 32),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  locked ? 'LOCKED' : 'YOUR POINTS',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                  ),
                ),
                Text(
                  '$sign${score.points}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  '${score.correct} correct • ${score.wrong} wrong • ${score.pending} pending',
                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StandingsTable extends StatelessWidget {
  final List<Map<String, dynamic>> teams;
  final int qualifyCount;
  const _StandingsTable({required this.teams, required this.qualifyCount});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(8, 8, 8, 4),
        child: Column(
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(8, 0, 8, 6),
              child: Row(
                children: [
                  SizedBox(width: 28, child: Text('#', style: _head)),
                  Expanded(child: Text('Team', style: _head)),
                  SizedBox(width: 28, child: Text('P', style: _head)),
                  SizedBox(width: 28, child: Text('W', style: _head)),
                  SizedBox(width: 28, child: Text('L', style: _head)),
                  SizedBox(width: 36, child: Text('Pts', style: _head)),
                ],
              ),
            ),
            ...teams.asMap().entries.map((entry) {
              final team = entry.value;
              final showQ = qualifyCount < teams.length && entry.key < qualifyCount;
              return Padding(
                padding: const EdgeInsets.fromLTRB(8, 4, 8, 8),
                child: Row(
                  children: [
                    SizedBox(
                      width: 28,
                      child: Text(
                        '${entry.key + 1}',
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                    Expanded(
                      child: Row(
                        children: [
                          Flexible(
                            child: Text(
                              '${team['name']}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                          ),
                          if (showQ) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.green.shade100,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                'Q${entry.key + 1}',
                                style: TextStyle(
                                  color: Colors.green.shade800,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    SizedBox(width: 28, child: Text('${team['played'] ?? 0}')),
                    SizedBox(width: 28, child: Text('${team['won'] ?? 0}')),
                    SizedBox(width: 28, child: Text('${team['lost'] ?? 0}')),
                    SizedBox(
                      width: 36,
                      child: Text(
                        '${team['points'] ?? 0}',
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

const _head = TextStyle(
  fontSize: 11,
  fontWeight: FontWeight.w700,
  color: Colors.blueGrey,
);

class _LeagueMatchTile extends StatelessWidget {
  final BracketMatch match;
  final String? selected;
  final String? official;
  final bool locked;
  final ValueChanged<String> onPick;

  const _LeagueMatchTile({
    required this.match,
    required this.selected,
    required this.official,
    required this.locked,
    required this.onPick,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
        child: Column(
          children: [
            if (match.time != null)
              Align(
                alignment: Alignment.centerRight,
                child: Text(
                  match.time!,
                  style: TextStyle(color: Colors.grey[600], fontSize: 11),
                ),
              ),
            Row(
              children: [
                Expanded(child: _chip(match.team1)),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Text(
                    'vs',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      color: Colors.grey[600],
                    ),
                  ),
                ),
                Expanded(child: _chip(match.team2)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _chip(String team) {
    final isSelected = selected != null && sameTeam(selected!, team);
    final won = official != null && sameTeam(official!, team);
    final wrong = official != null && isSelected && !won;
    return FilterChip(
      selected: isSelected,
      showCheckmark: false,
      avatar: Icon(
        isSelected ? Icons.check_circle : Icons.circle_outlined,
        size: 16,
        color: isSelected ? Colors.white : Colors.grey,
      ),
      label: Text(
        team,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      labelStyle: TextStyle(
        fontWeight: FontWeight.w700,
        fontSize: 12,
        color: isSelected ? Colors.white : Colors.black87,
      ),
      selectedColor: won
          ? Colors.green.shade600
          : wrong
              ? Colors.red.shade600
              : Colors.deepOrange,
      backgroundColor: Colors.grey.shade100,
      onSelected: locked ? null : (_) => onPick(team),
    );
  }
}

class _KnockoutBracket extends StatelessWidget {
  final BracketLayout layout;
  final BracketPicks picks;
  final Map<String, String> officialWinners;
  final bool locked;
  final void Function(BracketSlot slot, String team) onPick;

  const _KnockoutBracket({
    required this.layout,
    required this.picks,
    required this.officialWinners,
    required this.locked,
    required this.onPick,
  });

  @override
  Widget build(BuildContext context) {
    final semis = layout.slots.where((s) => s.round == 'sf').toList();
    final finals = layout.slots.where((s) => s.round == 'final').toList();
    final finalists = finals.isEmpty
        ? const <String>[]
        : BracketEngine.sidesFor(finals.first, picks.ranks, picks.winners)
            .where((name) => name.isNotEmpty)
            .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (finalists.length == 2)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              'Finalists: ${finalists[0]}  vs  ${finalists[1]}',
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                color: Color(0xFF1e40af),
              ),
            ),
          ),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              if (semis.isNotEmpty)
                SizedBox(
                  width: 220,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'Semi-finals',
                        style: TextStyle(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 8),
                      for (final slot in semis) ...[
                        _BracketMatchCard(
                          slot: slot,
                          picks: picks,
                          official: officialWinners[slot.id],
                          locked: locked,
                          onPick: onPick,
                        ),
                        const SizedBox(height: 16),
                      ],
                    ],
                  ),
                ),
              if (semis.isNotEmpty && finals.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: CustomPaint(
                    size: const Size(28, 220),
                    painter: _BracketLinesPainter(count: semis.length),
                  ),
                ),
              if (finals.isNotEmpty)
                SizedBox(
                  width: 220,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'Final',
                        style: TextStyle(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 8),
                      if (semis.length >= 2) const SizedBox(height: 48),
                      _BracketMatchCard(
                        slot: finals.first,
                        picks: picks,
                        official: officialWinners[finals.first.id],
                        locked: locked,
                        onPick: onPick,
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _BracketLinesPainter extends CustomPainter {
  final int count;
  const _BracketLinesPainter({required this.count});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF94A3B8)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;
    if (count < 2) {
      canvas.drawLine(
        Offset(0, size.height / 2),
        Offset(size.width, size.height / 2),
        paint,
      );
      return;
    }
    final top = size.height * 0.25;
    final bottom = size.height * 0.75;
    final mid = size.height / 2;
    canvas.drawLine(Offset(0, top), Offset(size.width / 2, top), paint);
    canvas.drawLine(Offset(0, bottom), Offset(size.width / 2, bottom), paint);
    canvas.drawLine(
        Offset(size.width / 2, top), Offset(size.width / 2, bottom), paint);
    canvas.drawLine(
        Offset(size.width / 2, mid), Offset(size.width, mid), paint);
  }

  @override
  bool shouldRepaint(covariant _BracketLinesPainter oldDelegate) =>
      oldDelegate.count != count;
}

class _BracketMatchCard extends StatelessWidget {
  final BracketSlot slot;
  final BracketPicks picks;
  final String? official;
  final bool locked;
  final void Function(BracketSlot slot, String team) onPick;

  const _BracketMatchCard({
    required this.slot,
    required this.picks,
    required this.official,
    required this.locked,
    required this.onPick,
  });

  @override
  Widget build(BuildContext context) {
    final sides = BracketEngine.sidesFor(slot, picks.ranks, picks.winners);
    final pick = picks.winners[slot.id];
    return Container(
      width: 220,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.indigo.shade100, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.indigo.withValues(alpha: 0.08),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            slot.title,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: Colors.indigo.shade700,
            ),
          ),
          const SizedBox(height: 8),
          _seedChip(slot, sides[0], slot.homeKey, pick),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Text(
              'vs',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: Colors.grey[500],
              ),
            ),
          ),
          _seedChip(slot, sides[1], slot.awayKey, pick),
        ],
      ),
    );
  }

  Widget _seedChip(
    BracketSlot slot,
    String team,
    String seed,
    String? pick,
  ) {
    final hasTeam = team.isNotEmpty;
    final selected = hasTeam && pick != null && sameTeam(team, pick);
    final won = hasTeam && official != null && sameTeam(official!, team);
    return SizedBox(
      width: double.infinity,
      child: FilterChip(
        selected: selected,
        showCheckmark: false,
        label: Text(
          hasTeam ? team : seed,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        labelStyle: TextStyle(
          fontWeight: FontWeight.w700,
          fontSize: 12,
          color: selected
              ? Colors.white
              : hasTeam
                  ? Colors.black87
                  : Colors.grey,
        ),
        selectedColor: won ? Colors.green.shade600 : Colors.indigo,
        backgroundColor: hasTeam ? Colors.indigo.shade50 : Colors.grey.shade100,
        onSelected: !hasTeam || locked ? null : (_) => onPick(slot, team),
      ),
    );
  }
}
