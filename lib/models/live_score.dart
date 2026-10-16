String cricketOvers(int legalBalls) =>
    '${legalBalls ~/ 6}.${legalBalls % 6}';

double cricketOversDouble(int legalBalls) =>
    (legalBalls ~/ 6) + (legalBalls % 6) / 10.0;

double cricketRate(int runs, int legalBalls) {
  if (legalBalls <= 0) return 0;
  return runs / (legalBalls / 6.0);
}

double strikeRate(int runs, int balls) {
  if (balls <= 0) return 0;
  return runs * 100 / balls;
}

class BatterInnings {
  final String name;
  final int runs;
  final int balls;
  final int fours;
  final int sixes;
  final bool out;
  final String? dismissal;

  const BatterInnings({
    required this.name,
    this.runs = 0,
    this.balls = 0,
    this.fours = 0,
    this.sixes = 0,
    this.out = false,
    this.dismissal,
  });

  double get sr => strikeRate(runs, balls);

  String get scoreCell => out || balls > 0 || runs > 0
      ? '$runs ($balls)'
      : '-';

  Map<String, dynamic> toMap() => {
        'name': name,
        'runs': runs,
        'balls': balls,
        'fours': fours,
        'sixes': sixes,
        'out': out,
        'dismissal': dismissal,
      };

  factory BatterInnings.fromMap(Map<String, dynamic> map) => BatterInnings(
        name: map['name'] as String? ?? '',
        runs: (map['runs'] as num?)?.toInt() ?? 0,
        balls: (map['balls'] as num?)?.toInt() ?? 0,
        fours: (map['fours'] as num?)?.toInt() ?? 0,
        sixes: (map['sixes'] as num?)?.toInt() ?? 0,
        out: map['out'] as bool? ?? false,
        dismissal: map['dismissal'] as String?,
      );

  BatterInnings copyWith({
    String? name,
    int? runs,
    int? balls,
    int? fours,
    int? sixes,
    bool? out,
    String? dismissal,
  }) {
    return BatterInnings(
      name: name ?? this.name,
      runs: runs ?? this.runs,
      balls: balls ?? this.balls,
      fours: fours ?? this.fours,
      sixes: sixes ?? this.sixes,
      out: out ?? this.out,
      dismissal: dismissal ?? this.dismissal,
    );
  }
}

class BowlerSpell {
  final String name;
  final int balls;
  final int maidens;
  final int runs;
  final int wickets;
  final int wides;
  final int noBalls;

  const BowlerSpell({
    required this.name,
    this.balls = 0,
    this.maidens = 0,
    this.runs = 0,
    this.wickets = 0,
    this.wides = 0,
    this.noBalls = 0,
  });

  String get overs => cricketOvers(balls);
  double get econ => cricketRate(runs, balls);

  Map<String, dynamic> toMap() => {
        'name': name,
        'balls': balls,
        'maidens': maidens,
        'runs': runs,
        'wickets': wickets,
        'wides': wides,
        'noBalls': noBalls,
      };

  factory BowlerSpell.fromMap(Map<String, dynamic> map) => BowlerSpell(
        name: map['name'] as String? ?? '',
        balls: (map['balls'] as num?)?.toInt() ?? 0,
        maidens: (map['maidens'] as num?)?.toInt() ?? 0,
        runs: (map['runs'] as num?)?.toInt() ?? 0,
        wickets: (map['wickets'] as num?)?.toInt() ?? 0,
        wides: (map['wides'] as num?)?.toInt() ?? 0,
        noBalls: (map['noBalls'] as num?)?.toInt() ?? 0,
      );
}

class FallOfWicket {
  final int wicket;
  final String batter;
  final int score;
  final String overs;

  const FallOfWicket({
    required this.wicket,
    required this.batter,
    required this.score,
    required this.overs,
  });

  Map<String, dynamic> toMap() => {
        'wicket': wicket,
        'batter': batter,
        'score': score,
        'overs': overs,
      };

  factory FallOfWicket.fromMap(Map<String, dynamic> map) => FallOfWicket(
        wicket: (map['wicket'] as num?)?.toInt() ?? 0,
        batter: map['batter'] as String? ?? '',
        score: (map['score'] as num?)?.toInt() ?? 0,
        overs: map['overs'] as String? ?? '0.0',
      );
}

class BallEvent {
  final String kind; // legal, wide, noBall, bye, legBye
  final int runs; // bat runs, or extra runs for bye/lb/wide-plus
  final String? wicket; // bowled, lbw, caught, stumped, runOut, hitWicket
  final bool outNonStriker;
  final String? fielder;
  final String? newBatsman;
  final String? bowler;
  final String batsman;
  final String commentary;
  final bool legalBall;

  const BallEvent({
    required this.kind,
    this.runs = 0,
    this.wicket,
    this.outNonStriker = false,
    this.fielder,
    this.newBatsman,
    this.bowler,
    this.batsman = '',
    this.commentary = '',
    this.legalBall = true,
  });

  Map<String, dynamic> toMap() => {
        'kind': kind,
        'runs': runs,
        'wicket': wicket,
        'outNonStriker': outNonStriker,
        'fielder': fielder,
        'newBatsman': newBatsman,
        'bowler': bowler,
        'batsman': batsman,
        'commentary': commentary,
        'legalBall': legalBall,
      };

  factory BallEvent.fromMap(Map<String, dynamic> map) => BallEvent(
        kind: map['kind'] as String? ?? 'legal',
        runs: (map['runs'] as num?)?.toInt() ?? 0,
        wicket: map['wicket'] as String?,
        outNonStriker: map['outNonStriker'] as bool? ?? false,
        fielder: map['fielder'] as String?,
        newBatsman: map['newBatsman'] as String?,
        bowler: map['bowler'] as String?,
        batsman: map['batsman'] as String? ?? '',
        commentary: map['commentary'] as String? ?? '',
        legalBall: map['legalBall'] as bool? ?? true,
      );
}

class Innings {
  final int number;
  final String battingTeam;
  final String bowlingTeam;
  final String openingStriker;
  final String openingNonStriker;
  final String openingBowler;
  final List<BallEvent> events;
  final int runs;
  final int wickets;
  final int legalBalls;
  final int wides;
  final int noBalls;
  final int byes;
  final int legByes;
  final List<BatterInnings> batters;
  final List<BowlerSpell> bowlers;
  final String striker;
  final String nonStriker;
  final String currentBowler;
  final bool needsNewBowler;
  final bool completed;
  final List<String> thisOver;
  final List<FallOfWicket> fallOfWickets;
  final int partnershipRuns;
  final int partnershipBalls;

  const Innings({
    required this.number,
    required this.battingTeam,
    required this.bowlingTeam,
    required this.openingStriker,
    required this.openingNonStriker,
    required this.openingBowler,
    this.events = const [],
    this.runs = 0,
    this.wickets = 0,
    this.legalBalls = 0,
    this.wides = 0,
    this.noBalls = 0,
    this.byes = 0,
    this.legByes = 0,
    this.batters = const [],
    this.bowlers = const [],
    this.striker = '',
    this.nonStriker = '',
    this.currentBowler = '',
    this.needsNewBowler = false,
    this.completed = false,
    this.thisOver = const [],
    this.fallOfWickets = const [],
    this.partnershipRuns = 0,
    this.partnershipBalls = 0,
  });

  int get extras => wides + noBalls + byes + legByes;
  String get overs => cricketOvers(legalBalls);
  double get crr => cricketRate(runs, legalBalls);
  String get scoreLine => '$runs/$wickets ($overs ov)';

  BatterInnings? batterNamed(String name) {
    for (final b in batters) {
      if (b.name == name) return b;
    }
    return null;
  }

  BowlerSpell? bowlerNamed(String name) {
    for (final b in bowlers) {
      if (b.name == name) return b;
    }
    return null;
  }

  Map<String, dynamic> toMap() => {
        'number': number,
        'battingTeam': battingTeam,
        'bowlingTeam': bowlingTeam,
        'openingStriker': openingStriker,
        'openingNonStriker': openingNonStriker,
        'openingBowler': openingBowler,
        'events': events.map((e) => e.toMap()).toList(),
        'runs': runs,
        'wickets': wickets,
        'legalBalls': legalBalls,
        'wides': wides,
        'noBalls': noBalls,
        'byes': byes,
        'legByes': legByes,
        'batters': batters.map((b) => b.toMap()).toList(),
        'bowlers': bowlers.map((b) => b.toMap()).toList(),
        'striker': striker,
        'nonStriker': nonStriker,
        'currentBowler': currentBowler,
        'needsNewBowler': needsNewBowler,
        'completed': completed,
        'thisOver': thisOver,
        'fallOfWickets': fallOfWickets.map((f) => f.toMap()).toList(),
        'partnershipRuns': partnershipRuns,
        'partnershipBalls': partnershipBalls,
      };

  factory Innings.fromMap(Map<String, dynamic> map) => Innings(
        number: (map['number'] as num?)?.toInt() ?? 1,
        battingTeam: map['battingTeam'] as String? ?? '',
        bowlingTeam: map['bowlingTeam'] as String? ?? '',
        openingStriker: map['openingStriker'] as String? ?? '',
        openingNonStriker: map['openingNonStriker'] as String? ?? '',
        openingBowler: map['openingBowler'] as String? ?? '',
        events: _mapList(map['events'], BallEvent.fromMap),
        runs: (map['runs'] as num?)?.toInt() ?? 0,
        wickets: (map['wickets'] as num?)?.toInt() ?? 0,
        legalBalls: (map['legalBalls'] as num?)?.toInt() ?? 0,
        wides: (map['wides'] as num?)?.toInt() ?? 0,
        noBalls: (map['noBalls'] as num?)?.toInt() ?? 0,
        byes: (map['byes'] as num?)?.toInt() ?? 0,
        legByes: (map['legByes'] as num?)?.toInt() ?? 0,
        batters: _mapList(map['batters'], BatterInnings.fromMap),
        bowlers: _mapList(map['bowlers'], BowlerSpell.fromMap),
        striker: map['striker'] as String? ?? '',
        nonStriker: map['nonStriker'] as String? ?? '',
        currentBowler: map['currentBowler'] as String? ?? '',
        needsNewBowler: map['needsNewBowler'] as bool? ?? false,
        completed: map['completed'] as bool? ?? false,
        thisOver: ((map['thisOver'] as List?) ?? []).map((e) => '$e').toList(),
        fallOfWickets: _mapList(map['fallOfWickets'], FallOfWicket.fromMap),
        partnershipRuns: (map['partnershipRuns'] as num?)?.toInt() ?? 0,
        partnershipBalls: (map['partnershipBalls'] as num?)?.toInt() ?? 0,
      );
}

class LiveScore {
  final String matchId;
  final String team1;
  final String team2;
  final int battingSide;
  final int team1Runs;
  final int team1Wickets;
  final double team1Overs;
  final int team2Runs;
  final int team2Wickets;
  final double team2Overs;
  final String status;
  final String? result;
  final String? dayName;
  final String? matchTime;
  final int maxOvers;
  final int maxWickets;
  final int currentInnings;
  final String? tossWinner;
  final String? tossDecision;
  final List<String> team1Squad;
  final List<String> team2Squad;
  final List<Innings> innings;
  final bool isWeekendMatch;
  final bool team1SheetSubmitted;
  final bool team2SheetSubmitted;
  final String? source;
  final int? cricheroesMatchId;

  const LiveScore({
    required this.matchId,
    required this.team1,
    required this.team2,
    this.battingSide = 1,
    this.team1Runs = 0,
    this.team1Wickets = 0,
    this.team1Overs = 0,
    this.team2Runs = 0,
    this.team2Wickets = 0,
    this.team2Overs = 0,
    this.status = 'upcoming',
    this.result,
    this.dayName,
    this.matchTime,
    this.maxOvers = 20,
    this.maxWickets = 10,
    this.currentInnings = 1,
    this.tossWinner,
    this.tossDecision,
    this.team1Squad = const [],
    this.team2Squad = const [],
    this.innings = const [],
    this.isWeekendMatch = false,
    this.team1SheetSubmitted = false,
    this.team2SheetSubmitted = false,
    this.source,
    this.cricheroesMatchId,
  });

  bool get isCricHeroes => source == 'cricheroes';

  bool get weekendSheetsReady =>
      isWeekendMatch &&
      team1.trim().isNotEmpty &&
      team2.trim().isNotEmpty &&
      team1SheetSubmitted &&
      team2SheetSubmitted &&
      team1Squad.length >= 2 &&
      team2Squad.length >= 2;

  bool get hasStarted => innings.isNotEmpty;
  bool get isLive => status == 'live';
  bool get isComplete => status == 'completed';

  /// Winning team name for a completed match, or null on a tie / incomplete.
  String? get winnerName {
    if (!isComplete) return null;
    final first = inningsNumber(1);
    final second = inningsNumber(2);
    if (first == null || second == null) return null;
    if (second.runs > first.runs) return second.battingTeam;
    if (second.runs < first.runs) return first.battingTeam;
    return null;
  }

  Innings? get liveInnings {
    if (innings.isEmpty) return null;
    final idx = (currentInnings - 1).clamp(0, innings.length - 1);
    return innings[idx];
  }

  Innings? inningsNumber(int number) {
    for (final inn in innings) {
      if (inn.number == number) return inn;
    }
    return null;
  }

  int get target {
    final first = inningsNumber(1);
    if (first == null || !first.completed) return 0;
    return first.runs + 1;
  }

  List<String> squadFor(String teamName) {
    final key = teamName.trim().toLowerCase();
    if (key.isEmpty) return const [];
    if (team1.trim().toLowerCase() == key) return team1Squad;
    if (team2.trim().toLowerCase() == key) return team2Squad;
    return const [];
  }

  /// Drop toss, innings and previous batsman/bowler picks.
  LiveScore resetPlay() {
    return copyWith(
      innings: const [],
      status: 'upcoming',
      clearResult: true,
      clearToss: true,
      currentInnings: 1,
      battingSide: 1,
      team1Runs: 0,
      team1Wickets: 0,
      team1Overs: 0,
      team2Runs: 0,
      team2Wickets: 0,
      team2Overs: 0,
    );
  }

  /// Wipe a weekend side so a replacement team cannot inherit old names.
  LiveScore clearWeekendSide(int side) {
    final cleared = resetPlay();
    if (side == 1) {
      return cleared.copyWith(
        team1: '',
        team1Squad: const [],
        team1SheetSubmitted: false,
      );
    }
    return cleared.copyWith(
      team2: '',
      team2Squad: const [],
      team2SheetSubmitted: false,
    );
  }

  String get team1ScoreLine => _line(team1, team1Runs, team1Wickets, team1Overs);
  String get team2ScoreLine => _line(team2, team2Runs, team2Wickets, team2Overs);

  String _line(String team, int runs, int wkts, double overs) {
    final inn = innings.where((i) => i.battingTeam == team).toList();
    if (inn.isEmpty) {
      return status == 'completed' ? '$runs/$wkts (${overs.toStringAsFixed(1)})' : 'yet to bat';
    }
    final latest = inn.last;
    if (latest.legalBalls == 0 && latest.runs == 0 && !latest.completed) {
      return status == 'upcoming' ? 'yet to bat' : latest.scoreLine;
    }
    return latest.scoreLine;
  }

  factory LiveScore.fromMap(String matchId, Map<String, dynamic> map) {
    return LiveScore(
      matchId: matchId,
      team1: map['team1'] as String? ?? 'Team 1',
      team2: map['team2'] as String? ?? 'Team 2',
      battingSide: (map['battingSide'] as num?)?.toInt() ?? 1,
      team1Runs: (map['team1Runs'] as num?)?.toInt() ?? 0,
      team1Wickets: (map['team1Wickets'] as num?)?.toInt() ?? 0,
      team1Overs: (map['team1Overs'] as num?)?.toDouble() ?? 0,
      team2Runs: (map['team2Runs'] as num?)?.toInt() ?? 0,
      team2Wickets: (map['team2Wickets'] as num?)?.toInt() ?? 0,
      team2Overs: (map['team2Overs'] as num?)?.toDouble() ?? 0,
      status: map['status'] as String? ?? 'upcoming',
      result: map['result'] as String?,
      dayName: map['dayName'] as String?,
      matchTime: map['matchTime'] as String?,
      maxOvers: (map['maxOvers'] as num?)?.toInt() ?? 20,
      maxWickets: (map['maxWickets'] as num?)?.toInt() ?? 10,
      currentInnings: (map['currentInnings'] as num?)?.toInt() ?? 1,
      tossWinner: map['tossWinner'] as String?,
      tossDecision: map['tossDecision'] as String?,
      team1Squad: _stringList(map['team1Squad']),
      team2Squad: _stringList(map['team2Squad']),
      innings: _mapList(map['innings'], Innings.fromMap),
      isWeekendMatch: map['isWeekendMatch'] == true,
      team1SheetSubmitted: _sheetSubmitted(map, 'team1SheetSubmitted', map['team1Squad']),
      team2SheetSubmitted: _sheetSubmitted(map, 'team2SheetSubmitted', map['team2Squad']),
      source: map['source'] as String?,
      cricheroesMatchId: (map['cricheroesMatchId'] as num?)?.toInt(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'team1': team1,
      'team2': team2,
      'battingSide': battingSide,
      'team1Runs': team1Runs,
      'team1Wickets': team1Wickets,
      'team1Overs': team1Overs,
      'team2Runs': team2Runs,
      'team2Wickets': team2Wickets,
      'team2Overs': team2Overs,
      'status': status,
      'result': result,
      'dayName': dayName,
      'matchTime': matchTime,
      'maxOvers': maxOvers,
      'maxWickets': maxWickets,
      'currentInnings': currentInnings,
      'tossWinner': tossWinner,
      'tossDecision': tossDecision,
      'team1Squad': team1Squad,
      'team2Squad': team2Squad,
      'innings': innings.map((i) => i.toMap()).toList(),
      'isWeekendMatch': isWeekendMatch,
      'team1SheetSubmitted': team1SheetSubmitted,
      'team2SheetSubmitted': team2SheetSubmitted,
      if (source != null) 'source': source,
      if (cricheroesMatchId != null) 'cricheroesMatchId': cricheroesMatchId,
    };
  }

  LiveScore copyWith({
    String? team1,
    String? team2,
    int? battingSide,
    int? team1Runs,
    int? team1Wickets,
    double? team1Overs,
    int? team2Runs,
    int? team2Wickets,
    double? team2Overs,
    String? status,
    String? result,
    bool clearResult = false,
    String? dayName,
    String? matchTime,
    int? maxOvers,
    int? maxWickets,
    int? currentInnings,
    String? tossWinner,
    String? tossDecision,
    List<String>? team1Squad,
    List<String>? team2Squad,
    List<Innings>? innings,
    bool? isWeekendMatch,
    bool? team1SheetSubmitted,
    bool? team2SheetSubmitted,
    String? source,
    int? cricheroesMatchId,
    bool clearToss = false,
  }) {
    return LiveScore(
      matchId: matchId,
      team1: team1 ?? this.team1,
      team2: team2 ?? this.team2,
      battingSide: battingSide ?? this.battingSide,
      team1Runs: team1Runs ?? this.team1Runs,
      team1Wickets: team1Wickets ?? this.team1Wickets,
      team1Overs: team1Overs ?? this.team1Overs,
      team2Runs: team2Runs ?? this.team2Runs,
      team2Wickets: team2Wickets ?? this.team2Wickets,
      team2Overs: team2Overs ?? this.team2Overs,
      status: status ?? this.status,
      result: clearResult ? null : (result ?? this.result),
      dayName: dayName ?? this.dayName,
      matchTime: matchTime ?? this.matchTime,
      maxOvers: maxOvers ?? this.maxOvers,
      maxWickets: maxWickets ?? this.maxWickets,
      currentInnings: currentInnings ?? this.currentInnings,
      tossWinner: clearToss ? null : (tossWinner ?? this.tossWinner),
      tossDecision: clearToss ? null : (tossDecision ?? this.tossDecision),
      team1Squad: team1Squad ?? this.team1Squad,
      team2Squad: team2Squad ?? this.team2Squad,
      innings: innings ?? this.innings,
      isWeekendMatch: isWeekendMatch ?? this.isWeekendMatch,
      team1SheetSubmitted: team1SheetSubmitted ?? this.team1SheetSubmitted,
      team2SheetSubmitted: team2SheetSubmitted ?? this.team2SheetSubmitted,
      source: source ?? this.source,
      cricheroesMatchId: cricheroesMatchId ?? this.cricheroesMatchId,
    );
  }
}

bool _sheetSubmitted(Map<String, dynamic> map, String key, dynamic rawSquad) {
  if (map.containsKey(key)) return map[key] == true;
  final squad = ((rawSquad as List?) ?? []).map((e) => '$e'.trim()).where((e) => e.isNotEmpty);
  return squad.length >= 2;
}

List<String> _stringList(dynamic raw) {
  if (raw is! List) return <String>[];
  final names = <String>[];
  for (final item in raw) {
    final name = item is Map
        ? '${item['name'] ?? ''}'.trim()
        : '$item'.trim();
    if (name.isEmpty || name == 'null') continue;
    if (!names.any((existing) => existing.toLowerCase() == name.toLowerCase())) {
      names.add(name);
    }
  }
  return names;
}

List<T> _mapList<T>(
  dynamic raw,
  T Function(Map<String, dynamic> map) parse,
) {
  if (raw is! List) return <T>[];
  final parsed = <T>[];
  for (final item in raw) {
    if (item is Map<String, dynamic>) {
      parsed.add(parse(item));
    } else if (item is Map) {
      parsed.add(parse(Map<String, dynamic>.from(item)));
    }
  }
  return parsed;
}
