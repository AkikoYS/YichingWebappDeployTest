// auth.js (整理版)
import { auth, provider } from "./firebase.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ===== 事前ガード：index-mobile から来たときは認証UI/初期化を止める =====
if (window.__DISABLE_AUTH__) {
    console.debug("Auth disabled (came from index-mobile). Skip auth init.");
    // 必要ならUIを隠す（該当クラスがある場合のみ）
    document.addEventListener("DOMContentLoaded", () => {
        document.querySelectorAll(".login-ui, .logout-ui, .account-ui, .requires-auth").forEach(el => el.remove());
        // スマホ用のアイコン容器ごと非表示にしたい場合は以下を有効化
        // document.querySelector(".auth-icon-container")?.remove();
    });
} else {
    // ====== 通常初期化 ======
    const loginBtn = document.getElementById("login-button");
    const logoutBtn = document.getElementById("logout-button");
    const authIcon = document.getElementById("auth-icon");                    // SVG アイコン
    const authIconContainer = document.querySelector(".auth-icon-container"); // スマホ用トグル

    // ---- イベント登録（要素があるときだけ） ----
    loginBtn?.addEventListener("click", async () => {
        try {
            await signInWithPopup(auth, provider);
            console.log("✅ ログイン成功");
        } catch (error) {
            console.error("❌ ログイン失敗:", error);
        }
    });

    logoutBtn?.addEventListener("click", async () => {
        try {
            await signOut(auth);
            console.log("✅ ログアウト成功");
        } catch (e) {
            console.error("❌ ログアウト失敗:", e);
        }
    });

    // スマホ用アイコンのトグル（ログイン/ログアウトを切替）
    authIconContainer?.addEventListener("click", async () => {
        try {
            if (auth.currentUser) {
                await signOut(auth);
                console.log("📤 ログアウトしました");
            } else {
                await signInWithPopup(auth, provider);
                console.log("📥 ログイン成功");
            }
        } catch (e) {
            console.error("❌ 認証操作失敗:", e);
        }
    });

    // ---- onAuthStateChanged は 1 回だけ ----
    onAuthStateChanged(auth, (user) => {
        // PC 用ボタン表示切替
        if (loginBtn) loginBtn.style.display = user ? "none" : "inline-block";
        if (logoutBtn) logoutBtn.style.display = user ? "inline-block" : "none";

        // スマホ用表示切替
        if (authIconContainer) {
            if (user) {
                authIconContainer.classList.remove("signin-text");
                if (authIcon) {
                    authIcon.style.display = "inline-block";
                    authIcon.src = "assets/icons/google-icon-1.svg"; // ログイン中アイコン
                }
            } else {
                authIconContainer.classList.add("signin-text");
                if (authIcon) authIcon.style.display = "none";
            }
        }

        // デバッグ表示（任意）
        const debug = document.getElementById("debug");
        if (debug) {
            if (user) {
                console.log("✅ あなたのUID:", user.uid);
                debug.textContent = "あなたのUID: " + user.uid;
            } else {
                console.log("❌ 未ログイン");
                debug.textContent = "";
            }
        }
    });
}
