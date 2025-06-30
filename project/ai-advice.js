import {
    collection,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase/firebase.js"; // 適宜パス調整


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
export async function sendAdviceToServer({ isTest = false, email = "", uid = null } = {}) {
    uid = uid || crypto.randomUUID();

    const userName = localStorage.getItem("userName") || "匿名";
    const userEmail = email || localStorage.getItem("userEmail") || "";
    const userBackground = localStorage.getItem("userBackground") || "";
    const userSituation = localStorage.getItem("userSituation") || "";
    const userNotes = localStorage.getItem("userNotes") || "";
    const userQuestion = localStorage.getItem("userQuestion") || "";
    const fortunesSummary = localStorage.getItem("summaryText") || "";
    const changedLineIndex = localStorage.getItem("changedLineIndex") || "0";

    const parseHex = (key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return "{}";
        try {
            JSON.parse(raw);
            return raw;
        } catch (e) {
            console.error(`❌ ${key} のパースに失敗:`, e);
            return "{}";
        }
    };

    const originalHexagram = parseHex("originalHexagram");
    const changedHexagram = parseHex("changedHexagram");
    const reverseHexagram = parseHex("reverseHexagram");
    const souHexagram = parseHex("souHexagram");
    const goHexagram = parseHex("goHexagram");

    const firestoreData = {
        uid,
        userName,
        userEmail,
        userQuestion,
        topic: userBackground,
        situation: userSituation,
        notes: userNotes,
        fortunesSummary,
        originalHexagram,
        changedHexagram,
        reverseHexagram,
        souHexagram,
        goHexagram,
        changedLineIndex,
        createdAt: serverTimestamp(),
    };

    console.log("📤 Firestore へ保存直前 uid:", uid);
    console.log("📤 保存するデータ:", firestoreData);

    try {
        await setDoc(doc(db, "adviceRequests", uid), firestoreData);
        console.log("✅ Firestore にデータ保存済:", uid);
    } catch (err) {
        console.error("❌ Firestore 保存失敗:", err);
        throw new Error("Firestoreへの保存に失敗しました");
    }

    if (isTest) {
        const response = await fetch("https://us-central1-yichingapp-a5f90.cloudfunctions.net/generateAndSavePDF", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`PDF生成リクエスト失敗: ${response.status}\n${errorText}`);
        }

        const result = await response.json();
        console.log("✅ PDF生成レスポンス:", result);
        return result;
    }

    return { uid }; // 決済用には uid を返す
}
  