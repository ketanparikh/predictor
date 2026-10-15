import 'dart:convert';

import 'package:flutter/services.dart';

import '../models/player_stats.dart';
import '../models/tournament_stats.dart';

class TournamentStatsService {
  TournamentStatsService._();

  static TournamentCatalog? _catalog;
  static final _byAsset = <String, TournamentStats>{};

  static Future<TournamentCatalog> loadCatalog() async {
    if (_catalog != null) return _catalog!;
    final raw =
        await rootBundle.loadString('assets/config/jcpl_tournaments.json');
    _catalog =
        TournamentCatalog.fromJson(json.decode(raw) as Map<String, dynamic>);
    return _catalog!;
  }

  static Future<TournamentStats> load(String asset) async {
    final cached = _byAsset[asset];
    if (cached != null) return cached;
    final raw = await rootBundle.loadString(asset);
    final stats =
        TournamentStats.fromJson(json.decode(raw) as Map<String, dynamic>);
    _byAsset[asset] = stats;
    return stats;
  }

  static List<PlayerStats> search(List<PlayerStats> players, String query) {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return players;
    return [
      for (final p in players)
        if (p.name.toLowerCase().contains(q) ||
            p.skill.toLowerCase().contains(q) ||
            p.city.toLowerCase().contains(q))
          p,
    ];
  }
}
