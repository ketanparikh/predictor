class PlayerStats {
  final String category;
  final String name;
  final String age;
  final String gender;
  final String skill;
  final String matchStatus;
  final int? playerId;
  final String cricheroesName;
  final String city;
  final String playingRole;
  final String battingHand;
  final String bowlingStyle;
  final String profileUrl;
  final int? matches;
  final BattingStats batting;
  final BowlingStats bowling;
  final FieldingStats fielding;

  const PlayerStats({
    required this.category,
    required this.name,
    required this.age,
    required this.gender,
    required this.skill,
    required this.matchStatus,
    required this.playerId,
    required this.cricheroesName,
    required this.city,
    required this.playingRole,
    required this.battingHand,
    required this.bowlingStyle,
    required this.profileUrl,
    required this.matches,
    required this.batting,
    required this.bowling,
    required this.fielding,
  });

  bool get hasProfile => playerId != null;

  String get roleLine {
    final parts = [
      if (city.isNotEmpty) city,
      if (battingHand.isNotEmpty) battingHand,
      if (bowlingStyle.isNotEmpty) bowlingStyle,
      if (skill.isNotEmpty) skill,
    ];
    return parts.join(' · ');
  }

  factory PlayerStats.fromJson(Map<String, dynamic> json) {
    return PlayerStats(
      category: '${json['category'] ?? ''}',
      name: '${json['name'] ?? ''}',
      age: '${json['age'] ?? ''}',
      gender: '${json['gender'] ?? ''}',
      skill: '${json['skill'] ?? ''}',
      matchStatus: '${json['matchStatus'] ?? ''}',
      playerId: _asInt(json['playerId']),
      cricheroesName: '${json['cricheroesName'] ?? ''}',
      city: '${json['city'] ?? ''}',
      playingRole: '${json['playingRole'] ?? ''}',
      battingHand: '${json['battingHand'] ?? ''}',
      bowlingStyle: '${json['bowlingStyle'] ?? ''}',
      profileUrl: '${json['profileUrl'] ?? ''}',
      matches: _asInt(json['matches']),
      batting: BattingStats.fromJson(
          (json['batting'] as Map?)?.cast<String, dynamic>() ?? const {}),
      bowling: BowlingStats.fromJson(
          (json['bowling'] as Map?)?.cast<String, dynamic>() ?? const {}),
      fielding: FieldingStats.fromJson(
          (json['fielding'] as Map?)?.cast<String, dynamic>() ?? const {}),
    );
  }
}

class BattingStats {
  final int? innings;
  final int? notOut;
  final int? runs;
  final String highScore;
  final num? avg;
  final num? sr;
  final int? thirties;
  final int? fifties;
  final int? hundreds;
  final int? fours;
  final int? sixes;
  final int? ducks;
  final int? won;
  final int? loss;

  const BattingStats({
    required this.innings,
    required this.notOut,
    required this.runs,
    required this.highScore,
    required this.avg,
    required this.sr,
    required this.thirties,
    required this.fifties,
    required this.hundreds,
    required this.fours,
    required this.sixes,
    required this.ducks,
    required this.won,
    required this.loss,
  });

  factory BattingStats.fromJson(Map<String, dynamic> json) {
    return BattingStats(
      innings: _asInt(json['innings']),
      notOut: _asInt(json['notOut']),
      runs: _asInt(json['runs']),
      highScore: '${json['highScore'] ?? ''}',
      avg: _asNum(json['avg']),
      sr: _asNum(json['sr']),
      thirties: _asInt(json['thirties']),
      fifties: _asInt(json['fifties']),
      hundreds: _asInt(json['hundreds']),
      fours: _asInt(json['fours']),
      sixes: _asInt(json['sixes']),
      ducks: _asInt(json['ducks']),
      won: _asInt(json['won']),
      loss: _asInt(json['loss']),
    );
  }
}

class BowlingStats {
  final int? innings;
  final String overs;
  final int? maidens;
  final int? wickets;
  final int? runs;
  final String best;
  final int? threeWickets;
  final int? fiveWickets;
  final num? economy;
  final num? sr;
  final num? avg;
  final int? wides;
  final int? noBalls;
  final int? dots;
  final int? fours;
  final int? sixes;

  const BowlingStats({
    required this.innings,
    required this.overs,
    required this.maidens,
    required this.wickets,
    required this.runs,
    required this.best,
    required this.threeWickets,
    required this.fiveWickets,
    required this.economy,
    required this.sr,
    required this.avg,
    required this.wides,
    required this.noBalls,
    required this.dots,
    required this.fours,
    required this.sixes,
  });

  factory BowlingStats.fromJson(Map<String, dynamic> json) {
    return BowlingStats(
      innings: _asInt(json['innings']),
      overs: '${json['overs'] ?? ''}',
      maidens: _asInt(json['maidens']),
      wickets: _asInt(json['wickets']),
      runs: _asInt(json['runs']),
      best: '${json['best'] ?? ''}',
      threeWickets: _asInt(json['threeWickets']),
      fiveWickets: _asInt(json['fiveWickets']),
      economy: _asNum(json['economy']),
      sr: _asNum(json['sr']),
      avg: _asNum(json['avg']),
      wides: _asInt(json['wides']),
      noBalls: _asInt(json['noBalls']),
      dots: _asInt(json['dots']),
      fours: _asInt(json['fours']),
      sixes: _asInt(json['sixes']),
    );
  }
}

class FieldingStats {
  final int? catches;
  final int? caughtBehind;
  final int? runOuts;
  final int? stumpings;
  final int? assistedRunOuts;

  const FieldingStats({
    required this.catches,
    required this.caughtBehind,
    required this.runOuts,
    required this.stumpings,
    required this.assistedRunOuts,
  });

  factory FieldingStats.fromJson(Map<String, dynamic> json) {
    return FieldingStats(
      catches: _asInt(json['catches']),
      caughtBehind: _asInt(json['caughtBehind']),
      runOuts: _asInt(json['runOuts']),
      stumpings: _asInt(json['stumpings']),
      assistedRunOuts: _asInt(json['assistedRunOuts']),
    );
  }
}

int? _asInt(Object? v) {
  if (v == null || v == '') return null;
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse('$v');
}

num? _asNum(Object? v) {
  if (v == null || v == '') return null;
  if (v is num) return v;
  return num.tryParse('$v');
}

String dash(String? value) {
  if (value == null || value.trim().isEmpty) return '—';
  return value;
}

String fmtInt(int? value) => value == null ? '—' : '$value';

String fmtDec(num? value) {
  if (value == null) return '—';
  if (value % 1 == 0) return '${value.toInt()}';
  return value.toStringAsFixed(2);
}
