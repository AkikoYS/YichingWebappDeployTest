import { auth } from "./firebase/firebase.js"; // ← これが必要（なければ上部に追加）
import { markAsSent, showToast, sendAdviceToServer } from "./ai-advice.js";

const chatLog = document.getElementById("chat-log");

document.addEventListener("DOMContentLoaded", () => {
    //noteボタンのchatLog処理
    const notesValue = document.getElementById("user-notes")?.value.trim();
    if (chatLog && notesValue && !document.querySelector(".chat-log strong")?.textContent.includes("その他の伝えたいこと")) {
        const notesResponse = document.createElement("div");
        notesResponse.className = "chat-log";
        notesResponse.innerHTML = `<strong>その他の伝えたいこと</strong><br>${notesValue}`;
        chatLog.appendChild(notesResponse);
        // ✅ フォームの値をクリアして再表示を防ぐ
        document.getElementById("user-notes").value = "";
    }

    const payBtn = document.getElementById("paymentButton");
    if (payBtn) {
        payBtn.addEventListener("click", async () => {
            const uid = auth?.currentUser?.uid;
            const email = auth?.currentUser?.email;

            if (!uid) {
                alert("Googleログインが必要です");
                return;
            }

            try {
                await sendAdviceToServer({
                    userName: "山田太郎",
                    userEmail: email,
                    userQuestion: "将来が不安",
                    topic: "転職活動",
                    situation: "迷っている",
                    notes: "特になし",
                    hexagrams: hexagramData,
                    fortunesSummary: summaryText,
                    uid
                });

                localStorage.setItem("lastPaymentUid", uid);

                const checkoutRes = await fetch("https://us-central1-yichingapp-a5f90.cloudfunctions.net/stripe/createCheckoutSession", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ uid, email })
                });

                const { url } = await checkoutRes.json();
                window.location.href = url;
            } catch (error) {
                alert("❌ 決済処理に失敗: " + error.message);
            }
        });
    }

});
