import 'dart:convert';

import 'package:flutter/services.dart';

import '../models/player_stats.dart';

class PlayerStatsService {
  PlayerStatsService._();

  static List<PlayerStats>? _cache;

  static Future<List<PlayerStats>> load() async {
    if (_cache != null) return _cache!;
    final raw =
        await rootBundle.loadString('assets/config/jcpl3_player_stats.json');
    final data = json.decode(raw) as Map<String, dynamic>;
    final players = (data['players'] as List? ?? [])
        .map((e) => PlayerStats.fromJson(e as Map<String, dynamic>))
        .toList()
      ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    _cache = players;
    return players;
  }

  static List<PlayerStats> inCategory(
    List<PlayerStats> all,
    String category,
    String query,
  ) {
    final q = query.trim().toLowerCase();
    return [
      for (final p in all)
        if (p.category == category &&
            (q.isEmpty ||
                p.name.toLowerCase().contains(q) ||
                p.cricheroesName.toLowerCase().contains(q)))
          p,
    ];
  }
}
