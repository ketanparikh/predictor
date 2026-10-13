class BracketSlot {
  final String id;
  final String round;
  final String title;
  final int points;
  final String homeKey;
  final String awayKey;

  const BracketSlot({
    required this.id,
    required this.round,
    required this.title,
    required this.points,
    required this.homeKey,
    required this.awayKey,
  });
}

class BracketLayout {
  final String categoryId;
  final String name;
  final List<String> groups;
  final int qualifyCount;
  final List<BracketSlot> slots;

  const BracketLayout({
    required this.categoryId,
    required this.name,
    required this.groups,
    required this.qualifyCount,
    required this.slots,
  });

  bool get grouped => groups.length > 1;

  static const categories = [
    BracketLayout(
      categoryId: 'mens',
      name: "Men's",
      groups: ['A', 'B'],
      qualifyCount: 2,
      slots: [
        BracketSlot(
          id: 'sf1',
          round: 'sf',
          title: 'Semi-final 1',
          points: 20,
          homeKey: 'A1',
          awayKey: 'B2',
        ),
        BracketSlot(
          id: 'sf2',
          round: 'sf',
          title: 'Semi-final 2',
          points: 20,
          homeKey: 'B1',
          awayKey: 'A2',
        ),
        BracketSlot(
          id: 'final',
          round: 'final',
          title: 'Final',
          points: 40,
          homeKey: 'sf1',
          awayKey: 'sf2',
        ),
      ],
    ),
    BracketLayout(
      categoryId: 'womens',
      name: "Women's",
      groups: ['all'],
      qualifyCount: 4,
      slots: [
        BracketSlot(
          id: 'sf1',
          round: 'sf',
          title: 'Semi-final 1',
          points: 20,
          homeKey: 'all1',
          awayKey: 'all4',
        ),
        BracketSlot(
          id: 'sf2',
          round: 'sf',
          title: 'Semi-final 2',
          points: 20,
          homeKey: 'all2',
          awayKey: 'all3',
        ),
        BracketSlot(
          id: 'final',
          round: 'final',
          title: 'Final',
          points: 40,
          homeKey: 'sf1',
          awayKey: 'sf2',
        ),
      ],
    ),
    BracketLayout(
      categoryId: 'boys',
      name: 'Boys',
      groups: ['all'],
      qualifyCount: 4,
      slots: [
        BracketSlot(
          id: 'sf1',
          round: 'sf',
          title: 'Semi-final 1',
          points: 20,
          homeKey: 'all1',
          awayKey: 'all4',
        ),
        BracketSlot(
          id: 'sf2',
          round: 'sf',
          title: 'Semi-final 2',
          points: 20,
          homeKey: 'all2',
          awayKey: 'all3',
        ),
        BracketSlot(
          id: 'final',
          round: 'final',
          title: 'Final',
          points: 40,
          homeKey: 'sf1',
          awayKey: 'sf2',
        ),
      ],
    ),
    BracketLayout(
      categoryId: 'girls',
      name: 'Girls',
      groups: ['all'],
      qualifyCount: 2,
      slots: [
        BracketSlot(
          id: 'final',
          round: 'final',
          title: 'Final',
          points: 40,
          homeKey: 'all1',
          awayKey: 'all2',
        ),
      ],
    ),
  ];

  static BracketLayout forId(String id) {
    return categories.firstWhere(
      (item) => item.categoryId == id,
      orElse: () => categories.first,
    );
  }

  List<String> roundOrder() {
    final seen = <String>[];
    for (final slot in slots) {
      if (!seen.contains(slot.round)) seen.add(slot.round);
    }
    return seen;
  }

  String roundLabel(String round) {
    switch (round) {
      case 'qf':
        return 'Quarter-finals';
      case 'sf':
        return 'Semi-finals';
      case 'final':
        return 'Final';
      default:
        return round;
    }
  }
}

class BracketMatch {
  final String id;
  final String team1;
  final String team2;
  final String group;
  final String? date;
  final String? time;

  const BracketMatch({
    required this.id,
    required this.team1,
    required this.team2,
    required this.group,
    this.date,
    this.time,
  });
}

class BracketPicks {
  final String userId;
  final String userName;
  final Map<String, List<String>> ranks;
  final Map<String, String> winners;
  final Map<String, String> matchWinners;
  final DateTime? submittedAt;

  const BracketPicks({
    required this.userId,
    required this.userName,
    this.ranks = const {},
    this.winners = const {},
    this.matchWinners = const {},
    this.submittedAt,
  });

  Map<String, dynamic> toMap() => {
        'userId': userId,
        'userName': userName,
        'ranks': ranks.map((key, value) => MapEntry(key, value)),
        'winners': winners,
        'matchWinners': matchWinners,
        'submittedAt': submittedAt?.toIso8601String(),
      };

  factory BracketPicks.fromMap(Map<String, dynamic> map) {
    DateTime? submitted;
    final rawSubmitted = map['submittedAt'];
    if (rawSubmitted is DateTime) {
      submitted = rawSubmitted;
    } else if (rawSubmitted != null) {
      submitted = DateTime.tryParse('$rawSubmitted');
    }
    return BracketPicks(
      userId: map['userId'] as String? ?? '',
      userName: map['userName'] as String? ?? 'Player',
      ranks: _stringListMap(map['ranks']),
      winners: _stringMap(map['winners']),
      matchWinners: _stringMap(map['matchWinners']),
      submittedAt: submitted,
    );
  }

  static Map<String, String> _stringMap(dynamic raw) {
    final out = <String, String>{};
    if (raw is Map) {
      for (final entry in raw.entries) {
        out['${entry.key}'] = '${entry.value}';
      }
    }
    return out;
  }

  static Map<String, List<String>> _stringListMap(dynamic raw) {
    final out = <String, List<String>>{};
    if (raw is Map) {
      for (final entry in raw.entries) {
        out['${entry.key}'] =
            ((entry.value as List?) ?? []).map((item) => '$item').toList();
      }
    }
    return out;
  }

  BracketPicks copyWith({
    Map<String, List<String>>? ranks,
    Map<String, String>? winners,
    Map<String, String>? matchWinners,
    DateTime? submittedAt,
  }) {
    return BracketPicks(
      userId: userId,
      userName: userName,
      ranks: ranks ?? this.ranks,
      winners: winners ?? this.winners,
      matchWinners: matchWinners ?? this.matchWinners,
      submittedAt: submittedAt ?? this.submittedAt,
    );
  }
}

class BracketConfig {
  final bool locked;
  final Map<String, String> winners;

  const BracketConfig({
    this.locked = false,
    this.winners = const {},
  });

  factory BracketConfig.fromMap(Map<String, dynamic>? map) {
    if (map == null) return const BracketConfig();
    final raw = map['winners'];
    final winners = <String, String>{};
    if (raw is Map) {
      for (final entry in raw.entries) {
        winners['${entry.key}'] = '${entry.value}';
      }
    }
    return BracketConfig(
      locked: map['locked'] == true,
      winners: winners,
    );
  }
}

class BracketScore {
  final int points;
  final int correct;
  final int wrong;
  final int pending;

  const BracketScore({
    this.points = 0,
    this.correct = 0,
    this.wrong = 0,
    this.pending = 0,
  });

  BracketScore operator +(BracketScore other) {
    return BracketScore(
      points: points + other.points,
      correct: correct + other.correct,
      wrong: wrong + other.wrong,
      pending: pending + other.pending,
    );
  }
}
