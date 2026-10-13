import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/bracket.dart';

class BracketService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  DocumentReference<Map<String, dynamic>> _config(String category) =>
      _db.collection('brackets').doc(category);

  CollectionReference<Map<String, dynamic>> _picks(String category) =>
      _config(category).collection('picks');

  Stream<BracketConfig> watchConfig(String category) {
    return _config(category).snapshots().map(
          (doc) => BracketConfig.fromMap(doc.data()),
        );
  }

  Stream<List<BracketPicks>> watchPicks(String category) {
    return _picks(category).snapshots().map((snapshot) {
      return snapshot.docs.map((doc) {
        final data = Map<String, dynamic>.from(doc.data());
        final submitted = data['submittedAt'];
        if (submitted is Timestamp) {
          data['submittedAt'] = submitted.toDate().toIso8601String();
        }
        return BracketPicks.fromMap({...data, 'userId': doc.id});
      }).toList();
    });
  }

  Stream<Map<String, List<BracketPicks>>> watchAllPicks() {
    late StreamController<Map<String, List<BracketPicks>>> controller;
    final latest = <String, List<BracketPicks>>{
      for (final cat in BracketLayout.categories) cat.categoryId: <BracketPicks>[],
    };
    final subs = <StreamSubscription<List<BracketPicks>>>[];
    controller = StreamController<Map<String, List<BracketPicks>>>(
      onListen: () {
        for (final cat in BracketLayout.categories) {
          subs.add(watchPicks(cat.categoryId).listen((list) {
            latest[cat.categoryId] = list;
            if (!controller.isClosed) {
              controller.add({
                for (final entry in latest.entries) entry.key: List.of(entry.value),
              });
            }
          }));
        }
      },
      onCancel: () async {
        for (final sub in subs) {
          await sub.cancel();
        }
      },
    );
    return controller.stream;
  }

  Future<void> savePicks(String category, BracketPicks picks) async {
    await _picks(category).doc(picks.userId).set({
      ...picks.toMap(),
      'submittedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> setLocked(String category, bool locked) async {
    await _config(category).set({'locked': locked}, SetOptions(merge: true));
  }

  Future<void> setOfficialWinner(
    String category,
    String slotId,
    String team,
  ) async {
    await _config(category).set({
      'winners': {slotId: team},
    }, SetOptions(merge: true));
  }
}
