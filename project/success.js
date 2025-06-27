import { showToast } from "./ai-advice.js";

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const uid = new URLSearchParams(window.location.search).get("uid");
        if (!uid) {
            showToast("❌ ユーザー情報が取得できませんでした");
            return;
        }

        // ✅ Firestore REST API でPDF送信済みか確認
        const res = await fetch(
            `https://firestore.googleapis.com/v1/projects/yichingapp-a5f90/databases/(default)/documents/adviceRequests/${uid}`
        );
        const data = await res.json();

        const sent = data?.fields?.pdfSent?.booleanValue === true;

        if (sent) {
            showToast("✅ 助言PDFを送信しました。メールをご確認ください。");
        } else {
            showToast("⏳ PDFの送信がまだ完了していません。少し待ってから再読み込みしてください。");
        }
    } catch (error) {
        console.error("❌ 成功画面でのFirestore取得エラー:", error);
        showToast("❌ 助言の送信状態を確認できませんでした");
    }
});
