import 'package:flutter/material.dart';

import '../../../models/live_score.dart';

Future<int?> showExtraRunsSheet(
  BuildContext context, {
  required String kind,
}) {
  final title = switch (kind) {
    'wide' => 'Wide',
    'noBall' => 'No-ball',
    'bye' => 'Byes',
    'legBye' => 'Leg byes',
    _ => 'Extras',
  };
  final subtitle = switch (kind) {
    'wide' => 'Select extra runs besides the wide',
    'noBall' => 'Select runs off the bat with the no-ball',
    'bye' => 'Select completed byes',
    'legBye' => 'Select completed leg byes',
    _ => 'Select runs',
  };
  final options = switch (kind) {
    'wide' => const [
        (0, 'Wide only'),
        (1, 'Wide + 1'),
        (2, 'Wide + 2'),
        (3, 'Wide + 3'),
        (4, 'Wide + 4'),
      ],
    'noBall' => const [
        (0, 'No-ball only'),
        (1, 'Nb + 1'),
        (2, 'Nb + 2'),
        (3, 'Nb + 3'),
        (4, 'Nb + 4'),
        (6, 'Nb + 6'),
      ],
    _ => const [
        (1, '1'),
        (2, '2'),
        (3, '3'),
        (4, '4'),
      ],
  };

  return showModalBottomSheet<int>(
    context: context,
    useRootNavigator: true,
    isScrollControlled: true,
    builder: (ctx) {
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(title, style: Theme.of(ctx).textTheme.titleMedium),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: TextStyle(color: Colors.grey[700], fontSize: 13),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final option in options)
                    ScoreSelectChip(
                      label: option.$2,
                      onTap: () => Navigator.pop(ctx, option.$1),
                    ),
                ],
              ),
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
}

class WicketChoice {
  final String type;
  final int runs;
  final bool outNonStriker;
  final String? fielder;
  final String newBatsman;

  const WicketChoice({
    required this.type,
    required this.runs,
    required this.outNonStriker,
    required this.fielder,
    required this.newBatsman,
  });
}

Future<WicketChoice?> showWicketSheet(
  BuildContext context, {
  required Innings innings,
  required int maxWickets,
  required List<String> battingSquad,
  required List<String> bowlingSquad,
  bool allowManual = false,
}) {
  return showModalBottomSheet<WicketChoice>(
    context: context,
    useRootNavigator: true,
    isScrollControlled: true,
    builder: (ctx) {
      return _WicketSheet(
        innings: innings,
        maxWickets: maxWickets,
        battingSquad: battingSquad,
        bowlingSquad: bowlingSquad,
        allowManual: allowManual,
      );
    },
  );
}

class _WicketSheet extends StatefulWidget {
  final Innings innings;
  final int maxWickets;
  final List<String> battingSquad;
  final List<String> bowlingSquad;
  final bool allowManual;

  const _WicketSheet({
    required this.innings,
    required this.maxWickets,
    required this.battingSquad,
    required this.bowlingSquad,
    this.allowManual = false,
  });

  @override
  State<_WicketSheet> createState() => _WicketSheetState();
}

class _WicketSheetState extends State<_WicketSheet> {
  static const _dismissals = [
    ('caught', 'Caught'),
    ('bowled', 'Bowled'),
    ('lbw', 'LBW'),
    ('stumped', 'Stumped'),
    ('runOut', 'Run out'),
    ('hitWicket', 'Hit wicket'),
  ];

  int _step = 0;
  String? _type;
  int _runs = 0;
  bool _outNonStriker = false;
  String? _fielder;
  String? _newBatter;

  bool get _noBattersLeft {
    if (widget.battingSquad.isEmpty) return false;
    final dismissed = widget.innings.batters
        .where((b) => b.out)
        .map((b) => b.name.toLowerCase())
        .toSet();
    final atCrease = {
      widget.innings.striker.toLowerCase(),
      widget.innings.nonStriker.toLowerCase(),
    };
    return widget.battingSquad.every((player) {
      final key = player.toLowerCase();
      return dismissed.contains(key) || atCrease.contains(key);
    });
  }

  bool get _lastWicket =>
      widget.innings.wickets + 1 >= widget.maxWickets || _noBattersLeft;

  int get _finalStep => _lastWicket ? 0 : 1;

  String get _typeLabel {
    for (final item in _dismissals) {
      if (item.$1 == _type) return item.$2;
    }
    return 'Wicket';
  }

  void _record() {
    if (_type == null) return;
    if (!_lastWicket && (_newBatter == null || _newBatter!.isEmpty)) return;
    Navigator.pop(
      context,
      WicketChoice(
        type: _type!,
        runs: _type == 'runOut' ? _runs : 0,
        outNonStriker: _type == 'runOut' && _outNonStriker,
        fielder: _fielder,
        newBatsman: _newBatter?.trim() ?? '',
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dismissed = widget.innings.batters
        .where((b) => b.out)
        .map((b) => b.name.toLowerCase())
        .toSet();
    final atCrease = {
      widget.innings.striker.toLowerCase(),
      widget.innings.nonStriker.toLowerCase(),
    };
    final newBatters = widget.battingSquad.where((p) {
      final key = p.toLowerCase();
      return !dismissed.contains(key) && !atCrease.contains(key);
    }).toList();
    final theme = Theme.of(context);
    final isNewBatterStep = _step == 1 && !_lastWicket;

    return SafeArea(
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.86,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
              child: Row(
                children: [
                  if (_step > 0)
                    IconButton(
                      onPressed: () => setState(() => _step -= 1),
                      icon: const Icon(Icons.arrow_back),
                    )
                  else
                    const SizedBox(width: 48),
                  Expanded(
                    child: isNewBatterStep
                        ? Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: theme.colorScheme.primary,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Text(
                              'New Batter',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          )
                        : Column(
                            children: [
                              Text('Wicket', style: theme.textTheme.titleLarge),
                              Text(
                                _lastWicket ? 'Last wicket' : 'Step 1 of 2',
                                style: TextStyle(
                                  color: Colors.grey[600],
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),
            if (!isNewBatterStep)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                child: LinearProgressIndicator(
                  value: _lastWicket ? 1 : 0.5,
                  minHeight: 6,
                  borderRadius: BorderRadius.circular(8),
                ),
              )
            else
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
                child: LinearProgressIndicator(
                  value: 1,
                  minHeight: 6,
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            if (_type != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                child: Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  alignment: WrapAlignment.center,
                  children: [
                    _SummaryChip(label: _typeLabel),
                    if (_type == 'runOut')
                      _SummaryChip(
                        label: _outNonStriker
                            ? widget.innings.nonStriker
                            : widget.innings.striker,
                      ),
                    if (_fielder != null) _SummaryChip(label: _fielder!),
                    if (_newBatter != null) _SummaryChip(label: 'in: $_newBatter'),
                  ],
                ),
              ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _step == 0
                    ? _CombinedDetailsStep(
                        type: _type,
                        innings: widget.innings,
                        bowlingSquad: widget.bowlingSquad,
                        runs: _runs,
                        outNonStriker: _outNonStriker,
                        fielder: _fielder,
                        allowManual: widget.allowManual,
                        onType: (type) => setState(() {
                          _type = type;
                          _fielder = null;
                        }),
                        onRuns: (v) => setState(() => _runs = v),
                        onOutNonStriker: (v) => setState(() => _outNonStriker = v),
                        onFielder: (name) => setState(() => _fielder = name),
                      )
                    : _BatterStep(
                        players: newBatters,
                        selected: _newBatter,
                        allowManual: widget.allowManual,
                        onSelect: (name) => setState(() => _newBatter = name),
                      ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: Row(
                children: [
                  if (_step > 0)
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => setState(() => _step -= 1),
                        child: const Text('Back'),
                      ),
                    ),
                  if (_step > 0) const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: FilledButton(
                      onPressed: _primaryEnabled ? _onPrimary : null,
                      child: Text(_primaryLabel),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String get _primaryLabel =>
      _step < _finalStep ? 'Next' : 'Record wicket';

  bool get _primaryEnabled {
    if (_type == null) return false;
    if (_step < _finalStep) return true;
    return _lastWicket || _newBatter != null;
  }

  void _onPrimary() {
    if (_step < _finalStep) {
      setState(() => _step += 1);
      return;
    }
    _record();
  }
}

class _CombinedDetailsStep extends StatelessWidget {
  final String? type;
  final Innings innings;
  final List<String> bowlingSquad;
  final int runs;
  final bool outNonStriker;
  final String? fielder;
  final bool allowManual;
  final ValueChanged<String> onType;
  final ValueChanged<int> onRuns;
  final ValueChanged<bool> onOutNonStriker;
  final ValueChanged<String> onFielder;

  const _CombinedDetailsStep({
    required this.type,
    required this.innings,
    required this.bowlingSquad,
    required this.runs,
    required this.outNonStriker,
    required this.fielder,
    required this.allowManual,
    required this.onType,
    required this.onRuns,
    required this.onOutNonStriker,
    required this.onFielder,
  });

  bool get _needsFielder =>
      type == 'caught' || type == 'stumped' || type == 'runOut';

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        const SliverToBoxAdapter(child: _SectionLabel('How is the batter out?')),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final item in _WicketSheetState._dismissals)
                  ScoreSelectChip(
                    label: item.$2,
                    selected: type == item.$1,
                    onTap: () => onType(item.$1),
                  ),
              ],
            ),
          ),
        ),
        if (type == 'runOut') ...[
          const SliverToBoxAdapter(child: _SectionLabel('Who is out')),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  ScoreSelectChip(
                    label: innings.striker,
                    selected: !outNonStriker,
                    onTap: () => onOutNonStriker(false),
                  ),
                  ScoreSelectChip(
                    label: innings.nonStriker,
                    selected: outNonStriker,
                    onTap: () => onOutNonStriker(true),
                  ),
                ],
              ),
            ),
          ),
          const SliverToBoxAdapter(child: _SectionLabel('Runs completed')),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final n in [0, 1, 2, 3])
                    ScoreSelectChip(
                      label: '$n',
                      selected: runs == n,
                      onTap: () => onRuns(n),
                    ),
                ],
              ),
            ),
          ),
        ],
        if (_needsFielder) ...[
          SliverToBoxAdapter(
            child: _SectionLabel(type == 'stumped' ? 'Wicketkeeper' : 'Fielder'),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (bowlingSquad.isNotEmpty)
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final player in bowlingSquad)
                          ScoreSelectChip(
                            label: player,
                            selected: fielder == player,
                            onTap: () => onFielder(player),
                          ),
                      ],
                    ),
                  if (allowManual) ...[
                    const SizedBox(height: 10),
                    ManualNameRow(
                      hint: type == 'stumped'
                          ? 'Type wicketkeeper name'
                          : 'Type fielder name',
                      onSubmit: onFielder,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _BatterStep extends StatelessWidget {
  final List<String> players;
  final String? selected;
  final bool allowManual;
  final ValueChanged<String> onSelect;

  const _BatterStep({
    required this.players,
    required this.selected,
    required this.allowManual,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          allowManual
              ? 'Type the incoming batter, or pick a name already used in this match.'
              : 'Only players still to bat are listed.',
          style: TextStyle(color: Colors.grey[700], fontSize: 13),
        ),
        const SizedBox(height: 12),
        if (allowManual)
          ManualNameRow(
            hint: 'Type new batter name',
            onSubmit: onSelect,
          ),
        const SizedBox(height: 12),
        Expanded(
          child: players.isEmpty && !allowManual
              ? Center(
                  child: Text(
                    'No batters still to come in',
                    style: TextStyle(color: Colors.grey[700]),
                  ),
                )
              : SingleChildScrollView(
                  child: Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      for (final player in players)
                        ScoreSelectChip(
                          label: player,
                          selected: selected == player,
                          onTap: () => onSelect(player),
                        ),
                    ],
                  ),
                ),
        ),
      ],
    );
  }
}

class ManualNameRow extends StatefulWidget {
  final String hint;
  final ValueChanged<String> onSubmit;

  const ManualNameRow({
    super.key,
    required this.hint,
    required this.onSubmit,
  });

  @override
  State<ManualNameRow> createState() => _ManualNameRowState();
}

class _ManualNameRowState extends State<ManualNameRow> {
  final _controller = TextEditingController();

  void _submit() {
    final name = _controller.text.trim();
    if (name.isEmpty) return;
    widget.onSubmit(name);
    _controller.clear();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _controller,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(
              hintText: widget.hint,
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
    );
  }
}

class _SummaryChip extends StatelessWidget {
  final String label;
  const _SummaryChip({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: Theme.of(context).colorScheme.primary,
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text.toUpperCase(),
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.6,
          color: Color(0xFF64748b),
        ),
      ),
    );
  }
}

class ScoreSelectChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback? onTap;

  const ScoreSelectChip({
    super.key,
    required this.label,
    this.selected = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ChoiceChip(
      label: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: 13,
          height: 1.15,
          fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
        ),
      ),
      selected: selected,
      showCheckmark: false,
      visualDensity: const VisualDensity(horizontal: -1, vertical: -1),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      labelPadding: const EdgeInsets.symmetric(horizontal: 8),
      side: BorderSide(color: selected ? scheme.primary : Colors.grey.shade300),
      onSelected: onTap == null ? null : (_) => onTap!(),
    );
  }
}
