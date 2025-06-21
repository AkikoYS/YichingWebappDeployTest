
import { db } from "./firebase/firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ トースト表示
export function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 4000);
}

// ✅ 送信完了状態のローカル記録
export function markAsSent() {
    localStorage.setItem("adviceSent", "true");
}

// ✅ 助言送信用関数（Firestore保存を含む）
export async function sendAdviceToServer({ isTest = false, email = "" } = {}) {
    const userName = localStorage.getItem("userName") || "匿名";
    const userEmail = email || localStorage.getItem("userEmail") || "";
    const userBackground = localStorage.getItem("userBackground") || "";
    const userSituation = localStorage.getItem("userSituation") || "";
    const userNotes = localStorage.getItem("userNotes") || "";
    const userQuestion = localStorage.getItem("userQuestion") || "";

    const originalHexagram = JSON.parse(localStorage.getItem("originalHexagram") || "{}");
    const changedHexagram = JSON.parse(localStorage.getItem("changedHexagram") || "{}");
    const reverseHexagram = JSON.parse(localStorage.getItem("reverseHexagram") || "{}");
    const souHexagram = JSON.parse(localStorage.getItem("souHexagram") || "{}");
    const goHexagram = JSON.parse(localStorage.getItem("goHexagram") || "{}");
    const changedLineIndex = localStorage.getItem("changedLineIndex") || "0";
    const fortuneSummary = localStorage.getItem("fortuneSummary") || "";

    const uid = crypto.randomUUID();

    const fullData = {
        uid,
        userName,
        userEmail,
        userQuestion,
        topic: userBackground,
        situation: userSituation,
        notes: userNotes,
        hexagrams: {
            original: originalHexagram,
            changed: changedHexagram,
            reverse: reverseHexagram,
            sou: souHexagram,
            go: goHexagram,
            changedLineIndex
        },
        fortunesSummary: fortuneSummary,
        timestamp: serverTimestamp()
    };

    // Firestoreに保存（Webhook照合用）
    await addDoc(collection(db, "payments_pending"), fullData)
        .then(() => console.log("✅ Firestore 保存成功"))
        .catch(err => console.error("❌ Firestore 保存失敗:", err));
    

    if (isTest) {
        const API_URL = "https://us-central1-yichingapp-a5f90.cloudfunctions.net/sendAdviceEmail";
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fullData),
        });

        const result = await res.json();
        if (!res.ok) {
            throw new Error("❌ エラー: " + JSON.stringify(result));
        }
        return result;
    }

    return { uid };
}