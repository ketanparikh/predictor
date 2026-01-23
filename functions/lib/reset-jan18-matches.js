"use strict";
// Script to reset Jan 18th matches for all users
// This will allow users to submit predictions again
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
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
async function resetJan18Matches() {
    console.log('Starting reset of Jan 18, 2026 matches...');
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users`);
    let totalDeleted = 0;
    // For each user, delete completed matches for Jan 18, 2026
    for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        console.log(`Processing user: ${userId}`);
        // Get all completed matches for this user
        const completedMatchesSnapshot = await db
            .collection('users')
            .doc(userId)
            .collection('completedMatches')
            .get();
        // Delete matches that are from Jan 18, 2026
        // Match IDs follow pattern: match_2026_01_18_1, match_2026_01_18_2, etc.
        for (const matchDoc of completedMatchesSnapshot.docs) {
            const matchId = matchDoc.id;
            // Check if this is a Jan 18, 2026 match
            if (matchId.includes('2026_01_18')) {
                console.log(`  Deleting ${matchId} for user ${userId}`);
                await matchDoc.ref.delete();
                totalDeleted++;
            }
        }
    }
    console.log(`\n✅ Reset complete!`);
    console.log(`Total completed match records deleted: ${totalDeleted}`);
    console.log('Users can now submit predictions for Jan 18th matches again.');
}
// Run the script
resetJan18Matches()
    .then(() => {
    console.log('Script finished successfully');
    process.exit(0);
})
    .catch((error) => {
    console.error('Error running script:', error);
    process.exit(1);
});
