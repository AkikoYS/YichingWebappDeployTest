// console.log("🔍 originalHexagram raw:", localStorage.getItem("originalHexagram"));
// console.log("🔍 parsed:", JSON.parse(localStorage.getItem("originalHexagram")));

// try {
//     const parsed = JSON.parse(localStorage.getItem("currentFortune"));
//     console.log("✅ Parsed currentFortune:", parsed);
// } catch (e) {
//     console.error("❌ JSON parse error:", e);
// }

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

// ✅ 助言送信用関数（Firestore保存とCloud Function送信）
export async function sendAdviceToServer({ isTest = false, email = "" } = {}) {
    const uid = crypto.randomUUID();

    // 🔍 必須データ取得 & 検証
    const userName = localStorage.getItem("userName") || "匿名";
    const userEmail = email || localStorage.getItem("userEmail") || "";
    const userBackground = localStorage.getItem("userBackground") || "";
    const userSituation = localStorage.getItem("userSituation") || "";
    const userNotes = localStorage.getItem("userNotes") || "";
    const userQuestion = localStorage.getItem("userQuestion") || "";
    const fortunesSummary = localStorage.getItem("fortunesSummary") || "";
    const changedLineIndex = localStorage.getItem("changedLineIndex") || "0";

    const parseHex = (key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return {};
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.error(`❌ ${key} のパースに失敗:`, e);
            return {};
        }
    };

    let originalHexagram = parseHex("originalHexagram");
    if (!originalHexagram.name) {
        throw new Error("❌ originalHexagram.name が不明です");
    }

    const changedHexagram = parseHex("changedHexagram");
    const reverseHexagram = parseHex("reverseHexagram");
    const souHexagram = parseHex("souHexagram");
    const goHexagram = parseHex("goHexagram");

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
        fortunesSummary: fortunesSummary,
        timestamp: serverTimestamp()
    };

    // ✅ Firestore保存
    try {
        await addDoc(collection(db, "payments_pending"), fullData);
        console.log("✅ Firestore 保存成功");
    } catch (err) {
        console.error("❌ Firestore 保存失敗:", err);
    }

    // ✅ テスト送信（Cloud Functionへ）
    if (isTest) {
        console.log("📤 fullData 送信内容:", JSON.stringify(fullData, null, 2));

        const API_URL = "https://us-central1-yichingapp-a5f90.cloudfunctions.net/sendAdviceEmail";

        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fullData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`サーバーエラー: ${response.status}\n${errorText}`);
        }

        return await response.json();
    }}