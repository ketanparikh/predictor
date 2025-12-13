class Team {
  final String id;
  final String name;
  final List<String> players;

  Team({
    required this.id,
    required this.name,
    required this.players,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'players': players,
    };
  }

  factory Team.fromMap(Map<String, dynamic> map) {
    return Team(
      id: map['id'] as String,
      name: map['name'] as String,
      players: List<String>.from(map['players'] as List? ?? []),
    );
  }

  Team copyWith({
    String? id,
    String? name,
    List<String>? players,
  }) {
    return Team(
      id: id ?? this.id,
      name: name ?? this.name,
      players: players ?? this.players,
    );
  }
}

