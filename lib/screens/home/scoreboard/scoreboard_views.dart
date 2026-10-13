import 'package:flutter/material.dart';

import '../../../models/live_score.dart';

const Color kScoreboardNavy = Color(0xFF071A2B);
const Color kScoreboardGreen = Color(0xFF00C853);

class ScoreboardHeader extends StatelessWidget {
  final LiveScore score;

  const ScoreboardHeader({super.key, required this.score});

  @override
  Widget build(BuildContext context) {
    final inn = score.liveInnings;
    final batting = inn?.battingTeam ?? score.team1;
    final bowling = inn?.bowlingTeam ?? score.team2;
    final other = batting == score.team1 ? score.team2 : score.team1;

    return Container(
      width: double.infinity,
      color: kScoreboardNavy,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _StatusPill(score: score),
              if (score.isWeekendMatch) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: Colors.white24),
                  ),
                  child: const Text(
                    'WEEKEND',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.6,
                    ),
                  ),
                ),
              ],
              const Spacer(),
              if (score.matchTime != null)
                Text(
                  score.matchTime!,
                  style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12),
                ),
            ],
          ),
          const SizedBox(height: 12),
          _TeamScoreRow(
            name: batting,
            line: inn?.scoreLine ?? score.team1ScoreLine,
            batting: score.isLive,
          ),
          const SizedBox(height: 8),
          _TeamScoreRow(
            name: other,
            line: _otherLine(score, other, inn),
            batting: false,
          ),
          const SizedBox(height: 12),
          Text(
            _situation(score, inn, bowling),
            style: TextStyle(
              color: Colors.white.withOpacity(0.9),
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
          if (score.result != null && score.result!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              score.result!,
              style: const TextStyle(
                color: Color(0xFFfbbf24),
                fontWeight: FontWeight.w700,
                fontSize: 14,
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _otherLine(LiveScore score, String other, Innings? inn) {
    final otherInn = score.innings.where((i) => i.battingTeam == other).toList();
    if (otherInn.isNotEmpty) return otherInn.last.scoreLine;
    if (inn != null && inn.number == 1) return 'yet to bat';
    return score.team1 == other ? score.team1ScoreLine : score.team2ScoreLine;
  }

  String _situation(LiveScore score, Innings? inn, String bowling) {
    if (score.tossWinner != null) {
      final toss =
          '${score.tossWinner} won the toss${score.tossDecision != null ? ' and chose to ${score.tossDecision}' : ''}';
      if (inn == null) return toss;
    }
    if (inn == null) return 'Match yet to begin';
    if (inn.number == 1) {
      return 'CRR ${inn.crr.toStringAsFixed(2)}  •  ${score.maxOvers} overs a side';
    }
    final need = score.target - inn.runs;
    final ballsLeft = score.maxOvers * 6 - inn.legalBalls;
    if (need <= 0) return '${inn.battingTeam} have reached the target';
    final rrr = cricketRate(need, ballsLeft);
    return 'Target ${score.target}  •  Need $need from $ballsLeft balls  •  RRR ${rrr.toStringAsFixed(2)}';
  }
}

class _StatusPill extends StatelessWidget {
  final LiveScore score;
  const _StatusPill({required this.score});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;
    switch (score.status) {
      case 'live':
        color = const Color(0xFFdc2626);
        label = 'LIVE';
        break;
      case 'completed':
        color = kScoreboardGreen;
        label = 'RESULT';
        break;
      default:
        color = const Color(0xFFf59e0b);
        label = 'UPCOMING';
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.6,
        ),
      ),
    );
  }
}

class _TeamScoreRow extends StatelessWidget {
  final String name;
  final String line;
  final bool batting;

  const _TeamScoreRow({
    required this.name,
    required this.line,
    required this.batting,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (batting)
          const Padding(
            padding: EdgeInsets.only(right: 8),
            child: Icon(Icons.sports_cricket, color: Colors.redAccent, size: 16),
          ),
        Expanded(
          child: Text(
            name,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              height: 1.2,
              fontWeight: batting ? FontWeight.w800 : FontWeight.w500,
            ),
          ),
        ),
        Text(
          line,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}

class LiveInningsPanel extends StatelessWidget {
  final LiveScore score;
  const LiveInningsPanel({super.key, required this.score});

  @override
  Widget build(BuildContext context) {
    final inn = score.liveInnings;
    if (inn == null) {
      return const Padding(
        padding: EdgeInsets.all(24),
        child: Text('The scorer will start this match from the Score tab.'),
      );
    }
    final striker = inn.batterNamed(inn.striker);
    final nonStriker = inn.batterNamed(inn.nonStriker);
    final bowler = inn.bowlerNamed(inn.currentBowler);

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        _sectionTitle('Batting'),
        _batterTable(inn, striker, nonStriker),
        const SizedBox(height: 8),
        Text(
          'Partnership: ${inn.partnershipRuns} (${inn.partnershipBalls})',
          style: TextStyle(color: Colors.grey[700], fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 20),
        _sectionTitle('Bowling'),
        _bowlerTable(bowler),
        const SizedBox(height: 20),
        _sectionTitle('This over'),
        if (inn.thisOver.isEmpty)
          Text('Over about to start', style: TextStyle(color: Colors.grey[600]))
        else
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: inn.thisOver.map((t) => _BallChip(token: t)).toList(),
          ),
        if (inn.needsNewBowler) ...[
          const SizedBox(height: 16),
          const Text(
            'End of over — new bowler required',
            style: TextStyle(fontWeight: FontWeight.w700, color: Colors.orange),
          ),
        ],
      ],
    );
  }

  Widget _sectionTitle(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text.toUpperCase(),
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.8,
          color: Color(0xFF64748b),
        ),
      ),
    );
  }

  Widget _batterTable(
    Innings inn,
    BatterInnings? striker,
    BatterInnings? nonStriker,
  ) {
    return Card(
      margin: EdgeInsets.zero,
      child: Column(
        children: [
          const _TableHeader(cells: ['Batter', 'R', 'B', '4s', '6s', 'SR']),
          if (striker != null) _BatterRow(batter: striker, onStrike: true),
          if (nonStriker != null) _BatterRow(batter: nonStriker, onStrike: false),
        ],
      ),
    );
  }

  Widget _bowlerTable(BowlerSpell? bowler) {
    return Card(
      margin: EdgeInsets.zero,
      child: Column(
        children: [
          const _TableHeader(cells: ['Bowler', 'O', 'M', 'R', 'W', 'Wd', 'Nb', 'Econ'], numericWidth: 32),
          if (bowler != null) _BowlerRow(bowler: bowler, current: true),
        ],
      ),
    );
  }
}

class ScorecardView extends StatelessWidget {
  final LiveScore score;
  const ScorecardView({super.key, required this.score});

  @override
  Widget build(BuildContext context) {
    if (score.innings.isEmpty) {
      return const Center(child: Text('Scorecard will appear once play starts.'));
    }
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
        for (final inn in score.innings) ...[
          _InningsCard(innings: inn, squad: score.squadFor(inn.battingTeam)),
          const SizedBox(height: 16),
        ],
      ],
    );
  }
}

class _InningsCard extends StatelessWidget {
  final Innings innings;
  final List<String> squad;
  const _InningsCard({required this.innings, required this.squad});

  @override
  Widget build(BuildContext context) {
    final yetToBat = squad
        .where((p) => innings.batters.every(
              (b) => b.name.trim().toLowerCase() != p.trim().toLowerCase(),
            ))
        .toList();
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              color: kScoreboardNavy,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: Text(
                '${innings.number == 1 ? '1st innings' : '2nd innings'}  •  ${innings.battingTeam}',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const _TableHeader(cells: ['Batter', 'R', 'B', '4s', '6s', 'SR']),
            for (final b in innings.batters)
              _BatterRow(
                batter: b,
                onStrike: !b.out &&
                    (b.name == innings.striker || b.name == innings.nonStriker),
                showDismissal: true,
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 4),
              child: Text(
                'Extras: ${innings.extras}  (wd ${innings.wides}, nb ${innings.noBalls}, b ${innings.byes}, lb ${innings.legByes})',
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              ),
            ),
            if (yetToBat.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 8, 14, 4),
                child: Text(
                  'Yet to bat: ${yetToBat.join(', ')}',
                  style: TextStyle(color: Colors.grey[700], fontSize: 12),
                ),
              ),
            if (innings.fallOfWickets.isNotEmpty) ...[
              const Padding(
                padding: EdgeInsets.fromLTRB(14, 12, 14, 4),
                child: Text('Fall of wickets',
                    style: TextStyle(fontWeight: FontWeight.w700)),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: Text(
                  innings.fallOfWickets
                      .map((f) => '${f.score}-${f.wicket} (${f.batter}, ${f.overs} ov)')
                      .join('  •  '),
                  style: const TextStyle(fontSize: 12, height: 1.4),
                ),
              ),
            ],
            const SizedBox(height: 8),
            const _TableHeader(cells: ['Bowler', 'O', 'M', 'R', 'W', 'Wd', 'Nb', 'Econ'], numericWidth: 32),
            for (final b in innings.bowlers)
              _BowlerRow(
                bowler: b,
                current: !innings.completed && b.name == innings.currentBowler,
              ),
          ],
        ),
      ),
    );
  }
}

class CommentaryView extends StatelessWidget {
  final LiveScore score;
  const CommentaryView({super.key, required this.score});

  @override
  Widget build(BuildContext context) {
    final items = _commentaryItems(score);
    if (items.isEmpty) {
      return const Center(child: Text('Ball-by-ball commentary will appear here.'));
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        final summary = item.summary;
        if (summary != null) {
          return _OverSummaryBanner(summary: summary);
        }
        return _CommentaryBallTile(event: item.event!);
      },
    );
  }
}

class _CommentaryItem {
  final BallEvent? event;
  final _OverSummary? summary;
  const _CommentaryItem.ball(this.event) : summary = null;
  const _CommentaryItem.over(this.summary) : event = null;
}

class _OverSummary {
  final int overNumber;
  final int runs;
  final int wickets;
  final int totalRuns;
  final int totalWickets;
  final String battingTeam;
  final String bowler;
  final String thisOver;

  const _OverSummary({
    required this.overNumber,
    required this.runs,
    required this.wickets,
    required this.totalRuns,
    required this.totalWickets,
    required this.battingTeam,
    required this.bowler,
    required this.thisOver,
  });
}

List<_CommentaryItem> _commentaryItems(LiveScore score) {
  final items = <_CommentaryItem>[];
  for (final inn in score.innings) {
    var legal = 0;
    var totalRuns = 0;
    var totalWkts = 0;
    var overRuns = 0;
    var overWkts = 0;
    var bowler = inn.openingBowler;
    final tokens = <String>[];

    for (final event in inn.events) {
      final legalBall = event.kind != 'wide' && event.kind != 'noBall';
      final teamRuns = _eventTeamRuns(event);
      totalRuns += teamRuns;
      overRuns += teamRuns;
      if (event.wicket != null) {
        totalWkts += 1;
        overWkts += 1;
      }
      if (event.bowler != null && event.bowler!.isNotEmpty) {
        bowler = event.bowler!;
      }
      tokens.add(_eventToken(event));
      items.add(_CommentaryItem.ball(event));

      if (!legalBall) continue;
      legal += 1;
      if (legal % 6 != 0) continue;

      items.add(
        _CommentaryItem.over(
          _OverSummary(
            overNumber: legal ~/ 6,
            runs: overRuns,
            wickets: overWkts,
            totalRuns: totalRuns,
            totalWickets: totalWkts,
            battingTeam: inn.battingTeam,
            bowler: bowler,
            thisOver: tokens.join('  '),
          ),
        ),
      );
      overRuns = 0;
      overWkts = 0;
      tokens.clear();
    }
  }
  return items.reversed.toList();
}

int _eventTeamRuns(BallEvent event) {
  switch (event.kind) {
    case 'wide':
    case 'noBall':
      return 1 + event.runs;
    default:
      return event.runs;
  }
}

String _eventToken(BallEvent event) {
  if (event.wicket != null) {
    if (event.kind == 'wide') return 'wd W';
    if (event.kind == 'noBall') return event.runs > 0 ? 'nb+${event.runs} W' : 'nb W';
    if (event.runs > 0) return '${event.runs} W';
    return 'W';
  }
  switch (event.kind) {
    case 'wide':
      return event.runs > 0 ? 'wd+${event.runs}' : 'wd';
    case 'noBall':
      return event.runs > 0 ? 'nb+${event.runs}' : 'nb';
    case 'bye':
      return event.runs == 0 ? 'b' : '${event.runs}b';
    case 'legBye':
      return event.runs == 0 ? 'lb' : '${event.runs}lb';
    default:
      return event.runs == 0 ? '.' : '${event.runs}';
  }
}

class _OverSummaryBanner extends StatelessWidget {
  final _OverSummary summary;
  const _OverSummaryBanner({required this.summary});

  @override
  Widget build(BuildContext context) {
    final runLabel = summary.runs == 0
        ? 'maiden'
        : '${summary.runs} run${summary.runs == 1 ? '' : 's'}';
    final wicketLabel = summary.wickets == 0
        ? ''
        : ', ${summary.wickets} wicket${summary.wickets == 1 ? '' : 's'}';
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: 10),
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: kScoreboardNavy,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'END OF OVER ${summary.overNumber}',
            style: const TextStyle(
              color: Color(0xFFfbbf24),
              fontSize: 12,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '$runLabel$wicketLabel',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            '${summary.battingTeam}  ${summary.totalRuns}/${summary.totalWickets}  (${summary.overNumber} ov)',
            style: const TextStyle(color: Colors.white, fontSize: 13),
          ),
          if (summary.bowler.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              summary.bowler,
              style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 12),
            ),
          ],
          if (summary.thisOver.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              summary.thisOver,
              style: const TextStyle(
                color: Color(0xFFfbbf24),
                fontSize: 13,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.4,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _CommentaryBallTile extends StatelessWidget {
  final BallEvent event;
  const _CommentaryBallTile({required this.event});

  @override
  Widget build(BuildContext context) {
    final isWicket = event.wicket != null;
    final isBoundary = event.kind == 'legal' && (event.runs == 4 || event.runs == 6);
    return Column(
      children: [
        ListTile(
          dense: true,
          contentPadding: EdgeInsets.zero,
          leading: CircleAvatar(
            radius: 16,
            backgroundColor: isWicket
                ? Colors.red.shade100
                : isBoundary
                    ? Colors.green.shade100
                    : Colors.grey.shade200,
            child: Text(
              isWicket
                  ? 'W'
                  : event.kind == 'wide'
                      ? 'wd'
                      : event.kind == 'noBall'
                          ? 'nb'
                          : event.runs == 0
                              ? '.'
                              : '${event.runs}',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: isWicket ? Colors.red : Colors.black87,
              ),
            ),
          ),
          title: Text(
            event.commentary.isEmpty
                ? '${event.bowler} to ${event.batsman}'
                : event.commentary,
            style: TextStyle(
              fontWeight: isWicket || isBoundary ? FontWeight.w700 : FontWeight.w500,
              fontSize: 13,
            ),
          ),
        ),
        const Divider(height: 1),
      ],
    );
  }
}

class _TableHeader extends StatelessWidget {
  final List<String> cells;
  final double numericWidth;
  const _TableHeader({required this.cells, this.numericWidth = 40});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFe2e8f0),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: [
          Expanded(
            flex: 5,
            child: Text(cells.first,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
          ),
          for (final cell in cells.skip(1))
            SizedBox(
              width: numericWidth,
              child: Text(
                cell,
                textAlign: TextAlign.right,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
              ),
            ),
        ],
      ),
    );
  }
}

class _BatterRow extends StatelessWidget {
  final BatterInnings batter;
  final bool onStrike;
  final bool showDismissal;

  const _BatterRow({
    required this.batter,
    required this.onStrike,
    this.showDismissal = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: [
          Expanded(
            flex: 5,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${batter.name}${onStrike && !batter.out ? ' *' : ''}',
                  style: TextStyle(
                    fontWeight: onStrike && !batter.out
                        ? FontWeight.w800
                        : FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                if (showDismissal)
                  Text(
                    batter.out
                        ? (batter.dismissal ?? 'out')
                        : (batter.balls == 0 && batter.runs == 0
                            ? 'not out'
                            : 'not out'),
                    style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                  ),
              ],
            ),
          ),
          _num(batter.runs.toString(), bold: true),
          _num('${batter.balls}'),
          _num('${batter.fours}'),
          _num('${batter.sixes}'),
          _num(batter.sr.toStringAsFixed(1)),
        ],
      ),
    );
  }
}

class _BowlerRow extends StatelessWidget {
  final BowlerSpell bowler;
  final bool current;
  const _BowlerRow({required this.bowler, required this.current});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: [
          Expanded(
            flex: 5,
            child: Text(
              '${bowler.name}${current ? ' *' : ''}',
              style: TextStyle(
                fontWeight: current ? FontWeight.w800 : FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ),
          _num(bowler.overs, width: 32),
          _num('${bowler.maidens}', width: 32),
          _num('${bowler.runs}', width: 32),
          _num('${bowler.wickets}', bold: true, width: 32),
          _num('${bowler.wides}', width: 32),
          _num('${bowler.noBalls}', width: 32),
          _num(bowler.econ.toStringAsFixed(1), width: 32),
        ],
      ),
    );
  }
}

Widget _num(String value, {bool bold = false, double width = 40}) {
  return SizedBox(
    width: width,
    child: Text(
      value,
      textAlign: TextAlign.right,
      style: TextStyle(
        fontSize: 13,
        fontWeight: bold ? FontWeight.w800 : FontWeight.w500,
      ),
    ),
  );
}

class _BallChip extends StatelessWidget {
  final String token;
  const _BallChip({required this.token});

  @override
  Widget build(BuildContext context) {
    final isWicket = token.contains('W');
    final isFour = token == '4';
    final isSix = token == '6';
    Color bg = const Color(0xFFe2e8f0);
    Color fg = Colors.black87;
    if (isWicket) {
      bg = Colors.red;
      fg = Colors.white;
    } else if (isSix) {
      bg = const Color(0xFF7c3aed);
      fg = Colors.white;
    } else if (isFour) {
      bg = kScoreboardGreen;
      fg = Colors.white;
    }
    return ConstrainedBox(
      constraints: const BoxConstraints(minWidth: 32),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(16),
        ),
        alignment: Alignment.center,
        child: Text(
          token,
          style: TextStyle(color: fg, fontWeight: FontWeight.w800, fontSize: 12),
        ),
      ),
    );
  }
}
