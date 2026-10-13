class FantasyPlayer {
  final String name;
  final String team;
  final String role;
  final double credits;

  const FantasyPlayer({
    required this.name,
    required this.team,
    this.role = 'BAT',
    this.credits = 9.0,
  });

  Map<String, dynamic> toMap() => {
        'name': name,
        'team': team,
        'role': role,
        'credits': credits,
      };

  factory FantasyPlayer.fromMap(Map<String, dynamic> map) => FantasyPlayer(
        name: map['name'] as String? ?? '',
        team: map['team'] as String? ?? '',
        role: map['role'] as String? ?? 'BAT',
        credits: (map['credits'] as num?)?.toDouble() ?? 9.0,
      );

  FantasyPlayer copyWith({String? role}) => FantasyPlayer(
        name: name,
        team: team,
        role: role ?? this.role,
        credits: credits,
      );
}

class FantasyEntry {
  final String userId;
  final String userName;
  final String matchId;
  final List<FantasyPlayer> players;
  final String captain;
  final String viceCaptain;
  final DateTime? submittedAt;

  const FantasyEntry({
    required this.userId,
    required this.userName,
    required this.matchId,
    this.players = const [],
    this.captain = '',
    this.viceCaptain = '',
    this.submittedAt,
  });

  double get spent =>
      players.fold(0, (sum, player) => sum + player.credits);

  Map<String, dynamic> toMap() => {
        'userId': userId,
        'userName': userName,
        'matchId': matchId,
        'players': players.map((p) => p.toMap()).toList(),
        'captain': captain,
        'viceCaptain': viceCaptain,
        'submittedAt': submittedAt?.toIso8601String(),
      };

  factory FantasyEntry.fromMap(String matchId, Map<String, dynamic> map) {
    DateTime? submitted;
    final raw = map['submittedAt'];
    if (raw is DateTime) {
      submitted = raw;
    } else if (raw != null) {
      submitted = DateTime.tryParse('$raw');
    }
    return FantasyEntry(
      userId: map['userId'] as String? ?? '',
      userName: map['userName'] as String? ?? 'Player',
      matchId: map['matchId'] as String? ?? matchId,
      players: ((map['players'] as List?) ?? [])
          .whereType<Map>()
          .map((item) => FantasyPlayer.fromMap(Map<String, dynamic>.from(item)))
          .toList(),
      captain: map['captain'] as String? ?? '',
      viceCaptain: map['viceCaptain'] as String? ?? '',
      submittedAt: submitted,
    );
  }

  FantasyEntry copyWith({
    List<FantasyPlayer>? players,
    String? captain,
    String? viceCaptain,
    DateTime? submittedAt,
  }) {
    return FantasyEntry(
      userId: userId,
      userName: userName,
      matchId: matchId,
      players: players ?? this.players,
      captain: captain ?? this.captain,
      viceCaptain: viceCaptain ?? this.viceCaptain,
      submittedAt: submittedAt ?? this.submittedAt,
    );
  }
}

class FantasyPoints {
  final String player;
  final double points;
  final List<String> breakdown;

  const FantasyPoints({
    required this.player,
    required this.points,
    this.breakdown = const [],
  });
}

class FantasyResult {
  final double total;
  final Map<String, FantasyPoints> byPlayer;

  const FantasyResult({
    required this.total,
    required this.byPlayer,
  });
}
