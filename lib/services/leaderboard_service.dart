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
      final entries = snapshot.docs
          .map((doc) => LeaderboardEntry.fromMap(doc.data()))
          .toList();
      // Client-side sort: by score (desc), then by timestamp (asc - earlier = better)
      entries.sort((a, b) {
        final scoreCompare = b.score.compareTo(a.score);
        if (scoreCompare != 0) return scoreCompare;
        return a.timestamp.compareTo(b.timestamp);
      });
      return entries;
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
      final entries = snapshot.docs
          .map((doc) => LeaderboardEntry.fromMap(doc.data()))
          .toList();
      // Client-side sort: by score (desc), then by timestamp (asc - earlier = better)
      entries.sort((a, b) {
        final scoreCompare = b.score.compareTo(a.score);
        if (scoreCompare != 0) return scoreCompare;
        return a.timestamp.compareTo(b.timestamp);
      });
      return entries;
    });
  }

  Future<List<LeaderboardEntry>> getLeaderboardOnce() async {
    try {
      final snapshot = await _firestore
          .collection(_collection)
          .orderBy('score', descending: true)
          .limit(100)
          .get();
      
      final entries = snapshot.docs
          .map((doc) => LeaderboardEntry.fromMap(doc.data()))
          .toList();
      // Client-side sort: by score (desc), then by timestamp (asc - earlier = better)
      entries.sort((a, b) {
        final scoreCompare = b.score.compareTo(a.score);
        if (scoreCompare != 0) return scoreCompare;
        return a.timestamp.compareTo(b.timestamp);
      });
      return entries;
    } catch (e) {
      print('Error getting leaderboard: $e');
      return [];
    }
  }

  /// Returns a cumulative leaderboard across all tournaments,
  /// aggregating scores per userId.
  Future<List<LeaderboardEntry>> getCumulativeLeaderboard() async {
    try {
      final snapshot = await _firestore.collection(_collection).get();

      final Map<String, LeaderboardEntry> aggregated = {};

      for (final doc in snapshot.docs) {
        final entry = LeaderboardEntry.fromMap(doc.data());
        final existing = aggregated[entry.userId];
        if (existing == null) {
          aggregated[entry.userId] = entry;
        } else {
          aggregated[entry.userId] = LeaderboardEntry(
            userId: entry.userId,
            userName: entry.userName.isNotEmpty
                ? entry.userName
                : existing.userName,
            score: existing.score + entry.score,
            // use latest timestamp
            timestamp: entry.timestamp.isAfter(existing.timestamp)
                ? entry.timestamp
                : existing.timestamp,
            tournamentId: 'overall',
          );
        }
      }

      // Sort by score (descending), then by timestamp (ascending - earlier = better)
      final result = aggregated.values.toList()
        ..sort((a, b) {
          final scoreCompare = b.score.compareTo(a.score);
          if (scoreCompare != 0) return scoreCompare;
          // Tiebreaker: earlier submission = better rank
          return a.timestamp.compareTo(b.timestamp);
        });

      return result;
    } catch (e) {
      print('Error computing cumulative leaderboard: $e');
      return [];
    }
  }
}

