// success.js
import { auth } from "./firebase/firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
    const uid = localStorage.getItem("lastPaymentUid");
    if (!uid) return;

    try {
        const res = await fetch("https://us-central1-yichingapp-a5f90.cloudfunctions.net/sendAdviceEmail", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid })
        });

        const result = await res.json();
        console.log("✅ メール送信結果:", result);
    } catch (err) {
        console.error("❌ メール送信失敗:", err);
    }
});