import 'package:cloud_firestore/cloud_firestore.dart';

class LeaderboardEntry {
  final String userId;
  final String userName;
  final int score;
  final DateTime timestamp;
  final String tournamentId;

  LeaderboardEntry({
    required this.userId,
    required this.userName,
    required this.score,
    required this.timestamp,
    required this.tournamentId,
  });

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'userName': userName,
      'score': score,
      'timestamp': Timestamp.fromDate(timestamp),
      'tournamentId': tournamentId,
    };
  }

  factory LeaderboardEntry.fromMap(Map<String, dynamic> map) {
    return LeaderboardEntry(
      userId: map['userId'] as String,
      userName: map['userName'] as String,
      score: map['score'] as int,
      timestamp: (map['timestamp'] as Timestamp).toDate(),
      tournamentId: map['tournamentId'] as String,
    );
  }
}

