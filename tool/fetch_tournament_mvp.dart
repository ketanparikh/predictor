import 'dart:convert';
import 'dart:io';

import 'cricheroes_api.dart';

const _delay = Duration(milliseconds: 350);

const _tournaments = [
  _Spec(869494, '2024-01-12', 'assets/config/jcpl_s1_mens.json'),
  _Spec(870016, '2024-01-12', 'assets/config/jcpl_s1_womens.json'),
  _Spec(870046, '2024-01-12', 'assets/config/jcpl_s1_boys.json'),
  _Spec(1232409, '2025-01-09', 'assets/config/jcpl_s2_mens.json'),
  _Spec(1254427, '2025-01-09', 'assets/config/jcpl_s2_womens.json'),
  _Spec(1254447, '2025-01-09', 'assets/config/jcpl_s2_boys.json'),
  _Spec(1786023, '2026-01-08', 'assets/config/jcpl_s3_mens.json'),
  _Spec(1786245, '2026-01-15', 'assets/config/jcpl_s3_womens.json'),
  _Spec(1786286, '2026-01-15', 'assets/config/jcpl_s3_boys.json'),
  _Spec(1786340, '2026-01-15', 'assets/config/jcpl_s3_girls.json'),
];

class _Spec {
  final int id;
  final String fromDate;
  final String path;
  const _Spec(this.id, this.fromDate, this.path);
}

void main() async {
  final api = CricHeroesApi();
  final cache = Directory('cricheroes_data/jcpl_tournament_cache')
    ..createSync(recursive: true);
  try {
    for (final spec in _tournaments) {
      await _patch(api, cache, spec);
    }
  } finally {
    api.close();
  }
}

Future<void> _patch(CricHeroesApi api, Directory cache, _Spec spec) async {
  final file = File(spec.path);
  final root = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
  stdout.writeln('\n${root['name']} (${spec.id})');

  final names = <int, Map<String, dynamic>>{};
  for (final p in (root['players'] as List).cast<Map<String, dynamic>>()) {
    names[p['playerId'] as int] = p;
  }

  final from = DateTime.parse(spec.fromDate).toUtc();
  final matchesById = <int, Map<String, dynamic>>{};
  for (final t in (root['teams'] as List).cast<Map<String, dynamic>>()) {
    final teamId = t['teamId'] as int;
    String? next = '/team/get-team-match/$teamId?pageno=1';
    while (next != null) {
      final res = await _cachedRaw(api, cache, next);
      final items = (res['data'] as List? ?? []).cast<Map<String, dynamic>>();
      if (items.isEmpty) break;
      var reachedOlder = false;
      for (final m in items) {
        final start = DateTime.tryParse('${m['match_start_time'] ?? ''}');
        if (start != null && start.isBefore(from)) {
          reachedOlder = true;
          continue;
        }
        if ('${m['tournament_id']}' != '${spec.id}') continue;
        matchesById.putIfAbsent(m['match_id'] as int, () => m);
      }
      if (reachedOlder) break;
      next = (res['page'] as Map?)?['next'] as String?;
      if (next != null) await Future.delayed(_delay);
    }
  }
  stdout.writeln('  ${matchesById.length} matches with MVP ids');

  Map<String, dynamic>? ref(int id) {
    if (id <= 0) return null;
    final p = names[id];
    return {
      'playerId': id,
      'name': p?['name'] ?? '',
      'team': p?['team'] ?? '',
    };
  }

  final mvpAcc = <int, Map<String, dynamic>>{};
  void credit(int id, String field) {
    if (id <= 0) return;
    final row = mvpAcc.putIfAbsent(id, () {
      final p = names[id];
      return {
        'playerId': id,
        'name': p?['name'] ?? '',
        'team': p?['team'] ?? '',
        'playerOfTheMatch': 0,
        'fighterOfTheMatch': 0,
        'bestBatter': 0,
        'bestBowler': 0,
      };
    });
    row[field] = (row[field] as int) + 1;
  }

  final matches = (root['matches'] as List).cast<Map<String, dynamic>>();
  for (final match in matches) {
    final raw = matchesById[match['matchId'] as int];
    if (raw == null) continue;
    final pom = _id(raw['pom_player_id']);
    final fom = _id(raw['fom_player_id']);
    final bba = _id(raw['bba_player_id']);
    final bbo = _id(raw['bbo_player_id']);
    match['playerOfTheMatch'] = ref(pom);
    match['fighterOfTheMatch'] = ref(fom);
    match['bestBatter'] = ref(bba);
    match['bestBowler'] = ref(bbo);
    credit(pom, 'playerOfTheMatch');
    credit(fom, 'fighterOfTheMatch');
    credit(bba, 'bestBatter');
    credit(bbo, 'bestBowler');
  }

  try {
    await Future.delayed(_delay);
    final mvpRes = await api.getRaw('/mvp/get-tournament-player-mvp/${spec.id}');
    if (mvpRes['status'] == true) {
      for (final row
          in (mvpRes['data'] as List? ?? []).cast<Map<String, dynamic>>()) {
        final id = _id(row['player_id']);
        if (id <= 0) continue;
        final acc = mvpAcc.putIfAbsent(id, () {
          final p = names[id];
          return {
            'playerId': id,
            'name': p?['name'] ?? row['name'] ?? '',
            'team': p?['team'] ?? row['team_name'] ?? '',
            'playerOfTheMatch': 0,
            'fighterOfTheMatch': 0,
            'bestBatter': 0,
            'bestBowler': 0,
          };
        });
        acc['mvpRank'] = _id(row['rank']);
        acc['mvpTotal'] = _num(row['total']);
        acc['mvpBatting'] = _num(row['batting']);
        acc['mvpBowling'] = _num(row['bowling']);
        acc['mvpFielding'] = _num(row['fielding']);
        acc['mvpMatches'] = _id(row['matches']);
        if ('${acc['name']}'.trim().isEmpty) {
          acc['name'] = row['name'] ?? '';
        }
        if ('${acc['team']}'.trim().isEmpty) {
          acc['team'] = row['team_name'] ?? '';
        }
      }
    }
  } catch (e) {
    stdout.writeln('  mvp scores skipped ($e)');
  }

  final mvp = mvpAcc.values.toList()
    ..sort((a, b) {
      final total = _num(b['mvpTotal']).compareTo(_num(a['mvpTotal']));
      if (total != 0) return total;
      final pom = (b['playerOfTheMatch'] as int)
          .compareTo(a['playerOfTheMatch'] as int);
      if (pom != 0) return pom;
      final bat = (b['bestBatter'] as int).compareTo(a['bestBatter'] as int);
      if (bat != 0) return bat;
      return (b['bestBowler'] as int).compareTo(a['bestBowler'] as int);
    });
  root['mvp'] = mvp;

  try {
    await Future.delayed(_delay);
    final awardsRes =
        await api.getRaw('/tournament/get-tournament-awards/${spec.id}');
    final awards = (awardsRes['status'] == true)
        ? (awardsRes['data'] as List? ?? []).cast<Map<String, dynamic>>()
        : const <Map<String, dynamic>>[];
    root['awards'] = [
      for (final a in awards)
        {
          'type': a['award_type'],
          'label': a['award_text'],
          'playerId': a['player_id'],
          'playerName': a['player_name'],
          'team': a['team_name'],
        },
    ];
    stdout.writeln('  awards=${(root['awards'] as List).length}  mvp=${mvp.length}');
  } catch (e) {
    root['awards'] = [];
    stdout.writeln('  awards skipped ($e)  mvp=${mvp.length}');
  }

  file.writeAsStringSync('${const JsonEncoder.withIndent('  ').convert(root)}\n');
}

Future<Map<String, dynamic>> _cachedRaw(
    CricHeroesApi api, Directory dir, String path) async {
  final slug = path
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
      .replaceAll(RegExp(r'^-|-$'), '');
  final file = File('${dir.path}${Platform.pathSeparator}$slug.json');
  if (file.existsSync()) {
    return jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
  }
  final data = await api.getRaw(path);
  file.writeAsStringSync(jsonEncode(data));
  return data;
}

int _id(Object? v) {
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse('$v') ?? 0;
}

double _num(Object? v) {
  if (v is double) return v;
  if (v is num) return v.toDouble();
  return double.tryParse('$v') ?? 0;
}
