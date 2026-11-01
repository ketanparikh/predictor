import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/player_stats.dart';
import '../../theme/app_theme.dart';

class PlayerStatsScreen extends StatelessWidget {
  final PlayerStats player;
  final String sourceNote;

  const PlayerStatsScreen({
    super.key,
    required this.player,
    this.sourceNote =
        'Source: JCPL 4 registration name with matched career statistics.',
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        flexibleSpace: Container(
          decoration: const BoxDecoration(gradient: AppTheme.stadiumGradient),
        ),
        title: Text(player.name),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _PlayerHeader(player: player),
          const SizedBox(height: 16),
          if (!player.hasProfile)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Text(
                  'No CricHeroes profile found for this name.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey.shade600),
                ),
              ),
            )
          else ...[
            _HeadlineRow(player: player),
            const SizedBox(height: 16),
            _StatsSection(
              title: 'Batting',
              rows: [
                ('Innings', fmtInt(player.batting.innings)),
                ('Not out', fmtInt(player.batting.notOut)),
                ('Runs', fmtInt(player.batting.runs)),
                ('High score', dash(player.batting.highScore)),
                ('Average', fmtDec(player.batting.avg)),
                ('Strike rate', fmtDec(player.batting.sr)),
                (
                  '30s / 50s / 100s',
                  '${fmtInt(player.batting.thirties)} / ${fmtInt(player.batting.fifties)} / ${fmtInt(player.batting.hundreds)}'
                ),
                (
                  '4s / 6s',
                  '${fmtInt(player.batting.fours)} / ${fmtInt(player.batting.sixes)}'
                ),
                ('Ducks', fmtInt(player.batting.ducks)),
              ],
            ),
            _StatsSection(
              title: 'Bowling',
              rows: [
                ('Innings', fmtInt(player.bowling.innings)),
                ('Overs', dash(player.bowling.overs)),
                ('Wickets', fmtInt(player.bowling.wickets)),
                ('Runs conceded', fmtInt(player.bowling.runs)),
                ('Best', dash(player.bowling.best)),
                ('Economy', fmtDec(player.bowling.economy)),
                ('Average', fmtDec(player.bowling.avg)),
                ('Strike rate', fmtDec(player.bowling.sr)),
                ('Dot balls', fmtInt(player.bowling.dots)),
              ],
            ),
            _StatsSection(
              title: 'Fielding',
              rows: [
                ('Catches', fmtInt(player.fielding.catches)),
                ('Caught behind', fmtInt(player.fielding.caughtBehind)),
                ('Run outs', fmtInt(player.fielding.runOuts)),
                ('Assisted run outs', fmtInt(player.fielding.assistedRunOuts)),
                ('Stumpings', fmtInt(player.fielding.stumpings)),
                (
                  'Won / Lost',
                  '${fmtInt(player.batting.won)} / ${fmtInt(player.batting.loss)}'
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.only(top: 8, bottom: 16),
              child: Text(
                sourceNote,
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PlayerHeader extends StatelessWidget {
  final PlayerStats player;

  const _PlayerHeader({required this.player});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              player.name,
              style: GoogleFonts.barlowCondensed(
                fontSize: 26,
                fontWeight: FontWeight.w800,
                color: AppTheme.ink,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              [
                player.category,
                if (player.roleLine.isNotEmpty) player.roleLine,
              ].join(' · '),
              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeadlineRow extends StatelessWidget {
  final PlayerStats player;

  const _HeadlineRow({required this.player});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 16),
        child: Row(
          children: [
            _HeadlineStat(fmtInt(player.matches), 'Matches'),
            _HeadlineStat(fmtInt(player.batting.runs), 'Runs'),
            _HeadlineStat(fmtInt(player.bowling.wickets), 'Wickets'),
            _HeadlineStat(fmtInt(player.fielding.catches), 'Catches'),
          ],
        ),
      ),
    );
  }
}

class _HeadlineStat extends StatelessWidget {
  final String value;
  final String label;

  const _HeadlineStat(this.value, this.label);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: GoogleFonts.barlowCondensed(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: AppTheme.primaryColor,
            ),
          ),
          Text(
            label,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
        ],
      ),
    );
  }
}

class _StatsSection extends StatelessWidget {
  final String title;
  final List<(String, String)> rows;

  const _StatsSection({required this.title, required this.rows});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: GoogleFonts.barlowCondensed(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(height: 8),
            for (var i = 0; i < rows.length; i++)
              Container(
                color: i.isOdd
                    ? AppTheme.primaryColor.withValues(alpha: 0.04)
                    : Colors.transparent,
                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        rows[i].$1,
                        style: TextStyle(color: Colors.grey.shade700),
                      ),
                    ),
                    Text(
                      rows[i].$2,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

