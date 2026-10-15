import 'player_stats.dart';

class TournamentCatalog {
  final List<TournamentSeason> seasons;

  const TournamentCatalog({required this.seasons});

  factory TournamentCatalog.fromJson(Map<String, dynamic> json) {
    return TournamentCatalog(
      seasons: (json['seasons'] as List? ?? [])
          .map((e) => TournamentSeason.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class TournamentSeason {
  final String id;
  final String label;
  final String year;
  final String subtitle;
  final List<TournamentCategoryRef> categories;

  const TournamentSeason({
    required this.id,
    required this.label,
    required this.year,
    required this.subtitle,
    required this.categories,
  });

  factory TournamentSeason.fromJson(Map<String, dynamic> json) {
    return TournamentSeason(
      id: '${json['id'] ?? ''}',
      label: '${json['label'] ?? ''}',
      year: '${json['year'] ?? ''}',
      subtitle: '${json['subtitle'] ?? ''}',
      categories: (json['categories'] as List? ?? [])
          .map((e) => TournamentCategoryRef.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class TournamentCategoryRef {
  final String id;
  final String label;
  final String asset;

  const TournamentCategoryRef({
    required this.id,
    required this.label,
    required this.asset,
  });

  factory TournamentCategoryRef.fromJson(Map<String, dynamic> json) {
    return TournamentCategoryRef(
      id: '${json['id'] ?? ''}',
      label: '${json['label'] ?? ''}',
      asset: '${json['asset'] ?? ''}',
    );
  }
}

class TournamentStats {
  final int tournamentId;
  final String name;
  final String city;
  final String fromDate;
  final String toDate;
  final String ground;
  final Map<String, String> overall;
  final List<TournamentMatch> matches;
  final List<PlayerStats> players;
  final List<TournamentAward> awards;
  final List<TournamentMvp> mvp;

  const TournamentStats({
    required this.tournamentId,
    required this.name,
    required this.city,
    required this.fromDate,
    required this.toDate,
    required this.ground,
    required this.overall,
    required this.matches,
    required this.players,
    this.awards = const [],
    this.mvp = const [],
  });

  String get dateLabel {
    final from = _prettyDate(fromDate);
    final to = _prettyDate(toDate);
    return from == to ? from : '$from – $to';
  }

  factory TournamentStats.fromJson(Map<String, dynamic> json) {
    final overall = <String, String>{};
    final rawOverall = json['overall'] as Map? ?? {};
    for (final e in rawOverall.entries) {
      overall['${e.key}'] = '${e.value}';
    }
    final players = (json['players'] as List? ?? [])
        .map((e) => _playerFromTournament(e as Map<String, dynamic>, '${json['name'] ?? ''}'))
        .toList()
      ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    return TournamentStats(
      tournamentId: json['tournamentId'] as int? ?? 0,
      name: '${json['name'] ?? ''}',
      city: '${json['city'] ?? ''}',
      fromDate: '${json['fromDate'] ?? ''}',
      toDate: '${json['toDate'] ?? ''}',
      ground: '${json['ground'] ?? ''}',
      overall: overall,
      matches: (json['matches'] as List? ?? [])
          .map((e) => TournamentMatch.fromJson(e as Map<String, dynamic>))
          .toList(),
      players: players,
      awards: (json['awards'] as List? ?? [])
          .map((e) => TournamentAward.fromJson(e as Map<String, dynamic>))
          .toList(),
      mvp: (json['mvp'] as List? ?? [])
          .map((e) => TournamentMvp.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class TournamentAward {
  final String type;
  final String label;
  final int? playerId;
  final String playerName;
  final String team;

  const TournamentAward({
    required this.type,
    required this.label,
    required this.playerId,
    required this.playerName,
    required this.team,
  });

  factory TournamentAward.fromJson(Map<String, dynamic> json) {
    return TournamentAward(
      type: '${json['type'] ?? ''}',
      label: '${json['label'] ?? ''}',
      playerId: _asInt(json['playerId']),
      playerName: '${json['playerName'] ?? ''}',
      team: '${json['team'] ?? ''}',
    );
  }
}

class TournamentMvp {
  final int playerId;
  final String name;
  final String team;
  final int playerOfTheMatch;
  final int fighterOfTheMatch;
  final int bestBatter;
  final int bestBowler;
  final int mvpRank;
  final double mvpTotal;
  final double mvpBatting;
  final double mvpBowling;
  final double mvpFielding;
  final int mvpMatches;

  const TournamentMvp({
    required this.playerId,
    required this.name,
    required this.team,
    required this.playerOfTheMatch,
    required this.fighterOfTheMatch,
    required this.bestBatter,
    required this.bestBowler,
    this.mvpRank = 0,
    this.mvpTotal = 0,
    this.mvpBatting = 0,
    this.mvpBowling = 0,
    this.mvpFielding = 0,
    this.mvpMatches = 0,
  });

  bool get hasMvpScore => mvpTotal > 0;

  factory TournamentMvp.fromJson(Map<String, dynamic> json) {
    return TournamentMvp(
      playerId: _asInt(json['playerId']) ?? 0,
      name: '${json['name'] ?? ''}',
      team: '${json['team'] ?? ''}',
      playerOfTheMatch: _asInt(json['playerOfTheMatch']) ?? 0,
      fighterOfTheMatch: _asInt(json['fighterOfTheMatch']) ?? 0,
      bestBatter: _asInt(json['bestBatter']) ?? 0,
      bestBowler: _asInt(json['bestBowler']) ?? 0,
      mvpRank: _asInt(json['mvpRank']) ?? 0,
      mvpTotal: _asDouble(json['mvpTotal']),
      mvpBatting: _asDouble(json['mvpBatting']),
      mvpBowling: _asDouble(json['mvpBowling']),
      mvpFielding: _asDouble(json['mvpFielding']),
      mvpMatches: _asInt(json['mvpMatches']) ?? 0,
    );
  }
}

class TournamentPlayerRef {
  final int playerId;
  final String name;
  final String team;

  const TournamentPlayerRef({
    required this.playerId,
    required this.name,
    required this.team,
  });

  factory TournamentPlayerRef.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return const TournamentPlayerRef(playerId: 0, name: '', team: '');
    }
    return TournamentPlayerRef(
      playerId: _asInt(json['playerId']) ?? 0,
      name: '${json['name'] ?? ''}',
      team: '${json['team'] ?? ''}',
    );
  }

  bool get isPresent => playerId > 0 && name.isNotEmpty;
}

class TournamentMatch {
  final int matchId;
  final String date;
  final String round;
  final String teamA;
  final String teamAScore;
  final String teamB;
  final String teamBScore;
  final String winner;
  final String result;
  final TournamentPlayerRef playerOfTheMatch;
  final TournamentPlayerRef fighterOfTheMatch;
  final TournamentPlayerRef bestBatter;
  final TournamentPlayerRef bestBowler;

  const TournamentMatch({
    required this.matchId,
    required this.date,
    required this.round,
    required this.teamA,
    required this.teamAScore,
    required this.teamB,
    required this.teamBScore,
    required this.winner,
    required this.result,
    this.playerOfTheMatch =
        const TournamentPlayerRef(playerId: 0, name: '', team: ''),
    this.fighterOfTheMatch =
        const TournamentPlayerRef(playerId: 0, name: '', team: ''),
    this.bestBatter =
        const TournamentPlayerRef(playerId: 0, name: '', team: ''),
    this.bestBowler =
        const TournamentPlayerRef(playerId: 0, name: '', team: ''),
  });

  factory TournamentMatch.fromJson(Map<String, dynamic> json) {
    return TournamentMatch(
      matchId: json['matchId'] as int? ?? 0,
      date: '${json['date'] ?? ''}',
      round: '${json['round'] ?? ''}',
      teamA: '${json['teamA'] ?? ''}',
      teamAScore: '${json['teamAScore'] ?? ''}',
      teamB: '${json['teamB'] ?? ''}',
      teamBScore: '${json['teamBScore'] ?? ''}',
      winner: '${json['winner'] ?? ''}',
      result: '${json['result'] ?? ''}',
      playerOfTheMatch: TournamentPlayerRef.fromJson(
          json['playerOfTheMatch'] as Map<String, dynamic>?),
      fighterOfTheMatch: TournamentPlayerRef.fromJson(
          json['fighterOfTheMatch'] as Map<String, dynamic>?),
      bestBatter: TournamentPlayerRef.fromJson(
          json['bestBatter'] as Map<String, dynamic>?),
      bestBowler: TournamentPlayerRef.fromJson(
          json['bestBowler'] as Map<String, dynamic>?),
    );
  }
}

PlayerStats _playerFromTournament(Map<String, dynamic> json, String tournamentName) {
  return PlayerStats(
    category: tournamentName,
    name: '${json['name'] ?? ''}',
    age: '',
    gender: '',
    skill: '${json['team'] ?? ''}',
    matchStatus: 'Tournament',
    playerId: json['playerId'] as int?,
    cricheroesName: '${json['name'] ?? ''}',
    city: 'Pune',
    playingRole: '',
    battingHand: '',
    bowlingStyle: '',
    profileUrl: '',
    matches: json['matches'] as int?,
    batting: BattingStats.fromJson(
        (json['batting'] as Map?)?.cast<String, dynamic>() ?? const {}),
    bowling: BowlingStats.fromJson(
        (json['bowling'] as Map?)?.cast<String, dynamic>() ?? const {}),
    fielding: FieldingStats.fromJson(
        (json['fielding'] as Map?)?.cast<String, dynamic>() ?? const {}),
  );
}

int? _asInt(Object? v) {
  if (v == null || v == '') return null;
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse('$v');
}

double _asDouble(Object? v) {
  if (v == null || v == '') return 0;
  if (v is double) return v;
  if (v is num) return v.toDouble();
  return double.tryParse('$v') ?? 0;
}

String _prettyDate(String iso) {
  if (iso.length < 10) return iso;
  final dt = DateTime.tryParse(iso);
  if (dt == null) return iso;
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return '${dt.day} ${months[dt.month - 1]} ${dt.year}';
}
