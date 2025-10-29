import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/leaderboard_entry.dart';

class LeaderboardService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _collection = 'leaderboard';

  Future<void> saveScore(LeaderboardEntry entry) async {
    try {
      await _firestore.collection(_collection).add(entry.toMap());
    } catch (e) {
      print('Error saving score: $e');
    }
  }

  Stream<List<LeaderboardEntry>> getLeaderboard() {
    return _firestore
        .collection(_collection)
        .orderBy('score', descending: true)
        .limit(100)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => LeaderboardEntry.fromMap(doc.data()))
          .toList();
    });
  }

  Stream<List<LeaderboardEntry>> getLeaderboardByTournament(String tournamentId) {
    return _firestore
        .collection(_collection)
        .where('tournamentId', isEqualTo: tournamentId)
        .orderBy('score', descending: true)
        .limit(100)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => LeaderboardEntry.fromMap(doc.data()))
          .toList();
    });
  }

  Future<List<LeaderboardEntry>> getLeaderboardOnce() async {
    try {
      final snapshot = await _firestore
          .collection(_collection)
          .orderBy('score', descending: true)
          .limit(100)
          .get();
      
      return snapshot.docs
          .map((doc) => LeaderboardEntry.fromMap(doc.data()))
          .toList();
    } catch (e) {
      print('Error getting leaderboard: $e');
      return [];
    }
  }
}

