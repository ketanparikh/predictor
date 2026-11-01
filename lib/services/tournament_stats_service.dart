import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/services.dart';

import '../models/player_stats.dart';
import '../models/tournament_stats.dart';

class TournamentStatsService {
  TournamentStatsService._();

  static TournamentCatalog? _catalog;
  static final _byAsset = <String, TournamentStats>{};
  static Map<String, String>? _excelNamesById;
  static Map<String, String>? _excelNamesByOld;

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
    final decoded = json.decode(raw) as Map<String, dynamic>;
    await _applyExcelNames(decoded);
    final stats = TournamentStats.fromJson(decoded);
    _byAsset[asset] = stats;
    return stats;
  }

  static Future<List<Map<String, dynamic>>> loadSharedAuctionPlayers() async {
    final excelPlayers = await loadExcelRoster();
    if (excelPlayers.isNotEmpty) return excelPlayers;
    try {
      final snap = await FirebaseFirestore.instance
          .collection('playerStats')
          .doc('catalog')
          .get();
      final rows = snap.data()?['auctionPlayers'];
      if (rows is List && rows.isNotEmpty) {
        return [
          for (final row in rows)
            if (row is Map) Map<String, dynamic>.from(row),
        ];
      }
    } catch (_) {}
    return const [];
  }

  static Future<List<Map<String, dynamic>>> loadExcelRoster() async {
    try {
      final raw =
          await rootBundle.loadString('assets/config/jcpl4_player_stats.json');
      final data = json.decode(raw) as Map<String, dynamic>;
      final rows = data['players'] as List? ?? const [];
      return [
        for (final row in rows)
          if (row is Map)
            {
              'name': row['name'],
              'role': row['skill'] ?? row['playingRole'],
              'grade': '',
              'jcplSeasons': ['JCPL 4'],
              'jcplPlayerId': row['playerId'],
              'stats': {
                'matches': row['matches'] ?? 0,
                'runs': (row['batting'] as Map?)?['runs'] ?? 0,
                'wickets': (row['bowling'] as Map?)?['wickets'] ?? 0,
              },
            },
      ];
    } catch (_) {
      return const [];
    }
  }

  static Future<void> _loadExcelNameMap() async {
    if (_excelNamesById != null) return;
    try {
      final raw =
          await rootBundle.loadString('assets/config/jcpl_s4_name_map.json');
      final data = json.decode(raw) as Map<String, dynamic>;
      _excelNamesById = {
        for (final e in (data['byPlayerId'] as Map? ?? {}).entries)
          '${e.key}': '${e.value}',
      };
      _excelNamesByOld = {
        for (final e in (data['byOldName'] as Map? ?? {}).entries)
          _normalizeName('${e.key}'): '${e.value}',
      };
    } catch (_) {
      _excelNamesById = {};
      _excelNamesByOld = {};
    }
  }

  static Future<void> _applyExcelNames(Map<String, dynamic> decoded) async {
    await _loadExcelNameMap();
    final byId = _excelNamesById ?? const {};
    final byOld = _excelNamesByOld ?? const {};
    if (byId.isEmpty && byOld.isEmpty) return;

    String rename(Object? id, Object? name) {
      final mappedId = byId['$id'];
      if (mappedId != null && mappedId.isNotEmpty) return mappedId;
      final mappedName = byOld[_normalizeName('$name')];
      if (mappedName != null && mappedName.isNotEmpty) return mappedName;
      return '$name';
    }

    void renameNamed(Map<String, dynamic>? row, String nameKey, String idKey) {
      if (row == null) return;
      final next = rename(row[idKey], row[nameKey]);
      if (next.isNotEmpty) row[nameKey] = next;
    }

    for (final row in decoded['players'] as List? ?? const []) {
      if (row is Map<String, dynamic>) {
        renameNamed(row, 'name', 'playerId');
      }
    }
    for (final row in decoded['awards'] as List? ?? const []) {
      if (row is Map<String, dynamic>) {
        renameNamed(row, 'playerName', 'playerId');
      }
    }
    for (final row in decoded['mvp'] as List? ?? const []) {
      if (row is Map<String, dynamic>) {
        renameNamed(row, 'name', 'playerId');
      }
    }
    for (final row in decoded['matches'] as List? ?? const []) {
      if (row is! Map<String, dynamic>) continue;
      for (final key in [
        'playerOfTheMatch',
        'fighterOfTheMatch',
        'bestBatter',
        'bestBowler',
      ]) {
        final ref = row[key];
        if (ref is Map<String, dynamic>) {
          renameNamed(ref, 'name', 'playerId');
        }
      }
    }
  }

  static String _normalizeName(String name) {
    return name
        .toLowerCase()
        .replaceAll(RegExp(r'\((c|wk|vc)\)'), ' ')
        .replaceAll(RegExp(r'[^a-z0-9 ]+'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
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
