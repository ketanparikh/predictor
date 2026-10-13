import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../models/fantasy.dart';
import '../../../models/live_score.dart';
import '../../../models/tournament.dart';
import '../../../providers/auction_provider.dart';
import '../../../providers/auth_provider.dart';
import '../../../services/fantasy_engine.dart';
import '../../../services/fantasy_service.dart';
import '../../../services/live_score_service.dart';
import '../../../services/team_roster_service.dart';
import '../../../widgets/game_page.dart';

class FantasyTeamScreen extends StatefulWidget {
  final MatchInfo match;
  final String dayName;
  final LiveScore score;

  const FantasyTeamScreen({
    super.key,
    required this.match,
    required this.dayName,
    required this.score,
  });

  @override
  State<FantasyTeamScreen> createState() => _FantasyTeamScreenState();
}

class _FantasyTeamScreenState extends State<FantasyTeamScreen> {
  final _fantasy = FantasyService();
  final _scores = LiveScoreService();
  final _roster = TeamRosterService();
  FantasyEntry? _draft;
  List<FantasyPlayer> _pool = [];
  bool _loading = true;
  bool _saving = false;
  String _roleFilter = 'ALL';
  String? _teamFilter;

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final auction = Provider.of<AuctionProvider>(context, listen: false);
    await _roster.load();
    if (auction.teams.isEmpty) await auction.loadTeams();
    final uid = auth.user?.uid ?? '';
    final saved = await _fantasy.watchEntry(widget.match.id, uid).first;
    if (!mounted) return;
    final score = widget.score;
    final pool = FantasyEngine.poolFor(
      team1: score.team1,
      team2: score.team2,
      roster: _roster,
      auctionTeams: auction.teams,
      team1Squad: score.team1Squad,
      team2Squad: score.team2Squad,
    );
    setState(() {
      _pool = pool;
      _draft = saved ??
          FantasyEntry(
            userId: uid,
            userName: auth.sessionDisplayName,
            matchId: widget.match.id,
          );
      _loading = false;
    });
  }

  FantasyPlayer _fromPool(FantasyPlayer player) {
    for (final selected in _draft?.players ?? const <FantasyPlayer>[]) {
      if (selected.name == player.name) return selected;
    }
    return player;
  }

  void _toggle(FantasyPlayer player) {
    final draft = _draft;
    if (draft == null) return;
    final exists = draft.players.any((p) => p.name == player.name);
    var players = List<FantasyPlayer>.from(draft.players);
    var captain = draft.captain;
    var vc = draft.viceCaptain;
    if (exists) {
      players.removeWhere((p) => p.name == player.name);
      if (captain == player.name) captain = '';
      if (vc == player.name) vc = '';
    } else {
      if (players.length >= FantasyEngine.squadSize) return;
      players.add(player);
    }
    setState(() {
      _draft = draft.copyWith(
        players: players,
        captain: captain,
        viceCaptain: vc,
      );
    });
  }

  void _setRole(FantasyPlayer player, String role) {
    final draft = _draft;
    if (draft == null) return;
    setState(() {
      _draft = draft.copyWith(
        players: draft.players
            .map((p) => p.name == player.name ? p.copyWith(role: role) : p)
            .toList(),
      );
    });
  }

  void _setCaptain(String name, {required bool vice}) {
    final draft = _draft;
    if (draft == null) return;
    setState(() {
      if (vice) {
        _draft = draft.copyWith(
          viceCaptain: name,
          captain: draft.captain == name ? '' : draft.captain,
        );
      } else {
        _draft = draft.copyWith(
          captain: name,
          viceCaptain: draft.viceCaptain == name ? '' : draft.viceCaptain,
        );
      }
    });
  }

  Future<void> _save() async {
    final draft = _draft;
    if (draft == null) return;
    final error = FantasyEngine.validate(draft);
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
      return;
    }
    setState(() => _saving = true);
    try {
      await _fantasy.saveEntry(draft);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Fantasy XI saved')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not save XI: $e')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<LiveScore?>(
      stream: _scores.watchScore(widget.match.id),
      builder: (context, snap) {
        final score = snap.data ?? widget.score;
        final locked =
            score.status == 'live' || score.status == 'completed';
        return Scaffold(
          appBar: GameAppBar(
            title: '${score.team1} vs ${score.team2}',
          ),
          body: _loading || _draft == null
              ? const Center(child: CircularProgressIndicator())
              : Column(
                  children: [
                    _Header(
                      score: score,
                      draft: _draft!,
                      locked: locked,
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                      child: Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        children: [
                          ChoiceChip(
                            label: const Text('All'),
                            selected: _roleFilter == 'ALL',
                            onSelected: (_) =>
                                setState(() => _roleFilter = 'ALL'),
                          ),
                          for (final role in FantasyEngine.roles)
                            ChoiceChip(
                              label: Text(role),
                              selected: _roleFilter == role,
                              onSelected: (_) =>
                                  setState(() => _roleFilter = role),
                            ),
                          ChoiceChip(
                            label: Text(score.team1),
                            selected: _teamFilter == score.team1,
                            onSelected: (_) => setState(() {
                              _teamFilter =
                                  _teamFilter == score.team1 ? null : score.team1;
                            }),
                          ),
                          ChoiceChip(
                            label: Text(score.team2),
                            selected: _teamFilter == score.team2,
                            onSelected: (_) => setState(() {
                              _teamFilter =
                                  _teamFilter == score.team2 ? null : score.team2;
                            }),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: locked
                          ? _LockedView(
                              score: score,
                              draft: _draft!,
                              fantasy: _fantasy,
                            )
                          : Column(
                              children: [
                                if (_pool.length < FantasyEngine.squadSize)
                                  Padding(
                                    padding: const EdgeInsets.fromLTRB(
                                        16, 8, 16, 0),
                                    child: Text(
                                      'Only ${_pool.length} players listed for this match so far. Squads fill in from auction and the live scorecard.',
                                      style: TextStyle(color: Colors.grey[700]),
                                    ),
                                  ),
                                Expanded(
                                  child: _PlayerList(
                                    pool: _pool.where((p) {
                                      if (_teamFilter != null &&
                                          p.team != _teamFilter) {
                                        return false;
                                      }
                                      if (_roleFilter == 'ALL') return true;
                                      final selected = _draft!.players
                                          .any((s) => s.name == p.name);
                                      if (!selected) return true;
                                      return _fromPool(p).role == _roleFilter;
                                    }).toList(),
                                    draft: _draft!,
                                    locked: locked,
                                    onToggle: _toggle,
                                    onRole: _setRole,
                                    onCaptain: _setCaptain,
                                  ),
                                ),
                              ],
                            ),
                    ),
                    if (!locked)
                      SafeArea(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                          child: SizedBox(
                            width: double.infinity,
                            child: FilledButton.icon(
                              onPressed: _saving ? null : _save,
                              icon: _saving
                                  ? const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : const Icon(Icons.save),
                              label: const Text('Save XI'),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
        );
      },
    );
  }
}

class _Header extends StatelessWidget {
  final LiveScore score;
  final FantasyEntry draft;
  final bool locked;

  const _Header({
    required this.score,
    required this.draft,
    required this.locked,
  });

  @override
  Widget build(BuildContext context) {
    final remaining = FantasyEngine.budget - draft.spent;
    final result = score.hasStarted ? FantasyEngine.score(score, draft) : null;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      color: const Color(0xFF0F172A),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            locked ? 'TEAM LOCKED' : 'CREATE YOUR XI',
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 11,
              letterSpacing: 1,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _stat('${draft.players.length}/${FantasyEngine.squadSize}', 'Players'),
              _stat(remaining.toStringAsFixed(1), 'Credits left'),
              _stat(
                result == null ? '-' : result.total.toStringAsFixed(1),
                'Points',
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'WK 1-4 • BAT 3-6 • AR 1-4 • BOWL 3-6 • Max 7 from one team',
            style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 11),
          ),
        ],
      ),
    );
  }

  Widget _stat(String value, String label) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11)),
        ],
      ),
    );
  }
}

class _PlayerList extends StatelessWidget {
  final List<FantasyPlayer> pool;
  final FantasyEntry draft;
  final bool locked;
  final ValueChanged<FantasyPlayer> onToggle;
  final void Function(FantasyPlayer player, String role) onRole;
  final void Function(String name, {required bool vice}) onCaptain;

  const _PlayerList({
    required this.pool,
    required this.draft,
    required this.locked,
    required this.onToggle,
    required this.onRole,
    required this.onCaptain,
  });

  @override
  Widget build(BuildContext context) {
    if (pool.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'No squad listed for this match yet. Players appear after auction or when the scorecard squad is set.',
            textAlign: TextAlign.center,
          ),
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
      itemCount: pool.length,
      itemBuilder: (context, index) {
        final player = pool[index];
        final selected = draft.players.any((p) => p.name == player.name);
        final current = selected
            ? draft.players.firstWhere((p) => p.name == player.name)
            : player;
        return Card(
          color: selected ? Colors.orange.shade50 : null,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
            child: Column(
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    player.name,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: Text('${player.team} • ${current.credits} cr'),
                  trailing: IconButton(
                    icon: Icon(
                      selected ? Icons.remove_circle : Icons.add_circle,
                      color: selected ? Colors.red : Colors.green,
                    ),
                    onPressed: locked ? null : () => onToggle(current),
                  ),
                ),
                if (selected)
                  Wrap(
                    spacing: 4,
                    runSpacing: 0,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      for (final role in FantasyEngine.roles)
                        ChoiceChip(
                          label: Text(role, style: const TextStyle(fontSize: 11)),
                          selected: current.role == role,
                          visualDensity: VisualDensity.compact,
                          onSelected: locked ? null : (_) => onRole(current, role),
                        ),
                      TextButton(
                        onPressed: locked
                            ? null
                            : () => onCaptain(current.name, vice: false),
                        child: Text(
                          draft.captain == current.name ? 'C' : 'Make C',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: draft.captain == current.name
                                ? Colors.deepOrange
                                : null,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: locked
                            ? null
                            : () => onCaptain(current.name, vice: true),
                        child: Text(
                          draft.viceCaptain == current.name ? 'VC' : 'Make VC',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: draft.viceCaptain == current.name
                                ? Colors.indigo
                                : null,
                          ),
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _LockedView extends StatelessWidget {
  final LiveScore score;
  final FantasyEntry draft;
  final FantasyService fantasy;

  const _LockedView({
    required this.score,
    required this.draft,
    required this.fantasy,
  });

  @override
  Widget build(BuildContext context) {
    final result = FantasyEngine.score(score, draft);
    return StreamBuilder<List<FantasyEntry>>(
      stream: fantasy.watchEntries(score.matchId),
      builder: (context, snap) {
        final entries = [...(snap.data ?? [])];
        entries.sort((a, b) {
          final pa = FantasyEngine.score(score, a).total;
          final pb = FantasyEngine.score(score, b).total;
          return pb.compareTo(pa);
        });
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              'Your XI  •  ${result.total.toStringAsFixed(1)} pts',
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
            ),
            const SizedBox(height: 8),
            ...draft.players.map((player) {
              final pts = result.byPlayer[player.name];
              final tag = player.name == draft.captain
                  ? 'C'
                  : player.name == draft.viceCaptain
                      ? 'VC'
                      : player.role;
              return ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('${player.name}  ($tag)'),
                subtitle: Text(pts?.breakdown.join(' • ') ?? player.team),
                trailing: Text(
                  (pts?.points ?? 0).toStringAsFixed(1),
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              );
            }),
            const SizedBox(height: 16),
            const Text(
              'Match leaderboard',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
            ),
            const SizedBox(height: 8),
            if (entries.isEmpty)
              const Text('No other teams yet.')
            else
              ...entries.asMap().entries.map((row) {
                final pts = FantasyEngine.score(score, row.value).total;
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: CircleAvatar(child: Text('${row.key + 1}')),
                  title: Text(row.value.userName),
                  trailing: Text(
                    pts.toStringAsFixed(1),
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                );
              }),
          ],
        );
      },
    );
  }
}
