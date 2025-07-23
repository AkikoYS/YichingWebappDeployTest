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
let spinnerClickBound = false;
let spinner = null;


function handleSpinnerClickWrapper(e) {
    handleSpinnerClick(e);
}

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
function initSpinnerScreen() {
    const spinnerWrapper = document.getElementById("spinner-anim-wrapper");
    const lottieEl = document.getElementById("lottie-spinner");

    if (!lottieEl) return console.error("❌ #lottie-spinner が見つかりません。");
    if (animation) animation.destroy();

    animation = lottie.loadAnimation({
        container: lottieEl,
        renderer: "svg",
        loop: true,
        autoplay: false,
        path: "assets/animations/spinner-animation.json"
    });

    animation.addEventListener("DOMLoaded", () => {
        console.log("✅ Lottie DOMLoaded → 再生開始");
        animation.play(); // screen1で回す
    });

    isSpinning = false;
    alreadyClicked = false;
}

function init() {
    showScreen("screen-start");
    initSpinnerScreen();

    const startBtn = document.getElementById("startBtn");
    const instructionText = document.getElementById("instructionText");
    const spinnerWrapper = document.getElementById("spinner-anim-wrapper");

    startBtn?.addEventListener("click", () => {
        startBtn.classList.remove("visible");
        startBtn.classList.add("hidden");

        if (animation) {
            animation.pause();
            const currentFrame = Math.round(animation.currentFrame);
            animation.goToAndStop(currentFrame, true);
            console.log("🛑 スピナー停止 at frame", currentFrame);

            // ✅ 明示的にDOMに対しても強制停止（CSS干渉回避）
            const spinnerVisual = document.getElementById("lottie-spinner");
            if (spinnerVisual) {
                spinnerVisual.style.animation = "none";
                spinnerVisual.style.transform = "none";
            }

            spinnerWrapper.classList.add("spinner-feedback");

            setTimeout(() => {
                spinnerWrapper.classList.remove("spinner-feedback");
            }, 2000); // ← CSSアニメ時間に合わせて900ms〜1s
        }
        showScreen("screen-spinner");

        setTimeout(() => {
            instructionText?.classList.remove("hidden");
            instructionText?.classList.add("visible");

            spinnerWrapper.addEventListener("click", handleSpinnerClick);

        }, 100);
    });
}

//screen2: スピナーを６回クリックして本卦を出す
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
        //scale up/downのアニメーション
        const spinnerFeedbackWrapper = document.getElementById("spinner-anim-wrapper");

        if (spinnerFeedbackWrapper) {
            spinnerFeedbackWrapper.classList.add("spinner-feedback");

            spinnerFeedbackWrapper.addEventListener("animationend", () => {
                spinnerFeedbackWrapper.classList.remove("spinner-feedback");
            }, { once: true });
        }

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
                showResultScreenWithTransition(); // アニメで切り替え
            }, 1200);
        }
    }
}
//screen3->4: 卦の結果表示に伴うスピナーズームアウト、結果のズームイン
function showResultScreenWithTransition() {
    const spinnerWrapper = document.getElementById("spinner-anim-wrapper");
    const resultScreen = document.getElementById("screen-result");

    // スピナーをズームアウト（アニメーション）
    spinnerWrapper.classList.add("spinner-zoom-out");

    // 600ms後に結果画面へ遷移＆本卦描画
    setTimeout(() => {
        showScreen("screen-result");

        // ズームインエフェクト
        resultScreen.classList.add("result-zoom-in");

        // 本卦を描画
        renderHexagramResult();

    }, 600);
}
// 卦の結果表示関数
function createHexagramHTML(hexagram) {
    const description = hexagram.description || "説明は準備中です";
    const formattedDescription = description.replace(/\n/g, "<br>");
    const nameWithRuby = `<ruby>${hexagram.name}<rt>${hexagram.reading}</rt></ruby>`;

    return `
      <div class="hexagram-title">第${hexagram.number}卦：${nameWithRuby}<span style="font-size: 0.8em;">—${hexagram.composition}</span></div>
      <div class="hexagram-reading" style="text-align: center;">${hexagram.summary}</div>
      <div class="hexagram-svg">
        <object data="assets/images/hexagrams/hexagram_${hexagram.number.toString().padStart(2, '0')}.svg" type="image/svg+xml"></object>
      </div>
      <div class="description-text">${formattedDescription}</div>
      <div class="description-image">⚪︎イメージ：${hexagram.desimage}</div>
    `;
}

const shownVariantKeys = new Set(); // 初期化（ページ読み込み時）

function waitForHexagramsAndRender() {
    const interval = setInterval(() => {
        if (sixtyFourHexagrams.length > 0) {
            clearInterval(interval);
            renderHexagramResult();
        }
    }, 100);
}

//variantBtnsをクリックしたときの処理
function handleVariantClick(key) {
    playSoundEffect("assets/sounds/click_button.mp3");

    // ボタン群を削除
    const buttonContainer = document.getElementById("variant-buttons");
    if (buttonContainer) buttonContainer.remove();

    if (key === "future-expansion") {
        handleFutureExpansion(selectedHexagram);
        return;
    }

    const variantHex = sixtyFourHexagrams.find(h => h.number === selectedHexagram[key]);
    const resultContainer = document.getElementById("result");

    if (!variantHex) {
        resultContainer.innerHTML = `<div class="error-message">該当する卦が見つかりません</div>`;
        return;
    }

    if (!shownVariantKeys.has(key)) {
        resultContainer.innerHTML = `<div class="waiting-message">占い結果を読み取っています...</div>`;
        setTimeout(() => {
            resultContainer.innerHTML = createHexagramHTML(variantHex) +
                `<button class="main-btn" onclick="renderHexagramResult()">本卦に戻る</button>`;
            shownVariantKeys.add(key);
        }, 1000);
    } else {
        resultContainer.innerHTML = createHexagramHTML(variantHex) +
            `<button class="main-btn" onclick="renderHexagramResult()">本卦に戻る</button>`;
    }
}

function renderHexagramResult() {
    const hexagram = getHexagramByArray(resultArray);
    if (!hexagram) {
        alert(`該当する卦が見つかりません（${resultArray}）`);
        return;
    }

    selectedHexagram = hexagram;

    const resultContainer = document.getElementById("result");
    resultContainer.innerHTML = createHexagramHTML(hexagram) + `
        <div class="variant-buttons">
            <button class="variant-btn" data-key="future-expansion">今後の展開</button>
            <button class="variant-btn" data-key="reverse">裏の意味</button>
            <button class="variant-btn" data-key="sou">客観的に運命を見ると</button>
            <button class="variant-btn" data-key="go">卦の本質は</button>
        </div>
    `;
    document.querySelectorAll(".variant-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const key = btn.dataset.key;
            handleVariantClick(key);
        });
    });
}

function playSoundEffect(src) {
    const audio = new Audio(src);
    audio.play();
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