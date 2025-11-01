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
exports.reconcileMatchOutcome = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
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
            const qPoints = points[qId] ?? 0;
            if (userAnswer !== undefined && userAnswer === correct) {
                newMatchScore += qPoints;
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
