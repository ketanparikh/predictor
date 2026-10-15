import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/player_stats.dart';
import '../../theme/app_theme.dart';

const statsNameFlex = 3;
const statsStatFlex = 1;

class StatsTableHeader extends StatelessWidget {
  const StatsTableHeader({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppTheme.primaryColor.withValues(alpha: 0.08),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: const Row(
        children: [
          Expanded(
              flex: statsNameFlex,
              child: _HeaderCell('Player', alignStart: true)),
          Expanded(flex: statsStatFlex, child: _HeaderCell('M')),
          Expanded(flex: statsStatFlex, child: _HeaderCell('Runs')),
          Expanded(flex: statsStatFlex, child: _HeaderCell('Avg')),
          Expanded(flex: statsStatFlex, child: _HeaderCell('SR')),
          Expanded(flex: statsStatFlex, child: _HeaderCell('Wkts')),
          Expanded(flex: statsStatFlex, child: _HeaderCell('Econ')),
          Expanded(flex: statsStatFlex, child: _HeaderCell('Ct')),
        ],
      ),
    );
  }
}

class _HeaderCell extends StatelessWidget {
  final String label;
  final bool alignStart;

  const _HeaderCell(this.label, {this.alignStart = false});

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      textAlign: alignStart ? TextAlign.start : TextAlign.center,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: GoogleFonts.outfit(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        color: AppTheme.primaryColor,
      ),
    );
  }
}

class StatsTableRow extends StatelessWidget {
  final PlayerStats player;
  final bool striped;
  final VoidCallback onTap;
  final String? subtitle;

  const StatsTableRow({
    super.key,
    required this.player,
    required this.striped,
    required this.onTap,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    final b = player.batting;
    final bowl = player.bowling;
    return Material(
      color: striped
          ? AppTheme.primaryColor.withValues(alpha: 0.03)
          : Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Expanded(
                flex: statsNameFlex,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      player.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                    if (subtitle != null && subtitle!.isNotEmpty)
                      Text(
                        subtitle!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey.shade600,
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(
                  flex: statsStatFlex, child: _StatCell(fmtInt(player.matches))),
              Expanded(flex: statsStatFlex, child: _StatCell(fmtInt(b.runs))),
              Expanded(flex: statsStatFlex, child: _StatCell(fmtDec(b.avg))),
              Expanded(flex: statsStatFlex, child: _StatCell(fmtDec(b.sr))),
              Expanded(
                  flex: statsStatFlex, child: _StatCell(fmtInt(bowl.wickets))),
              Expanded(
                  flex: statsStatFlex, child: _StatCell(fmtDec(bowl.economy))),
              Expanded(
                  flex: statsStatFlex,
                  child: _StatCell(fmtInt(player.fielding.catches))),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatCell extends StatelessWidget {
  final String value;

  const _StatCell(this.value);

  @override
  Widget build(BuildContext context) {
    return Text(
      value,
      textAlign: TextAlign.center,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(
        fontSize: 12,
        color: value == '—' ? Colors.grey.shade400 : AppTheme.ink,
      ),
    );
  }
}
