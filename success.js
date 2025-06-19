import { sendAdviceToServer, markAsSent, showToast } from "./ai-advice.js";

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const user = JSON.parse(localStorage.getItem("authUser")); // 例：ログインユーザー
        await sendAdviceToServer({ isTest: false, email: user?.email });
        markAsSent();
        showToast("✅ 助言を送信しました（メールを確認してください）");
    } catch (error) {
        showToast("❌ 助言の送信に失敗しました");
    }
});