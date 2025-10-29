import 'package:cloud_firestore/cloud_firestore.dart';

class MatchStatusService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  Future<Set<String>> fetchCompletedMatches(String userId) async {
    final snapshot = await _db
        .collection('users')
        .doc(userId)
        .collection('completedMatches')
        .get();
    return snapshot.docs.map((d) => d.id).toSet();
  }

  Future<void> markCompleted(String userId, String matchId) async {
    final ref = _db
        .collection('users')
        .doc(userId)
        .collection('completedMatches')
        .doc(matchId);
    await ref.set({
      'completedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }
}


