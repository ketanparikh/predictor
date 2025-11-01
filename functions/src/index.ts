import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

interface OutcomeDoc {
  correctAnswers: Record<string, string>;
  points: Record<string, number>;
  lockedAt?: admin.firestore.Timestamp;
}

export const reconcileMatchOutcome = onDocumentWritten(
  { document: 'tournaments/{tournamentId}/matches/{matchId}/meta/outcome', region: 'us-central1' },
  async (event: any) => {
    const tournamentId = event.params.tournamentId as string;
    const matchId = event.params.matchId as string;

    const afterSnap = event.data?.after;
    const after = afterSnap?.data() as OutcomeDoc | undefined;
    if (!after) {
      console.log('Outcome deleted; skipping');
      return;
    }

    const correctAnswers = after.correctAnswers || {};
    const points = after.points || {};

    const predictionsRef = db
      .collection('tournaments')
      .doc(tournamentId)
      .collection('matches')
      .doc(matchId)
      .collection('predictions');

    const scoresRef = db
      .collection('tournaments')
      .doc(tournamentId)
      .collection('matches')
      .doc(matchId)
      .collection('scores');

    const leaderboardColl = db.collection('leaderboard');

    const predictionsSnap = await predictionsRef.get();
    console.log(`Reconciling ${predictionsSnap.size} predictions for ${tournamentId}/${matchId}`);

    for (const predDoc of predictionsSnap.docs) {
      const userId = predDoc.id;
      const pred = predDoc.data() as { answers: Record<string, string>; userName?: string };
      const answers = pred.answers || {};

      let newMatchScore = 0;
      for (const [qId, correct] of Object.entries(correctAnswers)) {
        const userAnswer = answers[qId];
        const qPoints = points[qId] ?? 0;
        if (userAnswer !== undefined && userAnswer === correct) {
          newMatchScore += qPoints;
        }
      }

      const userScoreDocRef = scoresRef.doc(userId);
      const userScoreSnap = await userScoreDocRef.get();
      const prevMatchScore = userScoreSnap.exists
        ? (userScoreSnap.data()?.matchScore as number) || 0
        : 0;

      // Write per-match score for auditing
      await userScoreDocRef.set(
        {
          matchScore: newMatchScore,
          computedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Transactionally update tournament leaderboard total
      const leaderboardId = `${tournamentId}_${userId}`;
      const leaderboardRef = leaderboardColl.doc(leaderboardId);
      await db.runTransaction(async (trx) => {
        const snap = await trx.get(leaderboardRef);
        const currTotal = snap.exists ? (snap.data()?.score as number) || 0 : 0;
        const nextTotal = currTotal - prevMatchScore + newMatchScore;
        trx.set(
          leaderboardRef,
          {
            tournamentId,
            userId,
            userName: pred.userName || userId,
            score: nextTotal,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });
    }
  }
);


