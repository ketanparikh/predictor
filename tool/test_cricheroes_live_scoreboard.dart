// Probes CricHeroes for a live scoreboard: lists live matches, then fetches
// mini scorecard, full scorecard, and ball-by-ball commentary.
//
// Usage:
//   dart run tool/test_cricheroes_live_scoreboard.dart [match-url-or-id]
//
// Examples:
//   dart run tool/test_cricheroes_live_scoreboard.dart
//   dart run tool/test_cricheroes_live_scoreboard.dart --global
//   dart run tool/test_cricheroes_live_scoreboard.dart 27691863
//   dart run tool/test_cricheroes_live_scoreboard.dart https://cricheroes.com/scorecard/27691863/...
//   dart run tool/test_cricheroes_live_scoreboard.dart --watch-seconds 8 --out cricheroes_data/live_scoreboard_probe
//
// Options:
//   --global              List worldwide live matches instead of Pune nearby
//   --lat <n> --lon <n>   Nearby search (default: Pune 18.5204, 73.8567)
//   --limit <n>           How many live matches to print (default: 8)
//   --watch-seconds <n>   Refetch the mini scorecard after n seconds
//   --out <dir>           Save JSON responses
//   --delay-ms <ms>       Pause between requests (default: 300)

import 'dart:convert';
import 'dart:io';

import 'cricheroes_api.dart';

const _puneLat = 18.5204;
const _puneLon = 73.8567;

Future<void> main(List<String> args) async {
  if (args.contains('-h') || args.contains('--help')) {
    stdout.writeln(
        'Usage: dart run tool/test_cricheroes_live_scoreboard.dart '
        '[match-url-or-id] [--global] [--lat n] [--lon n] [--limit n] '
        '[--watch-seconds n] [--out dir] [--delay-ms ms]');
    exit(0);
  }

  final matchId = _parseMatchId(args);
  final global = args.contains('--global');
  final lat = double.tryParse(_option(args, '--lat') ?? '') ?? _puneLat;
  final lon = double.tryParse(_option(args, '--lon') ?? '') ?? _puneLon;
  final limit = int.tryParse(_option(args, '--limit') ?? '') ?? 8;
  final watchSeconds = int.tryParse(_option(args, '--watch-seconds') ?? '') ?? 0;
  final outDir = _option(args, '--out');
  final delay =
      Duration(milliseconds: int.tryParse(_option(args, '--delay-ms') ?? '') ?? 300);

  final api = CricHeroesApi();
  Directory? out;
  if (outDir != null) {
    out = Directory(outDir)..createSync(recursive: true);
  }

  try {
    int? chosen = matchId;
    if (chosen == null) {
      chosen = await _discoverLiveMatch(api, global: global, lat: lat, lon: lon, limit: limit);
      if (chosen == null) {
        stderr.writeln('No live match found to fetch a scoreboard from.');
        exitCode = 1;
        return;
      }
      await Future.delayed(delay);
    } else {
      stdout.writeln('Match $chosen (from argument)');
    }

    stdout.writeln('\n== Endpoint probe for match $chosen ==');
    final mini = await _probe(
      api,
      '/scorecard/get-mini-scorecard/$chosen',
      out: out,
      label: 'mini-scorecard',
    );
    await Future.delayed(delay);
    final v2 = await _probe(
      api,
      '/scorecard/v2/get-scorecard/$chosen',
      out: out,
      label: 'scorecard-v2',
    );
    await Future.delayed(delay);
    await _probe(
      api,
      '/scoreCard/get-scorecard/$chosen',
      out: out,
      label: 'scorecard-v1',
    );
    await Future.delayed(delay);
    final commentary = await _probe(
      api,
      '/scorecard/v2/get-commentary/$chosen',
      out: out,
      label: 'commentary-v2',
    );
    await Future.delayed(delay);
    await _probe(
      api,
      '/match/get-match-heroes/$chosen',
      out: out,
      label: 'match-heroes',
      pendingOk: 'CricHeroes of the Match will automatically be generated',
    );

    final board = (mini?['data'] as Map<String, dynamic>?) ??
        (v2?['data'] as Map<String, dynamic>?);
    if (board == null) {
      stderr.writeln('\nCould not fetch a scoreboard payload.');
      exitCode = 1;
      return;
    }

    stdout.writeln('\n== Live scoreboard ==');
    _printScoreboard(
      board,
      commentary?['data'],
      fallbackCard: v2?['data'] as Map<String, dynamic>?,
    );

    if (watchSeconds > 0 && mini != null) {
      stdout.writeln('\nWatching ${watchSeconds}s for a score change...');
      await Future.delayed(Duration(seconds: watchSeconds));
      final again = await _probe(
        api,
        '/scorecard/get-mini-scorecard/$chosen',
        out: out,
        label: 'mini-scorecard-watch',
        quiet: true,
      );
      final next = again?['data'] as Map<String, dynamic>?;
      if (next == null) {
        stdout.writeln('  watch refetch failed');
      } else {
        final before = _scoreLine(board);
        final after = _scoreLine(next);
        stdout.writeln('  before: $before');
        stdout.writeln('  after:  $after');
        stdout.writeln(before == after
            ? '  no score change in ${watchSeconds}s (match may be between balls)'
            : '  score updated — live feed is working');
      }
    }

    stdout.writeln('\nResult: live scoreboard CAN be fetched from CricHeroes.');
    stdout.writeln(
        'Use /scorecard/get-mini-scorecard/{matchId} for the live board, '
        '/scorecard/v2/get-scorecard/{matchId} for batting/bowling, '
        '/scorecard/v2/get-commentary/{matchId} for ball-by-ball.');
  } on ApiException catch (e) {
    stderr.writeln('Request failed: $e');
    exitCode = 1;
  } finally {
    api.close();
  }
}

Future<int?> _discoverLiveMatch(
  CricHeroesApi api, {
  required bool global,
  required double lat,
  required double lon,
  required int limit,
}) async {
  stdout.writeln(global
      ? 'Listing worldwide live matches (/match/get-matches/1/-1/-1)'
      : 'Listing live matches near $lat,$lon (/search/v2/near-by-me-matches)');

  final matches = <Map<String, dynamic>>[];
  if (global) {
    String? next = '/match/get-matches/1/-1/-1?pageno=1';
    while (next != null && matches.length < limit) {
      final res = await api.getRaw(next);
      final items = _asMaps(res['data']);
      matches.addAll(items.where((m) => '${m['status']}' == 'live'));
      next = (res['page'] as Map?)?['next'] as String?;
      if (items.isEmpty) break;
    }
  } else {
    final res = await api.getRaw('/search/v2/near-by-me-matches/$lat/$lon');
    matches.addAll(_asMaps(res['data']).where((m) => '${m['status']}' == 'live'));
  }

  if (matches.isEmpty && !global) {
    stdout.writeln('  none nearby; falling back to worldwide live list');
    return _discoverLiveMatch(api, global: true, lat: lat, lon: lon, limit: limit);
  }

  stdout.writeln('  ${matches.length} live match(es)');
  final shown = matches.take(limit).toList();
  for (final (i, m) in shown.indexed) {
    final id = m['match_id'];
    final a = '${m['team_a']} ${m['team_a_summary'] ?? ''}'.trim();
    final b = '${m['team_b']} ${m['team_b_summary'] ?? ''}'.trim();
    stdout.writeln(
        '  ${i + 1}. $id  $a vs $b  (${m['city_name'] ?? ''} · ${m['tournament_name'] ?? ''})');
  }
  if (shown.isEmpty) return null;

  final inPlay = shown.cast<Map<String, dynamic>?>().firstWhere(
        (m) => !_yetToBat(m!),
        orElse: () => shown.first,
      )!;
  stdout.writeln('Using match ${inPlay['match_id']}');
  return inPlay['match_id'] as int;
}

bool _yetToBat(Map<String, dynamic> m) {
  final a = '${m['team_a_summary'] ?? ''}';
  final b = '${m['team_b_summary'] ?? ''}';
  return a.contains('Yet to bat') && b.contains('Yet to bat');
}

Future<Map<String, dynamic>?> _probe(
  CricHeroesApi api,
  String path, {
  Directory? out,
  required String label,
  bool quiet = false,
  String? pendingOk,
}) async {
  try {
    final res = await api.getRaw(path);
    final data = res['data'];
    final size = _sizeHint(data);
    if (!quiet) stdout.writeln('  OK  $path  $size');
    if (out != null) {
      File('${out.path}${Platform.pathSeparator}$label.json')
          .writeAsStringSync(const JsonEncoder.withIndent('  ').convert(res));
    }
    return res;
  } on ApiException catch (e) {
    if (pendingOk != null && e.message.contains(pendingOk)) {
      if (!quiet) stdout.writeln('  SKIP  $path  (available after the match ends)');
      return null;
    }
    if (!quiet) stdout.writeln('  FAIL  $path  $e');
    return null;
  }
}

String _sizeHint(Object? data) {
  if (data is List) return '${data.length} items';
  if (data is Map) {
    final commentary = data['commentary'];
    if (commentary is List) return 'map, ${commentary.length} commentary balls';
    return 'map, ${data.keys.length} keys';
  }
  return data == null ? 'null' : data.runtimeType.toString();
}

void _printScoreboard(
  Map<String, dynamic> card,
  Object? commentaryData, {
  Map<String, dynamic>? fallbackCard,
}) {
  final status = '${card['status'] ?? ''}';
  stdout.writeln(
      '${card['team_a']?['name'] ?? card['team_a'] ?? ''}  '
      '${_teamSummary(card['team_a'])}'
      '  vs  '
      '${card['team_b']?['name'] ?? card['team_b'] ?? ''}  '
      '${_teamSummary(card['team_b'])}');
  stdout.writeln(
      'status=$status  inning=${card['current_inning']}  '
      'overs=${card['overs']}  ${card['ball_type']}  ${card['match_type']}');
  stdout.writeln(
      '${card['tournament_name'] ?? ''} · ${card['ground_name'] ?? ''}, '
      '${card['city_name'] ?? ''}');
  final summary = card['match_summary'];
  if (summary is Map && '${summary['summary'] ?? ''}'.isNotEmpty) {
    stdout.writeln('${summary['summary']}');
  }
  if ('${card['toss_details'] ?? ''}'.isNotEmpty) {
    stdout.writeln('${card['toss_details']}');
  }

  final batsmen = _asMaps(card['batsmen']);
  if (batsmen.isNotEmpty) {
    stdout.writeln('\nBatsmen');
    for (final b in batsmen) {
      stdout.writeln(
          '  ${b['name'] ?? b['player_name']}  ${b['runs'] ?? 0} (${b['balls'] ?? 0})  '
          '4s=${b['4s'] ?? b['fours'] ?? 0} 6s=${b['6s'] ?? b['sixes'] ?? 0}  '
          '${b['how_to_out'] ?? ''}');
    }
  } else {
    _printScorecardBatting(fallbackCard ?? card);
  }

  final bowlers = _asMaps(card['bowlers']);
  if (bowlers.isNotEmpty) {
    stdout.writeln('\nBowlers');
    for (final b in bowlers) {
      stdout.writeln(
          '  ${b['name'] ?? b['player_name']}  '
          '${b['overs'] ?? 0}.${b['balls'] ?? 0}  '
          '${b['runs'] ?? 0}/${b['wickets'] ?? 0}  eco=${b['economy_rate'] ?? ''}');
    }
  }

  if (card['current_partnership'] != null || card['last_wicket'] != null) {
    stdout.writeln('\nPartnership: ${card['current_partnership'] ?? '-'}  '
        'Last wicket: ${card['last_wicket'] ?? '-'}');
  }
  if (card['recent_over'] != null) {
    stdout.writeln('Recent over: ${card['recent_over']}');
  }

  final balls = _asMaps(
    commentaryData is Map ? commentaryData['commentary'] : card['commentary'],
  );
  if (balls.isNotEmpty) {
    stdout.writeln('\nLatest balls');
    for (final ball in balls.take(8)) {
      stdout.writeln(
          '  ${ball['ball'] ?? ''}  ${ball['run'] ?? ''}  '
          '${ball['title'] ?? ball['comment'] ?? ball['commentary'] ?? ball['out_how'] ?? ''}');
    }
  }
}

void _printScorecardBatting(Map<String, dynamic> card) {
  for (final side in ['team_a', 'team_b']) {
    final team = card[side];
    if (team is! Map) continue;
    final innings = _asMaps(team['scorecard']);
    if (innings.isEmpty) continue;
    stdout.writeln('\n${team['name']} batting');
    for (final inn in innings) {
      for (final b in _asMaps(inn['batting']).take(8)) {
        stdout.writeln(
            '  ${b['name']}  ${b['runs']} (${b['balls']})  ${b['how_to_out'] ?? ''}');
      }
    }
  }
}

String _teamSummary(Object? team) {
  if (team is Map) return '${team['summary'] ?? ''}';
  return '';
}

String _scoreLine(Map<String, dynamic> card) {
  return '${card['team_a']?['name']} ${_teamSummary(card['team_a'])} vs '
      '${card['team_b']?['name']} ${_teamSummary(card['team_b'])} '
      '(inning ${card['current_inning']})';
}

List<Map<String, dynamic>> _asMaps(Object? value) {
  if (value is List) {
    return value.whereType<Map<String, dynamic>>().toList();
  }
  return const [];
}

int? _parseMatchId(List<String> args) {
  for (final arg in args) {
    if (arg.startsWith('--')) continue;
    final i = args.indexOf(arg);
    if (i > 0 && args[i - 1].startsWith('--')) continue;
    final direct = int.tryParse(arg.trim());
    if (direct != null) return direct;
    final match = RegExp(r'scorecard/(\d+)').firstMatch(arg);
    if (match != null) return int.parse(match.group(1)!);
  }
  return null;
}

String? _option(List<String> args, String name) {
  final i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}
