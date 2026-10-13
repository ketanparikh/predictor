import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../models/live_score.dart';
import '../../../providers/auction_provider.dart';
import '../../../services/live_score_service.dart';
import '../../../widgets/game_page.dart';

class WeekendTeamSheetScreen extends StatefulWidget {
  final LiveScore score;
  final int side;

  const WeekendTeamSheetScreen({
    super.key,
    required this.score,
    required this.side,
  });

  @override
  State<WeekendTeamSheetScreen> createState() => _WeekendTeamSheetScreenState();
}

class _WeekendTeamSheetScreenState extends State<WeekendTeamSheetScreen> {
  final _service = LiveScoreService();
  final _name = TextEditingController();
  TextEditingController? _search;
  late List<String> _players;
  late bool _submitted;
  late String _teamName;
  bool _saving = false;
  bool _wiped = false;
  Future<void> _writes = Future.value();

  @override
  void initState() {
    super.initState();
    _players = List<String>.from(
      widget.side == 1 ? widget.score.team1Squad : widget.score.team2Squad,
    );
    _submitted = widget.side == 1
        ? widget.score.team1SheetSubmitted
        : widget.score.team2SheetSubmitted;
    _teamName = widget.side == 1 ? widget.score.team1 : widget.score.team2;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auction = Provider.of<AuctionProvider>(context, listen: false);
      auction.loadParticipants();
      auction.loadTeams();
      _hydrate();
    });
  }

  Future<void> _hydrate() async {
    final latest = await _service.getScore(widget.score.matchId);
    if (!mounted || latest == null || _wiped) return;
    final name = widget.side == 1 ? latest.team1 : latest.team2;
    if (name.trim().isEmpty) {
      Navigator.of(context).pop();
      return;
    }
    final remotePlayers = List<String>.from(
      widget.side == 1 ? latest.team1Squad : latest.team2Squad,
    );
    if (_players.length > remotePlayers.length) return;
    setState(() {
      _teamName = name;
      _players = remotePlayers;
      _submitted = widget.side == 1
          ? latest.team1SheetSubmitted
          : latest.team2SheetSubmitted;
    });
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  List<String> _auctionNames(AuctionProvider auction) {
    final names = <String>{};
    names.addAll(auction.mensParticipants);
    for (final team in auction.teams) {
      names.addAll(team.players);
    }
    final list = names
        .map((name) => name.trim())
        .where((name) => name.isNotEmpty)
        .toList()
      ..sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));
    return list;
  }

  bool _sameSquad(List<String> left, List<String> right) {
    if (left.length != right.length) return false;
    final a = left.map((e) => e.trim().toLowerCase()).toList()..sort();
    final b = right.map((e) => e.trim().toLowerCase()).toList()..sort();
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  Future<void> _enqueue(Future<void> Function() write) {
    final next = _writes.then((_) => write());
    _writes = next.catchError((_) {});
    return next;
  }

  Future<void> _persist({required bool submitted}) {
    return _enqueue(() async {
      if (_wiped) return;
      if (mounted) setState(() => _saving = true);
      try {
        final latest =
            await _service.getScore(widget.score.matchId) ?? widget.score;
        if (_wiped) return;
        final name = widget.side == 1 ? latest.team1 : latest.team2;
        if (name.trim().isEmpty) return;
        final squadChanged = !_sameSquad(
          widget.side == 1 ? latest.team1Squad : latest.team2Squad,
          _players,
        );
        final base = (submitted || squadChanged || latest.hasStarted)
            ? latest.resetPlay()
            : latest;
        final next = widget.side == 1
            ? base.copyWith(
                team1Squad: List<String>.from(_players),
                team1SheetSubmitted: submitted,
              )
            : base.copyWith(
                team2Squad: List<String>.from(_players),
                team2SheetSubmitted: submitted,
              );
        await _service.saveScore(next);
        if (mounted && !_wiped) setState(() => _submitted = submitted);
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not save sheet. $e')),
        );
      } finally {
        if (mounted) setState(() => _saving = false);
      }
    });
  }

  void _addName(String raw) {
    final name = raw.trim();
    if (name.isEmpty) return;
    if (_players.any((p) => p.toLowerCase() == name.toLowerCase())) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('That player is already on the sheet')),
      );
      return;
    }
    setState(() {
      _players.add(name);
      _submitted = false;
    });
    _name.clear();
    _persist(submitted: false);
  }

  Future<void> _edit(int index) async {
    final current = _players[index];
    final controller = TextEditingController(text: current);
    final next = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Edit player'),
        content: TextField(
          controller: controller,
          autofocus: true,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(labelText: 'Name'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (next == null || next.isEmpty || next == current) return;
    if (_players.asMap().entries.any(
          (e) => e.key != index && e.value.toLowerCase() == next.toLowerCase(),
        )) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('That player is already on the sheet')),
      );
      return;
    }
    setState(() {
      _players[index] = next;
      _submitted = false;
    });
    await _persist(submitted: false);
  }

  Future<void> _remove(int index) async {
    setState(() {
      _players.removeAt(index);
      _submitted = false;
    });
    await _persist(submitted: false);
  }

  Future<void> _deleteTeam() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete team?'),
        content: Text(
          'Delete $_teamName and its team sheet? You can enter a new team name on the Weekend page.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete team'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    setState(() {
      _wiped = true;
      _players = [];
      _submitted = false;
      _saving = true;
    });
    try {
      await _enqueue(() => _service.clearWeekendTeam(widget.score.matchId, widget.side));
      if (!mounted) return;
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _wiped = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not delete team. $e')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _submit() async {
    if (_players.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add at least 2 players before submitting')),
      );
      return;
    }
    await _persist(submitted: true);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$_teamName sheet submitted')),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final auction = Provider.of<AuctionProvider>(context);
    final auctionNames = _auctionNames(auction);

    return Scaffold(
      appBar: GameAppBar(
        title: _teamName.isEmpty ? 'Team sheet' : _teamName,
        actions: [
          IconButton(
            tooltip: 'Delete team',
            onPressed: _saving ? null : _deleteTeam,
            icon: const Icon(Icons.delete_outline, color: Colors.white),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          Text(
            _submitted
                ? 'Sheet submitted. You can still edit names, then submit again.'
                : 'Search the auction list or type a name that is not in the list.',
            style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey[700]),
          ),
          const SizedBox(height: 8),
          Text(
            '${_players.length} player${_players.length == 1 ? '' : 's'}'
            '${_submitted ? '  •  submitted' : '  •  draft'}',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              color: _submitted ? Colors.green.shade700 : Colors.orange.shade800,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Auction players',
            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          Autocomplete<String>(
            optionsBuilder: (value) {
              final query = value.text.trim().toLowerCase();
              final available = auctionNames.where(
                (name) => !_players.any((p) => p.toLowerCase() == name.toLowerCase()),
              );
              if (query.isEmpty) return available.take(20);
              return available.where((name) => name.toLowerCase().contains(query));
            },
            onSelected: (selection) {
              _addName(selection);
              WidgetsBinding.instance.addPostFrameCallback((_) {
                _search?.clear();
              });
            },
            fieldViewBuilder: (context, controller, focusNode, onFieldSubmitted) {
              _search = controller;
              return TextField(
                controller: controller,
                focusNode: focusNode,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(
                  labelText: 'Search player',
                  hintText: 'Type a few letters',
                  prefixIcon: Icon(Icons.search),
                ),
              );
            },
            optionsViewBuilder: (context, onSelected, options) {
              return Align(
                alignment: Alignment.topLeft,
                child: Material(
                  elevation: 4,
                  borderRadius: BorderRadius.circular(12),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 240, maxWidth: 420),
                    child: ListView.builder(
                      padding: EdgeInsets.zero,
                      shrinkWrap: true,
                      itemCount: options.length,
                      itemBuilder: (context, index) {
                        final option = options.elementAt(index);
                        return ListTile(
                          dense: true,
                          title: Text(option),
                          onTap: () => onSelected(option),
                        );
                      },
                    ),
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 20),
          Text(
            'Player not in auction list',
            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _name,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(
                    labelText: 'Manual player name',
                    hintText: 'Type a name not in the auction',
                  ),
                  onSubmitted: (_) => _addName(_name.text),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: () => _addName(_name.text),
                child: const Text('Add'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_players.isEmpty)
            Text(
              'No players yet',
              style: TextStyle(color: Colors.grey[600]),
            )
          else
            ..._players.asMap().entries.map((entry) {
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  title: Text(entry.value),
                  onTap: () => _edit(entry.key),
                  trailing: IconButton(
                    tooltip: 'Remove',
                    icon: const Icon(Icons.close),
                    onPressed: () => _remove(entry.key),
                  ),
                ),
              );
            }),
          const SizedBox(height: 20),
          if (_saving) const LinearProgressIndicator(),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _saving ? null : _submit,
            child: const Text('Submit team sheet'),
          ),
        ],
      ),
    );
  }
}
