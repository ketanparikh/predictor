import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/live_score.dart';
import 'scoring_engine.dart';

class LiveScoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final String _collection = 'liveScores';

  LiveScore _fromDoc(String id, Map<String, dynamic> data) {
    return ScoringEngine.rehydrate(LiveScore.fromMap(id, data));
  }

  Stream<Map<String, LiveScore>> watchScores() {
    return _db.collection(_collection).snapshots().map((snapshot) {
      final scores = <String, LiveScore>{};
      for (final doc in snapshot.docs) {
        scores[doc.id] = _fromDoc(doc.id, doc.data());
      }
      return scores;
    });
  }

  Stream<LiveScore?> watchScore(String matchId) {
    return _db.collection(_collection).doc(matchId).snapshots().map((doc) {
      if (!doc.exists || doc.data() == null) return null;
      return _fromDoc(doc.id, doc.data()!);
    });
  }

  Future<void> saveScore(LiveScore score) async {
    await _db.collection(_collection).doc(score.matchId).set(
      {
        ...score.toMap(),
        'updatedAt': FieldValue.serverTimestamp(),
      },
    );
  }
}
