import 'package:flutter/material.dart';

import '../../../models/live_score.dart';
import '../../../services/scoring_engine.dart';
import 'score_dialogs.dart';
import 'scoreboard_views.dart';

class ScoringConsole extends StatelessWidget {
  final LiveScore score;
  final bool saving;
  final String? error;
  final bool canUndo;
  final Future<void> Function(LiveScore next) onSave;
  final Future<void> Function() onUndo;

  const ScoringConsole({
    super.key,
    required this.score,
    required this.saving,
    required this.error,
    required this.canUndo,
    required this.onSave,
    required this.onUndo,
  });

  @override
  Widget build(BuildContext context) {
    final inn = score.liveInnings;
    if (!score.hasStarted) {
      return _MatchSetup(
        key: ValueKey(
          '${score.matchId}|${score.status}|${score.innings.length}|'
          '${score.team1}|${score.team2}|'
          '${score.team1Squad.join(',')}|${score.team2Squad.join(',')}',
        ),
        score: score,
        saving: saving,
        error: error,
        onStart: (next) => onSave(next),
      );
    }
    if (inn != null && inn.completed && inn.number == 1 && score.inningsNumber(2) == null) {
      return _SecondInningsSetup(
        key: ValueKey(
          '${score.matchId}|2|${score.team1Squad.join(',')}|${score.team2Squad.join(',')}',
        ),
        score: score,
        saving: saving,
        error: error,
        onStart: (next) => onSave(next),
      );
    }
    if (score.isComplete) {
      return ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(score.result ?? 'Match completed',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          const Text('Scoring is locked. Use Undo on the last innings only if you reopen play.'),
        ],
      );
    }
    return _Keypad(
      score: score,
      saving: saving,
      error: error,
      canUndo: canUndo,
      onSave: onSave,
      onUndo: onUndo,
    );
  }
}

class _MatchSetup extends StatefulWidget {
  final LiveScore score;
  final bool saving;
  final String? error;
  final Future<void> Function(LiveScore next) onStart;

  const _MatchSetup({
    super.key,
    required this.score,
    required this.saving,
    required this.error,
    required this.onStart,
  });

  @override
  State<_MatchSetup> createState() => _MatchSetupState();
}

class _MatchSetupState extends State<_MatchSetup> {
  late int _overs;
  late int _wickets;
  late String _battingFirst;
  late String _tossWinner;
  String _tossDecision = 'bat';
  String? _striker;
  String? _nonStriker;
  String? _bowler;
  String? _startError;
  late bool _weekend;
  late List<String> _team1Squad;
  late List<String> _team2Squad;

  @override
  void initState() {
    super.initState();
    _overs = widget.score.maxOvers.clamp(1, 10);
    _wickets = widget.score.maxWickets.clamp(1, 10);
    _battingFirst = widget.score.team1;
    _tossWinner = widget.score.team1;
    _weekend = widget.score.isWeekendMatch;
    _syncSquadsFromScore();
    _striker = null;
    _nonStriker = null;
    _bowler = null;
  }

  @override
  void didUpdateWidget(covariant _MatchSetup oldWidget) {
    super.didUpdateWidget(oldWidget);
    final score = widget.score;
    if (score.team1 != oldWidget.score.team1 ||
        score.team2 != oldWidget.score.team2) {
      _battingFirst = score.team1;
      _tossWinner = score.team1;
      _tossDecision = 'bat';
      _striker = null;
      _nonStriker = null;
      _bowler = null;
    }
    if (oldWidget.score.hasStarted && !score.hasStarted) {
      _striker = null;
      _nonStriker = null;
      _bowler = null;
    }
    _weekend = score.isWeekendMatch;
    _syncSquadsFromScore();
    _resetPlayers();
  }

  void _syncSquadsFromScore() {
    _team1Squad = List<String>.from(widget.score.team1Squad);
    _team2Squad = List<String>.from(widget.score.team2Squad);
  }

  List<String> _squadForTeam(String team) {
    final fromScore = widget.score.squadFor(team);
    if (fromScore.isNotEmpty) return fromScore;
    final key = team.trim().toLowerCase();
    if (key.isNotEmpty && key == widget.score.team1.trim().toLowerCase()) {
      return _team1Squad;
    }
    if (key.isNotEmpty && key == widget.score.team2.trim().toLowerCase()) {
      return _team2Squad;
    }
    return fromScore;
  }

  List<String> get _battingSquad => _squadForTeam(_battingFirst);

  List<String> get _bowlingSquad {
    final bowlingTeam = _battingFirst == widget.score.team1
        ? widget.score.team2
        : widget.score.team1;
    return _squadForTeam(bowlingTeam);
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Start match', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 4),
        Text(
          widget.score.weekendSheetsReady
              ? 'Pick openers and the opening bowler from the submitted weekend sheets.'
              : _weekend
                  ? 'Add both squads first, then pick openers and the bowler from the dropdowns.'
                  : 'Pick openers and the opening bowler from each team profile.',
          style: TextStyle(color: Colors.grey[700]),
        ),
        if (!widget.score.weekendSheetsReady) ...[
          const SizedBox(height: 12),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Weekend match'),
            subtitle: const Text('Enter both teams manually, then select players as usual'),
            value: _weekend,
            onChanged: _toggleWeekend,
          ),
          if (_weekend) ...[
            const SizedBox(height: 8),
            _SquadEditor(
              teamName: widget.score.team1,
              players: _team1Squad,
              onAdd: (name) => _addPlayer(1, name),
              onRemove: (name) => _removePlayer(1, name),
            ),
            const SizedBox(height: 12),
            _SquadEditor(
              teamName: widget.score.team2,
              players: _team2Squad,
              onAdd: (name) => _addPlayer(2, name),
              onRemove: (name) => _removePlayer(2, name),
            ),
          ],
        ],
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _Dropdown<int>(
                label: 'Overs',
                value: _overs,
                items: const [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                onChanged: (v) => setState(() => _overs = v),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _Dropdown<int>(
                label: 'Wickets',
                value: _wickets,
                items: const [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                onChanged: (v) => setState(() => _wickets = v),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _Dropdown<String>(
          label: 'Toss won by',
          value: _tossWinner,
          items: [widget.score.team1, widget.score.team2],
          onChanged: (v) => setState(() => _applyToss(winner: v)),
        ),
        const SizedBox(height: 12),
        _Dropdown<String>(
          label: 'Elected to',
          value: _tossDecision,
          items: const ['bat', 'bowl'],
          onChanged: (v) => setState(() => _applyToss(decision: v)),
        ),
        const SizedBox(height: 8),
        Text(
          '$_battingFirst batting first',
          style: TextStyle(
            color: Colors.grey[800],
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        _PlayerDropdown(
          label: 'Striker',
          value: _striker,
          players: _battingSquad,
          exclude: _nonStriker,
          onChanged: (v) => setState(() => _striker = v),
        ),
        const SizedBox(height: 12),
        _PlayerDropdown(
          label: 'Non-striker',
          value: _nonStriker,
          players: _battingSquad,
          exclude: _striker,
          onChanged: (v) => setState(() => _nonStriker = v),
        ),
        const SizedBox(height: 12),
        _PlayerDropdown(
          label: 'Opening bowler',
          value: _bowler,
          players: _bowlingSquad,
          onChanged: (v) => setState(() => _bowler = v),
        ),
        const SizedBox(height: 20),
        if (_startError != null || widget.error != null) ...[
          Text(
            _startError ?? widget.error!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
          const SizedBox(height: 12),
        ],
        FilledButton(
          onPressed: widget.saving ? null : _start,
          child: widget.saving
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Start innings'),
        ),
      ],
    );
  }

  Future<void> _toggleWeekend(bool value) async {
    setState(() {
      _weekend = value;
      _striker = null;
      _nonStriker = null;
      _bowler = null;
      if (value && !widget.score.isWeekendMatch) {
        _team1Squad = [];
        _team2Squad = [];
      }
    });
    await _persistWeekend();
  }

  void _addPlayer(int side, String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return;
    final list = side == 1 ? _team1Squad : _team2Squad;
    if (list.any((player) => player.toLowerCase() == trimmed.toLowerCase())) {
      return;
    }
    setState(() {
      list.add(trimmed);
      list.sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));
    });
    _persistWeekend();
  }

  void _removePlayer(int side, String name) {
    setState(() {
      final list = side == 1 ? _team1Squad : _team2Squad;
      list.removeWhere((player) => player == name);
      if (_striker == name) _striker = null;
      if (_nonStriker == name) _nonStriker = null;
      if (_bowler == name) _bowler = null;
    });
    _persistWeekend();
  }

  Future<void> _persistWeekend() async {
    if (widget.score.weekendSheetsReady) return;
    try {
      await widget.onStart(
        widget.score.copyWith(
          isWeekendMatch: _weekend,
          team1Squad: _weekend ? List<String>.from(_team1Squad) : widget.score.team1Squad,
          team2Squad: _weekend ? List<String>.from(_team2Squad) : widget.score.team2Squad,
        ),
      );
    } catch (_) {}
  }

  void _applyToss({String? winner, String? decision}) {
    if (winner != null) _tossWinner = winner;
    if (decision != null) _tossDecision = decision;
    _battingFirst = _tossDecision == 'bat'
        ? _tossWinner
        : (_tossWinner == widget.score.team1
            ? widget.score.team2
            : widget.score.team1);
    _resetPlayers();
  }

  void _resetPlayers() {
    if (!_battingSquad.contains(_striker)) _striker = null;
    if (!_battingSquad.contains(_nonStriker)) _nonStriker = null;
    if (!_bowlingSquad.contains(_bowler)) _bowler = null;
  }

  Future<void> _start() async {
    final striker = _striker?.trim() ?? '';
    final non = _nonStriker?.trim() ?? '';
    final bowler = _bowler?.trim() ?? '';
    if (striker.isEmpty || non.isEmpty || bowler.isEmpty) {
      setState(() => _startError = _weekend
          ? 'Add both squads, then select striker, non-striker and bowler'
          : 'Select striker, non-striker and bowler');
      return;
    }
    if (striker == non) {
      setState(() => _startError = 'Openers must be different players');
      return;
    }
    setState(() => _startError = null);
    var next = widget.score.weekendSheetsReady
        ? widget.score
        : widget.score.copyWith(
            team1Squad: _weekend ? List<String>.from(_team1Squad) : widget.score.team1Squad,
            team2Squad: _weekend ? List<String>.from(_team2Squad) : widget.score.team2Squad,
            isWeekendMatch: _weekend,
          );
    next = ScoringEngine.addToSquad(next, _battingFirst == next.team1 ? 1 : 2, striker);
    next = ScoringEngine.addToSquad(next, _battingFirst == next.team1 ? 1 : 2, non);
    next = ScoringEngine.addToSquad(
      next,
      _battingFirst == next.team1 ? 2 : 1,
      bowler,
    );
    next = ScoringEngine.startFirstInnings(
      match: next,
      battingTeam: _battingFirst,
      striker: striker,
      nonStriker: non,
      bowler: bowler,
      maxOvers: _overs,
      maxWickets: _wickets,
      tossWinner: _tossWinner,
      tossDecision: _tossDecision,
    );
    try {
      await widget.onStart(next);
    } catch (e) {
      if (mounted) setState(() => _startError = 'Could not start innings. $e');
    }
  }
}

class _SecondInningsSetup extends StatefulWidget {
  final LiveScore score;
  final bool saving;
  final String? error;
  final Future<void> Function(LiveScore next) onStart;

  const _SecondInningsSetup({
    super.key,
    required this.score,
    required this.saving,
    required this.error,
    required this.onStart,
  });

  @override
  State<_SecondInningsSetup> createState() => _SecondInningsSetupState();
}

class _SecondInningsSetupState extends State<_SecondInningsSetup> {
  String? _striker;
  String? _nonStriker;
  String? _bowler;

  @override
  Widget build(BuildContext context) {
    final first = widget.score.inningsNumber(1)!;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Start 2nd innings', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        Text('${first.bowlingTeam} need ${widget.score.target} to win'),
        const SizedBox(height: 16),
        _PlayerDropdown(
          label: 'Striker',
          value: _striker,
          players: widget.score.squadFor(first.bowlingTeam),
          exclude: _nonStriker,
          onChanged: (v) => setState(() => _striker = v),
        ),
        const SizedBox(height: 12),
        _PlayerDropdown(
          label: 'Non-striker',
          value: _nonStriker,
          players: widget.score.squadFor(first.bowlingTeam),
          exclude: _striker,
          onChanged: (v) => setState(() => _nonStriker = v),
        ),
        const SizedBox(height: 12),
        _PlayerDropdown(
          label: 'Opening bowler',
          value: _bowler,
          players: widget.score.squadFor(first.battingTeam),
          onChanged: (v) => setState(() => _bowler = v),
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: widget.saving ? null : _start,
          child: const Text('Begin chase'),
        ),
      ],
    );
  }

  Future<void> _start() async {
    final striker = _striker?.trim() ?? '';
    final non = _nonStriker?.trim() ?? '';
    final bowler = _bowler?.trim() ?? '';
    if (striker.isEmpty || non.isEmpty || bowler.isEmpty || striker == non) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select two different openers and a bowler')),
      );
      return;
    }
    final first = widget.score.inningsNumber(1)!;
    var next = widget.score;
    next = ScoringEngine.addToSquad(
      next,
      first.bowlingTeam == next.team1 ? 1 : 2,
      striker,
    );
    next = ScoringEngine.addToSquad(
      next,
      first.bowlingTeam == next.team1 ? 1 : 2,
      non,
    );
    next = ScoringEngine.addToSquad(
      next,
      first.battingTeam == next.team1 ? 1 : 2,
      bowler,
    );
    next = ScoringEngine.startSecondInnings(
      match: next,
      striker: striker,
      nonStriker: non,
      bowler: bowler,
    );
    await widget.onStart(next);
  }
}

class _Keypad extends StatefulWidget {
  final LiveScore score;
  final bool saving;
  final String? error;
  final bool canUndo;
  final Future<void> Function(LiveScore next) onSave;
  final Future<void> Function() onUndo;

  const _Keypad({
    required this.score,
    required this.saving,
    required this.error,
    required this.canUndo,
    required this.onSave,
    required this.onUndo,
  });

  @override
  State<_Keypad> createState() => _KeypadState();
}

class _KeypadState extends State<_Keypad> {
  bool _promptOpen = false;

  LiveScore get score => widget.score;
  bool get saving => widget.saving;
  String? get error => widget.error;
  bool get canUndo => widget.canUndo;
  Future<void> Function(LiveScore next) get onSave => widget.onSave;
  Future<void> Function() get onUndo => widget.onUndo;
  Innings get inn => score.liveInnings!;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _promptNewBowlerIfNeeded());
  }

  @override
  void didUpdateWidget(covariant _Keypad oldWidget) {
    super.didUpdateWidget(oldWidget);
    final wasNeeded = oldWidget.score.liveInnings?.needsNewBowler ?? false;
    final isNeeded = widget.score.liveInnings?.needsNewBowler ?? false;
    if (!wasNeeded && isNeeded) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _promptNewBowlerIfNeeded());
    }
  }

  Future<void> _promptNewBowlerIfNeeded() async {
    final innings = widget.score.liveInnings;
    if (!mounted || _promptOpen) return;
    if (innings == null || !innings.needsNewBowler || innings.completed) return;
    if (widget.score.isComplete) return;
    _promptOpen = true;
    await _pickBowler(context, endOfOver: true);
    _promptOpen = false;
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        Text(
          '${inn.striker} *  ${inn.batterNamed(inn.striker)?.runs ?? 0} (${inn.batterNamed(inn.striker)?.balls ?? 0})   •   ${inn.nonStriker}  ${inn.batterNamed(inn.nonStriker)?.runs ?? 0} (${inn.batterNamed(inn.nonStriker)?.balls ?? 0})',
          style: const TextStyle(fontSize: 13),
        ),
        Text(
          '${inn.currentBowler}  ${inn.bowlerNamed(inn.currentBowler)?.overs ?? '0.0'}-${inn.bowlerNamed(inn.currentBowler)?.maidens ?? 0}-${inn.bowlerNamed(inn.currentBowler)?.runs ?? 0}-${inn.bowlerNamed(inn.currentBowler)?.wickets ?? 0}  wd ${inn.bowlerNamed(inn.currentBowler)?.wides ?? 0}  nb ${inn.bowlerNamed(inn.currentBowler)?.noBalls ?? 0}',
          style: const TextStyle(fontSize: 13),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: inn.thisOver.isEmpty
              ? [const Chip(label: Text('New over'))]
              : inn.thisOver.map((t) => Chip(label: Text(t))).toList(),
        ),
        if (error != null) ...[
          const SizedBox(height: 8),
          Text(error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
        ],
        if (inn.needsNewBowler) ...[
          const SizedBox(height: 8),
          FilledButton.tonal(
            onPressed: saving ? null : () => _pickBowler(context, endOfOver: true),
            child: const Text('Select new bowler'),
          ),
        ],
        const SizedBox(height: 12),
        IgnorePointer(
          ignoring: saving || inn.needsNewBowler,
          child: Opacity(
            opacity: inn.needsNewBowler ? 0.45 : 1,
            child: Column(
              children: [
                Row(
                  children: [
                    for (final n in [0, 1, 2, 3])
                      Expanded(child: _pad(context, '$n', () => _legal(n))),
                  ],
                ),
                Row(
                  children: [
                    Expanded(child: _pad(context, '4', () => _legal(4), color: kScoreboardGreen)),
                    Expanded(child: _pad(context, '6', () => _legal(6), color: const Color(0xFF7c3aed))),
                    Expanded(child: _pad(context, 'Wd', () => _extra(context, 'wide'))),
                    Expanded(child: _pad(context, 'Nb', () => _extra(context, 'noBall'))),
                  ],
                ),
                Row(
                  children: [
                    Expanded(child: _pad(context, 'Bye', () => _extra(context, 'bye'))),
                    Expanded(child: _pad(context, 'LB', () => _extra(context, 'legBye'))),
                    Expanded(
                      child: _pad(context, 'W', () => _wicket(context), color: Colors.red),
                    ),
                    Expanded(child: _ballsLeftChip(context)),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: saving || !canUndo ? null : onUndo,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blueGrey,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            child: const Text('Undo last action'),
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton(
            onPressed: saving ? null : () => _completeInnings(context),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.red.shade700,
              side: BorderSide(color: Colors.red.shade300),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            child: Text(
              inn.number == 1 ? 'Complete innings' : 'Complete innings & match',
            ),
          ),
        ),
        if (saving) const Padding(
          padding: EdgeInsets.only(top: 12),
          child: LinearProgressIndicator(),
        ),
      ],
    );
  }

  Future<void> _completeInnings(BuildContext context) async {
    final first = inn.number == 1;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Complete innings?'),
        content: Text(
          first
              ? 'This will close the 1st innings at ${inn.scoreLine} and move to the chase.'
              : 'This will close the 2nd innings at ${inn.scoreLine} and finish the match.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Complete innings'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await onSave(ScoringEngine.endInnings(score));
  }

  int get _ballsLeftInOver {
    if (inn.needsNewBowler || inn.completed) return 0;
    final used = inn.legalBalls % 6;
    return used == 0 ? 6 : 6 - used;
  }

  Widget _ballsLeftChip(BuildContext context) {
    final left = _ballsLeftInOver;
    final scheme = Theme.of(context).colorScheme;
    final label = left == 0 ? 'Over up' : '$left left';
    return Padding(
      padding: const EdgeInsets.all(4),
      child: Center(
        child: Chip(
          label: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: scheme.onPrimary,
            ),
          ),
          backgroundColor: scheme.primary,
          visualDensity: const VisualDensity(horizontal: -1, vertical: -1),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          labelPadding: const EdgeInsets.symmetric(horizontal: 8),
          side: BorderSide.none,
        ),
      ),
    );
  }

  Widget _pad(BuildContext context, String label, VoidCallback onTap, {Color? color}) {
    return Padding(
      padding: const EdgeInsets.all(4),
      child: ElevatedButton(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: color ?? Theme.of(context).colorScheme.primary,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
          minimumSize: const Size(0, 52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        child: Text(label, style: const TextStyle(fontWeight: FontWeight.w800)),
      ),
    );
  }

  Future<void> _legal(int runs) {
    return onSave(
      ScoringEngine.addDelivery(
        score,
        BallEvent(kind: 'legal', runs: runs, bowler: inn.currentBowler),
      ),
    );
  }

  Future<void> _extra(BuildContext context, String kind) async {
    final extraRuns = await showExtraRunsSheet(context, kind: kind);
    if (extraRuns == null) return;
    final runs = (kind == 'bye' || kind == 'legBye') && extraRuns == 0 ? 1 : extraRuns;
    await onSave(
      ScoringEngine.addDelivery(
        score,
        BallEvent(kind: kind, runs: runs, bowler: inn.currentBowler),
      ),
    );
  }

  Future<void> _wicket(BuildContext context) async {
    final result = await showWicketSheet(
      context,
      innings: inn,
      maxWickets: score.maxWickets,
      battingSquad: score.squadFor(inn.battingTeam),
      bowlingSquad: score.squadFor(inn.bowlingTeam),
    );
    if (result == null) return;
    var next = score;
    next = ScoringEngine.addToSquad(
      next,
      inn.battingTeam == next.team1 ? 1 : 2,
      result.newBatsman,
    );
    if (result.fielder != null && result.fielder!.isNotEmpty) {
      next = ScoringEngine.addToSquad(
        next,
        inn.bowlingTeam == next.team1 ? 1 : 2,
        result.fielder!,
      );
    }
    await onSave(
      ScoringEngine.addDelivery(
        next,
        BallEvent(
          kind: 'legal',
          runs: result.runs,
          wicket: result.type,
          outNonStriker: result.outNonStriker,
          fielder: result.fielder,
          newBatsman: result.newBatsman,
          bowler: inn.currentBowler,
        ),
      ),
    );
  }

  Future<void> _pickBowler(BuildContext context, {bool endOfOver = false}) async {
    final current = inn.currentBowler;
    final players = endOfOver
        ? score.squadFor(inn.bowlingTeam).where((p) => p != current).toList()
        : score.squadFor(inn.bowlingTeam);
    final overNo = inn.legalBalls ~/ 6;
    final cannotDismiss = endOfOver && players.isNotEmpty;
    final name = await showModalBottomSheet<String>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      isDismissible: !cannotDismiss,
      enableDrag: !cannotDismiss,
      builder: (ctx) {
        return SafeArea(
          child: SizedBox(
            height: MediaQuery.of(ctx).size.height * 0.55,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
                  child: Text(
                    endOfOver ? 'Over $overNo complete' : 'Change bowler',
                    style: Theme.of(ctx).textTheme.titleMedium,
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  child: Text(
                    endOfOver
                        ? '$current cannot bowl consecutive overs. Select the next bowler.'
                        : 'Current bowler: $current',
                    style: TextStyle(color: Colors.grey[700], fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                ),
                Expanded(
                  child: players.isEmpty
                      ? const Center(child: Text('No other bowlers on this team profile'))
                      : SingleChildScrollView(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                          child: Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: [
                              for (final player in players)
                                ScoreSelectChip(
                                  label: player,
                                  onTap: () => Navigator.pop(ctx, player),
                                ),
                            ],
                          ),
                        ),
                ),
                if (endOfOver && canUndo)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx, '__undo__'),
                      child: const Text('Undo last ball'),
                    ),
                  ),
                if (!endOfOver)
                  TextButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('Cancel'),
                  ),
              ],
            ),
          ),
        );
      },
    );
    if (name == null || name.isEmpty) return;
    if (name == '__undo__') {
      await onUndo();
      return;
    }
    if (endOfOver && name == current) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('A bowler cannot bowl consecutive overs')),
        );
      }
      return;
    }
    var next = ScoringEngine.addToSquad(
      score,
      inn.bowlingTeam == score.team1 ? 1 : 2,
      name,
    );
    next = ScoringEngine.changeBowler(next, name);
    await onSave(next);
  }
}

class _SquadEditor extends StatefulWidget {
  final String teamName;
  final List<String> players;
  final ValueChanged<String> onAdd;
  final ValueChanged<String> onRemove;

  const _SquadEditor({
    required this.teamName,
    required this.players,
    required this.onAdd,
    required this.onRemove,
  });

  @override
  State<_SquadEditor> createState() => _SquadEditorState();
}

class _SquadEditorState extends State<_SquadEditor> {
  final _controller = TextEditingController();

  void _submit() {
    final name = _controller.text.trim();
    if (name.isEmpty) return;
    widget.onAdd(name);
    _controller.clear();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.teamName,
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
            ),
            Text(
              widget.players.isEmpty
                  ? 'No players yet'
                  : '${widget.players.length} player${widget.players.length == 1 ? '' : 's'}',
              style: TextStyle(color: Colors.grey[600], fontSize: 12),
            ),
            const SizedBox(height: 8),
            if (widget.players.isNotEmpty)
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final player in widget.players)
                    InputChip(
                      label: Text(player),
                      onDeleted: () => widget.onRemove(player),
                    ),
                ],
              ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(
                      hintText: 'Type player name',
                      isDense: true,
                    ),
                    onSubmitted: (_) => _submit(),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: _submit,
                  child: const Text('Add'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Dropdown<T> extends StatelessWidget {
  final String label;
  final T value;
  final List<T> items;
  final ValueChanged<T> onChanged;

  const _Dropdown({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<T>(
      value: value,
      isExpanded: true,
      decoration: InputDecoration(labelText: label),
      items: items
          .map((e) => DropdownMenuItem(value: e, child: Text('$e')))
          .toList(),
      onChanged: (v) {
        if (v != null) onChanged(v);
      },
    );
  }
}

class _PlayerDropdown extends StatelessWidget {
  final String label;
  final String? value;
  final List<String> players;
  final String? exclude;
  final ValueChanged<String> onChanged;

  const _PlayerDropdown({
    required this.label,
    required this.value,
    required this.players,
    required this.onChanged,
    this.exclude,
  });

  @override
  Widget build(BuildContext context) {
    final options = players.where((p) => p != exclude).toList();
    final selected = value != null && options.contains(value) ? value : null;

    if (options.isEmpty) {
      return InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          errorText: 'No players on this team profile',
        ),
        child: Text(
          'Add players on the Teams tab first',
          style: TextStyle(color: Colors.grey[600], fontSize: 13),
        ),
      );
    }

    return InkWell(
      onTap: () => _openPicker(context, options, selected),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          suffixIcon: const Icon(Icons.arrow_drop_down),
        ),
        child: Text(
          selected ?? 'Select player',
          style: TextStyle(
            fontSize: 16,
            color: selected == null ? Colors.grey[600] : null,
          ),
        ),
      ),
    );
  }

  Future<void> _openPicker(
    BuildContext context,
    List<String> options,
    String? selected,
  ) async {
    final chosen = await showModalBottomSheet<String>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      builder: (ctx) {
        return SafeArea(
          child: SizedBox(
            height: MediaQuery.of(ctx).size.height * 0.55,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Text(
                    label,
                    style: Theme.of(ctx).textTheme.titleMedium,
                  ),
                ),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final name in options)
                          ScoreSelectChip(
                            label: name,
                            selected: name == selected,
                            onTap: () => Navigator.pop(ctx, name),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
    if (chosen != null) onChanged(chosen);
  }
}
