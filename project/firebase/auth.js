// auth.js（最終整理版）
import { auth, provider } from "./firebase.js";
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ---- 要素取得（存在しないページもあるので ? で安全に扱う）
const $ = (sel) => document.querySelector(sel);
const loginBtn = $("#login-button");
const logoutBtn = $("#logout-button");
const authIcon = $("#auth-icon");                    // <img id="auth-icon">
const authIconContainer = $(".auth-icon-container");          // スマホ用トグル

// ---- クリック系
loginBtn?.addEventListener("click", async () => {
    try {
        await signInWithPopup(auth, provider);
        console.log("✅ ログイン成功");
    } catch (err) {
        console.error("❌ ログイン失敗:", err);
    }
});

logoutBtn?.addEventListener("click", async () => {
    try {
        await signOut(auth);
        console.log("✅ ログアウト成功");
    } catch (err) {
        console.error("❌ ログアウト失敗:", err);
    }
});

// スマホ用：アイコンをタップでログイン/ログアウト切替
authIconContainer?.addEventListener("click", async () => {
    try {
        if (auth.currentUser) {
            await signOut(auth);
            console.log("📤 ログアウトしました");
        } else {
            await signInWithPopup(auth, provider);
            console.log("📥 ログイン成功");
        }
    } catch (err) {
        console.error("❌ 認証操作失敗:", err);
    }
});

// ---- 認証状態をクラスとUIに反映（CSSでの出し分けに使う）
onAuthStateChanged(auth, (user) => {
    const html = document.documentElement;
    html.classList.toggle("is-authenticated", !!user);
    html.classList.toggle("is-unauthenticated", !user);

    // PC向けボタンの表示切替
    if (loginBtn) loginBtn.style.display = user ? "none" : "inline-block";
    if (logoutBtn) logoutBtn.style.display = user ? "inline-block" : "none";

    // スマホ用アイコンの見た目（DOMは消さず、表示のみ切替）
    if (authIconContainer) {
        if (user) {
            authIconContainer.classList.remove("signin-text");
            if (authIcon) {
                authIcon.style.display = "inline-block";
                // ルート基準の絶対パスで固定（/pc 配下でも崩れない）
                authIcon.src = "./assets/icons/google-icon-1.svg";
                authIcon.alt = "Googleアカウント";
                authIcon.title = "ログイン中 - タップでログアウト";
            }
        } else {
            authIconContainer.classList.add("signin-text");
            if (authIcon) authIcon.style.display = "none";
        }
    }

    // 任意のデバッグ
    const debug = $("#debug");
    if (debug) debug.textContent = user ? `あなたのUID: ${user.uid}` : "";
});
