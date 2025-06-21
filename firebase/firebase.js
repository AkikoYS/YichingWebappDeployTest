console.log("📦 firebase.js loaded");
if (window.FIREBASE_CONFIG) {
    console.log("✅ FIREBASE_CONFIG detected:", window.FIREBASE_CONFIG.apiKey);
} else {
    console.warn("❌ FIREBASE_CONFIG is undefined");
}
console.log("🧪 env:", typeof window.FIREBASE_CONFIG);

// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth,
    signInWithPopup,
    onAuthStateChanged,
    GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


// Firebase 設定
const firebaseConfig = window.FIREBASE_CONFIG;
// const firebaseConfig = {
//     apiKey: window.ENV.FIREBASE_API_KEY,
//     authDomain: "yichingapp-a5f90.firebaseapp.com",
//     projectId: "yichingapp-a5f90",
//     storageBucket: "yichingapp-a5f90.appspot.com", // ✅ 修正済み
//     messagingSenderId: "294471771058",
//     appId: "1:294471771058:web:b7baf7525c131a39cbbaab",
//     measurementId: "G-3PM8FFGK1V"
// };

// Firebase 初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Firebase 初期化完了の通知用 Promise
const firebaseReady = new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("✅ Firebase 認証済み:", user.email || "ログイン中");
            resolve();
        } else {
            console.log("⏳ 未ログイン状態です");
            resolve(); // ここでも resolve しておく（ボタン表示などに使う）
        }
    });
});

export { auth, db, provider, firebaseReady, onAuthStateChanged, signInWithPopup };

