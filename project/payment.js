import { auth } from "./firebase/firebase.js"; // ← これが必要（なければ上部に追加）
import { markAsSent, showToast, sendAdviceToServer } from "./ai-advice.js";

document.addEventListener("DOMContentLoaded", () => {
    const payBtn = document.getElementById("paymentButton");
    if (payBtn) {
        payBtn.addEventListener("click", async () => {

            const uid = auth?.currentUser?.uid;
            if (!uid) {
                alert("⚠️ Googleにログインしてから決済を開始してください。");
                return;
            }

            try {
                document.getElementById("sendingStatus").style.display = "block";
                // 🔽 🔥 Firestore に助言データを保存（ここが重要）
                const { uid } = await sendAdviceToServer({ isTest: false, email: auth?.currentUser?.email });

                const endpoint = location.hostname === "localhost"
                    ? "http://localhost:5001/yichingapp-a5f90/us-central1/createCheckoutSession"
                    : "https://us-central1-yichingapp-a5f90.cloudfunctions.net/stripe/createCheckoutSession";

                const res = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ uid })
                });
                if (!res.ok) {
                    const text = await res.text();
                    throw new Error("サーバーエラー: " + text);
                }

                const { url } = await res.json();
                window.location.href = url;
            } catch (error) {
                alert("❌ 決済開始に失敗しました: " + error.message);
                document.getElementById("sendingStatus").style.display = "none";
            }
        });
    }
});
