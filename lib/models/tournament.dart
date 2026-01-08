class MatchInfo {
  final String id;
  final String name;
  final String date; // ISO or friendly string from config
  final String questionFile; // path under assets/config/
  final String? time; // Optional time string (e.g., "09:00 AM" or "TBD")

  MatchInfo({
    required this.id,
    required this.name,
    required this.date,
    required this.questionFile,
    this.time,
  });

  factory MatchInfo.fromJson(Map<String, dynamic> json) {
    return MatchInfo(
      id: json['id'] as String,
      name: json['name'] as String,
      date: json['date'] as String,
      questionFile: json['questionFile'] as String,
      time: json['time'] as String?,
    );
  }
}

class Tournament {
  final String id;
  final String name;
  final List<MatchInfo> matches;

  Tournament({
    required this.id,
    required this.name,
    required this.matches,
  });

  factory Tournament.fromJson(Map<String, dynamic> json) {
    final matchesJson = json['matches'] as List<dynamic>? ?? [];
    return Tournament(
      id: json['id'] as String,
      name: json['name'] as String,
      matches: matchesJson.map((m) => MatchInfo.fromJson(m as Map<String, dynamic>)).toList(),
    );
  }
}


