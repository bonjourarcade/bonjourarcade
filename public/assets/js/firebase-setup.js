import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, connectAuthEmulator, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js";
import { getFirestore, connectFirestoreEmulator, collection, query, where, orderBy, onSnapshot, doc, getDoc, getDocs, addDoc, updateDoc, setDoc, deleteDoc, serverTimestamp, limit } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAh5PlPLpy8sfB5QxmjWiXaA_Qrtszc2Vg",
    authDomain: "alloarcade.firebaseapp.com",
    projectId: "alloarcade",
    storageBucket: "alloarcade.firebasestorage.app",
    messagingSenderId: "743236959029",
    appId: "1:743236959029:web:9996605303444776ae6a7c",
    measurementId: "G-G55K9S82G7"
};

const app = initializeApp(firebaseConfig);
window.firebaseApp = app;
const auth = getAuth(app);
const functions = getFunctions(app);
const db = getFirestore(app);

const isLocalhost = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('localhost') ||
    window.location.hostname.startsWith('192.168.');

if (isLocalhost) {
    console.log('Using Firebase Emulators');
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

window.firebaseAuth = auth;
window.firebaseFunctions = functions;
window.firebaseDb = db;

window.httpsCallable = httpsCallable;
window.Firestore = {
    collection, query, where, orderBy, onSnapshot, doc, getDoc, getDocs,
    addDoc, updateDoc, setDoc, deleteDoc, serverTimestamp, limit,
};

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
window.submitGameScore = async (gameId, score, comment, screenshotBase64, tournamentId, roundIndex) => {
    try {
        if (auth.currentUser) {
            await auth.currentUser.getIdToken(true);
        }
    } catch (tokenError) {
        console.warn("Token refresh failed, proceeding anyway:", tokenError);
    }

    const submitScoreFn = httpsCallable(functions, 'submitScore');
    const body = {
        gameId: gameId,
        score: score,
        comment: comment || undefined,
        screenshotBase64: screenshotBase64 || undefined,
        tournamentId: tournamentId || undefined,
        roundIndex: typeof roundIndex === 'number' ? roundIndex : undefined,
    };

    const MAX_RETRIES = 2;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const result = await submitScoreFn(body);
            return result.data;
        } catch (error) {
            const isRetryable = error && typeof error.code === 'string' &&
                (error.code === 'functions/internal' || error.code === 'functions/unavailable');
            if (isRetryable && attempt < MAX_RETRIES - 1) {
                console.warn(`Score submission attempt ${attempt + 1} failed, retrying...`, error);
                await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                continue;
            }
            console.error("Score submission error:", error);
            throw error;
        }
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

window.getPublicProfile = async (userId) => {
    const fn = httpsCallable(functions, 'getPublicProfile');
    const result = await fn({ userId });
    return result.data;
};

window.getUserScores = async (userId) => {
    const fn = httpsCallable(functions, 'getUserScores');
    const result = await fn({ userId });
    return result.data;
};

window.getPendingScoresCount = async () => {
  const fn = httpsCallable(functions, 'getPendingScoresCount');
  const result = await fn({});
  return result.data.count;
};

window.getSubmissionQueue = async (status = 'pending', limit = 20, lastDoc = null) => {
  const fn = httpsCallable(functions, 'getSubmissionQueue');
  const result = await fn({ status, limit, lastDoc });
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

    try {
        const fn = httpsCallable(functions, 'updateDisplayName');
        await fn({ displayName: nextDisplayName });
    } catch (e) {
        console.error('Failed to sync display name to Firestore:', e);
    }

    return auth.currentUser;
};
