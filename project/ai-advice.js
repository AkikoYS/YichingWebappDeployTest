// ✅ 完全版 ai-advice.js（uid = 助言単位ID）
import { db } from "./firebase/firebase.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ テスト送信用メイン関数
export async function sendAdviceToServer({ isTest = false, email = "", uid = null } = {}) {
    uid = uid || `log_${Date.now()}`; // ✅ 助言IDとしてのuidを生成、なければ日付時刻で自動生成

    //セッションやローカルストレージから情報収集
    const userName = sessionStorage.getItem("userName") || "匿名";
    const userEmail = email || sessionStorage.getItem("userEmail") || "";
    const userBackground = sessionStorage.getItem("userBackground") || "";
    const userSituation = sessionStorage.getItem("userSituation") || "";
    const userNotes = sessionStorage.getItem("userNotes") || "";
    const userQuestion = localStorage.getItem("userQuestion") || "";
    const fortunesSummary = localStorage.getItem("fortunesSummary") || "";//"summaryText"から変更

    const data = {
        uid,
        createdAt: serverTimestamp(),
        status: "waiting",
        emailSent: false,
        emailLock: false,
        userEmail,
        userName,
        userQuestion,
        topic: userBackground,
        situation: userSituation,
        notes: userNotes,
        fortunesSummary,
    };
    try {
        await setDoc(doc(db, "adviceRequests", uid), data);
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
