import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../models/live_score.dart';
import '../../../models/tournament.dart';
import '../../../providers/admin_provider.dart';
import '../../../providers/auction_provider.dart';
import '../../../services/live_score_service.dart';
import '../../../services/team_roster_service.dart';
import '../../../theme/app_theme.dart';
import 'scoreboard_views.dart';
import 'scoring_console.dart';

class MatchScoreboardScreen extends StatefulWidget {
  final MatchInfo match;
  final String dayName;
  final LiveScore initial;

  const MatchScoreboardScreen({
    super.key,
    required this.match,
    required this.dayName,
    required this.initial,
  });

  @override
  State<MatchScoreboardScreen> createState() => _MatchScoreboardScreenState();
}

class _MatchScoreboardScreenState extends State<MatchScoreboardScreen> {
  final LiveScoreService _service = LiveScoreService();
  final TeamRosterService _rosters = TeamRosterService();
  bool _saving = false;
  String? _error;
  LiveScore? _pending;
  LiveScore? _lastShown;
  LiveScore? _undoSnapshot;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _rosters.load();
      if (mounted) {
        await Provider.of<AuctionProvider>(context, listen: false).loadTeams();
      }
      if (mounted) setState(() {});
    });
  }

  Future<void> _save(LiveScore next, {bool fromUndo = false}) async {
    setState(() {
      if (!fromUndo && _lastShown != null) {
        _undoSnapshot = _lastShown;
      } else if (fromUndo) {
        _undoSnapshot = null;
      }
      _pending = next;
      _saving = true;
      _error = null;
    });
    try {
      await _service.saveScore(next);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Could not save score. $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not save score. $e')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _undo() async {
    final previous = _undoSnapshot;
    if (previous == null) return;
    await _save(previous, fromUndo: true);
  }

  LiveScore _merged(LiveScore? remote) {
    final initial = widget.initial;
    final base = remote ?? initial;
    final weekend = base.isWeekendMatch || initial.isWeekendMatch;
    if (weekend) {
      return base.copyWith(
        dayName: base.dayName ?? widget.dayName,
        matchTime: base.matchTime ?? widget.match.time,
        isWeekendMatch: true,
      );
    }
    return base.copyWith(
      team1: base.team1.isEmpty ? initial.team1 : base.team1,
      team2: base.team2.isEmpty ? initial.team2 : base.team2,
      dayName: base.dayName ?? widget.dayName,
      matchTime: base.matchTime ?? widget.match.time,
    );
  }

  LiveScore _withPending(LiveScore remote) {
    final pending = _pending;
    if (pending == null) return remote;
    if (remote.isWeekendMatch && !remote.hasStarted && pending.hasStarted) {
      return remote;
    }
    if (pending.innings.length < remote.innings.length) return remote;
    if (remote.isWeekendMatch || pending.isWeekendMatch) {
      return pending.copyWith(
        team1: remote.team1,
        team2: remote.team2,
        team1Squad: List<String>.from(remote.team1Squad),
        team2Squad: List<String>.from(remote.team2Squad),
        team1SheetSubmitted: remote.team1SheetSubmitted,
        team2SheetSubmitted: remote.team2SheetSubmitted,
        isWeekendMatch: true,
      );
    }
    return pending;
  }

  LiveScore _withAuctionSquads(LiveScore score, AuctionProvider auction) {
    if (score.isWeekendMatch) {
      return score;
    }
    List<String> squad(String teamName, List<String> existing) {
      final fromProfile = _rosters.playersFor(
        teamName,
        auctionTeams: auction.teams,
      );
      final merged = <String>[];
      void addAll(Iterable<String> names) {
        for (final name in names) {
          final trimmed = name.trim();
          if (trimmed.isEmpty) continue;
          if (!merged.any((p) => p.toLowerCase() == trimmed.toLowerCase())) {
            merged.add(trimmed);
          }
        }
      }

      addAll(fromProfile);
      addAll(existing);
      merged.sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));
      return merged;
    }

    return score.copyWith(
      team1Squad: squad(score.team1, score.team1Squad),
      team2Squad: squad(score.team2, score.team2Squad),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isAdmin = Provider.of<AdminProvider>(context).isAdmin;
    final auction = Provider.of<AuctionProvider>(context);
    final tabCount = isAdmin ? 4 : 3;

    return DefaultTabController(
      length: tabCount,
      child: StreamBuilder<LiveScore?>(
        stream: _service.watchScore(widget.match.id),
        builder: (context, snapshot) {
          var score = _withPending(_merged(snapshot.data));
          score = _withAuctionSquads(score, auction);
          _lastShown = score;

          return Scaffold(
            backgroundColor: AppTheme.backgroundColor,
            appBar: AppBar(
              automaticallyImplyLeading: false,
              leading: IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white),
                tooltip: 'Back',
                onPressed: () => Navigator.of(context).maybePop(),
              ),
              titleSpacing: 8,
              title: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  '${score.team1} vs ${score.team2}',
                  maxLines: 2,
                  textAlign: TextAlign.left,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                  ),
                ),
              ),
              flexibleSpace: Container(
                decoration: const BoxDecoration(
                  gradient: AppTheme.stadiumGradient,
                ),
              ),
              bottom: TabBar(
                isScrollable: true,
                indicatorColor: Colors.white,
                labelColor: Colors.white,
                unselectedLabelColor: Colors.white70,
                tabs: [
                  const Tab(text: 'Live'),
                  const Tab(text: 'Scorecard'),
                  const Tab(text: 'Commentary'),
                  if (isAdmin) const Tab(text: 'Score'),
                ],
              ),
            ),
            body: Column(
              children: [
                ScoreboardHeader(score: score),
                Container(
                  width: double.infinity,
                  color: kScoreboardNavy,
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                  child: Text(
                    '${widget.dayName}${widget.match.time != null ? '  •  ${widget.match.time}' : ''}${score.isWeekendMatch ? '  •  Weekend' : ''}  •  JCPL-4',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.65),
                      fontSize: 12,
                    ),
                  ),
                ),
                Expanded(
                  child: TabBarView(
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      LiveInningsPanel(score: score),
                      ScorecardView(score: score),
                      CommentaryView(score: score),
                      if (isAdmin)
                        ScoringConsole(
                          score: score,
                          saving: _saving,
                          error: _error,
                          canUndo: _undoSnapshot != null,
                          onSave: _save,
                          onUndo: _undo,
                        ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
