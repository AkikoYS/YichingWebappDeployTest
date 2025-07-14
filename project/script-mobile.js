let currentScreen = "screen-start";
let startAnimation = null;
let animation = null;
let clickCount = 0;
let resultArray = "";
let isSpinning = false;
let alreadyClicked = false;
let selectedHexagram = null;
let changedHexagram = null;
let cachedChangedLineIndex = null;

//指定された id を持つ画面（section）だけを表示し、それ以外はすべて非表示
function showScreen(id) {
    console.log("🧭 showScreen:", id); // ← デバッグ用

    document.querySelectorAll(".screen").forEach((section) => {
        section.classList.remove("active");
        section.classList.add("hidden");
    });
    const target = document.getElementById(id);
    if (target) {
        target.classList.remove("hidden");
        target.classList.add("active");
    } else {
        console.warn("⚠️ 該当画面が見つかりません:", id);
    }
    currentScreen = id;
    updateFooterButtons();
}
//スピナーの初期化（スピナーが「正しく表示・再生・反応」するようにする）
function initSpinnerScreen() {
    const spinnerWrapper = document.getElementById("spinner-anim-wrapper");
    const lottieEl = document.getElementById("lottie-spinner");

    if (!lottieEl) return console.error("❌ #lottie-spinner が見つかりません。");
    if (animation) animation.destroy();

    animation = lottie.loadAnimation({
        container: lottieEl,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: "assets/animations/spinner-animation.json"
    });

    spinnerWrapper.onclick = handleSpinnerClick;
    isSpinning = false;
    alreadyClicked = false;
}
//ボタンを押すことでScreen1からscreen2への遷移
function init() {
    // 初期画面の表示とスピナー初期化
    showScreen("screen-start");
    initSpinnerScreen();

    const startBtn = document.getElementById("startBtn");
    const instructionText = document.getElementById("instructionText");
    const spinner = document.getElementById("mainSpinner");

    // スピナーを一時的にクリック無効化
    spinner.classList.add("disable-click");

    // 「占いを始める」ボタンのクリックイベント
    startBtn?.addEventListener("click", () => {
        // ボタンを非表示にする
        startBtn.classList.remove("visible");
        startBtn.classList.add("hidden");

        // スピナーのクリックを有効化
        spinner.classList.remove("disable-click");

        // スピナーのフィードバックアニメーション
        const spinnerWrapper = document.getElementById("spinner-anim-wrapper");
        if (animation) {
            const currentFrame = animation.currentFrame;
            animation.goToAndStop(currentFrame, true);
            spinnerWrapper.classList.add("spinner-feedback");
            setTimeout(() => {
                spinnerWrapper.classList.remove("spinner-feedback");
            }, 200);
        }

        // 少し遅らせて占い画面へ切り替え
        setTimeout(() => {
            showScreen("screen-spinner");

            // 説明テキストを表示
            setTimeout(() => {
                instructionText?.classList.remove("hidden");
                instructionText?.classList.add("visible");
            }, 100);
        }, 100);
    });
}


//スピナーを６回クリックして本卦を出す
function handleSpinnerClick() {
    if (alreadyClicked || !animation) return;

    const instructionText = document.getElementById("instructionText");
    const spinnerEl = document.getElementById("mainSpinner");
    const overlay = document.getElementById("spinner-overlay");

    if (!isSpinning) {
        animation.play();
        isSpinning = true;
    } else {
        isSpinning = false;
        const currentFrame = animation.currentFrame;
        animation.goToAndStop(currentFrame, true);

        const spinnerFeedbackWrapper = document.getElementById("spinner-anim-wrapper");
        spinnerFeedbackWrapper?.classList.add("spinner-feedback");
        setTimeout(() => spinnerFeedbackWrapper?.classList.remove("spinner-feedback"), 200);

        navigator.vibrate?.(100);
        playSoundEffect("assets/sounds/click.mp3");

        const yinYang = Math.random() < 0.5 ? "0" : "1";
        resultArray += yinYang;
        clickCount++;

        const lineNames = ["初", "二", "三", "四", "五", "上"];
        instructionText.textContent = `${lineNames[clickCount - 1]}爻は${yinYang === "0" ? "陰" : "陽"}です`;

        if (clickCount >= 6) {
            alreadyClicked = true;
            spinnerEl.removeEventListener("click", handleSpinnerClick);
            instructionText.classList.add("hidden");
            spinnerEl.style.transition = "transform 1s ease";
            spinnerEl.style.transform = "scale(0)";

            setTimeout(() => {
                showScreen("screen-result");
                renderHexagramResult();
            }, 1200);
        }
    }
}


//卦の結果を表示する
function renderHexagramResult() {
    const hexagram = getHexagramByArray(resultArray);
    if (!hexagram) {
        alert(`該当する卦が見つかりません（${resultArray}）`);
        return;
    }
    selectedHexagram = hexagram;
    document.getElementById("hexagramNumber").textContent = `第${hexagram.number}卦`;
    document.getElementById("hexagramName").textContent = hexagram.name;
    document.getElementById("hexagramSummary").textContent = hexagram.summary;
}

function playSoundEffect(src) {
    const audio = new Audio(src);
    audio.play();
}

// 4つの変化ボタン（今後の展開／裏の意味／客観的に／卦の本質）
document.querySelectorAll(".variant-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        const key = btn.dataset.key;
        showVariant(key);
    });
});

function showVariant(key) {
    // 卦を入れ替えてHTML生成（簡略表示）
    const result = document.querySelector("#screen-result .result");
    result.innerHTML = `<div class="hexagram-title">【${key}】を表示中（仮）</div>
    <button class="main-btn" onclick="showScreen('screen-result')">本卦に戻る</button>`;
}

// 「今後の展開」ボタン → 再スピナー
document.getElementById("futureBtn")?.addEventListener("click", () => {
    showScreen("screen-future");
    clickCount = 0;
    alreadyClicked = false;
    document.getElementById("mainSpinner").style.transform = "scale(1)";
    initSpinnerScreen();
});

// フッター
const btnBack = document.getElementById("btn-back");
const btnNext = document.getElementById("btn-next");
const btnReset = document.getElementById("btn-home");
const btnContact = document.getElementById("btn-contact");

btnBack.addEventListener("click", () => {
    if (currentScreen === "screen-result") {
        showScreen("screen-instruction");
    } else if (currentScreen === "screen-final") {
        showScreen("screen-result");
    }
});
btnNext.addEventListener("click", () => {
    if (currentScreen === "screen-result") {
        document.getElementById("futureBtn")?.click();
    } else if (currentScreen === "screen-future") {
        document.getElementById("mainSpinner")?.click();
    }
});
btnReset.addEventListener("click", () => {
    location.reload();
});
btnContact.addEventListener("click", () => {
    alert("📩 お問い合わせ画面に遷移（仮）");
});

function updateFooterButtons() {
    btnBack.disabled = (currentScreen === "screen-start" || currentScreen === "screen-instruction");
    btnNext.disabled = !(currentScreen === "screen-result" || currentScreen === "screen-future");
}

document.addEventListener("DOMContentLoaded", init);
