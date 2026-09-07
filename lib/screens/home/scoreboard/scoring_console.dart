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
        score: score,
        saving: saving,
        error: error,
        onStart: (next) => onSave(next),
      );
    }
    if (inn != null && inn.completed && inn.number == 1 && score.inningsNumber(2) == null) {
      return _SecondInningsSetup(
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

  @override
  void initState() {
    super.initState();
    _overs = widget.score.maxOvers;
    _wickets = widget.score.maxWickets;
    _battingFirst = widget.score.team1;
    _tossWinner = widget.score.team1;
  }

  List<String> get _battingSquad => widget.score.squadFor(_battingFirst);

  List<String> get _bowlingSquad => widget.score.squadFor(
        _battingFirst == widget.score.team1
            ? widget.score.team2
            : widget.score.team1,
      );

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Start match', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 4),
        Text(
          'Pick openers and the opening bowler from each team profile.',
          style: TextStyle(color: Colors.grey[700]),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _Dropdown<int>(
                label: 'Overs',
                value: _overs,
                items: const [6, 8, 10, 12, 15, 20],
                onChanged: (v) => setState(() => _overs = v),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _Dropdown<int>(
                label: 'Wickets',
                value: _wickets,
                items: const [6, 7, 8, 9, 10],
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
      setState(() => _startError = 'Select striker, non-striker and bowler');
      return;
    }
    if (striker == non) {
      setState(() => _startError = 'Openers must be different players');
      return;
    }
    setState(() => _startError = null);
    var next = widget.score.copyWith(
      team1Squad: widget.score.team1Squad,
      team2Squad: widget.score.team2Squad,
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
        if (saving) const Padding(
          padding: EdgeInsets.only(top: 12),
          child: LinearProgressIndicator(),
        ),
      ],
    );
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
      onTap: () => _openPicker(context, options),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          suffixIcon: const Icon(Icons.arrow_drop_down),
        ),
        child: Text(
          value ?? 'Select player',
          style: TextStyle(
            fontSize: 16,
            color: value == null ? Colors.grey[600] : null,
          ),
        ),
      ),
    );
  }

  Future<void> _openPicker(BuildContext context, List<String> options) async {
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
                            selected: name == value,
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
