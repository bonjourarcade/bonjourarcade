import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, connectAuthEmulator, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAh5PlPLpy8sfB5QxmjWiXaA_Qrtszc2Vg",
    authDomain: "alloarcade.firebaseapp.com",
    projectId: "alloarcade",
    storageBucket: "alloarcade.firebasestorage.app",
    messagingSenderId: "743236959029",
    appId: "1:743236959029:web:9996605303444776ae6a7c",
    measurementId: "G-G55K9S82G7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);

// Check if we are running locally to use emulators
const isLocalhost = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('localhost') ||
    window.location.hostname.startsWith('192.168.');

if (isLocalhost) {
    console.log('Using Firebase Emulators for Auth and Functions');
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

// Global instances
window.firebaseAuth = auth;
window.firebaseFunctions = functions;

window.signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error("Google SSO Error:", error);
        throw error;
    }
};

window.signOutFirebase = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Sign Out Error:", error);
    }
};

// Expose onAuthStateChanged handler
window.onFirebaseAuthStateChanged = (callback) => {
    return onAuthStateChanged(auth, callback);
};

window.checkFirebaseAdminAccess = async () => {
    if (!auth.currentUser) {
        return false;
    }

    try {
        const token = await auth.currentUser.getIdTokenResult(true);
        if (token && token.claims && token.claims.admin === true) {
            return true;
        }
    } catch (error) {
        console.warn('Admin claim refresh failed:', error);
    }

    try {
        const fn = httpsCallable(functions, 'getSubmissionQueue');
        await fn({ status: 'pending', limit: 1 });
        return true;
    } catch (error) {
        return false;
    }
};

// Global score submission function
window.submitGameScore = async (gameId, score, comment, screenshotBase64) => {
    const submitScoreFn = httpsCallable(functions, 'submitScore');
    try {
        const result = await submitScoreFn({
            gameId: gameId,
            score: score,
            comment: comment || undefined, // Send undefined if empty
            screenshotBase64: screenshotBase64 || undefined
        });
        return result.data;
    } catch (error) {
        console.error("Score submission error:", error);
        throw error;
    }
};

// Global function to fetch latest verified scores (for public gallery)
window.getLatestScores = async () => {
    const fn = httpsCallable(functions, 'getLatestScores');
    const result = await fn({});
    return result.data;
};

// Global function to fetch leaderboard scores (optionally filtered by game)
window.listGameScores = async (gameId) => {
    const fn = httpsCallable(functions, 'listGameScores');
    const result = await fn({ gameId: gameId || 'all' });
    return result.data;
};

window.getOwnScores = async (userId) => {
    const fn = httpsCallable(functions, 'getOwnScores');
    const result = await fn({ userId: userId });
    return result.data;
};

// Global admin function to update an existing score (uses verifyScore override contract)
window.verifyGameScore = async (scoreId, override, notifyWebhooks) => {
    const fn = httpsCallable(functions, 'verifyScore');
    const result = await fn({
        scoreId: scoreId,
        override: override || undefined,
        notifyWebhooks: notifyWebhooks === false ? false : undefined
    });
    return result.data;
};

// Global admin/owner function to delete a score
window.deleteGameScore = async (scoreId) => {
    const fn = httpsCallable(functions, 'deleteScore');
    const result = await fn({ scoreId: scoreId });
    return result.data;
};

window.rateGame = async (gameId, rating) => {
    const fn = httpsCallable(functions, 'rateGame');
    const result = await fn({ gameId, rating });
    return result.data;
};

window.getGameRatings = async (gameId) => {
    const fn = httpsCallable(functions, 'getGameRatings');
    const result = await fn({ gameId });
    return result.data;
};

window.listGameRatings = async () => {
    const fn = httpsCallable(functions, 'listGameRatings');
    const result = await fn({});
    return result.data;
};

window.getLatestRatings = async () => {
    const fn = httpsCallable(functions, 'getLatestRatings');
    const result = await fn({});
    return result.data;
};

window.updateFirebaseDisplayName = async (displayName) => {
    const nextDisplayName = String(displayName || '').trim();

    if (!auth.currentUser) {
        throw new Error('Utilisateur non connecte');
    }

    if (!nextDisplayName) {
        throw new Error('Nom d\'affichage vide');
    }

    await updateProfile(auth.currentUser, {
        displayName: nextDisplayName
    });

    await auth.currentUser.reload();
    return auth.currentUser;
};
