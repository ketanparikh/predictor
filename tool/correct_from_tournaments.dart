import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'cricheroes_api.dart';

const _tournamentFiles = {
  'Mens': [
    'assets/config/jcpl_s1_mens.json',
    'assets/config/jcpl_s2_mens.json',
    'assets/config/jcpl_s3_mens.json',
  ],
  'Womens': [
    'assets/config/jcpl_s1_womens.json',
    'assets/config/jcpl_s2_womens.json',
    'assets/config/jcpl_s3_womens.json',
  ],
  'Boys': [
    'assets/config/jcpl_s1_boys.json',
    'assets/config/jcpl_s2_boys.json',
    'assets/config/jcpl_s3_boys.json',
  ],
  'Girls': [
    'assets/config/jcpl_s3_girls.json',
  ],
};

const _statMap = {
  'batting': {
    'Innings': 'innings',
    'Not out': 'notOut',
    'Runs': 'runs',
    'Highest Runs': 'highScore',
    'Avg': 'avg',
    'SR': 'sr',
    '30s': 'thirties',
    '50s': 'fifties',
    '100s': 'hundreds',
    '4s': 'fours',
    '6s': 'sixes',
    'Ducks': 'ducks',
    'Won': 'won',
    'Loss': 'loss',
  },
  'bowling': {
    'Innings': 'innings',
    'Overs': 'overs',
    'Maidens': 'maidens',
    'Wickets': 'wickets',
    'Runs': 'runs',
    'Best Bowling': 'best',
    '3 Wickets': 'threeWickets',
    '5 Wickets': 'fiveWickets',
    'Economy': 'economy',
    'SR': 'sr',
    'Avg': 'avg',
    'Wides': 'wides',
    'NoBalls': 'noBalls',
    'Dot Balls': 'dots',
    '4s': 'fours',
    '6s': 'sixes',
  },
  'fielding': {
    'Catches': 'catches',
    'Caught behind': 'caughtBehind',
    'Run outs': 'runOuts',
    'Stumpings': 'stumpings',
    'Assisted Run Outs': 'assistedRunOuts',
  },
};

void main() async {
  final playersFile = File('assets/config/jcpl3_player_stats.json');
  final root = jsonDecode(playersFile.readAsStringSync()) as Map<String, dynamic>;
  final players = (root['players'] as List).cast<Map<String, dynamic>>();
  final roster = _loadRoster();

  var reverted = 0;
  for (final p in players) {
    if ('${p['matchStatus']}' != 'Matched (tournament)') continue;
    if (_manualPlayerIds[_normalize('${p['name']}')] == p['playerId']) continue;
    if (_firstNamesClash('${p['name']}', '${p['cricheroesName']}')) {
      stdout.writeln('  revert ${p['name']}  (was ${p['cricheroesName']})');
      _clearCareer(p);
      reverted++;
    }
  }
  if (reverted > 0) stdout.writeln('Reverted $reverted mismatched names\n');

  stdout.writeln('Reconciling ${players.length} registrants against tournament scorecards\n');

  final decisions = <Map<String, dynamic>>[];
  var confirmed = 0;
  for (final p in players) {
    final hit = _match(p, roster['${p['category']}'] ?? const []);
    if (hit == null) {
      final status = '${p['matchStatus']}';
      if (status == 'Not found' || status.startsWith('Check')) {
        stdout.writeln('  miss  ${p['category']} ${p['name']}  ($status)');
      }
      continue;
    }
    final sameId = p['playerId'] == hit.id;
    final status = '${p['matchStatus']}';
    if (sameId) {
      if (status.startsWith('Check') || status == 'Not found') {
        if (p['matches'] == 0 || p['matches'] == null) {
          stdout.writeln(
              '  hit   ${p['category']} ${p['name']}  -> ${hit.name} (${hit.id})'
              ' [fetch stats]  ${hit.seasons.join(', ')}');
          decisions.add({'player': p, 'hit': hit});
        } else {
          p['matchStatus'] = 'Matched (tournament)';
          confirmed++;
          stdout.writeln(
              '  ok    ${p['category']} ${p['name']}  -> ${hit.name} (${hit.id})');
        }
      }
      continue;
    }
    stdout.writeln(
        '  remap ${p['category']} ${p['name']}  -> ${hit.name} (${hit.id})'
        '  [was ${p['playerId']} ${p['cricheroesName']}]  ${hit.seasons.join(', ')}');
    decisions.add({'player': p, 'hit': hit});
  }
  if (confirmed > 0) stdout.writeln('Confirmed $confirmed scorecard ids');

  const restore = {
    'abhishek mathur': (2445280, 'Abhishek Mathur'),
    'ashish singh': (17425, 'Ashish Singh'),
  };
  for (final p in players) {
    final key = _normalize('${p['name']}');
    final want = restore[key];
    if (want == null) continue;
    if (p['playerId'] == want.$1) continue;
    stdout.writeln('  restore ${p['category']} ${p['name']} -> ${want.$1}');
    decisions.add({
      'player': p,
      'hit': _TourneyPlayer(want.$1, want.$2, {'CricHeroes'}),
    });
  }

  stdout.writeln('\n${decisions.length} profiles to fetch/correct');
  if (decisions.isEmpty) {
    playersFile.writeAsStringSync(const JsonEncoder.withIndent('  ').convert(root));
    return;
  }

  final api = CricHeroesApi();
  final cache = Directory('cricheroes_data/jcpl3_cache')..createSync(recursive: true);
  var updated = 0;
  try {
    for (final d in decisions) {
      final p = d['player'] as Map<String, dynamic>;
      final hit = d['hit'] as _TourneyPlayer;
      stdout.write('  fetch ${hit.id} ${hit.name} ... ');
      try {
        final profile = await _cached(api, cache, '/player/get-player-profile-web/${hit.id}');
        await Future.delayed(const Duration(milliseconds: 250));
        final statsRaw =
            await _cached(api, cache, '/player/get-player-statistic/${hit.id}');
        final stats = (statsRaw['statistics'] ?? statsRaw) as Map<String, dynamic>;
        _applyCareer(p, profile, stats, hit);
        updated++;
        stdout.writeln('ok  matches=${p['matches']}');
      } catch (e) {
        stdout.writeln('ERR $e');
      }
    }
  } finally {
    api.close();
  }

  root['source'] =
      'JCPL 3 Registration Form (Responses) + CricHeroes career stats, IDs corrected from JCPL tournament scorecards';
  playersFile.writeAsStringSync(const JsonEncoder.withIndent('  ').convert(root));
  stdout.writeln('\nUpdated $updated players in ${playersFile.path}');
}

class _TourneyPlayer {
  final int id;
  final String name;
  final Set<String> seasons;
  _TourneyPlayer(this.id, this.name, this.seasons);
}

Map<String, List<_TourneyPlayer>> _loadRoster() {
  final byCategory = <String, Map<int, _TourneyPlayer>>{};
  for (final MapEntry(key: category, value: files) in _tournamentFiles.entries) {
    final map = byCategory.putIfAbsent(category, () => {});
    for (final path in files) {
      final data = jsonDecode(File(path).readAsStringSync()) as Map<String, dynamic>;
      final season = '${data['name']}';
      for (final p in (data['players'] as List).cast<Map<String, dynamic>>()) {
        final id = p['playerId'] as int;
        map.putIfAbsent(id, () => _TourneyPlayer(id, '${p['name']}', {}))
            .seasons
            .add(season);
      }
    }
  }
  return {for (final e in byCategory.entries) e.key: e.value.values.toList()};
}

const _manualPlayerIds = {
  'ganesh raghuram': 9999504, // scorecard name is "Ganesh", not Kalaskar
  'avinash gupta': 26538317, // scorecard name is "Avi", not Amit Gupta
  'ajit bhalwankar': 26538318, // scorecard name is "Ajit"
  'medha vivek pawar': 45948440, // scorecard name is "Adv Medha Pawar Jade"
  'rupal chiplunkar': 45975647, // scorecard name is "Rupal Jade"
  'avisha singhal': 46391156, // scorecard name is "Shweta Singhal Jade E"
  'sanvi gaikwad': 35215713, // scorecard name is "Sushama Gaikwad"
  'mukund dongre': 46008619, // scorecard name is "D Mukund"
  'vicky sharma': 46009313, // scorecard name is "Vicky Jade"
};

_TourneyPlayer? _match(Map<String, dynamic> registrant, List<_TourneyPlayer> pool) {
  final query = _normalize('${registrant['name']}');
  if (query.isEmpty) return null;
  final manualId = _manualPlayerIds[query];
  if (manualId != null) {
    for (final c in pool) {
      if (c.id == manualId) return c;
    }
  }
  final scored = <(_TourneyPlayer, int)>[];
  for (final c in pool) {
    final score = _nameScore(query, _normalize(c.name));
    if (score > 0) scored.add((c, score));
  }
  if (scored.isEmpty) return null;
  scored.sort((a, b) => b.$2.compareTo(a.$2));
  if (scored.first.$2 >= 16) {
    final exact = scored.where((s) => s.$2 >= 16).toList();
    return _pickExact(registrant['playerId'], exact);
  }
  if (scored.length == 1) return scored.first.$2 >= 8 ? scored.first.$1 : null;
  if (scored.first.$2 >= 12 && scored.first.$2 > scored[1].$2) return scored.first.$1;
  final best = scored.where((s) => s.$2 == scored.first.$2).toList();
  final ids = {for (final s in best) s.$1.id};
  if (ids.length == 1 && scored.first.$2 >= 10) return best.first.$1;
  return null;
}

_TourneyPlayer _pickExact(Object? currentId, List<(_TourneyPlayer, int)> exact) {
  final ids = {for (final s in exact) s.$1.id};
  if (currentId is int && ids.contains(currentId)) {
    return exact.firstWhere((s) => s.$1.id == currentId).$1;
  }
  exact.sort((a, b) => _seasonRank(b.$1.seasons).compareTo(_seasonRank(a.$1.seasons)));
  return exact.first.$1;
}

int _seasonRank(Set<String> seasons) {
  var best = 0;
  for (final s in seasons) {
    final n = s.toLowerCase();
    final rank = n.contains('2026') || n.contains('jcpl 3')
        ? 3
        : (n.contains('jcpl 2') ? 2 : 1);
    if (rank > best) best = rank;
  }
  return best;
}

const _firstAliases = {
  'hrishi': 'hrishikesh',
  'avi': 'avinash',
};

const _lastAliases = {
  'agarwal': 'aggarwal',
};

const _noiseTokens = {
  'jcpl', 'adv', 'dr', 'wk', 'c', 'captain',
};

String _canonFirst(String t) => _firstAliases[t] ?? t;

String _canonLast(String t) => _lastAliases[t] ?? t;

List<String> _sigTokens(String normalized) => normalized
    .split(' ')
    .where((t) => t.isNotEmpty && !_noiseTokens.contains(t))
    .toList();

int _nameScore(String a, String b) {
  if (a == b) return 20;
  final at = _sigTokens(a);
  final bt = _sigTokens(b);
  if (at.isEmpty || bt.isEmpty) return 0;
  if (_canonFirst(at.first) == _canonFirst(bt.first) &&
      _canonLast(at.last) == _canonLast(bt.last) &&
      at.last.length >= 3 &&
      bt.last.length >= 3) {
    return 16;
  }
  if (at.first == bt.first && at.length >= 2 && bt.length >= 2) {
    if (at.last.length == 1 &&
        bt.last.startsWith(at.last) &&
        bt.last.length >= 4) {
      return 14;
    }
    if (bt.last.length == 1 &&
        at.last.startsWith(bt.last) &&
        at.last.length >= 4) {
      return 14;
    }
  }
  if (at.length >= 2 &&
      bt.length == 2 &&
      bt.first.length == 1 &&
      bt.last == at.first) {
    return 12;
  }
  if (bt.length >= 2 &&
      at.length == 2 &&
      at.first.length == 1 &&
      at.last == bt.first) {
    return 12;
  }
  if (at.last == bt.last && (at.first.startsWith(bt.first) || bt.first.startsWith(at.first))) {
    return 14;
  }
  if (at.last == bt.last && _edit(at.first, bt.first) <= 2 && min(at.first.length, bt.first.length) >= 4) {
    return 13;
  }
  if (at.last != bt.last &&
      _edit(_canonLast(at.last), _canonLast(bt.last)) == 1 &&
      _canonFirst(at.first) == _canonFirst(bt.first) &&
      min(at.last.length, bt.last.length) >= 4) {
    return 12;
  }
  if (at.length >= 2 && '${at[0]}${at[1]}' == bt.first) return 15;
  if (bt.length >= 2 && '${bt[0]}${bt[1]}' == at.first) return 15;
  // all tokens of the shorter name appear in the longer
  final shorter = at.length <= bt.length ? at : bt;
  final longer = at.length <= bt.length ? bt : at;
  if (shorter.every(longer.contains) && shorter.length >= 2) return 11;
  if (at.first == bt.first &&
      at.first.length >= 6 &&
      (at.length == 1 || bt.length == 1)) {
    return 11;
  }
  if (_canonFirst(at.first) == _canonFirst(bt.first) && at.first != bt.first) {
    return 10;
  }
  const common = {
    'sunil', 'sagar', 'rajesh', 'varun', 'swapnil', 'tarun', 'nisha',
    'amit', 'rahul', 'aditya', 'sachin', 'anil', 'vijay', 'ravi', 'ajay',
  };
  if (at.length == 1 && bt.contains(at.first) && at.first.length >= 5 &&
      !common.contains(at.first)) {
    return 9;
  }
  if (bt.length == 1 && at.contains(bt.first) && bt.first.length >= 5 &&
      !common.contains(bt.first)) {
    return 9;
  }
  return 0;
}

bool _firstNamesClash(String registered, String cricheroes) {
  const noise = {'jade', 'jcpl', 'adv', 'dr', 'wk', 'c', 'captain'};
  List<String> tokens(String s) => _normalize(s)
      .split(' ')
      .where((t) => t.isNotEmpty && !noise.contains(t))
      .toList();
  final a = tokens(registered);
  final b = tokens(cricheroes);
  if (a.length < 2 || b.length < 2) return false;
  if (a.last != b.last) return false;
  if (a.first == b.first) return false;
  if (_canonFirst(a.first) == _canonFirst(b.first)) return false;
  if (a.first.startsWith(b.first) || b.first.startsWith(a.first)) return false;
  return _edit(a.first, b.first) > 2;
}

void _clearCareer(Map<String, dynamic> p) {
  p['matchStatus'] = 'Not found';
  p['playerId'] = null;
  p['cricheroesName'] = '';
  p['city'] = '';
  p['playingRole'] = '';
  p['battingHand'] = '';
  p['bowlingStyle'] = '';
  p['profileUrl'] = '';
  p['matches'] = null;
  p['batting'] = <String, Object?>{};
  p['bowling'] = <String, Object?>{};
  p['fielding'] = <String, Object?>{};
}

String _normalize(String s) => s
    .toLowerCase()
    .replaceAll('’', "'")
    .replaceAll(RegExp(r"'s\b"), '')
    .replaceAll(RegExp(r'\(c\)'), '')
    .replaceAll(RegExp(r'[^a-z0-9 ]'), ' ')
    .replaceAll(RegExp(r'\s+'), ' ')
    .trim();

int _edit(String a, String b) {
  if (a == b) return 0;
  final m = a.length, n = b.length;
  if ((m - n).abs() > 2) return 99;
  var prev = List<int>.generate(n + 1, (j) => j);
  for (var i = 1; i <= m; i++) {
    final cur = List<int>.filled(n + 1, 0);
    cur[0] = i;
    for (var j = 1; j <= n; j++) {
      cur[j] = min(min(prev[j] + 1, cur[j - 1] + 1),
          prev[j - 1] + (a[i - 1] == b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

Future<Map<String, dynamic>> _cached(
    CricHeroesApi api, Directory dir, String path) async {
  final slug = path
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
      .replaceAll(RegExp(r'^-|-$'), '');
  final file = File('${dir.path}${Platform.pathSeparator}$slug.json');
  if (file.existsSync()) {
    return jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
  }
  final data = await api.get(path);
  file.writeAsStringSync(jsonEncode(data));
  return data;
}

void _applyCareer(Map<String, dynamic> p, Map<String, dynamic> profile,
    Map<String, dynamic> stats, _TourneyPlayer hit) {
  final id = profile['player_id'] ?? hit.id;
  p['matchStatus'] = 'Matched (tournament)';
  p['playerId'] = id;
  p['cricheroesName'] = profile['name'] ?? hit.name;
  p['city'] = profile['city_name'] ?? '';
  p['playingRole'] = profile['playing_role'] ?? '';
  p['battingHand'] = profile['batting_hand'] ?? '';
  p['bowlingStyle'] = profile['bowling_style'] ?? '';
  p['profileUrl'] =
      'https://cricheroes.com/player-profile/$id/${_slug('${profile['name'] ?? hit.name}')}/stats';
  p['matches'] = _sectionValue(stats, 'batting', 'Matches');
  p['batting'] = _section(stats, 'batting');
  p['bowling'] = _section(stats, 'bowling');
  p['fielding'] = _section(stats, 'fielding');
}

Map<String, Object?> _section(Map<String, dynamic> stats, String section) {
  final mapping = _statMap[section]!;
  final out = <String, Object?>{for (final v in mapping.values) v: null};
  for (final item in (stats[section] as List? ?? []).cast<Map<String, dynamic>>()) {
    final key = mapping['${item['title']}'];
    if (key != null) out[key] = item['value'];
  }
  return out;
}

Object? _sectionValue(Map<String, dynamic> stats, String section, String title) {
  for (final item in (stats[section] as List? ?? []).cast<Map<String, dynamic>>()) {
    if ('${item['title']}' == title) return item['value'];
  }
  return null;
}

String _slug(String name) => name
    .toLowerCase()
    .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
    .replaceAll(RegExp(r'^-|-$'), '');
