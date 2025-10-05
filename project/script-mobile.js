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
let suppressLottiePlay = false; // グローバルに宣言
let snapshotArrayForHenko = "";
let lastScrollTop = 0;
let isFooterScrollListenerSet = false;
let appPhase = 'casting'; // 'casting' | 'result' | 'expansion'
let fingerAnim = null;
let didFirstTap = false;

//スピナークリックのラッパー
function handleSpinnerClickWrapper(e) {
    handleSpinnerClick(e);
}

//❶指定されたidを持つ画面（section）だけを表示し、それ以外はすべて非表示
function showScreen(id) {
    console.log("✅ showScreen:", id);
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
        // ✅ 今後の展開のスピナー（1回クリック）に戻ったとき ← ここを追加
        if (id === "screen-future") {
            resetSpinnerState();
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
    lottieEl.innerHTML = ""; // ✅ SVG内容をリセット

    animation = lottie.loadAnimation({
        container: lottieEl,
        renderer: "svg",
        loop: true,
        autoplay: false,
        path: "./assets/animations/spinner.json"
    });

    animation.addEventListener("DOMLoaded", () => {
        console.log("✅ Lottie DOMLoaded → 再生開始");
        if (!suppressLottiePlay) animation.play();
        else console.log("⛔ Lottie play 抑止中");
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
    resetHexagramStack()

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

//-------指操作
const FINGER_JSON = 'assets/animations/finger.json';

//なければ#tap-helperを作る
function getTapHelper() {
    let el = document.getElementById('tap-helper');
    if (!el) {
        el = document.createElement('div');
        el.id = 'tap-helper';
        el.setAttribute('aria-hidden', 'true');
        const box = document.createElement('div');
        box.id = 'finger-lottie';
        box.className = 'finger-lottie';
        el.appendChild(box);
        document.body.appendChild(el);
    }
    return el;
}
//指タップ用の Lottie コンテナがサイズ 0 で見えなくなる事故を防ぐ保険
function ensureFingerSized() {
    const box = document.getElementById('finger-lottie');
    if (!box) return;
    // 念のためサイズ明示（CSSが壊れても出るよう保険）
    box.style.width = box.style.width || '140px';
    box.style.height = box.style.height || '140px';
    const svg = box.querySelector('svg');
    if (svg) {
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.display = 'block';
    }
}
//指タップを出す関数
function showTapHelper() {
    const helper = getTapHelper();
    const box = helper.querySelector('#finger-lottie');

    // 競合クラスの掃除（念のため）
    helper.classList.remove('hidden', 'vanish');

    // Lottieを一度だけ初期化
    if (window.lottie && !fingerAnim) {
        fingerAnim = lottie.loadAnimation({
            container: box,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: FINGER_JSON
        });
        fingerAnim.addEventListener('DOMLoaded', ensureFingerSized);
    } else {
        fingerAnim?.play();
        ensureFingerSized();
    }

    helper.classList.add('visible');   // ← これだけで表示
}
//指タップを隠す関数
function hideTapHelper() {
    const helper = document.getElementById('tap-helper');
    console.log('[tap] hide called', helper?.className);
    if (!helper) return;
    helper.classList.remove('visible'); // ← これだけで非表示
    fingerAnim?.pause();                // 再表示時に再生される
}

// ▼ 開始ボタン → スピナー画面に遷移するところで呼ぶ
document.getElementById('startBtn')?.addEventListener('click', () => {
    document.getElementById('screen-start')?.classList.add('hidden');
    document.getElementById('screen-spinner')?.classList.remove('hidden');

    didFirstTap = false;
});

//❹screen2: スピナーを６回クリックして本卦を出す
function handleSpinnerClick() {
    const currentScreen = document.querySelector(".screen.active")?.id;
    if (currentScreen !== "screen-spinner") return; // スピナー画面以外は無視
    if (alreadyClicked || !animation) return;

    const spinnerEl = document.getElementById("mainSpinner");

    // 初回クリック → ガイド文を非表示に
    if (clickCount === 0) {
        const startInstruction = document.getElementById("startInstruction");
        startInstruction?.classList.replace("visible", "hidden");
    }

    // スピン開始
    if (!isSpinning) {
        animation.play();
        isSpinning = true;
        return;
    }

    // === スピン停止（結果確定） ===
    isSpinning = false;
    const currentFrame = animation.currentFrame;
    animation.goToAndStop(currentFrame, true);

    // スピナーのフィードバック演出
    const spinnerFeedbackWrapper = document.getElementById("spinner-anim-wrapper");
    if (spinnerFeedbackWrapper) {
        spinnerFeedbackWrapper.classList.add("spinner-feedback");
        spinnerFeedbackWrapper.addEventListener(
            "animationend",
            () => spinnerFeedbackWrapper.classList.remove("spinner-feedback"),
            { once: true }
        );
    }

    navigator.vibrate?.(100);
    playSoundEffect("./assets/sounds/click.mp3");

    // 陰陽決定
    const yinYang = Math.random() < 0.5 ? "0" : "1";
    resultArray += yinYang;
    clickCount++;

    //爻を積み上げる
    addHexLineToSlot(yinYang, clickCount);

    // ガイド文更新（クリック数に応じて）
    showGuideForClick(clickCount);

    // 爻メッセージ更新
    const labels = ["初", "二", "三", "四", "五", "上"];
    const label = labels[clickCount - 1] || `${clickCount}`;
    const yy =
        yinYang === "0"
            ? '<span class="yy yin">陰</span>'
            : '<span class="yy yang">陽</span>';
    updateInstruction(`${label}爻は${yy}です`);

    // ------------------------
    // 6本揃ったら結果画面へ
    // ------------------------
    if (clickCount >= 6) {
        alreadyClicked = true;
        spinnerEl.removeEventListener("click", handleSpinnerClick);

        // 本卦をセット
        originalHexagram = getHexagramByArray(resultArray);

        // 「やった！」を少し見せるタメの時間
        const SIXTH_HOLD_MS = 1000;     // ← ここで調整
        const SPINNER_SHRINK_MS = 1000; // スピナー縮小時間（CSSと揃える）

        // 少し待ってからスピナー縮小開始
        setTimeout(() => {
            spinnerEl.style.transition = `transform ${SPINNER_SHRINK_MS}ms ease`;
            spinnerEl.style.transform = "scale(0)";

            // 縮小が終わったら結果画面へ
            setTimeout(() => {
                showResultScreenWithTransition();
            }, SPINNER_SHRINK_MS);
        }, SIXTH_HOLD_MS);
    }
}

// --- 爻の結果（テキスト）のスライド演出
function updateInstruction(html) {
    const el = document.getElementById('koResult');
    if (!el) return;

    // 必要クラスを常に維持（念のため）
    el.classList.add('ko-result', 'line');

    // すでに表示中なら一度「左へアウト」→ 終わったら入れ替え → 右からイン
    if (el.classList.contains('show')) {
        el.classList.add('hide');          // 左へ
        el.addEventListener('transitionend', () => {
            el.classList.remove('show', 'hide');
            el.innerHTML = html;             // ★ HTML を入れる（色付きspanを有効に）
            // Reflow でリセットしてから右からイン
            void el.offsetWidth;
            el.classList.add('show');
        }, { once: true });
    } else {
        // 初回：そのまま右からイン
        el.innerHTML = html;               // ★ HTML を入れる
        el.classList.remove('hide');
        void el.offsetWidth;               // Reflow
        el.classList.add('show');
    }
}

// --- ガイド文のスライド演出（競合対策版）
function showGuideForClick(count) {
    const el = document.getElementById("instructionText");
    if (!el) return;

    const messages = {
        1: "その調子！またポツポツっとな",
        2: "二爻まで出たね。あと４回",
        3: "あと３回だよ",
        4: "あと２回！",
        5: "あと１回で卦が出るよ！",
        6: "やった！"
    };
    const msg = messages[count];
    if (!msg) return;

    // 6回目は即「やった！」を固定表示
    if (count === 6) {
        const DELAY_MS = 500; // ← 好きな遅延時間（ms）
        setTimeout(() => {
            el.classList.remove("hide", "show");
            el.textContent = msg;
            void el.offsetWidth;
            el.classList.add("show", "locked");
            el._locked = true;
        }, DELAY_MS);
        return;
    }

    if (el._locked) return; // 以後変更禁止

    el.classList.add("instruction", "tip", "line");
    clearTimeout(el._guideTimer);

    if (el._exiting) {
        el._pendingMsg = msg;
        el._pendingCount = count;
        return;
    }

    el._guideTimer = setTimeout(() => {
        if (el.classList.contains("show")) {
            el._exiting = true;
            el._pendingMsg = msg;
            el._pendingCount = count;

            el.classList.remove("show");
            void el.offsetWidth;
            el.classList.add("hide");

            el.addEventListener("transitionend", () => {
                el.classList.remove("hide");
                const nextMsg = el._pendingMsg ?? msg;
                el.textContent = nextMsg;
                void el.offsetWidth;
                el.classList.add("show");

                el._exiting = false;
                el._pendingMsg = undefined;
                el._pendingCount = undefined;
            }, { once: true });

        } else {
            el.classList.remove("hide", "show", "locked");
            el.textContent = msg;
            void el.offsetWidth;
            el.classList.add("show");
        }
    }, 300);
}

// 陰陽の爻（Svg）の積み上げ
const SVG_YIN = 'assets/images/yin.svg';
const SVG_YANG = 'assets/images/yang.svg';

/**
 * 六爻のスロットに陰陽SVGを追加する
 * @param {string} yinYang - '0' = 陰, '1' = 陽
 * @param {number} count   - 爻の順序（1〜6）下から上へ
 */
function addHexLineToSlot(yinYang, count) {
    const wrap = document.getElementById('hexagram-build');
    if (!wrap) return;

    // まず既存の「赤い」爻をすべて黒に戻す
    const prevActive = wrap.querySelectorAll('.hex-line.active');
    prevActive.forEach(el => el.classList.remove('active'));

    // count（1..6）に対応するスロットを探す
    const slot = wrap.querySelector(`.hex-slot[data-line="${count}"]`);
    if (!slot) return;

    // 古い要素をリセット（再占時にも安全）
    slot.innerHTML = '';

    // SVG画像を生成
    const img = document.createElement('img');
    img.src = yinYang === '0' ? SVG_YIN : SVG_YANG;
    img.alt = yinYang === '0' ? '陰' : '陽';
    img.className = 'hex-line active'; // 新しい爻は赤

    // スロットへ追加
    slot.appendChild(img);
}

//爻の積み上げのリセット
function resetHexagramStack() {
    const wrap = document.getElementById('hexagram-build');
    if (!wrap) return;
    wrap.querySelectorAll('.hex-slot').forEach(s => s.innerHTML = '');
}

//❺ screen3->4: 卦の結果表示に伴うスピナーズームアウト、結果のズームイン
function showResultScreenWithTransition() {
    const spinnerWrapper = document.getElementById("spinner-anim-wrapper");
    const resultScreen = document.getElementById("screen-result");
    const spinnerEl = document.getElementById("mainSpinner");
    const guide = document.getElementById("instructionText");

    // ✅ 「やった！」もスピナーと同時に退場
    if (guide && guide.classList.contains("locked")) {
        guide.classList.remove("show");
        guide.classList.add("hide");
    }

    // スピナーをズームアウト
    spinnerWrapper.classList.add("spinner-zoom-out");

    setTimeout(() => {
        spinnerEl.classList.add("hidden", "inactive");
        showScreenByIndex(2);

        resultScreen.classList.add("result-zoom-in");
        void resultScreen.offsetWidth;
        resultScreen.classList.add("result-zoom-in");
    }, 600);
}

// ❻卦の結果表示関数
function createHexagramHTML(hexagram) {
    const description = hexagram.description || "説明は準備中です";
    const formattedDescription = description.replace(/\n/g, "<br>");
    const nameWithRuby = `<ruby>${hexagram.name}<rt>${hexagram.reading}</rt></ruby>`;

    return `
      <div class="hexagram-title">第${hexagram.number}卦：<span>${nameWithRuby}</span></div>
      <div class="hexagram-reading" style="text-align: center;">${hexagram.composition}——${hexagram.summary}</div>

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
    playSoundEffect("/assets/sounds/click_button.mp3");
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
                `<button class="main-btn" onclick="renderMainHexagram()">本卦に戻る</button>`;
            shownVariantKeys.add(key);
            updateResultLayout(); // ← 卦を表示したあとにも追加
        }, 1000);
    } else {
        resultContainer.innerHTML = createHexagramHTML(variantHex) +
            `<button class="main-btn" onclick="renderMainHexagram()">本卦に戻る</button>`;
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

    // ✅ originalHexagram に一度だけ保存（すでにあるなら上書きしない）
    if (!originalHexagram) {
        originalHexagram = hexagram;
        console.log("📝 originalHexagram を保存しました:", originalHexagram);
    }
    selectedHexagram = hexagram;
    drawHexagramWithButtons(originalHexagram);
}

//卦の結果表示の補助関数（UI描画用）
function drawHexagramWithButtons(hexagram) {
    const resultContainer = document.getElementById("result");
    resultContainer.innerHTML = createHexagramHTML(hexagram) + `
        <div class="variant-buttons">
            <button class="variant-btn" data-key="future-expansion">今後の展開</button>
           <!--
        <button class="variant-btn" data-key="reverse">裏の意味</button>
        <button class="variant-btn" data-key="sou">客観的に運命を見ると</button>
        <button class="variant-btn" data-key="go">卦の本質は</button>
        -->
    `;
    document.querySelectorAll(".variant-btn").forEach((btn) => {
        const newBtn = btn.cloneNode(true); // ✅ 古いイベントを除去
        btn.replaceWith(newBtn);            // ✅ 差し替え

        newBtn.addEventListener("click", () => {
            const key = newBtn.dataset.key;
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

//11「今後の展開」ボタン→再スピナー表示(screen4)
function handleFutureExpansion(hexagram) {
    if (window._suppressFutureExpansion) {
        console.log("⛔ handleFutureExpansion キャンセル");
        return;
    }

    // ✅ 2回目：変卦を表示
    if (cachedChangedHexagram) {
        console.log("🔁 2回目の今後の展開：変卦キャッシュを直接表示");
        showCachedChangedHexagram(originalHexagram);
        return;
    }
    // ✅ 1回目のみ：スピナー画面へ
    const resultEl = document.getElementById("result");
    resultEl?.classList.add("result-zoom-out");
    // 🔒 resultArray を snapshot 保存しておく（リセット前）
    const snapshotArray = resultArray;
    snapshotArrayForHenko = resultArray;
    //スピナー状態リセット
    clickCount = 0;
    resultArray = "";
    alreadyClicked = false;

    setTimeout(() => {
        suppressLottiePlay = false; // ✅ Lottie再生を許可
        showScreenByIndex(6);
        // ✅ スピナー初期化
        initSpinnerScreen();

        // ✅ スピナー表示＆アニメーション復元
        const spinnerEl = document.getElementById("mainSpinner");
        spinnerEl.classList.remove("hidden", "inactive"); // ✅ 再表示
        spinnerEl.style.display = "block"; // 念のため

        const wrapper = document.getElementById("spinner-anim-wrapper");
        wrapper?.classList.remove("spinner-zoom-in");
        void wrapper?.offsetWidth;
        wrapper?.classList.add("spinner-zoom-in");

        // ✅ テキストアニメーション表示
        const instruction = document.getElementById("instructionText");
        if (instruction) {
            instruction.innerText = "最後に一度だけクリックしてください";
            instruction.style.display = "block";
            instruction.classList.remove("visible");
            void instruction.offsetWidth;
            setTimeout(() => instruction.classList.add("visible"), 50);
        } else {
            console.warn("⚠️ instructionText が見つかりません");
        }

        // ✅ スナップショットから変爻を計算（リセット前の結果を使う）
        startChangedHexagramSpin(hexagram, snapshotArray); // ← snapshot を渡す！
    }, 300);
}

//12 補助関数：変爻決定＆変卦へ遷移（スマホ：1クリックで完結）
function startChangedHexagramSpin(originalHexagram, array) {
    console.log("✅ startChangedHexagramSpin() が実行されました");

    const localArray = array; // ← ✅ これを使うことで後の再評価を防ぐ
    const spinnerContainer = document.getElementById("mainSpinner");
    const spinnerWrapper = document.getElementById("spinner-anim-wrapper");
    const instructionText = document.getElementById("futureInstruction");

    // ✅ 前回の onclick を明示的に削除（何度でも呼べるように）
    spinnerContainer.onclick = null;

    let hasSpun = false; // ✅ ローカルロック変数（1回だけ許可）

    spinnerContainer.onclick = () => {
        if (hasSpun) {
            console.warn("⚠️ すでに1回クリック済です");
            return;
        }
        hasSpun = true; // ✅ 最初にロックする

        if (isSpinning) return; // 念のための二重ガード（併用可）
        isSpinning = true;

        animation.goToAndStop(animation.currentFrame, true);
        playSoundEffect("/assets/sounds/click.mp3");

        // ✅ クリックのフィードバックアニメーション
        spinnerWrapper.classList.remove("spinner-feedback");
        void spinnerWrapper.offsetWidth;
        spinnerWrapper.classList.add("spinner-feedback");
        spinnerWrapper.addEventListener("animationend", () => {
            spinnerWrapper.classList.remove("spinner-feedback");
        }, { once: true });

        navigator.vibrate?.(100);

        setTimeout(() => {
            instructionText?.classList.remove("visible");
            instructionText?.classList.add("hidden");

            spinnerWrapper.classList.remove("spinner-zoom-in");
            void spinnerWrapper.offsetWidth;
            spinnerWrapper.classList.add("spinner-zoom-out");
        }, 1000);

        setTimeout(() => {
            spinnerContainer.classList.add("hidden", "inactive");
        }, 1600);

        // ✅ 🔁変爻の表示（array 引数使用！）
        setTimeout(() => {
            if (!localArray || localArray.length !== 6) {
                console.error("❌ 無効な resultArray:", localArray);
                return;
            }
            // ✅ 新しい変爻（毎回異なる）
            cachedChangedLineIndex = Math.floor(Math.random() * 6);
            const changedArray = localArray.split("").map((bit, i) =>
                i === cachedChangedLineIndex ? (bit === "0" ? "1" : "0") : bit
            );
            const changedKey = changedArray.join("");

            const changedHexagram = getHexagramByArray(changedKey);
            if (!changedHexagram) {
                console.error("変卦が見つかりません");
                return;
            }

            cachedChangedHexagram = changedHexagram;
            displayChangedLine(cachedChangedLineIndex, originalHexagram);
            setTimeout(() => {
                showScreenByIndex(7);
            }, 10);
        }, 1000);
        // ✅ 1回限りにする（再表示時は再バインドされる）
        spinnerContainer.onclick = null;
    };
}

//13 変爻表示更新
function displayChangedLine(index, hexagram) {
    const target = document.getElementById("changedLine");
    if (!target) return;

    // 再描画スキップガード（前回と同じなら表示しない）
    const newContentKey = `${hexagram.number}-${index}`;
    const previousContent = target.getAttribute("data-last-rendered");
    if (previousContent === newContentKey) {
        console.log("🔁 同じ変爻のため再描画スキップ");
        return;
    }
    target.setAttribute("data-last-rendered", newContentKey); // 記録更新

    const yaoNames = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];
    const yaoName = yaoNames[index];
    const yaoText = hexagram.yao_descriptions?.[(index + 1).toString()] || "該当する爻辞が見つかりません。";
    const nameWithRuby = `<ruby>${hexagram.name}<rt>${hexagram.reading}</rt></ruby>`;
    const svgPath = `assets/images/hexagram_lines/${hexagram.number}_${index + 1}.svg`;

    // HTML生成（事前に全て構成）
    const html = `
        <div class="hexagram-title-henko">第${hexagram.number}卦：${nameWithRuby} の ${yaoName}（変爻）</div>   
        <div class="hexagram-svg">
            <img src="${svgPath}" alt="卦象" style="width: 80px; height: auto;">
        </div>
        <div class="description-text">${yaoText}</div>
    `;

    // アニメーションのため一度クラス除去 → 再描画 → クラス再追加
    target.classList.remove("result-zoom-in");
    void target.offsetWidth;

    // innerHTML更新 & ボタン追加
    target.innerHTML = html;
    createFutureButton(index, target);

    // アニメーション適用
    target.classList.add("result-zoom-in");

    console.log("🔁 displayChangedLine 実行");
    console.log("🧩 ボタンを追加する container:", target);
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

//15 共通：総合運と本卦に戻るボタンのイベントバインド
function bindFinalButtons() {
    document.getElementById("final-fortune-button")?.addEventListener("click", () => {
        showFinalFortuneScreenMobile();
    });
    document.getElementById("return-button")?.addEventListener("click", () => {
        if (!originalHexagram || !originalHexagram.array) {
            alert("⚠️ 本卦の情報が見つかりません。最初からやり直してください。");
            return;
        }
        selectedHexagram = originalHexagram;
        drawHexagramWithButtons(originalHexagram);
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
    currentScreenIndex = 8;
    updateResultLayout();

    bindFinalButtons(); // ボタン再バインド
}

// 17 最終的な易断の内容表示（confetti の有無を切り替え可能）
function showFinalFortuneScreenMobile({ skipConfetti = false } = {}) {
    const html = generateFortunesSummaryHTML();
    const target = document.getElementById("finalFortune");

    if (!target) {
        console.warn("⚠️ #finalFortune が見つかりませんでした");
        return;
    }

    // 1. HTMLを生成して挿入
    target.innerHTML = html;

    // 2. スクリーン切り替え
    showScreenByIndex(9);
    document.body.style.overflow = 'hidden'; // scroll抑制

    // 3. confetti（必要なときのみ）
    if (!skipConfetti) {
        playConfettiAnimation();
    }

    // 4. フッター制御イベント（常に有効化）
    enableFooterScrollControl();

    // 5. wrapper・note・CTA を遅延または即時表示（confettiがあるときは遅らせる）
    const wrapperDelay = skipConfetti ? 0 : 500;
    const ctaDelay = skipConfetti ? 0 : 1200;

    setTimeout(() => {
        document.getElementById("final-fortune-wrapper")?.classList.remove("invisible");
    }, wrapperDelay);

    setTimeout(() => {
        document.querySelector(".final-fortune-note")?.classList.remove("invisible");
        document.getElementById("final-cta")?.classList.remove("invisible");
        setupMobileFinalCTAEvents();
    }, ctaDelay);
}

function resetOverflow() {
    document.body.style.overflow = "auto";
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
        playSoundEffect("/assets/sounds/click_reset.mp3");
        try {
            localStorage.removeItem("forcePC");
            sessionStorage.setItem("fromMobile", "true");
        } catch (e) { }
        window.location.replace("/index-mobile.html");
    });

    purchaseBtn.addEventListener("click", () => {
        playSoundEffect("/assets/sounds/click_button.mp3");
        try {
            localStorage.setItem("forcePC", "true"); // 次回以降もPC版固定
        } catch (e) { }
        window.location.replace("/pc/index.html");
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
        path: "/assets/animations/confetti.json"
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
    console.log('[showScreenByIndex] index=', index, screenStates[index]);
    const state = screenStates[index];
    currentScreenIndex = index;
    maxVisitedScreenIndex = Math.max(maxVisitedScreenIndex, index);

    // ✅ spinner再表示が必要な画面（1 or 6）
    if (index === 1 || index === 6) {
        suppressLottiePlay = false;
        initSpinnerScreen();

        const spinnerEl = document.getElementById("mainSpinner");
        if (spinnerEl) {
            spinnerEl.classList.remove("hidden", "inactive");
            spinnerEl.style.display = "block";
        }

        const spinnerWrapper = document.getElementById("spinner-anim-wrapper");
        if (spinnerWrapper) {
            spinnerWrapper.classList.remove("spinner-zoom-in");
            void spinnerWrapper.offsetWidth;
            spinnerWrapper.classList.add("spinner-zoom-in");
        }
    }

    // ✅ 通常の画面表示処理
    if (state.startsWith("result")) {
        showScreen("screen-result");
        renderResultContent(state);
    } else {
        showScreen("screen-" + state);
    }
    // 指タップの表示制御
    currentScreenIdx = index;
    // 指タップの表示制御
    switch (state) {
        case 'spinner':      // 本卦スピナー画面
        case 'future':       // 今後の展開スピナー画面
            console.log('[tap] show (state=' + state + ')');
            showTapHelper();
            break;

        case 'result':       // 結果画面
        case 'final':        // 最終画面
            console.log('[tap] hide (state=' + state + ')');
            hideTapHelper();
            break;

        default:
            console.log('[tap] hide immediate (state=' + state + ')');
            hideTapHelper({ immediate: true });
            break;
    }

    // ✅ フッターボタンの状態更新
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
    if (!originalHexagram || !originalHexagram.array) {
        alert("⚠️ 本卦情報が見つかりません。最初からやり直してください。");
        return;
    }
    selectedHexagram = originalHexagram;
    // ✅ アニメーション縮小状態が残っていたら解除
    const result = document.getElementById("result");
    result.classList.remove("result-zoom-out");
    drawHexagramWithButtons(originalHexagram);
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

    if (!originalHexagram && selectedHexagram) {
        originalHexagram = selectedHexagram;
        console.log("📝 originalHexagram を保存:", originalHexagram);
    }

    selectedHexagram = cachedChangedHexagram;

    const resultContainer = document.getElementById("result");
    resultContainer.innerHTML = createHexagramHTML(cachedChangedHexagram);

    // ✅ CTAを動的に追加
    const wrapper = document.createElement("div");
    wrapper.className = "final-buttons-wrapper";

    const cta = document.createElement("button");
    cta.id = "final-fortune-button";
    cta.className = "main-btn";
    cta.textContent = "総合的な易断を見る";
    cta.addEventListener("click", () => showScreenByIndex(9));

    const back = document.createElement("button");
    back.id = "return-button";
    back.className = "main-btn";
    back.textContent = "本卦に戻る";
    back.addEventListener("click", () => showScreenByIndex(2)); // 仮の戻り先

    wrapper.appendChild(cta);
    wrapper.appendChild(back);
    resultContainer.appendChild(wrapper);
}

// ✅ スピナーを非表示にするユーティリティ関数
function hideMobileSpinner() {
    const mainSpinner = document.getElementById("mainSpinner");
    const startSpinner = document.getElementById("startSpinner");

    if (mainSpinner) mainSpinner.style.display = "none";
    if (startSpinner) startSpinner.style.display = "none";
}

//✅ ステップ5：戻る・進むボタン制御（btnBack / btnNext）
suppressLottiePlay = true;
btnBack.addEventListener("click", () => {
    // ✅ 変卦variantから戻る場合 → 変爻画面へ
    if (currentScreenIndex === 2 && shownVariantKeys.size > 0) {
        // 🟣 変卦だけは screen-henko に戻す
        if (shownVariantKeys.has("result-henko")) {
            showScreenByIndex(7); // 変爻へ
        } else {
            renderMainHexagram(); // 他は本卦に戻す
        }
        shownVariantKeys.clear(); // variant状態をリセット
        return;
    }
    // ✅ screen-henko（変爻）から戻る → screen-future
    if (currentScreenIndex === 7) {
        console.log("⬅️ btnBack: screen-henko → screen-future に戻る");
        showScreenByIndex(6);
        // ✅ spinner 再初期化が必要！（ここが足りないとクリックできない）
        initSpinnerScreen(); // ← Lottie初期化

        const validArray = snapshotArrayForHenko && snapshotArrayForHenko.length === 6
            ? snapshotArrayForHenko
            : originalHexagram?.array || resultArray;

        startChangedHexagramSpin(originalHexagram, validArray);
    }

    // ✅ 「今後の展開（screen-future）」から戻る → 本卦
    if (currentScreenIndex === 6) {
        console.log("⬅️ btnBack: screen-future → screen-result に戻る");
        window._suppressFutureExpansion = true; // ✅ 抑止を一時的にON

        showScreenByIndex(2);
        renderMainHexagram();
        hideMobileSpinner();
        showTapHelper();

        // ✅ すぐ解除せず、UI描画後に解除（100ms後がベスト）
        setTimeout(() => {
            window._suppressFutureExpansion = false;
            console.log("🔓 suppress解除完了");
        }, 100);

        return;
    }
    // ✅ 変卦（screen-result）から戻る → 変爻（screen-henko）
    if (currentScreenIndex === 8) {
        console.log("⬅️ btnBack: screen-result → screen-henko に戻る");
        showScreenByIndex(7);
        const nextBtn = document.getElementById("btn-next");
        nextBtn.disabled = false;
        nextBtn.classList.remove("disabled");
        return;
    }
    // screen-final から screen-henko に戻った場合
    if (currentScreenIndex === 9 && shownVariantKeys.has("result-henko")) {
        showScreenByIndex(8); // 変卦へ戻る
        return;
    }

    // 通常の戻る処理
    if (currentScreenIndex > 0) {
        const prev = currentScreenIndex - 1;

        if (prev === 1) { // スピナー画面
            resetCastingState(); // 先に初期化
            resetHexagramStack();

            const guide = document.getElementById('instructionText');
            if (guide) {
                guide.classList.remove('show', 'hide', 'locked');
                guide._locked = false;
                guide.textContent = '';
            }
            // （必要なら）最初の説明を復活
            document.getElementById('startInstruction')
                ?.classList.replace('hidden', 'visible');
        }

        showScreenByIndex(prev); // そのあと画面遷移
        updateFooterButtons();
    }
});

btnNext?.addEventListener("click", () => {
    requestAnimationFrame(() => {
        const nextBtn = document.getElementById("btn-next");
        nextBtn.disabled = false;
        nextBtn.classList.remove("disabled");
    });

    if (shownVariantKeys.size > 0) return;

    // ✅ 本卦（screen 2）から進む場合
    if (currentScreenIndex === 2) {
        if (!cachedChangedHexagram) {
            // ✅ 初回：「今後の展開」 → スピナー
            console.log("➡️ btnNext: screen-result（本卦）→ screen-future（スピナー）");
            handleFutureExpansion(originalHexagram);
            return;
        } else {
            // ✅ 2回目以降：直接 変爻へ
            console.log("➡️ btnNext: screen-result（本卦）→ screen-henko（変爻）");

            if (!snapshotArrayForHenko || snapshotArrayForHenko.length !== 6) {
                console.error("❌ 無効な resultArray:", snapshotArrayForHenko);
                alert("変爻の計算に失敗しました。もう一度占ってください。");
                return;
            }

            if (typeof cachedChangedLineIndex !== "number") {
                console.error("❌ cachedChangedLineIndex が未定義です");
                alert("変爻の位置が不明です。もう一度占ってください。");
                return;
            }

            displayChangedLine(cachedChangedLineIndex, originalHexagram);
            showScreenByIndex(7);
            return;
        }
    }

    if (currentScreenIndex === 6 && cachedChangedHexagram) {
        if (!snapshotArrayForHenko || snapshotArrayForHenko.length !== 6) return;
        if (typeof cachedChangedLineIndex !== "number") return;
        displayChangedLine(cachedChangedLineIndex, originalHexagram);
        showScreenByIndex(7);
        return;
    }

    if (currentScreenIndex === 7) {
        showCachedChangedHexagram(originalHexagram);
        currentScreenIndex = 8;
        return;
    }

    if (currentScreenIndex === 8) {
        showFinalFortuneScreenMobile({ skipConfetti: true });
        return;
    }

    if (currentScreenIndex < maxVisitedScreenIndex) {
        showScreenByIndex(currentScreenIndex + 1);
    }
});

//戻る、進むボタンのアップデート
function updateFooterButtons() {
    // ✅ デバッグ用ログを最初に追加
    console.log("➡️ updateFooterButtons", {
        currentScreenIndex,
        maxVisitedScreenIndex,
        shouldDisableNext:
            currentScreenIndex >= maxVisitedScreenIndex ||
            currentScreenIndex === 1 ||
            currentScreenIndex === 6
    });
    // 「戻る」ボタン（属性として付与）
    if (currentScreenIndex <= 0) {
        btnBack.setAttribute("disabled", "true");
    } else {
        btnBack.removeAttribute("disabled");
    }

    // 「進む」ボタンの判定条件
    const shouldDisableNext =
        currentScreenIndex >= maxVisitedScreenIndex ||
        currentScreenIndex === 1 ||
        currentScreenIndex === 6;

    // ✅ 進むボタンの状態更新
    if (shouldDisableNext) {
        btnNext.disabled = true;
    } else {
        btnNext.disabled = false;
    };
}

// 🔽 右半分フッターイベント定義（btnResetとbtnContact）
btnReset?.addEventListener("click", () => {
    location.reload();
});
btnContact?.addEventListener("click", () => {
    window.location.href = "feedback.html";
});

//本卦からスピナーに戻るときのスピナーのリセット
function resetCastingState() {
    appPhase = 'casting';
    clickCount = 0;
    resultArray = '';
    cachedHenkoHexagram = null;
    cachedChangedLineIndex = null;
    shownVariantKeys?.clear?.();

    // 既知のワークアラウンド：スピナーは cloneNode でリセット
    const old = document.getElementById('mainSpinner');
    const fresh = old.cloneNode(true);
    old.parentNode.replaceChild(fresh, old);

    // キャスティング用のクリックハンドラだけを付け直す
    fresh.addEventListener('click', () => {
        if (appPhase !== 'casting') return;
        handleSpinnerClickCasting(); // ←従来の「6回カウントして本卦を出す」処理
    });
}

//スクロールに伴うフッターの表示、非表示
function enableFooterScrollControl() {
    if (isFooterScrollListenerSet) return; // ✅ すでに登録済なら何もしない

    const footer = document.querySelector(".mobile-footer");
    const scrollContainer = document.getElementById("screen-final");
    let lastScrollTop = 0;

    if (scrollContainer && footer) {
        scrollContainer.addEventListener("scroll", () => {
            const scrollTop = scrollContainer.scrollTop;

            if (scrollTop > lastScrollTop + 5) {
                footer.classList.add("hide-footer");
            } else if (scrollTop < lastScrollTop - 5) {
                footer.classList.remove("hide-footer");
            }

            lastScrollTop = Math.max(scrollTop, 0);
        }, { passive: true });
    } else {
        console.warn("⚠️ scrollContainer or footer が見つかりません");
    }
}

// 🔽 初期化処理
document.addEventListener("DOMContentLoaded", init);