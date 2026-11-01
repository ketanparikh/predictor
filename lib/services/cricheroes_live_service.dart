import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

import '../models/live_score.dart';
import 'live_score_service.dart';

class CricHeroesFeedMatch {
  final int cricheroesMatchId;
  final String? label;

  const CricHeroesFeedMatch({
    required this.cricheroesMatchId,
    this.label,
  });

  String get matchId => 'ch-$cricheroesMatchId';
}

class CricHeroesLiveConfig {
  final bool enabled;
  final bool includeAppFixtures;
  final Duration pollInterval;
  final List<CricHeroesFeedMatch> matches;

  const CricHeroesLiveConfig({
    this.enabled = false,
    this.includeAppFixtures = true,
    this.pollInterval = const Duration(seconds: 8),
    this.matches = const [],
  });

  static const empty = CricHeroesLiveConfig();
}

class CricHeroesLiveService {
  static const _bundlePath = 'assets/config/live_scoreboard.json';
  static const _directBase = 'https://api.cricheroes.in/api/v1';
  static const _functionBase =
      'https://us-central1-predictor-jcpl.cloudfunctions.net/cricheroesProxy';

  final http.Client _client;
  CricHeroesLiveConfig? _config;

  CricHeroesLiveService({http.Client? client}) : _client = client ?? http.Client();

  Map<String, dynamic>? _configMap(Object? raw) {
    if (raw is! Map) return null;
    return Map<String, dynamic>.from(raw);
  }

  CricHeroesLiveConfig _configFromMap(Map<String, dynamic> raw) {
    final matches = <CricHeroesFeedMatch>[];
    for (final item in (raw['matches'] as List? ?? const [])) {
      if (item is! Map) continue;
      if (item['enabled'] == false) continue;
      final id = (item['cricheroesMatchId'] as num?)?.toInt();
      if (id == null) continue;
      matches.add(CricHeroesFeedMatch(
        cricheroesMatchId: id,
        label: item['label'] as String?,
      ));
    }
    return CricHeroesLiveConfig(
      enabled: raw['enabled'] != false,
      includeAppFixtures: raw['includeAppFixtures'] == true,
      pollInterval: Duration(
        seconds: (raw['pollSeconds'] as num?)?.toInt() ?? 8,
      ),
      matches: matches,
    );
  }

  Future<CricHeroesLiveConfig> loadConfig() async {
    if (_config != null) return _config!;
    try {
      final remote = await FirebaseFirestore.instance
          .collection('config')
          .doc('liveScoreboard')
          .get();
      final remoteMap = _configMap(remote.data());
      if (remoteMap != null && remoteMap['matches'] is List) {
        _config = _configFromMap(remoteMap);
        return _config!;
      }
    } catch (_) {}

    try {
      final raw = jsonDecode(await rootBundle.loadString(_bundlePath));
      final bundled = _configMap(raw);
      if (bundled == null) {
        _config = CricHeroesLiveConfig.empty;
        return _config!;
      }
      _config = _configFromMap(bundled);
      try {
        await FirebaseFirestore.instance
            .collection('config')
            .doc('liveScoreboard')
            .set({
          ...bundled,
          'updatedAt': FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));
      } catch (_) {}
      return _config!;
    } catch (_) {
      _config = CricHeroesLiveConfig.empty;
      return _config!;
    }
  }

  Stream<LiveScore> watchMatch(int cricheroesMatchId, {Duration? interval}) {
    late StreamController<LiveScore> controller;
    Timer? timer;
    var inflight = false;

    Future<void> tick() async {
      if (inflight) return;
      inflight = true;
      try {
        final score = await fetchMatch(cricheroesMatchId);
        try {
          await LiveScoreService().saveScore(score);
        } catch (_) {}
        if (!controller.isClosed) controller.add(score);
      } catch (error, stack) {
        if (!controller.isClosed) controller.addError(error, stack);
      } finally {
        inflight = false;
      }
    }

    controller = StreamController<LiveScore>(
      onListen: () {
        tick();
        timer = Timer.periodic(
          interval ?? const Duration(seconds: 8),
          (_) => tick(),
        );
      },
      onCancel: () => timer?.cancel(),
    );
    return controller.stream;
  }

  Future<LiveScore> fetchMatch(int cricheroesMatchId) async {
    final mini = await _get('/scorecard/get-mini-scorecard/$cricheroesMatchId');
    final card = await _get('/scorecard/v2/get-scorecard/$cricheroesMatchId');
    Map<String, dynamic> commentary = const {};
    try {
      commentary = await _get('/scorecard/v2/get-commentary/$cricheroesMatchId');
    } catch (_) {
      commentary = const {};
    }
    return mapLiveScore(
      cricheroesMatchId: cricheroesMatchId,
      mini: mini,
      card: card,
      commentary: commentary,
    );
  }

  Future<Map<String, dynamic>> _get(String path) async {
    final uri = _requestUri(path);
    final response = await _client.get(uri, headers: _headers(uri)).timeout(
          const Duration(seconds: 20),
        );
    if (response.statusCode != 200) {
      throw Exception('CricHeroes HTTP ${response.statusCode} for $path');
    }
    final json = jsonDecode(response.body);
    if (json is! Map) throw Exception('Unexpected response for $path');
    if (json['status'] != true) {
      throw Exception(json['error'] ?? json['message'] ?? 'Request failed');
    }
    final data = json['data'];
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return Map<String, dynamic>.from(data);
    throw Exception('Unexpected payload for $path');
  }

  Uri _requestUri(String path) {
    if (_useDirectApi) {
      return Uri.parse('$_directBase$path');
    }
    if (_useHostingRewrite) {
      return Uri.parse('${Uri.base.origin}/api/cricheroes').replace(
        queryParameters: {'path': path},
      );
    }
    return Uri.parse(_functionBase).replace(queryParameters: {'path': path});
  }

  Map<String, String> _headers(Uri uri) {
    if (uri.host.contains('cricheroes.in')) {
      return {
        'api-key': 'cr!CkH3r0s',
        'udid': List.generate(32, (_) => Random().nextInt(16).toRadixString(16)).join(),
        'device-type': 'Chrome: 126.0.0.0',
        'Accept': 'application/json',
      };
    }
    return const {'Accept': 'application/json'};
  }

  bool get _useDirectApi => !kIsWeb;

  bool get _useHostingRewrite {
    if (!kIsWeb) return false;
    final host = Uri.base.host;
    return host == 'predictor-jcpl.web.app' ||
        host == 'predictor-jcpl.firebaseapp.com';
  }
}

LiveScore mapLiveScore({
  required int cricheroesMatchId,
  required Map<String, dynamic> mini,
  required Map<String, dynamic> card,
  required Map<String, dynamic> commentary,
}) {
  final teamA = _map(card['team_a']);
  final teamB = _map(card['team_b']);
  final team1Name = '${teamA['name'] ?? mini['team_a']?['name'] ?? 'Team 1'}'.trim();
  final team2Name = '${teamB['name'] ?? mini['team_b']?['name'] ?? 'Team 2'}'.trim();
  final ballsByInning = _commentaryByInning(commentary['commentary'] ?? mini['commentary']);
  final innings = <Innings>[];

  void addTeamInnings(Map<String, dynamic> team, String batting, String bowling) {
    final scorecards = _maps(team['scorecard']);
    final innMeta = _maps(team['innings']);
    if (scorecards.isEmpty && innMeta.isEmpty) return;
    final count = max(scorecards.length, innMeta.length);
    for (var i = 0; i < count; i++) {
      final sc = i < scorecards.length ? scorecards[i] : const <String, dynamic>{};
      final meta = i < innMeta.length ? innMeta[i] : const <String, dynamic>{};
      final number = (sc['inning'] as num?)?.toInt() ??
          (meta['inning'] as num?)?.toInt() ??
          innings.length + 1;
      innings.add(_mapInnings(
        number: number,
        battingTeam: batting,
        bowlingTeam: bowling,
        scorecard: sc,
        meta: meta,
        events: ballsByInning[number] ?? const [],
      ));
    }
  }

  addTeamInnings(teamA, team1Name, team2Name);
  addTeamInnings(teamB, team2Name, team1Name);
  innings.sort((a, b) => a.number.compareTo(b.number));

  final currentInning = (card['current_inning'] as num?)?.toInt() ??
      (mini['current_inning'] as num?)?.toInt() ??
      (innings.isEmpty ? 1 : innings.last.number);
  final live = innings.where((inn) => inn.number == currentInning).toList();
  if (live.isNotEmpty) {
    final idx = innings.indexWhere((inn) => inn.number == currentInning);
    innings[idx] = _withLiveContext(innings[idx], mini);
  }

  final statusRaw = '${card['status'] ?? mini['status'] ?? ''}'.toLowerCase();
  final status = statusRaw == 'live'
      ? 'live'
      : statusRaw == 'past' || statusRaw == 'completed'
          ? 'completed'
          : 'upcoming';
  final toss = _parseToss('${card['toss_details'] ?? mini['toss_details'] ?? ''}');
  final summary = _map(card['match_summary']).isNotEmpty
      ? _map(card['match_summary'])
      : _map(mini['match_summary']);
  final resultText = '${summary['summary'] ?? ''}'.trim();
  final start = DateTime.tryParse('${card['start_datetime'] ?? mini['start_datetime'] ?? ''}');

  final team1Inn = innings.where((inn) => inn.battingTeam == team1Name).toList();
  final team2Inn = innings.where((inn) => inn.battingTeam == team2Name).toList();
  final t1 = team1Inn.isEmpty ? null : team1Inn.last;
  final t2 = team2Inn.isEmpty ? null : team2Inn.last;
  final battingTeam = live.isNotEmpty ? live.last.battingTeam : team1Name;

  return LiveScore(
    matchId: 'ch-$cricheroesMatchId',
    team1: team1Name,
    team2: team2Name,
    battingSide: battingTeam == team2Name ? 2 : 1,
    team1Runs: t1?.runs ?? 0,
    team1Wickets: t1?.wickets ?? 0,
    team1Overs: t1 == null ? 0 : cricketOversDouble(t1.legalBalls),
    team2Runs: t2?.runs ?? 0,
    team2Wickets: t2?.wickets ?? 0,
    team2Overs: t2 == null ? 0 : cricketOversDouble(t2.legalBalls),
    status: status,
    result: status == 'completed' && resultText.isNotEmpty ? resultText : null,
    dayName: '${card['tournament_name'] ?? mini['tournament_name'] ?? 'CricHeroes'}',
    matchTime: start == null ? null : _formatTime(start.toLocal()),
    maxOvers: (card['overs'] as num?)?.toInt() ??
        (mini['overs'] as num?)?.toInt() ??
        20,
    currentInnings: currentInning,
    tossWinner: toss.$1,
    tossDecision: toss.$2,
    team1Squad: _squad(teamA),
    team2Squad: _squad(teamB),
    innings: innings,
    source: 'cricheroes',
    cricheroesMatchId: cricheroesMatchId,
  );
}

Innings _mapInnings({
  required int number,
  required String battingTeam,
  required String bowlingTeam,
  required Map<String, dynamic> scorecard,
  required Map<String, dynamic> meta,
  required List<BallEvent> events,
}) {
  final batters = _maps(scorecard['batting']).map(_batter).toList();
  final bowlers = _maps(scorecard['bowling']).map(_bowler).toList();
  final extras = _map(scorecard['extras']);
  final extraData = _maps(extras['data']);
  int extraOf(String code) {
    for (final row in extraData) {
      if ('${row['type_code']}'.toUpperCase() == code) {
        return (row['extra_type_run'] as num?)?.toInt() ??
            (row['extra_run'] as num?)?.toInt() ??
            0;
      }
    }
    return 0;
  }

  final fow = _maps(_map(scorecard['fall_of_wicket'])['data']);
  final legalBalls = _legalBalls(meta['overs_played'] ?? scorecard['overs']);
  final notOut = batters.where((b) => !b.out).toList();
  final currentBowler = bowlers.isEmpty ? '' : bowlers.last.name;
  return Innings(
    number: number,
    battingTeam: battingTeam,
    bowlingTeam: bowlingTeam,
    openingStriker: batters.isNotEmpty ? batters.first.name : '',
    openingNonStriker: batters.length > 1 ? batters[1].name : '',
    openingBowler: bowlers.isNotEmpty ? bowlers.first.name : '',
    events: events,
    runs: (meta['total_run'] as num?)?.toInt() ?? 0,
    wickets: (meta['total_wicket'] as num?)?.toInt() ?? 0,
    legalBalls: legalBalls,
    wides: extraOf('WD'),
    noBalls: extraOf('NB'),
    byes: extraOf('B'),
    legByes: extraOf('LB'),
    batters: batters,
    bowlers: bowlers,
    striker: notOut.isNotEmpty ? notOut.last.name : '',
    nonStriker: notOut.length > 1 ? notOut[notOut.length - 2].name : '',
    currentBowler: currentBowler,
    completed: meta['inning_end_time'] != null && '${meta['inning_end_time']}'.isNotEmpty,
    thisOver: const [],
    fallOfWickets: [
      for (final row in fow)
        FallOfWicket(
          wicket: (row['wicket'] as num?)?.toInt() ?? 0,
          batter: '${row['dismiss_player_name'] ?? ''}',
          score: (row['run'] as num?)?.toInt() ?? 0,
          overs: '${row['over'] ?? '0.0'}',
        ),
    ],
  );
}

Innings _withLiveContext(Innings innings, Map<String, dynamic> mini) {
  final batsmen = _playerPair(mini['batsmen']);
  final bowlers = _playerPair(mini['bowlers']);
  final striker = _map(batsmen['sb']);
  final nonStriker = _map(batsmen['nsb']);
  final bowler = _map(bowlers['sb']);
  final partnership = _map(mini['current_partnership_data']);
  final recent = '${mini['recent_over'] ?? ''}';
  final thisOver = recent.contains('|')
      ? recent.split('|').last.trim().split(RegExp(r'\s+')).where((t) => t.isNotEmpty).toList()
      : recent.split(RegExp(r'\s+')).where((t) => t.isNotEmpty).toList();

  BatterInnings overlay(Map<String, dynamic> row, BatterInnings? existing) {
    final name = '${row['name'] ?? existing?.name ?? ''}'.trim();
    if (name.isEmpty) {
      return existing ?? const BatterInnings(name: '');
    }
    return BatterInnings(
      name: name,
      runs: (row['runs'] as num?)?.toInt() ?? existing?.runs ?? 0,
      balls: (row['balls'] as num?)?.toInt() ?? existing?.balls ?? 0,
      fours: (row['4s'] as num?)?.toInt() ?? existing?.fours ?? 0,
      sixes: (row['6s'] as num?)?.toInt() ?? existing?.sixes ?? 0,
      out: false,
    );
  }

  final nextBatters = [...innings.batters];
  void upsertBatter(BatterInnings batter) {
    if (batter.name.isEmpty) return;
    final idx = nextBatters.indexWhere((b) => b.name.trim() == batter.name.trim());
    if (idx >= 0) {
      nextBatters[idx] = batter;
    } else {
      nextBatters.add(batter);
    }
  }

  if (striker.isNotEmpty) {
    upsertBatter(overlay(striker, innings.batterNamed('${striker['name'] ?? ''}')));
  }
  if (nonStriker.isNotEmpty) {
    upsertBatter(overlay(nonStriker, innings.batterNamed('${nonStriker['name'] ?? ''}')));
  }

  var nextBowlers = [...innings.bowlers];
  if (bowler.isNotEmpty) {
    final mapped = _bowler(bowler);
    final idx = nextBowlers.indexWhere((b) => b.name.trim() == mapped.name.trim());
    if (idx >= 0) {
      nextBowlers[idx] = mapped;
    } else {
      nextBowlers.add(mapped);
    }
  }

  return Innings(
    number: innings.number,
    battingTeam: innings.battingTeam,
    bowlingTeam: innings.bowlingTeam,
    openingStriker: innings.openingStriker,
    openingNonStriker: innings.openingNonStriker,
    openingBowler: innings.openingBowler,
    events: innings.events,
    runs: innings.runs,
    wickets: innings.wickets,
    legalBalls: innings.legalBalls,
    wides: innings.wides,
    noBalls: innings.noBalls,
    byes: innings.byes,
    legByes: innings.legByes,
    batters: nextBatters,
    bowlers: nextBowlers,
    striker: '${striker['name'] ?? innings.striker}'.trim(),
    nonStriker: '${nonStriker['name'] ?? innings.nonStriker}'.trim(),
    currentBowler: '${bowler['name'] ?? innings.currentBowler}'.trim(),
    needsNewBowler: innings.needsNewBowler,
    completed: innings.completed,
    thisOver: thisOver,
    fallOfWickets: innings.fallOfWickets,
    partnershipRuns: (partnership['runs'] as num?)?.toInt() ?? innings.partnershipRuns,
    partnershipBalls: (partnership['balls'] as num?)?.toInt() ?? innings.partnershipBalls,
  );
}

BatterInnings _batter(Map<String, dynamic> row) {
  final how = '${row['how_to_out'] ?? ''}'.trim();
  final out = how.isNotEmpty && how.toLowerCase() != 'not out';
  return BatterInnings(
    name: '${row['name'] ?? ''}'.trim(),
    runs: (row['runs'] as num?)?.toInt() ?? 0,
    balls: (row['balls'] as num?)?.toInt() ?? 0,
    fours: (row['4s'] as num?)?.toInt() ?? 0,
    sixes: (row['6s'] as num?)?.toInt() ?? 0,
    out: out,
    dismissal: out ? how : null,
  );
}

BowlerSpell _bowler(Map<String, dynamic> row) {
  return BowlerSpell(
    name: '${row['name'] ?? ''}'.trim(),
    balls: _legalBalls(row['overs']),
    maidens: (row['maidens'] as num?)?.toInt() ?? 0,
    runs: (row['runs'] as num?)?.toInt() ?? 0,
    wickets: (row['wickets'] as num?)?.toInt() ?? 0,
    wides: (row['wide'] as num?)?.toInt() ?? 0,
    noBalls: (row['noball'] as num?)?.toInt() ?? 0,
  );
}

Map<int, List<BallEvent>> _commentaryByInning(Object? raw) {
  final balls = _maps(raw)
    ..sort((a, b) {
      final idA = (a['ball_id'] as num?)?.toInt() ?? 0;
      final idB = (b['ball_id'] as num?)?.toInt() ?? 0;
      return idA.compareTo(idB);
    });
  final grouped = <int, List<BallEvent>>{};
  for (final ball in balls) {
    final inning = (ball['inning'] as num?)?.toInt() ?? 1;
    grouped.putIfAbsent(inning, () => []).add(_ballEvent(ball));
  }
  return grouped;
}

BallEvent _ballEvent(Map<String, dynamic> ball) {
  final extra = '${ball['extra_type_code'] ?? ''}'.toUpperCase();
  final commentary = '${ball['commentary'] ?? ''}'.split('\n').first.trim();
  final names = RegExp(r'^(.*?)\s+to\s+(.*?)(?:,|$)').firstMatch(commentary);
  final kind = extra == 'WD'
      ? 'wide'
      : extra == 'NB'
          ? 'noBall'
          : extra == 'B'
              ? 'bye'
              : extra == 'LB'
                  ? 'legBye'
                  : 'legal';
  return BallEvent(
    kind: kind,
    runs: (ball['run'] as num?)?.toInt() ?? 0,
    wicket: (ball['is_out'] == 1 || ball['is_out'] == true)
        ? '${ball['dismiss_type'] ?? ball['out_how'] ?? 'wicket'}'
        : null,
    bowler: names?.group(1)?.trim(),
    batsman: names?.group(2)?.trim() ?? '',
    commentary: commentary,
    legalBall: extra != 'WD' && extra != 'NB',
  );
}

List<String> _squad(Map<String, dynamic> team) {
  final names = <String>[];
  void add(String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return;
    if (!names.any((n) => n.toLowerCase() == trimmed.toLowerCase())) {
      names.add(trimmed);
    }
  }

  for (final inn in _maps(team['scorecard'])) {
    for (final batter in _maps(inn['batting'])) {
      add('${batter['name'] ?? ''}');
    }
    for (final waiting in _maps(inn['to_be_bat'])) {
      add('${waiting['name'] ?? ''}');
    }
  }
  return names;
}

(String?, String?) _parseToss(String raw) {
  if (raw.trim().isEmpty) return (null, null);
  final field = RegExp(r'(?:Toss:\s*)?(.*?)\s+(?:opt|won the toss and elected) to\s+(bat|field|bowl)',
          caseSensitive: false)
      .firstMatch(raw);
  if (field == null) return (raw.replaceFirst(RegExp(r'^Toss:\s*'), '').trim(), null);
  final decision = field.group(2)!.toLowerCase();
  return (
    field.group(1)!.trim(),
    decision == 'bowl' ? 'field' : decision,
  );
}

int _legalBalls(Object? raw) {
  if (raw == null) return 0;
  final text = '$raw';
  final parts = text.split('.');
  final overs = int.tryParse(parts.first) ?? 0;
  final balls = parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;
  return overs * 6 + balls;
}

String _formatTime(DateTime time) {
  final hour = time.hour > 12 ? time.hour - 12 : (time.hour == 0 ? 12 : time.hour);
  final minute = time.minute.toString().padLeft(2, '0');
  final suffix = time.hour >= 12 ? 'PM' : 'AM';
  return '$hour:$minute $suffix';
}

Map<String, dynamic> _map(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return const {};
}

Map<String, dynamic> _playerPair(Object? value) {
  if (value is Map) return _map(value);
  if (value is List && value.isNotEmpty) {
    return {
      'sb': value.first,
      if (value.length > 1) 'nsb': value[1],
    };
  }
  return const {};
}

List<Map<String, dynamic>> _maps(Object? value) {
  if (value is! List) return const [];
  return [
    for (final item in value)
      if (item is Map) Map<String, dynamic>.from(item),
  ];
}
