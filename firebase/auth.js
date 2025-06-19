import { auth, provider } from "./firebase.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const loginBtn = document.getElementById("login-button");
const logoutBtn = document.getElementById("logout-button");
const authIcon = document.getElementById("auth-icon");// ✅ SVG表示用アイコン
const authIconContainer = document.querySelector(".auth-icon-container");

// ログイン処理
loginBtn.addEventListener("click", () => {
    signInWithPopup(auth, provider)
        .then(() => {
            console.log("✅ ログイン成功");
        })
        .catch((error) => {
            console.error("❌ ログイン失敗:", error);
        });
});

// ログアウト処理
logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
        console.log("✅ ログアウト成功");
    });
});

// スマホ用アイコンの処理
authIconContainer?.addEventListener("click", () => {
    const user = auth.currentUser;

    if (user) {
        // ログイン中 → ログアウト
        signOut(auth)
            .then(() => console.log("📤 ログアウトしました"))
            .catch((error) => console.error("❌ ログアウト失敗:", error));
    } else {
        // ログアウト中 → ログイン
        signInWithPopup(auth, provider)
            .then(() => console.log("📥 ログイン成功"))
            .catch((error) => console.error("❌ ログイン失敗:", error));
    }
});

// 状態に応じてボタン切り替え
onAuthStateChanged(auth, (user) => {
    if (user) {
        // ✅ ログイン中：PC用ボタン切替
        loginBtn.style.display = "none";
        logoutBtn.style.display = "inline-block";

        // ✅ スマホ：アイコン表示、Sign in非表示
        authIconContainer.classList.remove("signin-text");
        authIcon.style.display = "inline-block";
        authIcon.src = "assets/icons/google-icon-1.svg"; // ✅ ログイン中用アイコンに変更
    } else {
        // ✅ ログアウト中：PC用ボタン切替
        loginBtn.style.display = "inline-block";
        logoutBtn.style.display = "none";

        // ✅ スマホ：Sign in表示、アイコン非表示
        authIconContainer.classList.add("signin-text");
        authIcon.style.display = "none"; // 念のため明示
    }
});