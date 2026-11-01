import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/player_stats.dart';
import '../../services/player_stats_service.dart';
import '../../theme/app_theme.dart';
import 'player_stats_screen.dart';
import 'stats_table.dart';
import 'tournament_stats_screen.dart';

enum StatsCategory {
  mens('Mens', 'JCPL 4 registered men', Icons.man, AppTheme.electricBlue),
  womens('Womens', 'JCPL 4 registered women', Icons.woman,
      AppTheme.accentColor),
  boys('Boys', 'JCPL 4 registered boys', Icons.boy, AppTheme.cricketOrange),
  girls('Girls', 'JCPL 4 registered girls', Icons.girl,
      AppTheme.secondaryColor),
  tournament('Tournament', 'Overall tournament records & leaders',
      Icons.emoji_events, AppTheme.primaryColor);

  final String label;
  final String subtitle;
  final IconData icon;
  final Color color;

  const StatsCategory(this.label, this.subtitle, this.icon, this.color);
}

class StatsTab extends StatelessWidget {
  const StatsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 12),
          child: Text(
            'STATS',
            style: GoogleFonts.barlowCondensed(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              letterSpacing: 1,
              color: AppTheme.primaryColor,
            ),
          ),
        ),
        for (final category in StatsCategory.values)
          _StatsCategoryCard(category: category),
      ],
    );
  }
}

class _StatsCategoryCard extends StatelessWidget {
  final StatsCategory category;

  const _StatsCategoryCard({required this.category});

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => StatsCategoryScreen(category: category),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: category.color.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Icon(category.icon, color: category.color, size: 30),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      category.label,
                      style: GoogleFonts.barlowCondensed(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.ink,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      category.subtitle,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: Colors.grey.shade500),
            ],
          ),
        ),
      ),
    );
  }
}

class StatsCategoryScreen extends StatefulWidget {
  final StatsCategory category;

  const StatsCategoryScreen({super.key, required this.category});

  @override
  State<StatsCategoryScreen> createState() => _StatsCategoryScreenState();
}

class _StatsCategoryScreenState extends State<StatsCategoryScreen> {
  final _search = TextEditingController();
  late Future<List<PlayerStats>> _future;

  @override
  void initState() {
    super.initState();
    _future = PlayerStatsService.load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.category == StatsCategory.tournament) {
      return const TournamentStatsScreen();
    }

    return Scaffold(
      appBar: _appBar(),
      body: FutureBuilder<List<PlayerStats>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Could not load stats: ${snapshot.error}'));
          }
          final players = PlayerStatsService.inCategory(
            snapshot.data ?? const [],
            widget.category.label,
            _search.text,
          );
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: TextField(
                  controller: _search,
                  onChanged: (_) => setState(() {}),
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: 'Search a player',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _search.text.isEmpty
                        ? null
                        : IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _search.clear();
                              setState(() {});
                            },
                          ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                child: Text(
                  '${players.length} player${players.length == 1 ? '' : 's'} · A–Z · JCPL 4 registrations',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
              ),
              Expanded(
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final width = math.max(constraints.maxWidth, 640.0);
                    return SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: SizedBox(
                        width: width,
                        height: constraints.maxHeight,
                        child: Column(
                          children: [
                            const StatsTableHeader(),
                            Expanded(
                              child: players.isEmpty
                                  ? Center(
                                      child: Text(
                                        _search.text.trim().isEmpty
                                            ? 'No players in this category'
                                            : 'No player matching "${_search.text.trim()}"',
                                        style: TextStyle(
                                            color: Colors.grey.shade600),
                                      ),
                                    )
                                  : ListView.builder(
                                      itemCount: players.length,
                                      itemBuilder: (context, i) {
                                        final player = players[i];
                                        return StatsTableRow(
                                          player: player,
                                          striped: i.isOdd,
                                          onTap: () =>
                                              Navigator.of(context).push(
                                            MaterialPageRoute(
                                              builder: (_) =>
                                                  PlayerStatsScreen(
                                                      player: player),
                                            ),
                                          ),
                                        );
                                      },
                                    ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  PreferredSizeWidget _appBar() {
    return AppBar(
      flexibleSpace: Container(
        decoration: const BoxDecoration(gradient: AppTheme.stadiumGradient),
      ),
      title: Text('${widget.category.label} Stats'),
    );
  }
}
