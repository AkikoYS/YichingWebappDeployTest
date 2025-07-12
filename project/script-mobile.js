let currentScreen = "screen-start";
let clickCount = 0;
let animation = null;

function showScreen(id) {
    document.querySelectorAll(".screen").forEach((section) => {
        section.classList.remove("active");
        section.classList.add("hidden");
    });
    const target = document.getElementById(id);
    if (target) {
        target.classList.remove("hidden");
        target.classList.add("active");
    }
    currentScreen = id;
}

function initSpinnerScreen() {
    const container = document.getElementById("spinner");
    container.innerHTML = ""; // 前のアニメーションを消す
    animation = lottie.loadAnimation({
        container,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: "assets/animations/spinner-animation.json",
    });

    container.addEventListener("click", handleSpinnerClick);
}

function handleSpinnerClick() {
    clickCount++;
    navigator.vibrate?.(100);

    if (clickCount >= 6) {
        const container = document.getElementById("spinner");
        container.removeEventListener("click", handleSpinnerClick);
        setTimeout(() => {
            showScreen("screen-result");
            renderHexagramResult();
        }, 600);
    }
}

function renderHexagramResult() {
    const number = 23;
    const name = "山地剥（さんちはく）";
    const summary = "最低限、自分の立ち位置を守り、前に進むべきではありません。耐えることが吉。";

    document.getElementById("hexagramNumber").textContent = `第${number}卦`;
    document.getElementById("hexagramName").textContent = name;
    document.getElementById("hexagramSummary").textContent = summary;
}

function init() {
    // 🌟 スタート画面の要素取得
    const spinnerContainer = document.getElementById("spinnerContainer");
    const startBtn = document.getElementById("startBtn");
    const instructionText = document.getElementById("instructionText");

    // 🔁 スピナーは最初は静止（autoplay: false）
    if (spinnerContainer) {
        lottie.loadAnimation({
            container: spinnerContainer,
            renderer: "svg",
            loop: true,
            autoplay: false, // ← スタート時は静止状態
            path: "assets/animations/spinner-animation.json",
        });
    }

    // 🎬 「占いを始める」ボタン押下時の処理
    startBtn?.addEventListener("click", () => {
        // ボタン非表示、テキスト表示
        startBtn.classList.remove("visible");
        startBtn.classList.add("hidden");

        instructionText.classList.remove("hidden");
        instructionText.classList.add("visible");

        // スピナーを開始
        const animationInstance = lottie.getRegisteredAnimations()?.[0];
        animationInstance?.play();

    });

    // 🔙 「戻る」ボタン処理（画面状態に応じて戻る先を分岐）
    document.getElementById("btn-back")?.addEventListener("click", () => {
        if (currentScreen === "screen-spinner") {
            showScreen("screen-start");
            clickCount = 0;
        } else if (currentScreen === "screen-result") {
            showScreen("screen-spinner");
        } else {
            console.log("⬅️ 戻る動作なし");
        }
    });

    // 🔜 次へ
    document.getElementById("btn-next")?.addEventListener("click", () => {
        console.log("➡️ 次に進む");
    });

    // 🏠 ホームに戻る
    document.getElementById("btn-home")?.addEventListener("click", () => {
        showScreen("screen-start");
        clickCount = 0;
    });

    // ✉️ お問い合わせページへ
    document.getElementById("btn-contact")?.addEventListener("click", () => {
        window.location.href = "feedback.html?mobile=1";
    });
}


// ✅ DOM構築完了後に初期化
document.addEventListener("DOMContentLoaded", init);
