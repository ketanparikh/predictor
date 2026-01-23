"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetJan18Matches = exports.reconcileMatchOutcome = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
exports.reconcileMatchOutcome = (0, firestore_1.onDocumentWritten)({ document: 'tournaments/{tournamentId}/matches/{matchId}/meta/outcome', region: 'us-central1' }, async (event) => {
    const tournamentId = event.params.tournamentId;
    const matchId = event.params.matchId;
    const afterSnap = event.data?.after;
    const after = afterSnap?.data();
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
        const pred = predDoc.data();
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
            }
            else {
                // Incorrect prediction: 0 (no negative scoring on backend)
            }
        }
        const userScoreDocRef = scoresRef.doc(userId);
        const userScoreSnap = await userScoreDocRef.get();
        const prevMatchScore = userScoreSnap.exists
            ? userScoreSnap.data()?.matchScore || 0
            : 0;
        // Write per-match score for auditing
        await userScoreDocRef.set({
            matchScore: newMatchScore,
            computedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        // Transactionally update tournament leaderboard total
        const leaderboardId = `${tournamentId}_${userId}`;
        const leaderboardRef = leaderboardColl.doc(leaderboardId);
        await db.runTransaction(async (trx) => {
            const snap = await trx.get(leaderboardRef);
            const currTotal = snap.exists ? snap.data()?.score || 0 : 0;
            const nextTotal = currTotal - prevMatchScore + newMatchScore;
            trx.set(leaderboardRef, {
                tournamentId,
                userId,
                userName: pred.userName || userId,
                score: nextTotal,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        });
    }
});
/**
 * HTTP-triggered Cloud Function to reset Jan 18th match completions.
 * Call this manually to allow users to resubmit predictions for Jan 18, 2026.
 *
 * Usage:
 * curl -X POST https://us-central1-predictor-jcpl.cloudfunctions.net/resetJan18Matches
 */
exports.resetJan18Matches = (0, https_1.onRequest)({ region: 'us-central1' }, async (req, res) => {
    try {
        console.log('Starting comprehensive reset of Jan 18, 2026 matches...');
        let totalCompletedMatchesDeleted = 0;
        let totalPredictionsDeleted = 0;
        let usersAffected = 0;
        const affectedUsers = [];
        const matchIdsFound = new Set();
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
    }
    catch (error) {
        console.error('Error resetting matches:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
