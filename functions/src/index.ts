import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

const CRICHEROES_API = 'https://api.cricheroes.in/api/v1';
const CRICHEROES_PATH =
  /^\/(scorecard\/(get-mini-scorecard|v2\/get-scorecard|v2\/get-commentary)|scoreCard\/get-scorecard)\/\d+$/;

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

        if (userAnswer === undefined) {
          continue;
        }

        if (userAnswer === correct) {
          // Correct prediction: +10 points
          newMatchScore += 10;
        } else {
          // Incorrect prediction: 0 (no negative scoring on backend)
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

/**
 * HTTP-triggered Cloud Function to reset Jan 18th match completions.
 * Call this manually to allow users to resubmit predictions for Jan 18, 2026.
 * 
 * Usage: 
 * curl -X POST https://us-central1-predictor-jcpl.cloudfunctions.net/resetJan18Matches
 */
export const resetJan18Matches = onRequest(
  { region: 'us-central1' },
  async (req, res) => {
    try {
      console.log('Starting comprehensive reset of Jan 18, 2026 matches...');
      
      let totalCompletedMatchesDeleted = 0;
      let totalPredictionsDeleted = 0;
      let usersAffected = 0;
      const affectedUsers: string[] = [];
      const matchIdsFound: Set<string> = new Set();
      
      // Step 1: Get all users and delete from completedMatches subcollection
      const usersSnapshot = await db.collection('users').get();
      console.log(`Found ${usersSnapshot.size} users`);
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        
        // Get all completed matches for this user
        const completedMatchesSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('completedMatches')
          .get();
        
        let userMatchesDeleted = 0;
        
        // Delete matches that are from Jan 18, 2026
        for (const matchDoc of completedMatchesSnapshot.docs) {
          const matchId = matchDoc.id;
          
          // Check if this is a Jan 18, 2026 match
          if (matchId.includes('2026_01_18')) {
            await matchDoc.ref.delete();
            totalCompletedMatchesDeleted++;
            userMatchesDeleted++;
            matchIdsFound.add(matchId);
            console.log(`Deleted completedMatch ${matchId} for user ${userId}`);
          }
        }
        
        if (userMatchesDeleted > 0) {
          usersAffected++;
          affectedUsers.push(userId);
        }
      }
      
      // Step 2: Find and delete predictions from all tournaments
      const tournamentsSnapshot = await db.collection('tournaments').get();
      console.log(`Found ${tournamentsSnapshot.size} tournaments`);
      
      for (const tournamentDoc of tournamentsSnapshot.docs) {
        const tournamentId = tournamentDoc.id;
        const matchesSnapshot = await db
          .collection('tournaments')
          .doc(tournamentId)
          .collection('matches')
          .get();
        
        for (const matchDoc of matchesSnapshot.docs) {
          const matchId = matchDoc.id;
          
          // Check if this is a Jan 18, 2026 match
          if (matchId.includes('2026_01_18')) {
            matchIdsFound.add(matchId);
            
            // Delete all predictions for this match
            const predictionsSnapshot = await db
              .collection('tournaments')
              .doc(tournamentId)
              .collection('matches')
              .doc(matchId)
              .collection('predictions')
              .get();
            
            for (const predDoc of predictionsSnapshot.docs) {
              await predDoc.ref.delete();
              totalPredictionsDeleted++;
              console.log(`Deleted prediction for ${matchId} by user ${predDoc.id} in tournament ${tournamentId}`);
            }
            
            // Also delete scores for this match
            const scoresSnapshot = await db
              .collection('tournaments')
              .doc(tournamentId)
              .collection('matches')
              .doc(matchId)
              .collection('scores')
              .get();
            
            for (const scoreDoc of scoresSnapshot.docs) {
              await scoreDoc.ref.delete();
              console.log(`Deleted score for ${matchId} by user ${scoreDoc.id} in tournament ${tournamentId}`);
            }
          }
        }
      }
      
      const result = {
        success: true,
        message: 'Reset complete! Users can now submit predictions for Jan 18th matches again.',
        usersAffected,
        totalCompletedMatchesDeleted,
        totalPredictionsDeleted,
        matchIdsFound: Array.from(matchIdsFound),
        affectedUsers: affectedUsers.slice(0, 10), // Show first 10 users
        timestamp: new Date().toISOString()
      };
      
      console.log('Reset complete:', result);
      res.status(200).json(result);
      
    } catch (error: any) {
      console.error('Error resetting matches:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Same-origin / Cloud Functions proxy for CricHeroes live scoreboard APIs.
 * CricHeroes returns 403 when the browser Origin is our hosting domain.
 */
export const cricheroesProxy = onRequest(
  { region: 'us-central1', cors: true, invoker: 'public' },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'GET') {
      res.status(405).json({ status: false, error: 'GET only' });
      return;
    }

    const rawPath = String(req.query.path || '');
    const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    if (!CRICHEROES_PATH.test(path)) {
      res.status(400).json({ status: false, error: 'Path is not allowed' });
      return;
    }

    try {
      const udid = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      const upstream = await fetch(`${CRICHEROES_API}${path}`, {
        headers: {
          'api-key': 'cr!CkH3r0s',
          udid,
          'device-type': 'Chrome: 126.0.0.0',
          Accept: 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        },
      });
      const body = await upstream.text();
      res
        .status(upstream.status)
        .set('Cache-Control', 'no-store')
        .type('application/json')
        .send(body);
    } catch (error: any) {
      console.error('CricHeroes proxy failed', error);
      res.status(502).json({
        status: false,
        error: error?.message || 'Upstream request failed',
      });
    }
  }
);

