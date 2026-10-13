import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/fantasy.dart';

class FantasyService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  CollectionReference<Map<String, dynamic>> _entries(String matchId) =>
      _db.collection('fantasy').doc(matchId).collection('entries');

  Map<String, dynamic> _normalize(Map<String, dynamic> data) {
    final copy = Map<String, dynamic>.from(data);
    final submitted = copy['submittedAt'];
    if (submitted is Timestamp) {
      copy['submittedAt'] = submitted.toDate().toIso8601String();
    }
    return copy;
  }

  Stream<List<FantasyEntry>> watchEntries(String matchId) {
    return _entries(matchId).snapshots().map((snapshot) {
      return snapshot.docs
          .map((doc) => FantasyEntry.fromMap(matchId, {
                ..._normalize(doc.data()),
                'userId': doc.id,
              }))
          .toList();
    });
  }

  Stream<FantasyEntry?> watchEntry(String matchId, String userId) {
    return _entries(matchId).doc(userId).snapshots().map((doc) {
      if (!doc.exists || doc.data() == null) return null;
      return FantasyEntry.fromMap(matchId, {
        ..._normalize(doc.data()!),
        'userId': doc.id,
      });
    });
  }

  Future<void> saveEntry(FantasyEntry entry) async {
    await _entries(entry.matchId).doc(entry.userId).set({
      ...entry.toMap(),
      'submittedAt': FieldValue.serverTimestamp(),
    });
  }
}
