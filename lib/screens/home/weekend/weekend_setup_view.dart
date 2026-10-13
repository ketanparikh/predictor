import 'package:flutter/material.dart';

import '../../../models/live_score.dart';
import '../../../services/live_score_service.dart';
import 'weekend_team_sheet_screen.dart';

class WeekendSetupView extends StatefulWidget {
  final List<LiveScore> matches;
  final bool isAdmin;

  const WeekendSetupView({
    super.key,
    required this.matches,
    required this.isAdmin,
  });

  @override
  State<WeekendSetupView> createState() => _WeekendSetupViewState();
}

class _WeekendSetupViewState extends State<WeekendSetupView> {
  final _service = LiveScoreService();
  final _team1 = TextEditingController();
  final _team2 = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _team1.dispose();
    _team2.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    final name1 = _team1.text.trim();
    final name2 = _team2.text.trim();
    if (name1.isEmpty || name2.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter both team names')),
      );
      return;
    }
    setState(() => _saving = true);
    final now = DateTime.now();
    final score = LiveScore(
      matchId: 'weekend_${now.millisecondsSinceEpoch}',
      team1: name1,
      team2: name2,
      dayName: 'Weekend',
      isWeekendMatch: true,
    );
    try {
      await _service.saveScore(score);
      _team1.clear();
      _team2.clear();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not create match. $e')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _deleteMatch(LiveScore score) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete weekend match?'),
        content: Text('${score.team1} vs ${score.team2} will be removed.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await _service.deleteScore(score.matchId);
  }

  Future<void> _deleteTeam(LiveScore score, int side) async {
    final name = side == 1 ? score.team1 : score.team2;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete team?'),
        content: Text(
          name.isEmpty
              ? 'Remove this team from the match?'
              : 'Delete $name and its team sheet?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await _service.clearWeekendTeam(score.matchId, side);
  }

  Future<void> _saveTeamName(LiveScore score, int side, String name) async {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return;
    final latest = await _service.getScore(score.matchId) ?? score;
    final other = side == 1 ? latest.team2 : latest.team1;
    if (trimmed.toLowerCase() == other.toLowerCase()) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Team names must be different')),
      );
      return;
    }
    await _service.saveWeekendTeamName(score.matchId, side, trimmed);
  }

  Future<void> _openSheet(LiveScore score, int side) async {
    final latest = await _service.getScore(score.matchId) ?? score;
    if (!mounted) return;
    final name = side == 1 ? latest.team1 : latest.team2;
    if (name.trim().isEmpty) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => WeekendTeamSheetScreen(score: latest, side: side),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
      children: [
        Text(
          'Enter two team names, then tap a team to fill its sheet. The match appears on Live after both sheets are submitted.',
          style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey[700]),
        ),
        if (widget.isAdmin) ...[
          const SizedBox(height: 16),
          TextField(
            controller: _team1,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(labelText: 'Team 1 name'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _team2,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(labelText: 'Team 2 name'),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _saving ? null : _create,
            child: _saving
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Create weekend match'),
          ),
        ],
        const SizedBox(height: 24),
        Text(
          'Weekend matches',
          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        if (widget.matches.isEmpty)
          Text(
            'No weekend matches yet',
            style: TextStyle(color: Colors.grey[600]),
          )
        else
          ...widget.matches.map((score) => _WeekendMatchCard(
                score: score,
                isAdmin: widget.isAdmin,
                onOpenSheet: (side) => _openSheet(score, side),
                onDeleteMatch: () => _deleteMatch(score),
                onDeleteTeam: (side) => _deleteTeam(score, side),
                onSaveTeamName: (side, name) => _saveTeamName(score, side, name),
              )),
      ],
    );
  }
}

class _WeekendMatchCard extends StatelessWidget {
  final LiveScore score;
  final bool isAdmin;
  final ValueChanged<int> onOpenSheet;
  final VoidCallback onDeleteMatch;
  final ValueChanged<int> onDeleteTeam;
  final void Function(int side, String name) onSaveTeamName;

  const _WeekendMatchCard({
    required this.score,
    required this.isAdmin,
    required this.onOpenSheet,
    required this.onDeleteMatch,
    required this.onDeleteTeam,
    required this.onSaveTeamName,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    score.weekendSheetsReady
                        ? 'Ready on Live'
                        : 'Waiting for team sheets',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: score.weekendSheetsReady
                          ? Colors.green.shade700
                          : Colors.orange.shade800,
                    ),
                  ),
                ),
                if (isAdmin)
                  IconButton(
                    tooltip: 'Delete match',
                    onPressed: onDeleteMatch,
                    icon: const Icon(Icons.delete_outline),
                  ),
              ],
            ),
            _TeamRow(
              key: ValueKey('${score.matchId}-1-${score.team1}'),
              name: score.team1,
              players: score.team1Squad.length,
              submitted: score.team1SheetSubmitted,
              onTap: isAdmin && score.team1.trim().isNotEmpty
                  ? () => onOpenSheet(1)
                  : null,
              onDelete: isAdmin ? () => onDeleteTeam(1) : null,
              onSaveName: (name) => onSaveTeamName(1, name),
            ),
            const SizedBox(height: 8),
            _TeamRow(
              key: ValueKey('${score.matchId}-2-${score.team2}'),
              name: score.team2,
              players: score.team2Squad.length,
              submitted: score.team2SheetSubmitted,
              onTap: isAdmin && score.team2.trim().isNotEmpty
                  ? () => onOpenSheet(2)
                  : null,
              onDelete: isAdmin ? () => onDeleteTeam(2) : null,
              onSaveName: (name) => onSaveTeamName(2, name),
            ),
          ],
        ),
      ),
    );
  }
}

class _TeamRow extends StatefulWidget {
  final String name;
  final int players;
  final bool submitted;
  final VoidCallback? onTap;
  final VoidCallback? onDelete;
  final ValueChanged<String> onSaveName;

  const _TeamRow({
    super.key,
    required this.name,
    required this.players,
    required this.submitted,
    required this.onTap,
    required this.onDelete,
    required this.onSaveName,
  });

  @override
  State<_TeamRow> createState() => _TeamRowState();
}

class _TeamRowState extends State<_TeamRow> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final empty = widget.name.trim().isEmpty;
    return Material(
      color: Colors.grey.shade100,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        child: empty
              ? Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        textCapitalization: TextCapitalization.words,
                        decoration: const InputDecoration(
                          hintText: 'Enter team name',
                          isDense: true,
                          border: InputBorder.none,
                        ),
                        onSubmitted: widget.onSaveName,
                      ),
                    ),
                    FilledButton(
                      onPressed: () => widget.onSaveName(_controller.text),
                      child: const Text('Save'),
                    ),
                  ],
                )
              : Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: widget.onTap,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.name,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 16,
                              ),
                            ),
                            Text(
                              widget.submitted
                                  ? '${widget.players} players  •  submitted'
                                  : '${widget.players} players  •  tap to enter sheet',
                              style: TextStyle(
                                color: Colors.grey[700],
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (widget.onDelete != null)
                      IconButton(
                        tooltip: 'Delete team',
                        onPressed: widget.onDelete,
                        icon: const Icon(Icons.close),
                      ),
                    Icon(
                      widget.submitted ? Icons.check_circle : Icons.chevron_right,
                      color: widget.submitted ? Colors.green : Colors.grey,
                    ),
                  ],
                ),
      ),
    );
  }
}
