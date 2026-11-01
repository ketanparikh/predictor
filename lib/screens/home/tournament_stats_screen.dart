import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/player_stats.dart';
import '../../models/tournament_stats.dart';
import '../../services/tournament_stats_service.dart';
import '../../theme/app_theme.dart';
import 'player_stats_screen.dart';
import 'stats_table.dart';

class TournamentStatsScreen extends StatelessWidget {
  const TournamentStatsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        flexibleSpace: Container(
          decoration: const BoxDecoration(gradient: AppTheme.stadiumGradient),
        ),
        title: const Text('Tournament Stats'),
      ),
      body: FutureBuilder<TournamentCatalog>(
        future: TournamentStatsService.loadCatalog(),
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Could not load seasons: ${snapshot.error}'));
          }
          final seasons = snapshot.data!.seasons;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              FutureBuilder<List<Map<String, dynamic>>>(
                future: TournamentStatsService.loadSharedAuctionPlayers(),
                builder: (context, auctionSnap) {
                  final auctionPlayers = auctionSnap.data ?? const [];
                  if (auctionPlayers.isEmpty) {
                    return const SizedBox.shrink();
                  }
                  return _NavCard(
                    title: 'JCPL 4 registrations',
                    subtitle:
                        '${auctionPlayers.length} players from the JCPL 4 Excel form',
                    icon: Icons.gavel,
                    color: AppTheme.cricketOrange,
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => AuctionRosterStatsScreen(
                          players: auctionPlayers,
                        ),
                      ),
                    ),
                  );
                },
              ),
              Text(
                'SEASONS',
                style: GoogleFonts.barlowCondensed(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1,
                  color: AppTheme.primaryColor,
                ),
              ),
              const SizedBox(height: 12),
              for (final season in seasons)
                _NavCard(
                  title: season.label,
                  subtitle: season.subtitle,
                  icon: Icons.emoji_events,
                  color: AppTheme.primaryColor,
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => TournamentSeasonScreen(season: season),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class TournamentSeasonScreen extends StatelessWidget {
  final TournamentSeason season;

  const TournamentSeasonScreen({super.key, required this.season});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        flexibleSpace: Container(
          decoration: const BoxDecoration(gradient: AppTheme.stadiumGradient),
        ),
        title: Text(season.label),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            season.subtitle,
            style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 16),
          for (final category in season.categories)
            _NavCard(
              title: category.label,
              subtitle: '${season.label} ${category.label} stats',
              icon: _iconFor(category.id),
              color: _colorFor(category.id),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => TournamentCategoryScreen(
                    season: season,
                    category: category,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class TournamentCategoryScreen extends StatefulWidget {
  final TournamentSeason season;
  final TournamentCategoryRef category;

  const TournamentCategoryScreen({
    super.key,
    required this.season,
    required this.category,
  });

  @override
  State<TournamentCategoryScreen> createState() =>
      _TournamentCategoryScreenState();
}

class _TournamentCategoryScreenState extends State<TournamentCategoryScreen> {
  final _search = TextEditingController();
  late Future<TournamentStats> _future;
  var _showMvp = false;

  @override
  void initState() {
    super.initState();
    _future = TournamentStatsService.load(widget.category.asset);
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        flexibleSpace: Container(
          decoration: const BoxDecoration(gradient: AppTheme.stadiumGradient),
        ),
        title: Text('${widget.season.label} ${widget.category.label}'),
      ),
      body: FutureBuilder<TournamentStats>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Could not load stats: ${snapshot.error}'));
          }
          final tournament = snapshot.data!;
          final players =
              TournamentStatsService.search(tournament.players, _search.text);
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _TournamentHeader(tournament: tournament),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: SegmentedButton<bool>(
                  segments: const [
                    ButtonSegment(
                      value: false,
                      label: Text('Players'),
                      icon: Icon(Icons.people_alt_outlined, size: 18),
                    ),
                    ButtonSegment(
                      value: true,
                      label: Text('MVP'),
                      icon: Icon(Icons.emoji_events_outlined, size: 18),
                    ),
                  ],
                  selected: {_showMvp},
                  onSelectionChanged: (value) {
                    setState(() => _showMvp = value.first);
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: TextField(
                  controller: _search,
                  onChanged: (_) => setState(() {}),
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: _showMvp
                        ? 'Search MVP, award or match'
                        : 'Search a player or team',
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
              if (!_showMvp)
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                  child: Text(
                    '${players.length} player${players.length == 1 ? '' : 's'} · A–Z · ${tournament.name} scorecards',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ),
              Expanded(
                child: _showMvp
                    ? _MvpView(tournament: tournament, query: _search.text)
                    : LayoutBuilder(
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
                                                subtitle: player.skill,
                                                onTap: () => Navigator.of(
                                                        context)
                                                    .push(
                                                  MaterialPageRoute(
                                                    builder: (_) =>
                                                        PlayerStatsScreen(
                                                      player: player,
                                                      sourceNote:
                                                          'Source: ${tournament.name} scorecards, ${tournament.city}, ${tournament.dateLabel}.',
                                                    ),
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
}

class _MvpView extends StatelessWidget {
  final TournamentStats tournament;
  final String query;

  const _MvpView({required this.tournament, required this.query});

  @override
  Widget build(BuildContext context) {
    final q = query.trim().toLowerCase();
    bool matches(String a, [String b = '', String c = '']) {
      if (q.isEmpty) return true;
      return a.toLowerCase().contains(q) ||
          b.toLowerCase().contains(q) ||
          c.toLowerCase().contains(q);
    }

    final awards = [
      for (final a in tournament.awards)
        if (matches(a.playerName, a.team, a.label)) a,
    ];
    final mvp = [
      for (final a in tournament.mvp)
        if ((a.hasMvpScore || a.playerOfTheMatch > 0) && matches(a.name, a.team))
          a,
    ];
    final matchesWithPom = [
      for (final m in tournament.matches)
        if (m.playerOfTheMatch.isPresent &&
            matches(m.playerOfTheMatch.name, m.teamA, m.teamB))
          m,
    ];

    if (awards.isEmpty && mvp.isEmpty && matchesWithPom.isEmpty) {
      return Center(
        child: Text(
          q.isEmpty
              ? 'No MVP data for this tournament'
              : 'No MVP matching "$query"',
          style: TextStyle(color: Colors.grey.shade600),
        ),
      );
    }

    PlayerStats? playerFor(int id) {
      for (final p in tournament.players) {
        if (p.playerId == id) return p;
      }
      return null;
    }

    void openPlayer(int id) {
      final player = playerFor(id);
      if (player == null) return;
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => PlayerStatsScreen(
            player: player,
            sourceNote:
                'Source: ${tournament.name} scorecards, ${tournament.city}, ${tournament.dateLabel}.',
          ),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      children: [
        if (awards.isNotEmpty) ...[
          Text(
            'AWARDS',
            style: GoogleFonts.outfit(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.6,
              color: AppTheme.primaryColor,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final award in awards)
                _AwardChip(
                  award: award,
                  onTap: () => openPlayer(award.playerId ?? 0),
                ),
            ],
          ),
          const SizedBox(height: 20),
        ],
        if (mvp.isNotEmpty) ...[
          Text(
            'TOURNAMENT MVP',
            style: GoogleFonts.outfit(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.6,
              color: AppTheme.primaryColor,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'CricHeroes MVP 2.0 impact scores. PoM is the match award count.',
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 8),
          for (var i = 0; i < mvp.length; i++)
            _MvpTile(
              rank: q.isEmpty && mvp[i].mvpRank > 0 ? mvp[i].mvpRank : i + 1,
              row: mvp[i],
              onTap: () => openPlayer(mvp[i].playerId),
            ),
          const SizedBox(height: 20),
        ],
        if (matchesWithPom.isNotEmpty) ...[
          Text(
            'MATCH HEROES',
            style: GoogleFonts.outfit(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.6,
              color: AppTheme.primaryColor,
            ),
          ),
          const SizedBox(height: 8),
          for (final match in matchesWithPom)
            _MatchHeroTile(
              match: match,
              onTap: () => openPlayer(match.playerOfTheMatch.playerId),
            ),
        ],
      ],
    );
  }
}

class _AwardChip extends StatelessWidget {
  final TournamentAward award;
  final VoidCallback onTap;

  const _AwardChip({required this.award, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 168,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppTheme.primaryColor.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.12)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              award.label.toUpperCase(),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.outfit(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: AppTheme.primaryColor,
                letterSpacing: 0.3,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              award.playerName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
            ),
            Text(
              award.team,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }
}

class _MvpTile extends StatelessWidget {
  final int rank;
  final TournamentMvp row;
  final VoidCallback onTap;

  const _MvpTile({
    required this.rank,
    required this.row,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final extras = [
      if (row.playerOfTheMatch > 0) '${row.playerOfTheMatch} PoM',
      if (row.bestBatter > 0) '${row.bestBatter} best bat',
      if (row.bestBowler > 0) '${row.bestBowler} best bowl',
      if (row.fighterOfTheMatch > 0) '${row.fighterOfTheMatch} fighter',
    ];
    final score = row.hasMvpScore
        ? row.mvpTotal.toStringAsFixed(2)
        : '${row.playerOfTheMatch}';
    final scoreLabel = row.hasMvpScore ? 'MVP' : 'PoM';
    return Card(
      child: ListTile(
        onTap: onTap,
        leading: CircleAvatar(
          backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.12),
          child: Text(
            '$rank',
            style: GoogleFonts.barlowCondensed(
              fontWeight: FontWeight.w800,
              color: AppTheme.primaryColor,
            ),
          ),
        ),
        title: Text(row.name, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(
          [
            row.team,
            if (extras.isNotEmpty) extras.join(' · '),
          ].where((s) => s.isNotEmpty).join(' · '),
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              score,
              style: GoogleFonts.barlowCondensed(
                fontSize: row.hasMvpScore ? 18 : 22,
                fontWeight: FontWeight.w800,
                color: AppTheme.primaryColor,
              ),
            ),
            Text(scoreLabel,
                style: TextStyle(fontSize: 10, color: Colors.grey.shade600)),
          ],
        ),
      ),
    );
  }
}

class _MatchHeroTile extends StatelessWidget {
  final TournamentMatch match;
  final VoidCallback onTap;

  const _MatchHeroTile({required this.match, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        onTap: onTap,
        title: Text(
          '${match.teamA} vs ${match.teamB}',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          [
            if (match.round.isNotEmpty) match.round,
            'PoM ${match.playerOfTheMatch.name}',
            if (match.bestBatter.isPresent)
              'Bat ${match.bestBatter.name}',
            if (match.bestBowler.isPresent)
              'Bowl ${match.bestBowler.name}',
          ].join(' · '),
          maxLines: 2,
        ),
      ),
    );
  }
}

class _NavCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _NavCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 30),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.barlowCondensed(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.ink,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
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

class _TournamentHeader extends StatelessWidget {
  final TournamentStats tournament;

  const _TournamentHeader({required this.tournament});

  @override
  Widget build(BuildContext context) {
    PlayerStats? topBy(int? Function(PlayerStats p) score) {
      PlayerStats? best;
      var bestScore = -1;
      for (final p in tournament.players) {
        final s = score(p) ?? 0;
        if (s > bestScore) {
          bestScore = s;
          best = p;
        }
      }
      return bestScore > 0 ? best : null;
    }

    final topRuns = topBy((p) => p.batting.runs);
    final topWkts = topBy((p) => p.bowling.wickets);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            tournament.name,
            style: GoogleFonts.barlowCondensed(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              color: AppTheme.primaryColor,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            '${tournament.city} · ${tournament.dateLabel} · ${tournament.ground}',
            style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 14),
              child: Row(
                children: [
                  _HeroStat(
                      tournament.overall['Matches'] ??
                          '${tournament.matches.length}',
                      'Matches'),
                  _HeroStat('${tournament.players.length}', 'Players'),
                  _HeroStat(tournament.overall['Runs'] ?? '—', 'Runs'),
                  _HeroStat(tournament.overall['Wickets'] ?? '—', 'Wickets'),
                ],
              ),
            ),
          ),
          if (topRuns != null || topWkts != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                if (topRuns != null)
                  Expanded(
                    child: _LeaderChip(
                      label: 'Most runs',
                      value: '${topRuns.name} · ${topRuns.batting.runs}',
                    ),
                  ),
                if (topRuns != null && topWkts != null) const SizedBox(width: 8),
                if (topWkts != null)
                  Expanded(
                    child: _LeaderChip(
                      label: 'Most wickets',
                      value: '${topWkts.name} · ${topWkts.bowling.wickets}',
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _HeroStat extends StatelessWidget {
  final String value;
  final String label;

  const _HeroStat(this.value, this.label);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: GoogleFonts.barlowCondensed(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: AppTheme.primaryColor,
            ),
          ),
          Text(label,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
        ],
      ),
    );
  }
}

class _LeaderChip extends StatelessWidget {
  final String label;
  final String value;

  const _LeaderChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label.toUpperCase(),
              style: GoogleFonts.outfit(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: AppTheme.primaryColor,
                letterSpacing: 0.4,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }
}

class AuctionRosterStatsScreen extends StatelessWidget {
  final List<Map<String, dynamic>> players;

  const AuctionRosterStatsScreen({super.key, required this.players});

  @override
  Widget build(BuildContext context) {
    final sorted = [...players]..sort((a, b) {
      return '${a['name']}'.toLowerCase().compareTo('${b['name']}'.toLowerCase());
    });
    return Scaffold(
      appBar: AppBar(
        flexibleSpace: Container(
          decoration: const BoxDecoration(gradient: AppTheme.stadiumGradient),
        ),
        title: const Text('JCPL 4 registrations'),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: sorted.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          final player = sorted[index];
          final stats = player['stats'] is Map
              ? Map<String, dynamic>.from(player['stats'] as Map)
              : const <String, dynamic>{};
          final seasons = (player['jcplSeasons'] as List?)?.join(' · ') ?? '';
          return Card(
            child: ListTile(
              title: Text('${player['name'] ?? ''}'),
              subtitle: Text(
                [
                  if ('${player['role'] ?? ''}'.isNotEmpty) '${player['role']}',
                  if ('${player['grade'] ?? ''}'.isNotEmpty) 'Grade ${player['grade']}',
                  if (seasons.isNotEmpty) seasons,
                  '${stats['matches'] ?? 0} matches · ${stats['runs'] ?? 0} runs · ${stats['wickets'] ?? 0} wkts',
                ].join(' · '),
              ),
            ),
          );
        },
      ),
    );
  }
}

IconData _iconFor(String id) {
  switch (id) {
    case 'womens':
      return Icons.woman;
    case 'boys':
      return Icons.boy;
    case 'girls':
      return Icons.girl;
    default:
      return Icons.man;
  }
}

Color _colorFor(String id) {
  switch (id) {
    case 'womens':
      return AppTheme.accentColor;
    case 'boys':
      return AppTheme.cricketOrange;
    case 'girls':
      return AppTheme.secondaryColor;
    default:
      return AppTheme.electricBlue;
  }
}
