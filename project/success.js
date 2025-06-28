import { showToast } from "./ai-advice.js";
import { db } from "./firebase/firebase.js"; // ここはプロジェクト内の firebase.js を参照
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const uid = new URLSearchParams(window.location.search).get("uid");
    if (!uid) {
        showToast("❌ ユーザー情報が取得できませんでした");
        return;
    }

    const docRef = doc(db, "adviceRequests", uid);
    let toastShown = false;
    showToast("🌀 AI助言を送信しています…");

    onSnapshot(docRef, (docSnap) => {
        console.log("snapshot triggered:", docSnap.exists(), docSnap?.data()?.pdfPath);
        if (!toastShown && docSnap.exists() && docSnap.data().pdfPath) {
            toastShown = true;
            showToast("✅ 助言PDFを送信しました。メールが届くまで楽しみにお待ちください。");
        }
    }, (err) => {
        console.error("onSnapshot error:", err);
        showToast("❌ データ取得に失敗しました");
    });
    });