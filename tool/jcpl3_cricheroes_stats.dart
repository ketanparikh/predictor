// Reads the JCPL registration responses sheet, groups players into
// Mens / Womens / Boys / Girls (from Gender + Age), looks each player up on
// CricHeroes by name and writes their career statistics into one workbook.
//
// Usage:
//   dart run tool/jcpl3_cricheroes_stats.dart <responses.xlsx> [options]
//
// Example:
//   dart run tool/jcpl3_cricheroes_stats.dart "C:/Users/Ketan Parikh/Downloads/JCPL 3 Registration Form (Responses) (4).xlsx"
//
// Options:
//   --out <file>       Output workbook (default: cricheroes_data/JCPL3_CricHeroes_Stats.xlsx)
//   --category <name>  Only process one of Mens, Womens, Boys, Girls
//   --city <name>      Prefer profiles from this city when names collide (default: Pune)
//   --delay-ms <ms>    Pause between uncached requests (default: 400)
//
// API responses are cached under cricheroes_data/jcpl3_cache, so re-running
// only fetches players that were not fetched before. Delete that folder to
// refresh everything.

import 'dart:convert';
import 'dart:io';

import 'package:excel/excel.dart';

import 'cricheroes_api.dart';

const _categories = ['Mens', 'Womens', 'Boys', 'Girls'];
const _maxCandidates = 5;

Future<void> main(List<String> args) async {
  if (args.isEmpty || args.contains('-h') || args.contains('--help')) {
    stdout.writeln('Usage: dart run tool/jcpl3_cricheroes_stats.dart <responses.xlsx> '
        '[--out file] [--category Mens|Womens|Boys|Girls] [--city name] [--delay-ms ms]');
    exit(args.isEmpty ? 64 : 0);
  }

  final input = File(args.first);
  if (!input.existsSync()) {
    stderr.writeln('File not found: ${input.path}');
    exit(66);
  }
  final outPath = _option(args, '--out') ?? 'cricheroes_data/JCPL3_CricHeroes_Stats.xlsx';
  final onlyCategory = _option(args, '--category');
  if (onlyCategory != null && !_categories.contains(onlyCategory)) {
    stderr.writeln('--category must be one of ${_categories.join(', ')}');
    exit(64);
  }
  final city = _option(args, '--city') ?? 'Pune';
  final delay =
      Duration(milliseconds: int.tryParse(_option(args, '--delay-ms') ?? '') ?? 400);

  var registrants = _readRegistrants(input);
  if (onlyCategory != null) {
    registrants = registrants.where((r) => r.category == onlyCategory).toList();
  }
  stdout.writeln('${registrants.length} players to look up');

  final client = _CachedClient(CricHeroesApi(), Directory('cricheroes_data/jcpl3_cache'), delay);
  final results = <_PlayerResult>[];
  try {
    for (final (i, reg) in registrants.indexed) {
      stdout.write('[${i + 1}/${registrants.length}] ${reg.category.padRight(6)} ${reg.name} ... ');
      try {
        final result = await _lookUp(client, reg, city);
        results.add(result);
        stdout.writeln(result.status +
            (result.profile == null ? '' : ' -> ${result.profile!['name']} (${result.playerId})'));
      } on ApiException catch (e) {
        results.add(_PlayerResult(reg, 'Error', notes: '$e'));
        stdout.writeln('Error: $e');
      }
    }
  } finally {
    client.close();
  }

  final file = File(outPath)..parent.createSync(recursive: true);
  file.writeAsBytesSync(_buildWorkbook(results));

  final counts = <String, int>{};
  for (final r in results) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
  }
  stdout.writeln('\nSaved ${file.path}');
  counts.forEach((status, n) => stdout.writeln('  $status: $n'));
}

class _Registrant {
  final String name;
  final String age;
  final String gender;
  final String skill;
  final String category;

  _Registrant(this.name, this.age, this.gender, this.skill)
      : category = _categoryFor(gender, age);

  static String _categoryFor(String gender, String age) {
    final isJunior = age.toLowerCase().contains('10 to 14');
    final isFemale = gender.toLowerCase().startsWith('f');
    if (isJunior) return isFemale ? 'Girls' : 'Boys';
    return isFemale ? 'Womens' : 'Mens';
  }
}

class _PlayerResult {
  final _Registrant registrant;
  final String status;
  final Map<String, dynamic>? profile;
  final Map<String, dynamic>? statistics;
  final String notes;

  _PlayerResult(this.registrant, this.status,
      {this.profile, this.statistics, this.notes = ''});

  Object? get playerId => profile?['player_id'];
}

List<_Registrant> _readRegistrants(File file) {
  final excel = Excel.decodeBytes(file.readAsBytesSync());
  final sheet = excel.tables['Form Responses 1'] ?? excel.tables.values.first;
  final rows = sheet.rows;
  final header = rows.first.map((c) => _text(c).toLowerCase()).toList();

  int column(String title) {
    final i = header.indexWhere((h) => h.startsWith(title.toLowerCase()));
    if (i < 0) throw StateError('Column "$title" not found in ${file.path}');
    return i;
  }

  final nameCol = column('Name');
  final ageCol = column('Age');
  final genderCol = column('Gender');
  final skillCol = column('Primary Cricket Skill');

  String at(List<Data?> row, int i) => i < row.length ? _text(row[i]) : '';

  return [
    for (final row in rows.skip(1))
      if (at(row, nameCol).isNotEmpty)
        _Registrant(at(row, nameCol), at(row, ageCol), at(row, genderCol), at(row, skillCol)),
  ];
}

String _text(Data? cell) => cell?.value?.toString().trim() ?? '';

Future<_PlayerResult> _lookUp(_CachedClient client, _Registrant reg, String city) async {
  final query = _normalize(reg.name);
  var hits = await client.searchPlayers(reg.name);
  final tokens = query.split(' ');
  if (hits.isEmpty && tokens.length > 2) {
    hits = await client.searchPlayers('${tokens.first} ${tokens.last}');
  }

  var exact = true;
  var candidates = hits.where((p) => _normalize('${p['name']}') == query).toList();
  if (candidates.isEmpty) {
    exact = false;
    candidates = hits.where((p) {
      final nameTokens = _normalize('${p['name']}').split(' ').toSet();
      return tokens.every(nameTokens.contains);
    }).toList();
  }
  if (candidates.isEmpty) {
    final seen = hits.take(3).map((p) => '${p['name']} (${p['city_name']})').join('; ');
    return _PlayerResult(reg, 'Not found', notes: seen.isEmpty ? '' : 'Search returned: $seen');
  }

  final local = candidates
      .where((p) => '${p['city_name']}'.toLowerCase() == city.toLowerCase())
      .toList();
  if (local.isNotEmpty) candidates = local;

  final profiles = <Map<String, dynamic>>[];
  for (final c in candidates.take(_maxCandidates)) {
    profiles.add(await client.get('/player/get-player-profile-web/${c['user_id']}'));
  }
  profiles.sort((a, b) => _asInt(b['total_matches']).compareTo(_asInt(a['total_matches'])));
  final chosen = profiles.first;

  final stats = await client.get('/player/get-player-statistic/${chosen['player_id']}');

  final String status;
  var notes = '';
  if (candidates.length > 1) {
    status = 'Check: ${candidates.length} profiles';
    notes = 'Picked most matches. Others: ${profiles.skip(1).map((p) => '${p['player_id']} '
        '(${p['city_name']}, ${_asInt(p['total_matches'])} matches)').join('; ')}';
  } else if (!exact) {
    status = 'Check: partial name';
  } else {
    status = 'Matched';
  }
  if (!exact) {
    notes = [notes, 'CricHeroes name: ${chosen['name']}'].where((s) => s.isNotEmpty).join('. ');
  }

  return _PlayerResult(reg, status,
      profile: chosen,
      statistics: (stats['statistics'] ?? stats) as Map<String, dynamic>,
      notes: notes);
}

String _normalize(String s) => s
    .toLowerCase()
    .replaceAll(RegExp(r'[^a-z ]'), ' ')
    .replaceAll(RegExp(r'\s+'), ' ')
    .trim();

int _asInt(Object? v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;

String _slug(String name) =>
    name.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '-').replaceAll(RegExp(r'^-|-$'), '');

String? _option(List<String> args, String name) {
  final i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}

const _sectionPrefix = {
  'batting': 'Bat',
  'bowling': 'Bowl',
  'fielding': 'Field',
  'captain': 'Capt',
};

/// Flattens CricHeroes `statistics` into `"Bat Runs" -> 868` style columns.
Map<String, Object?> _flattenStats(Map<String, dynamic>? stats) {
  final out = <String, Object?>{};
  if (stats == null) return out;
  for (final MapEntry(key: section, value: prefix) in _sectionPrefix.entries) {
    for (final item in (stats[section] as List? ?? []).cast<Map<String, dynamic>>()) {
      final title = '${item['title']}';
      if (title == 'Matches' && (section == 'bowling' || section == 'fielding')) continue;
      out[section == 'batting' && title == 'Matches' ? 'Matches' : '$prefix $title'] =
          item['value'];
    }
  }
  return out;
}

List<int> _buildWorkbook(List<_PlayerResult> results) {
  final flat = {for (final r in results) r: _flattenStats(r.statistics)};
  final statColumns = <String>{for (final s in flat.values) ...s.keys}.toList();

  const infoColumns = [
    'Category', 'Name', 'Age', 'Gender', 'Primary Skill', 'Match Status',
    'CricHeroes ID', 'CricHeroes Name', 'City', 'Playing Role', 'Batting Hand',
    'Bowling Style', 'Profile URL',
  ];
  final header = [...infoColumns, ...statColumns, 'Notes'];

  List<CellValue?> rowFor(_PlayerResult r) {
    final p = r.profile;
    final id = r.playerId;
    return [
      TextCellValue(r.registrant.category),
      TextCellValue(r.registrant.name),
      TextCellValue(r.registrant.age),
      TextCellValue(r.registrant.gender),
      TextCellValue(r.registrant.skill),
      TextCellValue(r.status),
      id == null ? null : IntCellValue(_asInt(id)),
      _cell(p?['name']),
      _cell(p?['city_name']),
      _cell(p?['playing_role']),
      _cell(p?['batting_hand']),
      _cell(p?['bowling_style']),
      id == null
          ? null
          : TextCellValue('https://cricheroes.com/player-profile/$id/${_slug('${p!['name']}')}/stats'),
      for (final c in statColumns) _cell(flat[r]![c]),
      _cell(r.notes),
    ];
  }

  final excel = Excel.createExcel();
  final defaultSheet = excel.getDefaultSheet()!;
  final headerStyle = CellStyle(bold: true);

  void writeSheet(String name, Iterable<_PlayerResult> rows) {
    final sheet = excel[name];
    sheet.appendRow(header.map(TextCellValue.new).toList());
    for (var c = 0; c < header.length; c++) {
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: c, rowIndex: 0)).cellStyle = headerStyle;
    }
    for (final r in rows) {
      sheet.appendRow(rowFor(r));
    }
  }

  writeSheet('All Players', results);
  for (final category in _categories) {
    writeSheet(category, results.where((r) => r.registrant.category == category));
  }
  excel.setDefaultSheet('All Players');
  excel.delete(defaultSheet);
  return excel.encode()!;
}

CellValue? _cell(Object? v) {
  if (v == null || (v is String && v.isEmpty)) return null;
  if (v is int) return IntCellValue(v);
  if (v is num) return DoubleCellValue(v.toDouble());
  final s = '$v';
  final asInt = int.tryParse(s);
  if (asInt != null) return IntCellValue(asInt);
  final asDouble = double.tryParse(s);
  if (asDouble != null) return DoubleCellValue(asDouble);
  return TextCellValue(s);
}

/// Wraps [CricHeroesApi] with an on-disk cache of `data` payloads.
class _CachedClient {
  final CricHeroesApi _api;
  final Directory _dir;
  final Duration _delay;

  _CachedClient(this._api, this._dir, this._delay) {
    _dir.createSync(recursive: true);
  }

  Future<Map<String, dynamic>> get(String path) async {
    final file = File('${_dir.path}${Platform.pathSeparator}${_slug(Uri.decodeComponent(path))}.json');
    if (file.existsSync()) {
      return jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
    }
    await Future.delayed(_delay);
    final data = await _api.get(path);
    file.writeAsStringSync(jsonEncode(data));
    return data;
  }

  Future<List<Map<String, dynamic>>> searchPlayers(String name) async {
    final data = await get('/search/v2/global-search-all/2/${Uri.encodeComponent(name)}');
    return (data['players'] as List? ?? []).cast<Map<String, dynamic>>();
  }

  void close() => _api.close();
}
