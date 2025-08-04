// ❖ グローバル変数と初期設定
let currentScreen = "screen-start";
let startAnimation = null;
let animation = null;
let clickCount = 0;
let resultArray = "";
let isSpinning = false;
let alreadyClicked = false;
let selectedHexagram = null;
let changedHexagram = null;
let cachedChangedLineIndex = null;//今後の展開ボタンで得た変卦表示
let spinnerClickBound = false;
let spinner = null;
let originalHexagram = null;
let cachedChangedHexagram = null;//長い目で見るとボタンで得た変卦表示


//スピナークリックのラッパー
function handleSpinnerClickWrapper(e) {
    handleSpinnerClick(e);
}

//❶指定されたidを持つ画面（section）だけを表示し、それ以外はすべて非表示
function showScreen(id) {
    document.querySelectorAll(".screen").forEach((section) => {
        section.classList.remove("active");
        section.classList.add("hidden");
    });
    const target = document.getElementById(id);
    if (target) {
        target.classList.remove("hidden");
        target.classList.add("active");

        // ✅ 「占いをはじめる」ボタンを復元（戻ってきたとき）
        if (id === "screen-start") {
            const startBtn = document.getElementById("startBtn");
            startBtn?.classList.remove("hidden");
            startBtn?.classList.add("visible");
        }

        // ✅ 特別処理：spinner画面に戻ったらスピナー初期化
        if (id === "screen-spinner") {
            initSpinnerScreen(); // ← これを呼ばないとスピナーが出ない
            resetSpinnerState(); // これも必要（下記で定義）
        }

        // ✅ top: -10000px を強制リセット！
        target.style.position = "";
        target.style.top = "0px";
        console.log(`✅ showScreen: ${id} を表示しました`);
    } else {
        console.warn("⚠️ 該当画面が見つかりません:", id);
    }
    currentScreen = id;
    updateFooterButtons();
}

//❷スピナーが回っている初期画面
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
//スピナー初期化関数
function resetSpinnerState() {
    resultArray = "";
    clickCount = 0;
    alreadyClicked = false;
    isSpinning = true;

    const instructionText = document.getElementById("instructionText");
    if (instructionText) {
        instructionText.textContent = "こころに念じながら6回クリックしてください";
        instructionText.classList.remove("hidden");
        instructionText.classList.add("visible");

    }

    const spinnerEl = document.getElementById("mainSpinner");
    if (spinnerEl) {
        spinnerEl.style.transition = "";
        spinnerEl.style.transform = "scale(1)";
        spinnerEl.classList.remove("hidden", "inactive");
    }

    if (animation) {
        animation.stop();         // 念のため停止
        animation.play();         // ✅ スピナーを回す！
    }
    // ✅ スピナーのクリックイベントを再バインド（重要！）
    const spinnerWrapper = document.getElementById("spinner-anim-wrapper");
    if (spinnerWrapper) {
        spinnerWrapper.classList.remove("spinner-zoom-out"); // ✅ ズームアウト解除！
        spinnerWrapper.removeEventListener("click", handleSpinnerClick); // 念のため一度削除
        spinnerWrapper.addEventListener("click", handleSpinnerClick);
    }
}
//❸「占いをはじめる」ボタンをクリック
function init() {
    showScreenByIndex(0); // ← 状態も初期化
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

            // ✅ 明示的にDOMに対しても強制停止（CSS干渉回避）
            const spinnerVisual = document.getElementById("lottie-spinner");
            if (spinnerVisual) {
                spinnerVisual.style.animation = "none";
                spinnerVisual.style.transform = "none";
            }

            spinnerWrapper.classList.add("spinner-feedback");

            setTimeout(() => {
                spinnerWrapper.classList.remove("spinner-feedback");
            }, 1000); // ← CSSアニメ時間に合わせて900ms〜1s
        }
        showScreenByIndex(1); // ← 状態付きで spinner へ

        setTimeout(() => {
            instructionText?.classList.remove("hidden");
            instructionText?.classList.add("visible");

            spinnerWrapper.addEventListener("click", handleSpinnerClick);

        }, 100);
    });
}

//❹screen2: スピナーを６回クリックして本卦を出す
function handleSpinnerClick() {
    const currentScreen = document.querySelector(".screen.active")?.id;
    if (currentScreen !== "screen-spinner") return; // ✅ スピナー画面以外は無視

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

        // scale up/downのアニメーション
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

            spinnerEl.style.transition = "transform 1s ease";
            spinnerEl.style.transform = "scale(0)";

            // ✅ 本卵をセット
            originalHexagram = getHexagramByArray(resultArray);

            setTimeout(() => {
                showResultScreenWithTransition(); // アニメで切り替え
            }, 800);
        }
    }
}

//❺ screen3->4: 卦の結果表示に伴うスピナーズームアウト、結果のズームイン
function showResultScreenWithTransition() {
    const spinnerWrapper = document.getElementById("spinner-anim-wrapper");
    const resultScreen = document.getElementById("screen-result");
    const instructionText = document.getElementById("instructionText");
    const spinnerEl = document.getElementById("mainSpinner");

    // ✅ テキスト非表示をスピナーと同時に
    if (instructionText) {
        instructionText.classList.remove("visible");
        instructionText.classList.add("hidden");
    }
    // スピナーをズームアウト（アニメーション）
    spinnerWrapper.classList.add("spinner-zoom-out");

    // 600ms後に結果画面へ遷移＆本卦描画
    setTimeout(() => {
        // ✅ ここでスピナーのクリック無効化（完全に非表示にする）
        spinnerEl.classList.add("hidden", "inactive");
        showScreenByIndex(2);

        // ズームインエフェクト
        resultScreen.classList.add("result-zoom-in");
        void resultScreen.offsetWidth; // ← 再描画トリガー
        resultScreen.classList.add("result-zoom-in");

    }, 600);
}
// ❻卦の結果表示関数
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

//❼「今後の展開」などvariantボタン押下時のクリックしたときの処理
function handleVariantClick(key) {
    playSoundEffect("assets/sounds/click_button.mp3");
    console.log("🔁 handleVariantClick 実行", key);

    // ボタン群を削除
    const buttonContainer = document.getElementById("variant-buttons");
    if (buttonContainer) buttonContainer.remove();

    const resultContainer = document.getElementById("result");

    // variant key → state key のマップ
    const stateKeyMap = {
        reverse: "result-reverse",
        sou: "result-sou",
        go: "result-go",
        "future-expansion": "result-henko"
    };
    const stateKey = stateKeyMap[key];

    //「今後の展開」ボタンを押したとき
    if (key === "future-expansion") {
        handleFutureExpansion(selectedHexagram);
        // → スピナー再初期化と変卦スピンの待機
        initSpinnerScreen(); // スピナーが再び表示されるように初期化
        startChangedHexagramSpin(selectedHexagram); // ← ここで変卦スピンのロジック開始
        return;
    }

    const variantHex = sixtyFourHexagrams.find(h => h.number === selectedHexagram[key]);

    if (!variantHex) {
        resultContainer.innerHTML = `<div class="error-message">該当する卦が見つかりません</div>`;
        return;
    }

    if (!shownVariantKeys.has(key)) {
        resultContainer.innerHTML = `<div class="waiting-message">占い結果を読み取っています...</div>`;
        updateResultLayout(); // ← waiting-message表示直後に追加
        setTimeout(() => {
            resultContainer.innerHTML = createHexagramHTML(variantHex) +
                `<button class="main-btn" onclick="renderHexagramResult()">本卦に戻る</button>`;
            shownVariantKeys.add(key);
            updateResultLayout(); // ← 卦を表示したあとにも追加
        }, 1000);
    } else {
        resultContainer.innerHTML = createHexagramHTML(variantHex) +
            `<button class="main-btn" onclick="renderHexagramResult()">本卦に戻る</button>`;
        updateResultLayout(); // ← 表示直後に追加
    }
}
//❽卦の結果表示
function renderHexagramResult() {
    const hexagram = getHexagramByArray(resultArray);
    if (!hexagram) {
        alert(`該当する卦が見つかりません（${resultArray}）`);
        return;
    }

    selectedHexagram = hexagram;
    originalHexagram = hexagram;

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
//❾音声効果
function playSoundEffect(src) {
    const audio = new Audio(src);
    audio.play();
}

//🔟waiting-message表示中のresultの仕様（fullscreen）
function updateResultLayout() {
    const result = document.getElementById("result");
    const waiting = result.querySelector(".waiting-message");

    if (waiting) {
        result.classList.add("fullscreen");
    } else {
        result.classList.remove("fullscreen");
    }
}

//🕚「今後の展開」ボタン→再スピナー表示(screen4)
function handleFutureExpansion(hexagram) {
    // ✅ 2回目：変卦を表示
    if (cachedChangedHexagram) {
        console.log("🔁 2回目の今後の展開：変卦キャッシュを直接表示");
        showCachedChangedHexagram(originalHexagram);
        return;
    }
    // ✅ 1回目のみ：スピナー画面へ
    document.getElementById("result").classList.add("result-zoom-out");

    setTimeout(() => {
        showScreen("screen-future");
        const spinnerEl = document.getElementById("mainSpinner");
        spinnerEl.classList.remove("hidden", "inactive"); // ✅ 再表示

        const spinnerWrapper = document.getElementById("spinner-anim-wrapper");
        spinnerWrapper.classList.remove("spinner-zoom-in");
        void spinnerWrapper.offsetWidth;
        spinnerWrapper.classList.add("spinner-zoom-in");

        const instruction = document.getElementById("futureInstruction");
        instruction.style.display = "block";
        instruction.classList.remove("visible");
        void instruction.offsetWidth;
        setTimeout(() => instruction.classList.add("visible"), 50);

        clickCount = 0;
        alreadyClicked = false;
        initSpinnerScreen(); // 任意のスピナー初期化関数

        startChangedHexagramSpin(hexagram);
    }, 300);
}

//12 変爻決定＆変卦へ遷移（スマホ：1クリックで完結）
function startChangedHexagramSpin(originalHexagram) {
    console.log("🌀 startChangedHexagramSpin 開始");

    const spinnerContainer = document.getElementById("mainSpinner");
    const spinnerWrapper = document.getElementById("spinner-anim-wrapper");
    const instructionText = document.getElementById("futureInstruction"); // ← 

    spinnerContainer.onclick = () => {
        animation.goToAndStop(animation.currentFrame, true);
        isSpinning = false;
        playSoundEffect("assets/sounds/click.mp3");

        const wrapper = document.getElementById("spinner-anim-wrapper");
        if (!wrapper) return;

        // ✅ フィードバック開始
        wrapper.classList.remove("spinner-feedback");
        void wrapper.offsetWidth; // 💡 再適用のための再描画トリガー
        wrapper.classList.add("spinner-feedback");

        // ✅ アニメーション終了時にクラス削除（保険）
        wrapper.addEventListener("animationend", () => {
            wrapper.classList.remove("spinner-feedback");
        }, { once: true });

        // ✅ iOS対策で振動も追加
        navigator.vibrate?.(100);

        // ✅ 3. 少し待ってからテキスト非表示＋ズームアウト
        setTimeout(() => {
            if (instructionText) {
                instructionText.classList.remove("visible");
                instructionText.classList.add("hidden");
            }
            spinnerWrapper.classList.remove("spinner-zoom-in");
            void spinnerWrapper.offsetWidth;
            spinnerWrapper.classList.add("spinner-zoom-out");

        }, 1000);

        // ✅ ズームアウト完了後にスピナー非表示（ここが重要！）
        setTimeout(() => {
            const spinnerEl = document.getElementById("mainSpinner");
            spinnerEl.classList.add("hidden", "inactive");
        }, 1600); // ← zoom-out 0.6s 

        // ✅ 4. 変爻の表示
        setTimeout(() => {
            cachedChangedLineIndex = Math.floor(Math.random() * 6);
            const changedArray = resultArray.split("").map((bit, i) =>
                i === cachedChangedLineIndex ? (bit === "0" ? "1" : "0") : bit
            );
            const changedHexagram = getHexagramByArray(changedArray.join(""));
            if (!changedHexagram) {
                console.error("変卦が見つかりません");
                return;
            }
            cachedChangedHexagram = changedHexagram;
            displayChangedLine(cachedChangedLineIndex, originalHexagram);
            setTimeout(() => {
                showScreen("screen-henko");
            }, 10);
        }, 1000);

        spinnerContainer.onclick = null;
    };
}

//13 変爻表示更新
function displayChangedLine(index, hexagram) {
    setTimeout(() => {
        console.log("🔁 displayChangedLine 実行");

        const yaoNames = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];
        const yaoText = hexagram.yao_descriptions?.[(index + 1).toString()] || "該当する爻辞が見つかりません。";
        const nameWithRuby = `<ruby>${hexagram.name}<rt>${hexagram.reading}</rt></ruby>`;
        const yaoName = yaoNames[index];
        const svgPath = `assets/images/hexagram_lines/${hexagram.number}_${index + 1}.svg`;
        const target = document.getElementById("changedLine");

        console.log("🧩 ボタンを追加する container:", target);
        target.innerHTML = `
            <div class="hexagram-title-henko">第${hexagram.number}卦：${nameWithRuby} の ${yaoName}（変爻）</div>   
            <div class="hexagram-svg">
                <img src="${svgPath}" alt="卦象" style="width: 80px; height: auto;">
            </div>
            <div class="description-text">${yaoText}</div>
        `;
        createFutureButton(index, target);
        target.classList.remove("result-zoom-in"); // 再適用のため一度外す
        void target.offsetWidth; // 再描画トリガ
        target.classList.add("result-zoom-in"); // ✅ ズームイン演出！
    }, 300);

}

//14 「長い目で見るとどうなるか？」ボタン（createFutureButton）の生成、押下と変卦の生成
function createFutureButton(index, container) {
    if (!container) {
        console.warn("⚠️ createFutureButton: container が null");
        return;
    }

    if (container.querySelector(".future-button")) {
        console.log("⏭ すでに future-button が存在します");
        return;
    }
    let button = container.querySelector(".future-button");

    button = document.createElement("button");
    button.textContent = "長い目で見るとどうなる？";
    button.classList.add("main-btn", "future-button");
    button.style.display = "block";
    button.style.margin = "20px auto";
    container.appendChild(button);
    console.log("✅ future-button を追加しました");

    button.onclick = () => {
        console.log("🟢 future-button が押されました");
        if (!originalHexagram || !cachedChangedHexagram) return;
        showCachedChangedHexagram(originalHexagram);
    };
}

// 15 共通：総合運と本卦に戻るボタンのイベントバインド
function bindFinalButtons() {
    document.getElementById("final-fortune-button")?.addEventListener("click", () => {
        showFinalFortuneScreenMobile();
    });
    document.getElementById("return-button")?.addEventListener("click", () => {
        renderHexagramResult(); // ← 本卦へ戻す
    });
}

// 16 変卦表示、今後の展開ボタンの2回目以降クリック処理
function showCachedChangedHexagram(originalHex) {
    console.log("📦 showCachedChangedHexagram: 呼び出されました");
    const resultContainer = document.getElementById("result");
    if (!cachedChangedHexagram || !resultContainer) return;

    resultContainer.innerHTML = createHexagramHTML(cachedChangedHexagram) + `
        <div class="final-buttons-wrapper">
            <button id="final-fortune-button">総合的な易断を見る</button>
            <button id="return-button" class="main-btn">本卦に戻る</button>
        </div>`;

    resultContainer.classList.remove("result-zoom-out");
    resultContainer.classList.add("result-zoom-in");
    resultContainer.style.opacity = "1";
    showScreen("screen-result");
    updateResultLayout();

    bindFinalButtons(); // ボタン再バインド
}

//17 最終的な易断の内容表示
function showFinalFortuneScreenMobile() {
    // 1. HTMLを生成して挿入
    const html = generateFortunesSummaryHTML();
    const target = document.getElementById("finalFortune");

    if (!target) {
        console.warn("⚠️ #final-fortune-wrapper が見つかりませんでした");
        return;
    }
    // 内容セット
    target.innerHTML = html;

    // 2. スクリーン切り替え
    showScreen("screen-final");
    document.body.style.overflow = 'hidden'; // confetti中はスクロール抑制

    // 3. confetti を先に再生
    playConfettiAnimation();

    // 4. 少し遅れてwrapperを表示（本文 + note + CTAはこの中にある）
    setTimeout(() => {
        document.getElementById("final-fortune-wrapper")?.classList.remove("invisible");
    }, 500);

    // 5. CTA（ボタン）はさらに遅れて表示
    setTimeout(() => {
        document.querySelector(".final-fortune-note")?.classList.remove("invisible");
        document.getElementById("final-cta")?.classList.remove("invisible");
        setupMobileFinalCTAEvents();
    }, 1200);
}

//18総合的な易断のコンテンツ
function generateFortunesSummaryHTML() {
    const reverseHexagram = sixtyFourHexagrams.find(h => h.number === originalHexagram.reverse);
    const souHexagram = sixtyFourHexagrams.find(h => h.number === originalHexagram.sou);
    const goHexagram = sixtyFourHexagrams.find(h => h.number === originalHexagram.go);

    const yaoText = originalHexagram.yao_descriptions?.[(cachedChangedLineIndex + 1).toString()] || "該当する爻辞が見つかりません";
    const yaoName = ["初", "二", "三", "四", "五", "上"][cachedChangedLineIndex];

    const originalName = `<ruby>${originalHexagram.name}<rt>${originalHexagram.reading}</rt></ruby>`;
    const changedName = `<ruby>${cachedChangedHexagram.name}<rt>${cachedChangedHexagram.reading}</rt></ruby>`;
    const reverseName = reverseHexagram ? `<ruby>${reverseHexagram.name}<rt>${reverseHexagram.reading}</rt></ruby>` : "不明";
    const souName = souHexagram ? `<ruby>${souHexagram.name}<rt>${souHexagram.reading}</rt></ruby>` : "不明";
    const goName = goHexagram ? `<ruby>${goHexagram.name}<rt>${goHexagram.reading}</rt></ruby>` : "不明";

    return `
        <div class="fortune-summary">
            <h3>🔮 総合的な易断</h3>
            <p>今のあなたの状況は、本卦である「<strong>${originalName}</strong>（${originalHexagram.summary}）」に示されています。<strong>${originalHexagram.description}</strong></p>
            <p>とくに注目すべきは <strong>${yaoName}爻</strong> の変化であり、</p>
            <p>この爻辞である「<strong>${yaoText}</strong>」があなたの今後の行動の鍵です。</p>
            <p>この変化により、中長期的に状況は「<strong>${changedName}</strong> (${cachedChangedHexagram.summary})」へと展開していきます。</p>
            <hr>
            <p>この本卦に隠されている裏の意味は「<strong>${reverseName}</strong> (${reverseHexagram?.summary || "不明"})」です。</p>
            <p>状況を俯瞰すると「<strong>${souName}</strong> (${souHexagram?.summary || "不明"})」となります。</p>
            <p>そもそも本質は「<strong>${goName}</strong> (${goHexagram?.summary || "不明"})」です。</p>
        </div>
          
    `;
}

//19 ctaボタン表示関数（有料版へ、新しい占いへ）
function setupMobileFinalCTAEvents() {
    const resetBtn = document.getElementById("reset-button");
    const purchaseBtn = document.getElementById("purchase-button");

    if (!resetBtn || !purchaseBtn) {
        console.warn("CTAボタンが見つかりませんでした");
        return;
    }

    resetBtn.addEventListener("click", () => {
        playSoundEffect("assets/sounds/click_reset.mp3");
        window.location.href = "index-mobile.html";
    });

    purchaseBtn.addEventListener("click", () => {
        playSoundEffect("assets/sounds/click_button.mp3");
        handleLoginRequiredAction(() => {
            window.location.href = "https://yichingapp-a5f90.web.app/index.html";
        });
    });
}

//20 confettiアニメーション
function playConfettiAnimation() {
    const container = document.getElementById("confetti-lottie");
    if (!container) return;

    lottie.loadAnimation({
        container,
        renderer: "svg",
        loop: false,
        autoplay: true,
        path: "assets/animations/confetti.json"
    });
}

// フッター
// 🔽 フッターボタン取得
const btnBack = document.getElementById("btn-back");
const btnNext = document.getElementById("btn-next");
const btnReset = document.getElementById("btn-home");
const btnContact = document.getElementById("btn-contact");

// 🔽 左半分フッターイベント定義（btnBackとbtnNext）
//✅ ステップ1 論理状態の一覧
const screenStates = [
    "start",           // 0: 占い開始ボタン
    "spinner",         // 1: 6回クリック
    "result-main",     // 2: 本卦
    "result-reverse",  // 3: 裏卦
    "result-sou",      // 4: 総卦
    "result-go",       // 5: 互卦
    "future",          // 6: 今後の展開（最後の1回クリック）
    "henko",           // 7: 変爻（1本の変化）
    "result-henko",    // 8: 変卦（変化後の全体卦）
    "final"            // 9: 総合的な易断
];
//✅ ステップ2：状態変数
let currentScreenIndex = 0;
let maxVisitedScreenIndex = 0;

//✅ ステップ3：表示処理の統合関数
function showScreenByIndex(index) {
    const state = screenStates[index];
    currentScreenIndex = index;
    maxVisitedScreenIndex = Math.max(maxVisitedScreenIndex, index);

    if (state.startsWith("result")) {
        showScreen("screen-result");
        renderResultContent(state);
    } else {
        showScreen("screen-" + state);
    }

    updateFooterButtons();
}

//✅ ステップ4：各result状態の描画切替
function renderResultContent(state) {
    switch (state) {
        case "result-main":
            renderMainHexagram(); break;
        case "result-reverse":
            renderReverseHexagram(); break;
        case "result-sou":
            renderSouHexagram(); break;
        case "result-go":
            renderGoHexagram(); break;
        case "result-henko":
            renderChangedHexagram(); break;
    }
}
// ✅ 本卦の描画（"result-main" 用）
function renderMainHexagram() {
    renderHexagramResult(); // ← あなたが作った本卦描画関数
}
//✅ 裏卦：
function renderReverseHexagram() {
    const reverseHex = getReverseHexagram(originalHexagram);
    selectedHexagram = reverseHex;
    document.getElementById("result").innerHTML = createHexagramHTML(reverseHex);
}
//✅ 総卦（客観的に見ると）：
function renderSouHexagram() {
    const souHex = getSouHexagram(originalHexagram);
    selectedHexagram = souHex;
    document.getElementById("result").innerHTML = createHexagramHTML(souHex);
}
//✅ 互卦（本質）：
function renderGoHexagram() {
    const goHex = getGoHexagram(originalHexagram);
    selectedHexagram = goHex;
    document.getElementById("result").innerHTML = createHexagramHTML(goHex);
}
//✅ 変卦（変爻の結果）：
function renderChangedHexagram() {
    if (!cachedChangedHexagram) return;
    selectedHexagram = cachedChangedHexagram;
    document.getElementById("result").innerHTML = createHexagramHTML(cachedChangedHexagram);
}


//✅ ステップ5：戻る・進むボタン制御（btnBack / btnNext）
btnBack.addEventListener("click", () => {
    // ✅ variant表示中なら個別に制御
    if (currentScreenIndex === 2 && shownVariantKeys.size > 0) {
        // 🟣 変卦だけは screen-henko に戻す
        if (shownVariantKeys.has("result-henko")) {
            showScreenByIndex(7); // screenStates[7] = "henko"
        } else {
            renderMainHexagram(); // 他は本卦に戻す
        }
        shownVariantKeys.clear(); // variant状態をリセット
        return;
    }

    // 通常の戻る処理
    if (currentScreenIndex > 0) {
        showScreenByIndex(currentScreenIndex - 1);
    }
});

btnNext?.addEventListener("click", () => {
    if (currentScreenIndex < maxVisitedScreenIndex) {
        showScreenByIndex(currentScreenIndex + 1);
    }
});

//戻る、進むボタンのアップデート
function updateFooterButtons() {
    // 「戻る」ボタンは start（0番目）以外のときに有効
    btnBack.disabled = currentScreenIndex <= 0;
    // 「進む」ボタンは一度でも訪れた先までしか進めない
    btnNext.disabled = currentScreenIndex >= maxVisitedScreenIndex;
}


// 🔽 右半分フッターイベント定義（btnResetとbtnContact）
btnReset?.addEventListener("click", () => {
    location.reload();
});
btnContact?.addEventListener("click", () => {
    window.location.href = "feedback.html";
});


// 🔽 初期化処理
document.addEventListener("DOMContentLoaded", init);