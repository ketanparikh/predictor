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

  Future<LiveScore?> getScore(String matchId) async {
    final doc = await _db.collection(_collection).doc(matchId).get();
    if (!doc.exists || doc.data() == null) return null;
    return _fromDoc(doc.id, doc.data()!);
  }

  Future<void> saveScore(LiveScore score) async {
    await _db.collection(_collection).doc(score.matchId).set(
      {
        ...score.toMap(),
        'updatedAt': FieldValue.serverTimestamp(),
      },
    );
  }

  Future<void> deleteScore(String matchId) async {
    await _db.collection(_collection).doc(matchId).delete();
  }

  static const _playReset = {
    'innings': <Map<String, dynamic>>[],
    'status': 'upcoming',
    'result': null,
    'tossWinner': null,
    'tossDecision': null,
    'currentInnings': 1,
    'battingSide': 1,
    'team1Runs': 0,
    'team1Wickets': 0,
    'team1Overs': 0,
    'team2Runs': 0,
    'team2Wickets': 0,
    'team2Overs': 0,
  };

  /// Wipe one weekend side and any previous batsman/bowler picks.
  Future<void> clearWeekendTeam(String matchId, int side) async {
    final fields = side == 1
        ? {
            'team1': '',
            'team1Squad': <String>[],
            'team1SheetSubmitted': false,
          }
        : {
            'team2': '',
            'team2Squad': <String>[],
            'team2SheetSubmitted': false,
          };
    await _db.collection(_collection).doc(matchId).update({
      ...fields,
      ..._playReset,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> saveWeekendTeamName(String matchId, int side, String name) async {
    final fields = side == 1
        ? {
            'team1': name,
            'team1Squad': <String>[],
            'team1SheetSubmitted': false,
          }
        : {
            'team2': name,
            'team2Squad': <String>[],
            'team2SheetSubmitted': false,
          };
    await _db.collection(_collection).doc(matchId).update({
      ...fields,
      ..._playReset,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> resetWeekendPlay(String matchId) async {
    await _db.collection(_collection).doc(matchId).update({
      ..._playReset,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }
}
