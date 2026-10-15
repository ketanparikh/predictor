import 'dart:convert';
import 'dart:io';

import 'cricheroes_api.dart';

const _delay = Duration(milliseconds: 350);

const _tournaments = [
  _Spec(869494, 'JCPL Men', '2024-01-12', '2024-01-14', 'assets/config/jcpl_s1_mens.json'),
  _Spec(870016, 'JCPL Women', '2024-01-12', '2024-01-14', 'assets/config/jcpl_s1_womens.json'),
  _Spec(870046, 'JCPL Kids', '2024-01-12', '2024-01-14', 'assets/config/jcpl_s1_boys.json'),
  _Spec(1232409, 'JCPL 2 Men', '2025-01-09', '2025-01-12', 'assets/config/jcpl_s2_mens.json'),
  _Spec(1254427, 'JCPL 2 Women', '2025-01-09', '2025-01-12', 'assets/config/jcpl_s2_womens.json'),
  _Spec(1254447, 'JCPL 2 Kids', '2025-01-09', '2025-01-12', 'assets/config/jcpl_s2_boys.json'),
  _Spec(1786023, 'JCPL 2026 Men', '2026-01-08', '2026-01-18', 'assets/config/jcpl_s3_mens.json'),
  _Spec(1786245, 'JCPL 2026 Women', '2026-01-15', '2026-01-18', 'assets/config/jcpl_s3_womens.json'),
  _Spec(1786286, 'JCPL 2026 Boys', '2026-01-15', '2026-01-18', 'assets/config/jcpl_s3_boys.json'),
  _Spec(1786340, 'JCPL 2026 Girls', '2026-01-15', '2026-01-18', 'assets/config/jcpl_s3_girls.json'),
];

class _Spec {
  final int id;
  final String name;
  final String fromDate;
  final String toDate;
  final String outPath;
  const _Spec(this.id, this.name, this.fromDate, this.toDate, this.outPath);
}

Future<void> main() async {
  final api = CricHeroesApi();
  final cache = Directory('cricheroes_data/jcpl_tournament_cache')
    ..createSync(recursive: true);
  final oldCache = Directory('cricheroes_data/jcpl_men_2024_cache');
  if (oldCache.existsSync()) {
    for (final f in oldCache.listSync().whereType<File>()) {
      f.copySync('${cache.path}/${f.uri.pathSegments.last}');
    }
  }
  try {
    for (final spec in _tournaments) {
      await _fetch(api, cache, spec);
    }
  } finally {
    api.close();
  }
}

Future<void> _fetch(CricHeroesApi api, Directory cache, _Spec spec) async {
  stdout.writeln('\n${spec.name} (${spec.id})');
  final overall = await api.get('/tournament/get-tournament-statistic/${spec.id}');
  await Future.delayed(_delay);
  final teams = ((await api.getRaw('/tournament/get-tournament-teams/${spec.id}'))['data']
              as List? ??
          [])
      .cast<Map<String, dynamic>>();
  stdout.writeln('  ${teams.length} teams');

  final from = DateTime.parse(spec.fromDate).toUtc();
  final matchesById = <int, Map<String, dynamic>>{};
  for (final team in teams) {
    final teamId = team['team_id'] as int;
    stdout.write('  matches for ${team['team_name']} ($teamId) ... ');
    var added = 0;
    String? next = '/team/get-team-match/$teamId?pageno=1';
    while (next != null) {
      await Future.delayed(_delay);
      final res = await api.getRaw(next);
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
        final id = m['match_id'] as int;
        matchesById.putIfAbsent(id, () => m);
        added++;
      }
      if (reachedOlder) break;
      next = (res['page'] as Map?)?['next'] as String?;
    }
    stdout.writeln('$added tournament matches (unique ${matchesById.length})');
  }

  final scorecards = <Map<String, dynamic>>[];
  for (final (i, id) in matchesById.keys.indexed) {
    stdout.write('  scorecard ${i + 1}/${matchesById.length} $id ... ');
    final file = File('${cache.path}/scorecard_$id.json');
    Map<String, dynamic> card;
    if (file.existsSync()) {
      card = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
    } else {
      await Future.delayed(_delay);
      card = await api.get('/scoreCard/get-scorecard/$id');
      file.writeAsStringSync(jsonEncode(card));
    }
    scorecards.add(card);
    stdout.writeln(
        '${card['tournament_round_name']} ${card['team_a']?['name']} vs ${card['team_b']?['name']}');
  }

  final players = _aggregate(scorecards);
  final matchSummaries = [
    for (final c in scorecards)
      {
        'matchId': c['match_id'],
        'date': c['start_datetime'],
        'round': c['tournament_round_name'],
        'ground': c['ground_name'],
        'teamA': c['team_a']?['name'],
        'teamAScore': c['team_a']?['summary'],
        'teamB': c['team_b']?['name'],
        'teamBScore': c['team_b']?['summary'],
        'winner': c['winning_team'],
        'winBy': c['win_by'],
        'result': c['match_summary']?['summary'],
      },
  ]..sort((a, b) => '${a['date']}'.compareTo('${b['date']}'));
  _attachMatchMvp(matchSummaries, matchesById, players);

  final out = {
    'tournamentId': spec.id,
    'name': spec.name,
    'city': 'Pune',
    'fromDate': spec.fromDate,
    'toDate': spec.toDate,
    'ground': scorecards.isEmpty ? '' : scorecards.first['ground_name'],
    'overall': {
      for (final item
          in (overall['graph_data'] as List? ?? []).cast<Map<String, dynamic>>())
        '${item['title']}': item['value'],
    },
    'teams': [
      for (final t in teams)
        {
          'teamId': t['team_id'],
          'name': t['team_name'],
          'logo': t['logo'],
          'captainId': t['captain_id'],
        },
    ],
    'matches': matchSummaries,
    'players': players,
    'awards': await _awards(api, spec.id),
    'mvp': await _mvpLeaderboard(api, spec.id, matchSummaries, players),
  };

  final jsonFile = File(spec.outPath);
  jsonFile.writeAsStringSync(const JsonEncoder.withIndent('  ').convert(out));
  stdout.writeln('Saved ${jsonFile.path}  matches=${matchSummaries.length} players=${players.length}');
}

List<Map<String, dynamic>> _aggregate(List<Map<String, dynamic>> cards) {
  final byId = <int, _Agg>{};
  _Agg player(int id, String name, String team) {
    return byId.putIfAbsent(id, () => _Agg(id, name, team));
  }

  for (final card in cards) {
    final teamA = card['team_a'] as Map<String, dynamic>;
    final teamB = card['team_b'] as Map<String, dynamic>;
    final nameA = '${teamA['name']}'.trim();
    final nameB = '${teamB['name']}'.trim();
    final rosterA = _roster(teamA, teamB);
    final rosterB = _roster(teamB, teamA);
    for (final p in rosterA) {
      player(p.$1, p.$2, nameA).matches.add(card['match_id']);
    }
    for (final p in rosterB) {
      player(p.$1, p.$2, nameB).matches.add(card['match_id']);
    }

    for (final innings in [
      ..._innings(teamA),
      ..._innings(teamB),
    ]) {
      final battingTeamId = innings['team_id'];
      final bowlingRoster = battingTeamId == teamA['id'] ? rosterB : rosterA;
      for (final b in (innings['batting'] as List? ?? []).cast<Map<String, dynamic>>()) {
        final id = b['player_id'] as int;
        final agg = player(id, '${b['name']}', battingTeamId == teamA['id'] ? nameA : nameB);
        agg.batInnings++;
        final runs = _asInt(b['runs']);
        final out = '${b['how_to_out']}'.toLowerCase();
        final notOut = out.contains('not out') || out.isEmpty;
        if (notOut) agg.notOut++;
        agg.runs += runs;
        agg.balls += _asInt(b['balls']);
        agg.fours += _asInt(b['4s']);
        agg.sixes += _asInt(b['6s']);
        if (runs > agg.highScore ||
            (runs == agg.highScore && notOut && !agg.highScoreNotOut)) {
          agg.highScore = runs;
          agg.highScoreNotOut = notOut;
        }
        if (runs == 0 && !notOut) agg.ducks++;
        _creditFielding(out, bowlingRoster, byId);
      }
      for (final b in (innings['bowling'] as List? ?? []).cast<Map<String, dynamic>>()) {
        final id = b['player_id'] as int;
        final agg = player(id, '${b['name']}', battingTeamId == teamA['id'] ? nameB : nameA);
        agg.bowlInnings++;
        agg.bowlBalls += _asInt(b['overs']) * 6 + _asInt(b['balls']);
        agg.maidens += _asInt(b['maidens']);
        agg.wickets += _asInt(b['wickets']);
        agg.bowlRuns += _asInt(b['runs']);
        agg.dots += _asInt(b['0s']);
        agg.wides += _asInt(b['wide']);
        agg.noBalls += _asInt(b['noball']);
        final figures = '${_asInt(b['wickets'])}/${_asInt(b['runs'])}';
        if (_betterFigures(_asInt(b['wickets']), _asInt(b['runs']), agg.bestWkts, agg.bestRuns)) {
          agg.bestWkts = _asInt(b['wickets']);
          agg.bestRuns = _asInt(b['runs']);
          agg.best = figures;
        }
      }
    }
  }

  final list = byId.values.map((p) => p.toJson()).toList()
    ..sort((a, b) => '${a['name']}'.toLowerCase().compareTo('${b['name']}'.toLowerCase()));
  return list;
}

void _creditFielding(String howOut, List<(int, String)> roster, Map<int, _Agg> byId) {
  final catchMatch = RegExp(r'^c(?:\s+&\s+b)?\s+(.+?)(?:\s+b\s+|$)').firstMatch(howOut);
  final stMatch = RegExp(r'^st\s+(.+?)(?:\s+b\s+|$)').firstMatch(howOut);
  final roMatch = RegExp(r'run out\s+(.+)$').firstMatch(howOut);
  String? name;
  var kind = '';
  if (catchMatch != null && !howOut.startsWith('c & b')) {
    name = catchMatch.group(1);
    kind = 'catch';
  } else if (howOut.startsWith('c & b')) {
    // caught-and-bowled credited to bowler; skip here
    return;
  } else if (stMatch != null) {
    name = stMatch.group(1);
    kind = 'stumping';
  } else if (roMatch != null) {
    name = roMatch.group(1)?.split('/').first.trim();
    kind = 'runout';
  }
  if (name == null || name.isEmpty) return;
  final needle = name.toLowerCase().trim();
  for (final (id, playerName) in roster) {
    if (playerName.toLowerCase() == needle ||
        playerName.toLowerCase().startsWith(needle) ||
        needle.startsWith(playerName.toLowerCase())) {
      final agg = byId[id];
      if (agg == null) return;
      if (kind == 'catch') agg.catches++;
      if (kind == 'stumping') agg.stumpings++;
      if (kind == 'runout') agg.runOuts++;
      return;
    }
  }
}

List<Map<String, dynamic>> _innings(Map<String, dynamic> team) =>
    (team['scorecard'] as List? ?? []).cast<Map<String, dynamic>>();

List<(int, String)> _roster(
    Map<String, dynamic> team, Map<String, dynamic> opponent) {
  final seen = <int>{};
  final out = <(int, String)>[];
  void add(int? id, String name) {
    if (id == null || !seen.add(id)) return;
    out.add((id, name));
  }

  for (final innings in _innings(team)) {
    for (final p in (innings['batting'] as List? ?? []).cast<Map<String, dynamic>>()) {
      add(p['player_id'] as int?, '${p['name']}');
    }
    for (final p in (innings['to_be_bat'] as List? ?? []).cast<Map<String, dynamic>>()) {
      add(p['player_id'] as int?, '${p['name']}');
    }
  }
  // Bowlers in the opponent innings belong to this team, not the batting side.
  for (final innings in _innings(opponent)) {
    for (final p in (innings['bowling'] as List? ?? []).cast<Map<String, dynamic>>()) {
      add(p['player_id'] as int?, '${p['name']}');
    }
  }
  return out;
}

int _asInt(Object? v) {
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse('$v') ?? 0;
}

bool _betterFigures(int wkts, int runs, int bestWkts, int bestRuns) {
  if (wkts > bestWkts) return true;
  if (wkts == bestWkts && wkts > 0 && (bestRuns == 0 || runs < bestRuns)) return true;
  return false;
}

class _Agg {
  final int id;
  String name;
  String team;
  final matches = <Object>{};
  var batInnings = 0;
  var notOut = 0;
  var runs = 0;
  var balls = 0;
  var highScore = 0;
  var highScoreNotOut = false;
  var fours = 0;
  var sixes = 0;
  var ducks = 0;
  var bowlInnings = 0;
  var bowlBalls = 0;
  var maidens = 0;
  var wickets = 0;
  var bowlRuns = 0;
  var dots = 0;
  var wides = 0;
  var noBalls = 0;
  var bestWkts = 0;
  var bestRuns = 0;
  var best = '';
  var catches = 0;
  var runOuts = 0;
  var stumpings = 0;

  _Agg(this.id, this.name, this.team);

  Map<String, dynamic> toJson() {
    final outs = batInnings - notOut;
    final overs = bowlBalls == 0 ? 0.0 : bowlBalls / 6.0;
    return {
      'playerId': id,
      'name': name,
      'team': team,
      'matches': matches.length,
      'batting': {
        'innings': batInnings,
        'notOut': notOut,
        'runs': runs,
        'balls': balls,
        'highScore': highScore == 0 && batInnings == 0
            ? ''
            : '$highScore${highScoreNotOut && batInnings > 0 ? '*' : ''}',
        'avg': outs <= 0 ? null : _round(runs / outs),
        'sr': balls == 0 ? null : _round(runs * 100 / balls),
        'fours': fours,
        'sixes': sixes,
        'ducks': ducks,
      },
      'bowling': {
        'innings': bowlInnings,
        'overs': _overs(bowlBalls),
        'maidens': maidens,
        'wickets': wickets,
        'runs': bowlRuns,
        'best': best,
        'economy': overs == 0 ? null : _round(bowlRuns / overs),
        'avg': wickets == 0 ? null : _round(bowlRuns / wickets),
        'sr': wickets == 0 ? null : _round(bowlBalls / wickets),
        'dots': dots,
        'wides': wides,
        'noBalls': noBalls,
      },
      'fielding': {
        'catches': catches,
        'runOuts': runOuts,
        'stumpings': stumpings,
      },
    };
  }
}

Future<List<Map<String, dynamic>>> _awards(CricHeroesApi api, int id) async {
  try {
    await Future.delayed(_delay);
    final res = await api.getRaw('/tournament/get-tournament-awards/$id');
    if (res['status'] != true) return [];
    return [
      for (final a in (res['data'] as List? ?? []).cast<Map<String, dynamic>>())
        {
          'type': a['award_type'],
          'label': a['award_text'],
          'playerId': a['player_id'],
          'playerName': a['player_name'],
          'team': a['team_name'],
        },
    ];
  } catch (_) {
    return [];
  }
}

void _attachMatchMvp(
  List<Map<String, dynamic>> matches,
  Map<int, Map<String, dynamic>> rawById,
  List<Map<String, dynamic>> players,
) {
  final names = {
    for (final p in players) p['playerId'] as int: p,
  };
  Map<String, dynamic>? ref(int id) {
    if (id <= 0) return null;
    final p = names[id];
    return {
      'playerId': id,
      'name': p?['name'] ?? '',
      'team': p?['team'] ?? '',
    };
  }

  for (final match in matches) {
    final raw = rawById[match['matchId'] as int];
    if (raw == null) continue;
    match['playerOfTheMatch'] = ref(_asInt(raw['pom_player_id']));
    match['fighterOfTheMatch'] = ref(_asInt(raw['fom_player_id']));
    match['bestBatter'] = ref(_asInt(raw['bba_player_id']));
    match['bestBowler'] = ref(_asInt(raw['bbo_player_id']));
  }
}

Future<List<Map<String, dynamic>>> _mvpLeaderboard(
  CricHeroesApi api,
  int tournamentId,
  List<Map<String, dynamic>> matches,
  List<Map<String, dynamic>> players,
) async {
  final names = {
    for (final p in players) p['playerId'] as int: p,
  };
  final acc = <int, Map<String, dynamic>>{};
  void credit(Map<String, dynamic>? ref, String field) {
    final id = ref?['playerId'] as int? ?? 0;
    if (id <= 0) return;
    final row = acc.putIfAbsent(id, () {
      final p = names[id];
      return {
        'playerId': id,
        'name': p?['name'] ?? ref?['name'] ?? '',
        'team': p?['team'] ?? ref?['team'] ?? '',
        'playerOfTheMatch': 0,
        'fighterOfTheMatch': 0,
        'bestBatter': 0,
        'bestBowler': 0,
      };
    });
    row[field] = (row[field] as int) + 1;
  }

  for (final m in matches) {
    credit(m['playerOfTheMatch'] as Map<String, dynamic>?, 'playerOfTheMatch');
    credit(m['fighterOfTheMatch'] as Map<String, dynamic>?, 'fighterOfTheMatch');
    credit(m['bestBatter'] as Map<String, dynamic>?, 'bestBatter');
    credit(m['bestBowler'] as Map<String, dynamic>?, 'bestBowler');
  }

  try {
    await Future.delayed(_delay);
    final mvpRes = await api.getRaw('/mvp/get-tournament-player-mvp/$tournamentId');
    if (mvpRes['status'] == true) {
      for (final row
          in (mvpRes['data'] as List? ?? []).cast<Map<String, dynamic>>()) {
        final id = _asInt(row['player_id']);
        if (id <= 0) continue;
        final accRow = acc.putIfAbsent(id, () {
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
        accRow['mvpRank'] = _asInt(row['rank']);
        accRow['mvpTotal'] = _asNum(row['total']);
        accRow['mvpBatting'] = _asNum(row['batting']);
        accRow['mvpBowling'] = _asNum(row['bowling']);
        accRow['mvpFielding'] = _asNum(row['fielding']);
        accRow['mvpMatches'] = _asInt(row['matches']);
      }
    }
  } catch (_) {}

  return acc.values.toList()
    ..sort((a, b) {
      final total = _asNum(b['mvpTotal']).compareTo(_asNum(a['mvpTotal']));
      if (total != 0) return total;
      final pom = (b['playerOfTheMatch'] as int)
          .compareTo(a['playerOfTheMatch'] as int);
      if (pom != 0) return pom;
      return (b['bestBatter'] as int).compareTo(a['bestBatter'] as int);
    });
}

double _asNum(Object? v) {
  if (v is double) return v;
  if (v is num) return v.toDouble();
  return double.tryParse('$v') ?? 0;
}

double _round(num n) => double.parse(n.toStringAsFixed(2));

String _overs(int balls) {
  if (balls == 0) return '';
  return '${balls ~/ 6}.${balls % 6}';
}
