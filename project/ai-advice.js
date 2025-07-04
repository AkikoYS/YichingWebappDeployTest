// ✅ 完全版 ai-advice.js（uid = 助言単位ID）
import { db } from "./firebase/firebase.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ テスト送信用メイン関数（決済でも使い回せる）
export async function sendAdviceToServer({ isTest = false, email = "", uid = null } = {}) {
    uid = uid || `log_${Date.now()}`; // ✅ 助言IDとしてのuidを生成

    const userName = sessionStorage.getItem("userName") || "匿名";
    const userEmail = email || sessionStorage.getItem("userEmail") || "";
    const userBackground = sessionStorage.getItem("userBackground") || "";
    const userSituation = sessionStorage.getItem("userSituation") || "";
    const userNotes = sessionStorage.getItem("userNotes") || "";
    const userQuestion = localStorage.getItem("userQuestion") || "";
    const fortunesSummary = localStorage.getItem("fortunesSummary") || "";//"summaryText"から変更
    const changedLineIndex = sessionStorage.getItem("changedLineIndex") || "0";

    const parseHex = (key) => {
        const raw = sessionStorage.getItem(key);
        if (!raw) return {};
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.error(`❌ ${key} のパースに失敗:`, e);
            return {};
        }
    };

    const firestoreData = {
        userName,
        userEmail,
        userQuestion,
        topic: userBackground,
        situation: userSituation,
        notes: userNotes,
        fortunesSummary,
        originalHexagram: parseHex("originalHexagram"),
        changedHexagram: parseHex("changedHexagram"),
        reverseHexagram: parseHex("reverseHexagram"),
        souHexagram: parseHex("souHexagram"),
        goHexagram: parseHex("goHexagram"),
        changedLineIndex,
        createdAt: serverTimestamp(),
    };

    try {
        await setDoc(doc(db, "adviceRequests", uid), firestoreData);
        console.log("✅ Firestore に保存成功:", uid);
    } catch (err) {
        console.error("❌ Firestore 保存エラー:", err);
        throw new Error("Firestoreへの保存に失敗しました");
    }

    if (isTest) {
        const response = await fetch("https://us-central1-yichingapp-a5f90.cloudfunctions.net/generateAndSavePDF", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid }) // ✅ uidだけを渡す
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`PDF生成リクエスト失敗: ${response.status}\n${errorText}`);
        }

        const result = await response.json();
        console.log("✅ PDF生成レスポンス:", result);
        return result;
    }

    return { uid }; // 決済連携時に使用
}

export function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("visible");
    setTimeout(() => {
        toast.classList.remove("visible");
    }, 3000);
}
