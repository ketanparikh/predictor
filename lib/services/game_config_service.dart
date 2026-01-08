import 'package:cloud_firestore/cloud_firestore.dart';

/// Stores admin-controlled game configuration such as which days are playable.
class GameConfigService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _collection = 'config';
  final String _docId = 'game_control';

  /// Returns the set of tournament (day) ids that are currently enabled.
  Future<Set<String>> fetchPlayableTournamentIds() async {
    try {
      final doc =
          await _firestore.collection(_collection).doc(_docId).get();
      if (!doc.exists) return <String>{};
      final data = doc.data() ?? {};
      final list = (data['playableTournamentIds'] as List?)
              ?.whereType<String>()
              .toList() ??
          <String>[];
      return list.toSet();
    } catch (e) {
      // ignore: avoid_print
      print('Error fetching playableTournamentIds: $e');
      return <String>{};
    }
  }

  /// Persists the set of playable tournament (day) ids configured by admin.
  Future<void> savePlayableTournamentIds(Set<String> ids) async {
    try {
      await _firestore.collection(_collection).doc(_docId).set(
        {
          'playableTournamentIds': ids.toList(),
        },
        SetOptions(merge: true),
      );
    } catch (e) {
      // ignore: avoid_print
      print('Error saving playableTournamentIds: $e');
    }
  }
}


