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
let cachedHenkoHexagram = null;//長い目で見るとボタンで得た変卦表示

//スピナークリックのラッパー
function handleSpinnerClickWrapper(e) {
    handleSpinnerClick(e);
}

//❶指定された id を持つ画面（section）だけを表示し、それ以外はすべて非表示
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
//❸「占いをはじめる」ボタンをクリック
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

//❹screen2: スピナーを６回クリックして本卦を出す
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

            setTimeout(() => {
                instructionText.classList.add("hidden");
            }, 900); // 0.6秒後に

            spinnerEl.style.transition = "transform 1s ease";
            spinnerEl.style.transform = "scale(0)";

            // ✅ 本卦をセット
            originalHexagram = getHexagramByArray(resultArray);

            setTimeout(() => {
                showScreen("screen-result");
                renderHexagramResult();
                showResultScreenWithTransition(); // アニメで切り替え
            }, 1400);
        }
    }
}
//❺ screen3->4: 卦の結果表示に伴うスピナーズームアウト、結果のズームイン
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

//❼ボタン押下時のクリックしたときの処理
function handleVariantClick(key) {
    playSoundEffect("assets/sounds/click_button.mp3");
    console.log("🔁 handleVariantClick 実行", key);

    // ボタン群を削除
    const buttonContainer = document.getElementById("variant-buttons");
    if (buttonContainer) buttonContainer.remove();

    const resultContainer = document.getElementById("result");

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

//🔟waiting-message表示中のresultの仕様（画面一杯に）
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
    // ✅ 2回目以降ならスピナーを表示せず、変卦を即表示
    if (cachedHenkoHexagram) {
        console.log("🔁 2回目の今後の展開：変卦キャッシュを直接表示");
        showCachedChangedHexagram(originalHexagram);
        return;
    }

    // ✅ 以下は1回目のみ（スピナーを挟む）
    const result = document.getElementById("result");
    const screenResult = document.getElementById("screen-result");
    const screenFuture = document.getElementById("screen-future");
    const spinnerWrapper = document.getElementById("spinner-anim-wrapper");
    const instruction = document.getElementById("futureInstruction");

    result.classList.add("result-zoom-out");

    setTimeout(() => {
        screenResult.classList.add("hidden");
        screenResult.style.position = "absolute";
        screenResult.style.top = "-10000px";

        screenFuture.classList.remove("hidden");
        screenFuture.classList.add("active");

        spinnerWrapper.classList.remove("spinner-zoom-in");
        void spinnerWrapper.offsetWidth;
        spinnerWrapper.classList.add("spinner-zoom-in");

        instruction.style.display = "block";
        instruction.style.opacity = "";
        instruction.classList.remove("visible");
        void instruction.offsetWidth;

        setTimeout(() => {
            instruction.classList.add("visible");
        }, 50);

        clickCount = 0;
        alreadyClicked = false;
        initSpinnerScreen();

        startChangedHexagramSpin(hexagram);
    }, 300);
}


//12 変爻決定＆変卦へ遷移（スマホ：1クリックで完結）
function startChangedHexagramSpin(originalHexagram) {
    console.log("🌀 startChangedHexagramSpin 開始");

    const spinnerContainer = document.getElementById("mainSpinner");
    const spinnerWrapper = document.getElementById("spinner-anim-wrapper"); // ← 追加

    spinnerContainer.onclick = () => {
        // 1. スピナー停止
        animation.goToAndStop(animation.currentFrame, true);
        isSpinning = false;
        playSoundEffect("assets/sounds/click.mp3");

        // 2. スピナーをズームアウト
        setTimeout(() => {
            spinnerWrapper.classList.remove("spinner-zoom-in");
            void spinnerWrapper.offsetWidth;
            spinnerWrapper.classList.add("spinner-zoom-out");
        }, 200);

        // 3. 変爻を決定し、画面遷移
        setTimeout(() => {
            cachedChangedLineIndex = Math.floor(Math.random() * 6);
            const changedArray = resultArray.split("").map((bit, i) =>
                i === cachedChangedLineIndex ? (bit === "0" ? "1" : "0") : bit
            );
            const changedArrayString = changedArray.join("");
            const changedHexagram = getHexagramByArray(changedArrayString);

            if (!changedHexagram) {
                console.error("変卦が見つかりません: ", changedArrayString);
                return;
            }
            cachedChangedHexagram = changedHexagram;
            cachedHenkoHexagram = changedHexagram;        // ✅ モバイル用変数にもキャッシュ！

            showScreen("screen-henko");
            displayChangedLine(cachedChangedLineIndex, selectedHexagram);
        }, 1000); // ← アニメが0.6sならこれぐらいでOK

        spinnerContainer.onclick = null;
    };
}

//14 変爻表示更新
function displayChangedLine(index, hexagram) {
    const yaoNames = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];

    setTimeout(() => {
        console.log("🔁 displayChangedLine 実行");
        const yaoText = hexagram.yao_descriptions?.[(index + 1).toString()] || "該当する爻辞が見つかりません。";
        const nameWithRuby = `<ruby>${hexagram.name}<rt>${hexagram.reading}</rt></ruby>`;
        const yaoName = yaoNames[index];
        const title = `第${hexagram.number}卦：${nameWithRuby} の ${yaoName}`;
        const svgPath = `assets/images/hexagram_lines/${hexagram.number}_${index + 1}.svg`;
        const target = document.getElementById("changedLine");
        target.innerHTML = `
            <div class="hexagram-title-henko">${title}</div>   
            <div class="hexagram-svg">
                <img src="${svgPath}" alt="卦象" style="width: 80px; height: auto;">
            </div>
             <div class="description-text">${yaoText}</div>
        `;
        createFutureButton(index, target); // ✅ ボタン生成
    }, 1500);
}

//15 「長い目で見るとどうなるか？」ボタン（createFutureButton）の生成、押下と変卦の生成
function createFutureButton(index, container) {
    if (!container) return;

    const button = document.createElement("button");
    button.textContent = "長い目で見るとどうなる？";
    button.classList.add("main-btn", "future-button");
    button.style.display = "block";
    button.style.margin = "20px auto";

    button.onclick = () => {
        const resultContainer = document.getElementById("result");
        if (!resultContainer) return;

        // ✅ 常にキャッシュされた変卦を表示（分岐しない）
        console.log("📌 長い目ボタン：変卦キャッシュを表示します");
        showCachedChangedHexagram(originalHexagram);
    };

    if (!container.querySelector(".future-button")) {
        container.appendChild(button);
    }
}

// 🔗 共通：総合運と本卦に戻るボタンのイベントバインド
function bindFinalButtons() {
    document.getElementById("final-fortune-button")?.addEventListener("click", () => {
        showFinalFortuneScreenMobile();
    });
    document.getElementById("return-button")?.addEventListener("click", () => {
        renderHexagramResult();
    });
}

// ✅ 今後の展開ボタンの2回目以降クリック処理
function showCachedChangedHexagram(originalHex) {
    console.log("📦 showCachedChangedHexagram: 呼び出されました");
    const resultContainer = document.getElementById("result");

    if (cachedHenkoHexagram && resultContainer) {
        resultContainer.innerHTML = createHexagramHTML(cachedHenkoHexagram) + `
            <div class="final-buttons-wrapper">
                <button id="final-fortune-button">総合的な易断を見る</button>
                <button id="return-button" class="main-btn">本卦に戻る</button>
            </div>`;

        resultContainer.classList.remove("result-zoom-out");
        resultContainer.classList.add("result-zoom-in");
        showScreen("screen-result");
        updateResultLayout();

        const finalFortuneBtn = document.getElementById("final-fortune-button");
        const returnBtn = document.getElementById("return-button");

        if (finalFortuneBtn) {
            finalFortuneBtn.addEventListener("click", () => {
                showFinalFortuneScreenMobile();
            });
        }
        if (returnBtn) {
            returnBtn.addEventListener("click", () => {
                renderHexagramResult();
            });
        }
    } else {
        console.warn("cachedHenkoHexagram is null または resultContainer が null");

        if (resultContainer) {
            resultContainer.innerHTML = `<div class="error-message">変卦データが存在しません。最初からやり直してください。</div>`;
        }
    }
}

//16 最終的な易断の内容表示
function showFinalFortuneScreenMobile() {
    // 1. HTMLを生成して挿入
    const html = generateFortunesSummaryHTML();
    const target = document.getElementById("finalFortune");
    target.innerHTML = html;

    const wrapper = document.getElementById("final-fortune-wrapper");
    if (!wrapper) {
        console.warn("⚠️ #final-fortune-wrapper が見つかりませんでした");
        return;
    }

    // 2. スクリーン切り替え
    showScreen("screen-final");
    document.body.style.overflow = 'hidden'; // confetti中はスクロール抑制

    // 3. confetti を先に再生
    playConfettiAnimation();

    // 4. 少し遅れて易断内容をズーム表示
    setTimeout(() => {
        wrapper.classList.remove("hidden");
        wrapper.classList.add("show"); // ←アニメーション発火
    }, 500);

    // 5. CTA（ボタン）はさらに遅れて表示
    setTimeout(() => {
        insertMobileFinalCTAs();
        document.body.style.overflow = 'auto'; // スクロール復活
    }, 1200);
}


//総合的な易断のコンテンツ
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
    < id="final-fortune-wrapper" class="final-fortune hidden">
    <div id="confetti-lottie"></div>
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
              <div class="final-fortune-note">
                    易は自分との対話です。<br>
                    象徴を自由で大胆に自分のケースに当てはめて人生に道標にしてください。<br>
                    個別の占いたい内容についてAI易経助言（300円）もご提供しています。
                </div>
    `;
}

//ctaボタン表示関数（有料版へ、新しい占いへ）
function insertMobileFinalCTAs() {
    const container = document.getElementById("finalFortune");

    const cta = document.createElement("div");
    cta.className = "cta-buttons";
    cta.innerHTML = `
   
        <button id="purchase-button" class="final-fortune-button">有料版の占いへ</button>
        <button id="reset-button" class="main-btn">新しく占う</button>
    `;
    container.appendChild(cta);

    document.getElementById("reset-button").addEventListener("click", () => {
        playSoundEffect("assets/sounds/click_reset.mp3");
        window.location.href = "index-mobile.html"; // ← または画面初期化処理
    });

    document.getElementById("purchase-button").addEventListener("click", () => {
        playSoundEffect("assets/sounds/click_button.mp3");
        handleLoginRequiredAction(() => {
            window.location.href = "https://yichingapp-a5f90.web.app/index.html";
        });
    });
}

//confettiアニメーション
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
    window.location.href = "feedback.html";
});

function updateFooterButtons() {
    btnBack.disabled = (currentScreen === "screen-start" || currentScreen === "screen-instruction");
    btnNext.disabled = !(currentScreen === "screen-result" || currentScreen === "screen-future");
}

document.addEventListener("DOMContentLoaded", init);