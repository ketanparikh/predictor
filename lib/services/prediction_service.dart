import 'package:cloud_firestore/cloud_firestore.dart';

class PredictionService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  Future<void> saveUserPrediction({
    required String userId,
    required String userName,
    required String tournamentId,
    required String matchId,
    required Map<String, String> answers,
    required DateTime submittedAt,
  }) async {
    // Store predictions under tournament/match for backend aggregation
    final predictionDoc = _db
        .collection('tournaments')
        .doc(tournamentId)
        .collection('matches')
        .doc(matchId)
        .collection('predictions')
        .doc(userId);

    try {
      // Debug log for troubleshooting
      // ignore: avoid_print
      print('Saving prediction userId=$userId tId=$tournamentId mId=$matchId answers=${answers.length}');

      await predictionDoc.set({
        'userId': userId,
        'userName': userName,
        'tournamentId': tournamentId,
        'matchId': matchId,
        'answers': answers,
        'submittedAt': Timestamp.fromDate(submittedAt),
      }, SetOptions(merge: true));
    } catch (e) {
      // ignore: avoid_print
      print('Failed to save prediction: $e');
      rethrow;
    }
  }
}


