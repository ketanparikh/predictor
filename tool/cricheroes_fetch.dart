// Fetches a CricHeroes player's profile, career statistics and full match
// history, and writes them as JSON plus a matches CSV.
//
// Usage:
//   dart run tool/cricheroes_fetch.dart <player-url-or-id> [options]
//
// Examples:
//   dart run tool/cricheroes_fetch.dart https://cricheroes.com/player-profile/1415762/rehet-kalsi/matches
//   dart run tool/cricheroes_fetch.dart 1415762 --max-pages 3 --out data/cricheroes
//
// Options:
//   --out <dir>        Output directory (default: cricheroes_data)
//   --max-pages <n>    Stop after n pages of matches (10 matches per page)
//   --delay-ms <ms>    Pause between requests (default: 400)

import 'dart:convert';
import 'dart:io';

import 'cricheroes_api.dart';

Future<void> main(List<String> args) async {
  if (args.isEmpty || args.contains('-h') || args.contains('--help')) {
    stdout.writeln(
        'Usage: dart run tool/cricheroes_fetch.dart <player-url-or-id> '
        '[--out dir] [--max-pages n] [--delay-ms ms]');
    exit(args.isEmpty ? 64 : 0);
  }

  final playerId = _parsePlayerId(args.first);
  if (playerId == null) {
    stderr.writeln('Could not find a player id in "${args.first}".');
    exit(64);
  }
  final outDir = _option(args, '--out') ?? 'cricheroes_data';
  final maxPages = int.tryParse(_option(args, '--max-pages') ?? '');
  final delay =
      Duration(milliseconds: int.tryParse(_option(args, '--delay-ms') ?? '') ?? 400);

  final api = CricHeroesApi();
  try {
    stdout.writeln('Player $playerId');

    final profile = await api.get('/player/get-player-profile-web/$playerId');
    stdout.writeln('  profile: ${profile['name']} (${profile['city_name']})');
    await Future.delayed(delay);

    final stats = await api.get('/player/get-player-statistic/$playerId');
    stdout.writeln('  statistics: fetched');

    final matches = <Map<String, dynamic>>[];
    String? next = '/player/get-player-match/$playerId?pageno=1';
    var page = 0;
    while (next != null && (maxPages == null || page < maxPages)) {
      await Future.delayed(delay);
      final res = await api.getRaw(next);
      final items = (res['data'] as List? ?? []).cast<Map<String, dynamic>>();
      if (items.isEmpty) break;
      matches.addAll(items);
      page++;
      stdout.writeln('  matches page $page: ${items.length} (total ${matches.length})');
      next = (res['page'] as Map?)?['next'] as String?;
    }

    final dir = Directory(outDir)..createSync(recursive: true);
    final slug = _slug(profile['name']?.toString() ?? 'player');
    final base = '${dir.path}${Platform.pathSeparator}${playerId}_$slug';

    final jsonFile = File('$base.json');
    jsonFile.writeAsStringSync(const JsonEncoder.withIndent('  ').convert({
      'fetched_at': DateTime.now().toUtc().toIso8601String(),
      'player_id': playerId,
      'profile': profile,
      'statistics': stats['statistics'] ?? stats,
      'matches': matches,
    }));

    final csvFile = File('${base}_matches.csv');
    csvFile.writeAsStringSync(_matchesCsv(matches));

    stdout.writeln('\nSaved ${matches.length} matches:');
    stdout.writeln('  ${jsonFile.path}');
    stdout.writeln('  ${csvFile.path}');
  } on ApiException catch (e) {
    stderr.writeln('Request failed: $e');
    exitCode = 1;
  } finally {
    api.close();
  }
}

int? _parsePlayerId(String input) {
  final direct = int.tryParse(input.trim());
  if (direct != null) return direct;
  final match = RegExp(r'player-profile/(\d+)').firstMatch(input);
  return match == null ? null : int.parse(match.group(1)!);
}

String? _option(List<String> args, String name) {
  final i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}

String _slug(String name) =>
    name.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '-').replaceAll(RegExp(r'^-|-$'), '');

String _matchesCsv(List<Map<String, dynamic>> matches) {
  const header = [
    'match_id', 'date', 'match_type', 'ball_type', 'overs', 'tournament',
    'round', 'ground', 'city', 'team_a', 'team_a_score', 'team_b',
    'team_b_score', 'winner', 'win_by', 'result', 'summary', 'toss',
  ];
  final rows = <List<Object?>>[header];
  for (final m in matches) {
    rows.add([
      m['match_id'],
      m['match_start_time'],
      m['match_type'],
      m['ball_type'],
      m['overs'],
      m['tournament_name'],
      m['tournament_round_name'],
      m['ground_name'],
      m['city_name'],
      m['team_a'],
      m['team_a_summary'],
      m['team_b'],
      m['team_b_summary'],
      m['winning_team'],
      m['win_by'],
      m['match_result'],
      (m['match_summary'] as Map?)?['summary'],
      m['toss_details'],
    ]);
  }
  return rows.map((r) => r.map(_csvCell).join(',')).join('\n');
}

String _csvCell(Object? value) {
  final s = value?.toString() ?? '';
  return RegExp(r'[",\n]').hasMatch(s) ? '"${s.replaceAll('"', '""')}"' : s;
}
