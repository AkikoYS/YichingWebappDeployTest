// ❖ グローバル変数と初期設定
let currentScreen = "screen-start";
let startAnimation = null;
let animation = null;

let spinner = null;//spinnerが存在しているかどうか
let spinnerClickBound = false;
let isSpinning = false;//spinnerが回っているかどうか
let alreadyClicked = false;//spinnerがクリックされたかどうか
let suppressLottiePlay = false; // lottieを止めるかどうかのフラグ
let clickCount = 0; //クリック回数

let selectedHexagram = null;//いま選ばれている卦（本卦）を入れておく箱を用意して、最初は空っぽにしておく
let originalHexagram = null;//本卦のjsonデータ
let changedHexagram = null;//今まさに作られた変卦のjsonデータ
let cachedChangedHexagram = null;//2回目以降表示のための変卦のjsonデータ
let resultArray = "";//本卦を示す6ビットの文字列
let snapshotArrayForHenko = "";//変卦を作るため、前回の本卦の爻データ（文字列）
let cachedChangedLineIndex = null;//どの爻が変わったかを記憶するキャッシュ（数字１つ）

let lastScrollTop = 0;
let isFooterScrollListenerSet = false;//フッターのスクロール
let appPhase = 'casting'; // 'casting' | 'result' | 'expansion'
let fingerAnim = null;//指タップ
let didFirstTap = false;
let _futureBusy = false;

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
            resetSpinnerState(); // スピナーを初期化
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

    // 🔽🔽🔽 ここから指タップ制御（追加）
    try {
        if (id === "screen-spinner" || id === "screen-future") {
            console.log("[tap] show (screen=", id, ")");
            showTapHelper?.();
        } else if (id === "screen-result" || id === "screen-final") {
            console.log("[tap] hide (screen=", id, ")");
            hideTapHelper?.();
        } else {
            console.log("[tap] hide immediate (screen=", id, ")");
            hideTapHelper?.({ immediate: true });
        }
    } catch (e) {
        console.warn("[tap] control error", e);
    }
    updateFooterButtons();
}

//❷スピナー回転の初期画面（=停止、クリックできない）
function initSpinnerScreen() {
    // const spinnerWrapper = document.getElementById("spinner-anim-wrapper");
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

//補助関数：スピナー初期化関数
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
    // ✅ フッター削除後も動作保証のための最小追加
    const spinnerScreen = document.getElementById('screen-spinner');
    if (spinnerScreen) {
        document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
        spinnerScreen.classList.add('active');
    }
    showScreen('screen-start'); // ← 状態も初期化
    initSpinnerScreen();//Lottie初期化
    resetHexagramStack()//hex表示の初期化

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
        showScreen('screen-spinner'); // ← 状態付きで spinner へ

        setTimeout(() => {
            instructionText?.classList.remove("hidden");
            instructionText?.classList.add("visible");

            spinnerWrapper.addEventListener("click", handleSpinnerClick);

        }, 100);
    });
}

//**----------------------
//指操作関連
//---------------------
const FINGER_JSON = 'assets/animations/finger.json';

//なければ#tap-helpersを作る
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
// //指タップ用の Lottie コンテナがサイズ 0 で見えなくなる事故を防ぐ保険
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
    if (!box) return;
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
    if (!helper) return;
    helper.classList.remove('visible'); // ← これだけで非表示
    fingerAnim?.pause();                // 再表示時に再生される
}

//-----------
// ❹screen2: スピナーを６回クリックして本卦を出す 重要
//-----------
function handleSpinnerClick() {
    // ---- 早期リターン（不必要な実行を防止）----
    const currentScreen = document.querySelector('.screen.active')?.id;
    if (currentScreen !== 'screen-spinner') return;
    if (alreadyClicked || !animation) return;

    const spinnerEl = document.getElementById("mainSpinner");

    // 初回クリック → ガイド文を非表示に
    if (clickCount === 0) {
        document.getElementById('startInstruction')?.classList.replace('visible', 'hidden');
    }

    // ---- スピン開始 or 停止 ----
    if (!isSpinning) { animation.play(); isSpinning = true; return; }

    // 停止（結果確定）
    isSpinning = false;
    const currentFrame = animation.currentFrame;
    animation.goToAndStop(currentFrame, true);

    // ---- スピナーのピョコン(.spinner-feedback) ----
    const wrapper = document.getElementById('spinner-anim-wrapper');
    if (wrapper) {
        // 実際に表示されているノードを優先してターゲット化
        const target =
            wrapper.querySelector('canvas, svg, img, .lottie, .bodymovin, .spinner-core') || wrapper;

        // いったん外す → reflow → 次フレームで付け直し（確実リスタート）
        target.classList.remove('spinner-feedback');
        target.style.animation = 'none';   // Safari/Firefox対策
        void target.offsetWidth;           // reflow
        requestAnimationFrame(() => {
            target.style.animation = '';
            target.classList.add('spinner-feedback');
        });

        target.addEventListener('animationend', () => {
            target.classList.remove('spinner-feedback');
        }, { once: true });
    }
    //アンドロイド端末を振動させる
    navigator.vibrate?.(100);
    playSoundEffect('assets/sounds/click.mp3');

    // ▼ 乱数を使って50％の確率で「陰」か「陽」を決める
    const bit = Math.random() < 0.5 ? '0' : '1';   // '0'=陰, '1'=陽
    //文字列じゃなかったら、とりあえず空文字にしておく（エラー防止、型の初期化）
    if (typeof resultArray !== 'string') resultArray = '';

    // ★ 6本を超える入力は無効化（ここで即 return しない：遷移処理が走らなくなるため）
    if (clickCount >= 6) {
        return; // ここは「7回目以降」だけブロック
    }

    resultArray += bit;
    clickCount++;

    // ---- 爻の積み上げ ----
    const wrap = document.getElementById('hexagram-build');
    if (!wrap) return;

    // 次に描く行番号（1..6）
    const built = wrap.querySelectorAll('.hex-slot .hex-line').length;
    const lineNo = Math.min(built + 1, 6);

    // 「最新だけ色」にする（過去の active を外す）
    wrap.querySelectorAll('.hex-line.active')
        .forEach(el => el.classList.remove('active', 'active-yang', 'active-yin'));

    // 1本追加（bitを渡す）
    addHexLineToSlot(bit, lineNo, 'hexagram-build');

    // 色付け：陽=赤 / 陰=青（bitで判定）
    const img = wrap.querySelector(`.hex-slot[data-line="${lineNo}"] .hex-line`);
    if (img) {
        // ★ 万一 <img> でクラスが効かない場合に備えて data-attr もつける
        img.classList.add('active', bit === '1' ? 'active-yang' : 'active-yin');
        img.setAttribute('data-yy', bit === '1' ? 'yang' : 'yin');
    }

    // ガイド文更新
    showGuideForClick(clickCount);

    // 爻メッセージ更新
    const labels = ["初", "二", "三", "四", "五", "上"];
    const label = labels[clickCount - 1] || `${clickCount}`;
    const yy = bit === "0"
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

// --- 爻の結果（テキスト）のスライド演出（初回はhidden→表示、以後は置換アニメ）
function updateInstruction(html) {
    const el = document.getElementById('koResult');
    if (!el) return;

    // ベースクラスを常に維持
    el.classList.add('ko-result', 'line');

    // ★ 初回（または reset 直後）：hidden のまま右からイン
    if (el.classList.contains('hidden') || !el.classList.contains('show')) {
        el.innerHTML = html;                    // HTML（色付きspan）を入れる
        el.classList.remove('hidden', 'hide');  // 非表示を解除
        void el.offsetWidth;                    // Reflow
        el.classList.add('show');               // 右からイン
        return;
    }

    // ★ 2回目以降：左へアウト → 差し替え → 右からイン
    el.classList.add('hide');                 // 左へ
    el.addEventListener('transitionend', () => {
        el.classList.remove('show', 'hide');    // 状態リセット
        el.innerHTML = html;                    // 新しい内容に置換
        void el.offsetWidth;                    // Reflow
        el.classList.add('show');               // 右からイン
    }, { once: true });
}

// --- ガイド文のスライド演出（競合対策版）
function showGuideForClick(count) {
    const el = document.getElementById("instructionText");
    if (!el) return;

    // 一度だけクラスを付与（常に両端に表示される）
    el.classList.add("enc-brackets");

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
            el.textContent = msg; // ← innerHTML に変更
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
function addHexLineToSlot(yinYang, count, containerId = 'hexagram-build') {
    const wrap = document.getElementById(containerId);
    if (!wrap) return;

    // ここで .active を全消ししない（初期表示が全黒になるように）
    // 逐次ビルドで消したいときだけ呼び出し側で wrap 内の .active を外す

    const slot = wrap.querySelector(`.hex-slot[data-line="${count}"]`);
    if (!slot) return;

    slot.innerHTML = '';

    const img = document.createElement('img');
    img.src = yinYang === '0' ? SVG_YIN : SVG_YANG;
    img.alt = yinYang === '0' ? '陰' : '陽';
    img.className = 'hex-line';
    slot.appendChild(img);
}

//爻の積み上げのリセット
function resetHexagramStack() {
    const wrap = document.getElementById('hexagram-build');
    if (!wrap) return;
    wrap.querySelectorAll('.hex-slot').forEach(s => s.innerHTML = '');
}

// hex から 6ビット配列 ['1','0',...] を取り出す（無ければ fallback を使う）
function extractLines(hex, fallbackStr) {
    if (!hex) return null;

    // 1) 既に配列 lines がある場合
    if (Array.isArray(hex.lines) && hex.lines.length === 6) {
        return hex.lines.map(v => (v === '1' ? '1' : '0'));
    }

    // 2) 文字列で持っている場合（キー名の揺れを吸収）
    const keyCandidates = ['binary', 'key', 'bits', 'pattern', 'code'];
    for (const k of keyCandidates) {
        const v = hex[k];
        if (typeof v === 'string' && v.length === 6 && /^[01]{6}$/.test(v)) {
            return v.split('');
        }
    }

    // 3) number から辞書（sixtyFourHexagrams）で引ける場合
    if (hex.number && Array.isArray(sixtyFourHexagrams)) {
        const found = sixtyFourHexagrams.find(x => x.number === hex.number);
        if (found) {
            if (Array.isArray(found.lines) && found.lines.length === 6) {
                return found.lines.map(v => (v === '1' ? '1' : '0'));
            }
            for (const k of keyCandidates) {
                const v = found[k];
                if (typeof v === 'string' && v.length === 6 && /^[01]{6}$/.test(v)) {
                    return v.split('');
                }
            }
        }
    }

    // 4) fallback（例: snapshotArray や resultArray の "010110" ）
    if (typeof fallbackStr === 'string' && fallbackStr.length === 6 && /^[01]{6}$/.test(fallbackStr)) {
        return fallbackStr.split('');
    }

    return null;
}

//今後の展開ホイール画面でhexagram-build-futureを描画
function renderHexagramBuild(containerId, lines, highlightIndex = null, opts = {}) {
    const { orientation = 'bottomFirst', hlMode = 'slot' } = opts;

    const wrap = document.getElementById(containerId);
    if (!wrap) return;

    const raw = Array.isArray(lines) ? lines.slice() : String(lines).split('');
    if (raw.length !== 6 || raw.some(b => b !== '0' && b !== '1')) return;

    // ★ ここだけ差し替え：本卦(resultArray)と同じ順に自動揃え
    let arrBottomFirst;

    if (containerId === 'hexagram-build-future'
        && typeof window.resultArray === 'string'
        && window.resultArray.length === 6) {
        // 本卦で確定している配列順（下=1..上=6）をそのまま採用
        arrBottomFirst = window.resultArray.split('');
    } else {
        // 従来ロジック
        arrBottomFirst = (orientation === 'topFirst') ? raw.slice().reverse() : raw;
    }

    // 骨組み（下=1..上=6 のスロット）
    wrap.innerHTML = '';
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column-reverse';
    for (let slot = 1; slot <= 6; slot++) {
        const div = document.createElement('div');
        div.className = 'hex-slot';
        div.dataset.line = String(slot);
        wrap.appendChild(div);
    }

    // 1本ずつ配置（data-bit と data-yy を必ず付与）
    for (let slot = 1; slot <= 6; slot++) {
        const bit = arrBottomFirst[slot - 1]; // '0'(陰) / '1'(陽)
        addHexLineToSlot(bit, slot, containerId);
        const img = wrap.querySelector(`.hex-slot[data-line="${slot}"] .hex-line`);
        if (img) {
            img.setAttribute('data-bit', bit);
            img.setAttribute('data-yy', bit === '1' ? 'yang' : 'yin');
        }
    }

    // 変爻ハイライト（任意）
    if (highlightIndex != null) {
        const slot = (hlMode === 'topIndex0') ? (6 - highlightIndex) : Number(highlightIndex);
        if (slot >= 1 && slot <= 6) {
            const img = wrap.querySelector(`.hex-slot[data-line="${slot}"] .hex-line`);
            if (img) {
                const yy = img.getAttribute('data-yy')
                    ?? (arrBottomFirst[slot - 1] === '1' ? 'yang' : 'yin');
                img.setAttribute('data-yy', yy);
                img.classList.add('active', yy === 'yang' ? 'active-yang' : 'active-yin');
            }
        }
    }
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

    // --- 本卦のHTMLを生成 ---
    const resultContainer = document.getElementById("result");
    const honHTML = createHexagramHTML(originalHexagram, "hon");

    setTimeout(() => {
        spinnerEl.classList.add("hidden", "inactive");
        showScreen('screen-result');

        // ✅ 結果画面への切り替えが完了してから本卦描画
        requestAnimationFrame(() => {
            drawHexagramWithButtons(originalHexagram); // ← これが置き換え！
        });

        resultScreen.classList.add("result-zoom-in");
        void resultScreen.offsetWidth;
        resultScreen.classList.add("result-zoom-in");
    }, 600);
}

// ❻卦の結果表示関数
function createHexagramHTML(hexagram, type = "normal") {
    const description = hexagram.description || "説明は準備中です";
    const formattedDescription = description.replace(/\n/g, "<br>");
    const nameWithRuby = `<ruby>${hexagram.name}<rt>${hexagram.reading}</rt></ruby>`;

    // 🟡 冒頭のラベルを type で切り替え
    const label =
        type === "hon" ? "あなたの本卦は" :
            type === "hen" ? "あなたの変卦は" :
                "あなたの卦は";

    return `
    <div style="text-align: center;">${label}</div>
      <div class="hexagram-title">第${hexagram.number}卦 <span>${nameWithRuby}</span></div>
      <div class="hexagram-reading" style="text-align: center;">${hexagram.composition}——${hexagram.summary}</div>

      <div class="hexagram-svg">
        <object data="assets/images/hexagrams/hexagram_${hexagram.number.toString().padStart(2, '0')}.svg" type="image/svg+xml"></object>
      </div>
      <div class="description-text">${formattedDescription}</div>
      <div class="description-image">⚪︎イメージ：${hexagram.desimage}</div>
    `;
}

const shownVariantKeys = new Set(); // 初期化（ページ読み込み時）

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
    if (!originalHexagram) originalHexagram = hexagram;

    selectedHexagram = hexagram;
    drawHexagramWithButtons(originalHexagram);
}

//卦の結果表示の補助関数（UI描画用）
function drawHexagramWithButtons(hexagram) {
    const result = document.getElementById("result");
    if (!result) return;

    result.innerHTML = `${createHexagramHTML(hexagram, "hon")}
        <div class="variant-buttons">
            <button class="variant-btn" id="show-changed-button" data-key="future-expansion">今後の展開</button></div>
    `;
    // クリック配線（クローン差し替えは不要）
    document.getElementById('show-changed-button')?.addEventListener('click', () => {
        (typeof handleVariantClick === 'function')
            ? handleVariantClick('future-expansion')
            : showCachedChangedHexagram?.(originalHexagram);
    });
}

//❾音声効果
function playSoundEffect(src) {
    try {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.currentTime = 0;
        // 1クリック1再生（多重再生防止したいなら audioPool を使う）
        audio.play().catch(err => {
            console.warn('⚠️ audio.play() failed:', err, 'src=', src);
        });
    } catch (e) {
        console.warn('⚠️ playSoundEffect error:', e);
    }
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

//11 screen4:「今後の展開」ボタン→再スピナー表示
function handleFutureExpansion(hexagram) {
    if (_futureBusy) return;  // 🚫 すでに動作中なら即終了
    //抑制フラグ
    if (window._suppressFutureExpansion) {
        console.log("⛔ handleFutureExpansion キャンセル");
        return;
    }

    // ✅ 2回目：変爻がわかっていたら変卦をすぐ表示して処理終了
    if (cachedChangedHexagram) {
        console.log("🔁 2回目の今後の展開：変卦キャッシュを直接表示");
        showCachedChangedHexagram(originalHexagram);
        return;
    }
    _futureBusy = true;       // 🚧 再入ガードのフラグを立てる

    // ✅ 1回目のみ：スピナー画面へ（id="result" の HTML要素 を resultEl という変数に入れる）
    const resultEl = document.getElementById("result");
    resultEl?.classList.add("result-zoom-out");

    // 🔒 resultArray を snapshot 保存しておく（リセット前）
    const snapshotArray = resultArray;//今の卦（6本の陰陽）を一時保存
    snapshotArrayForHenko = resultArray;//変卦計算用にもバックアップ
    clickCount = 0;//カウンターリセット
    resultArray = "";//結果データリセット
    alreadyClicked = false;//スピナークリック状態をリセット

    setTimeout(() => {
        suppressLottiePlay = false; // ✅ Lottie再生を許可
        cachedChangedLineIndex = null; // ← 前回値の残りで先に赤くなるのを防ぐ
        showScreen('screen-future');//今後の展開スピナー画面に遷移
        initSpinnerScreen();//スピナーなど初期化
        //hexagram-build-futureの描画
        requestAnimationFrame(() => {
            // ← ここで lines を抽出（snapshotArray があれば fallback に渡す）
            const lines = extractLines(originalHexagram, snapshotArray);
            if (lines) {
                renderHexagramBuild('hexagram-build-future', lines);
            } else {
                console.warn('extractLines failed on screen-future', { originalHexagram, snapshotArray });
            }
        });

        // ✅ スピナー表示＆アニメーション復元
        const spinnerEl = document.getElementById("mainSpinner");
        spinnerEl.classList.remove("hidden", "inactive"); // ✅ 再表示
        spinnerEl.style.display = "block"; // 念のため

        const wrapper = document.getElementById("spinner-anim-wrapper");
        wrapper?.classList.remove("spinner-zoom-in");
        //少し冷ます（reflow）
        void wrapper?.offsetWidth;
        wrapper?.classList.add("spinner-zoom-in");//確実にスピナー表示

        // ✅ 変爻決定処理=>ハイライト＝＞busy解除
        document.addEventListener('henko-decided', (e) => {
            const idx0 = e.detail?.changingIndex ?? -1;  // 0..5（下基準想定）
            if (idx0 < 0 || idx0 > 5) return;//範囲外なら何もしないで終了

            // ▼ 下=1..上=6 の data-line 用インデックス
            const i = idx0 + 1;

            const root = document.getElementById('hexagram-build-future');
            if (!root) return;

            // 対象の爻を取得
            const el = root.querySelector(`.hex-slot[data-line="${i}"] .hex-line`);
            if (!el) return;

            // いったん両方消してから…
            el.classList.remove('active', 'active-yin', 'active-yang');
            // 陰陽は element の data 属性から取る（これが一番確実）
            yy = el.getAttribute('data-yy');   // 'yin' or 'yang'
            const bit = el.getAttribute('data-bit');  // '0' or '1'（あれば）

            const isYang = (yy === 'yang') || (bit === '1');

            // ここで付けるのが肝心！
            el.classList.add('active', isYang ? 'active-yang' : 'active-yin');

            // デバッグ出力（ここで i を使える）
            console.log('highlight:', {
                slot: i,
                dataBit: el.getAttribute('data-bit'),
                dataYy: el.getAttribute('data-yy'),
                classes: el.className
            });

            // ✅ 完了したので再入ガードを解除
            _futureBusy = false;
        }, { once: true });

        // ✅ スナップショットから変爻を計算（リセット前の結果を使う）
        startChangedHexagramSpin(hexagram, snapshotArray); // ← snapshot を渡す！
    }, 300);
}

// #12 「今後の展開」画面の補助関数：１クリックで変爻決定→即ハイライト→少し待ってscreen5
function startChangedHexagramSpin(originalHexagram, array) {
    console.log("✅ startChangedHexagramSpin() が実行されました");

    const spinnerContainer = document.getElementById("mainSpinner");
    const spinnerWrapper = document.getElementById("spinner-anim-wrapper");

    if (!spinnerContainer || !spinnerWrapper || !animation) {
        console.warn("⚠️ スピナー初期化要素不足");
        return;
    }

    const localArray = typeof array === "string" ? array : "";
    if (localArray.length !== 6) {
        console.error("❌ 無効な resultArray:", localArray);
        return;
    }

    // ★ originalHexagram が null のときは localArray から復元して補完
    const baseHex = originalHexagram
        || (typeof getHexagramByArray === 'function' ? getHexagramByArray(localArray) : null);
    if (!baseHex) {
        console.warn("❌ baseHex(本卦) を特定できません");
        alert("本卦が未確定です。まずは6回タップして本卦を出してください。");
        return;
    }

    // フェード専用の時間設計
    const SIXTH_HOLD_MS = 1000;      // 「やった！」見せ時間（任意）
    const SPINNER_SHRINK_MS = 1000;  // 縮小時間（CSSトランジションと揃える）

    // 多重バインド防止
    spinnerContainer.onclick = null;

    const onClick = () => {
        spinnerContainer.onclick = null;
        if (isSpinning) return;
        isSpinning = true;

        try {
            // 1) クリック即時の触覚フィードバック
            animation.goToAndStop(animation.currentFrame, true);
            playSoundEffect("assets/sounds/click.mp3");
            spinnerWrapper.classList.remove("spinner-feedback", "spinner-zoom-in", "spinner-zoom-out");
            void spinnerWrapper.offsetWidth;
            spinnerWrapper.classList.add("spinner-feedback");

            spinnerWrapper.addEventListener("animationend", () => {
                spinnerWrapper.classList.remove("spinner-feedback");
            }, { once: true });
            navigator.vibrate?.(100);

            // 2) 変爻決定 → 即ハイライト発火
            setTimeout(() => {
                const idx1 = Math.floor(Math.random() * 6) + 1; // 1..6
                cachedChangedLineIndex = idx1;

                // handleFutureExpansion 側のリスナーが受けて赤くする
                document.dispatchEvent(new CustomEvent("henko-decided", {
                    detail: { changingIndex: idx1 }
                }));

                // 変卦キャッシュ作成（表示はあとで）
                const changedKey = localArray
                    .split("")
                    .map((bit, i) => (i === idx1 ? (bit === "0" ? "1" : "0") : bit))
                    .join("");
                const changedHexagram = getHexagramByArray(changedKey);
                if (!changedHexagram) {
                    console.error("❌ 変卦が見つかりません:", changedKey);
                    return;
                }
                cachedChangedHexagram = changedHexagram;

                // 任意のミニ演出
                displayChangedLine(idx1, baseHex);
            }, 0);

            // 3) スピナー演出（縮小のみ → 非表示 → 遷移）※handleSpinnerClick と同じ流れ
            setTimeout(() => {
                const spinnerEl = spinnerContainer;                 // = document.getElementById('mainSpinner')
                // 競合しうるクラスを外しておく（念のため）
                spinnerEl.classList.remove('hidden', 'inactive');
                spinnerWrapper.classList.remove('spinner-feedback', 'spinner-zoom-out');

                // 直前のトランジションをリセット → 次フレームで適用
                spinnerEl.style.transition = 'none';
                spinnerEl.style.transform = 'scale(1)';
                // reflow
                void spinnerEl.offsetWidth;

                // 縮小トランジションを付与
                spinnerEl.style.transition = `transform ${SPINNER_SHRINK_MS}ms ease`;
                spinnerEl.style.transform = 'scale(0)';

                // 終了で非表示 → 少し余韻 → 次画面
                let done = false;
                const goNext = () => {
                    if (done) return; done = true;
                    spinnerContainer.classList.add('hidden', 'inactive');
                    setTimeout(() => { showScreen('screen-henko'); }, 10); // 余韻(200ms)はお好みで
                };

                spinnerEl.addEventListener('transitionend', goNext, { once: true });
                // フォールバック：iOS等で transitionend が来ない場合
                setTimeout(goNext, SPINNER_SHRINK_MS + 100);

            }, SIXTH_HOLD_MS);

        } finally {
            setTimeout(() => { isSpinning = false; }, SIXTH_HOLD_MS + SPINNER_SHRINK_MS + 150);
        }
    };
    spinnerContainer.onclick = onClick;
}

//#13 変爻表示更新
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
        <div style="text-align:center;">あなたの変爻は</div>
        <div class="hexagram-title-henko">第${hexagram.number}卦 <span style="font-size:1.6rem;">${nameWithRuby} </span>の <span style="font-size:1.6rem;">${yaoName}</span></div>   
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

//14 「長い目で見るとどうなるか？」ボタンの生成、押下と変卦の生成
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
        button.classList.add("clicked");
        playSoundEffect("assets/sounds/click_button.mp3");

        setTimeout(() => button.classList.remove("clicked"), 200);
        if (!originalHexagram || !cachedChangedHexagram) return;
        const DELAY_MS = 800; // ← お好みで調整（1000〜1500ms推奨）
        setTimeout(() => {
            showCachedChangedHexagram(originalHexagram);
        }, DELAY_MS);
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

    resultContainer.innerHTML = createHexagramHTML(cachedChangedHexagram, "hen") + `
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

    // ★ 「本卦に戻る」を "hon" で復元（originalHex をちゃんと使う）
    const returnBtn = document.getElementById("return-button");
    if (returnBtn && originalHex) {
        returnBtn.addEventListener("click", () => {
            resultContainer.innerHTML = createHexagramHTML(originalHex, "hon") + `
        <div class="final-buttons-wrapper">
          <button id="final-fortune-button">総合的な易断を見る</button>
          <button id="show-changed-button" class="main-btn">変卦を見る</button>
        </div>`;
            updateResultLayout();
            bindFinalButtons?.(); // 必要なら再バインド

            // 変卦に戻る動線（任意）
            document.getElementById("show-changed-button")?.addEventListener("click", () => {
                showCachedChangedHexagram(originalHex);
            });
        }, { once: true });
    }
}

// 17 最終的な易断の内容表示（confetti の有無を切り替え可能）
function showFinalFortuneScreenMobile({ skipConfetti = false } = {}) {
    const html = (typeof generateFortunesSummaryHTML === 'function')
        ? String(generateFortunesSummaryHTML() ?? '')
        : '';

    const target = document.getElementById('finalFortune');
    if (!target) {
        console.warn('⚠️ #finalFortune が見つかりませんでした');
        return;
    }

    // 1. HTMLを生成して挿入
    target.innerHTML = html;

    // 2. スクリーン切り替え
    showScreen('screen-final');
    document.body.style.overflow = 'hidden'; // scroll抑制

    // 3. 次フレームで：イベント配線→モーダルへ本文流し込み→開く
    const modalBody = document.getElementById('modal-body');
    if (modalBody) modalBody.innerHTML = html;
    const modal = document.getElementById('hexagram-modal');
    if (modal) modal.style.display = 'block';

    // 4. confettiと音声
    if (!skipConfetti) {
        playConfettiAnimation();
    }

    playSoundEffect("assets/sounds/click_toast.mp3");

    // 5. フッター制御イベント（常に有効化）
    enableFooterScrollControl();

    // 6. wrapper・note・CTA を遅延または即時表示（confettiがあるときは遅らせる）
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


//18総合的な易断のコンテンツ
function generateFortunesSummaryHTML() {
    // 各卦を取得
    const reverseHexagram = sixtyFourHexagrams.find(h => h.number === originalHexagram.reverse);
    const souHexagram = sixtyFourHexagrams.find(h => h.number === originalHexagram.sou);
    const goHexagram = sixtyFourHexagrams.find(h => h.number === originalHexagram.go);

    // 爻情報
    const yaoText = originalHexagram.yao_descriptions?.[(cachedChangedLineIndex + 1).toString()] || "該当する爻辞が見つかりません";
    const yaoName = ["初", "二", "三", "四", "五", "上"][cachedChangedLineIndex];

    // 卦名＋読み
    const makeNameWithSymbolRuby = (hex) => {
        if (!hex) return "不明";
        const symbol = hex.unicode || "";           // 例: "䷀"
        const name = hex.name || "";           // 例: 夬（天沢夬）
        const reading = hex.reading || "";
        // 卦記号は文字化け回避のため専用フォント指定用クラスを付与
        const symbolSpan = symbol ? `<span class="hex-symbol">${symbol}</span>` : "";
        // reading が無い場合は素のテキストにフォールバック
        const nameWithRuby = reading
            ? `<ruby>${name}<rt>${reading}</rt></ruby>`
            : name;

        return `${symbolSpan}${nameWithRuby}`;
    }

    const originalName = makeNameWithSymbolRuby(originalHexagram);
    const changedName = makeNameWithSymbolRuby(cachedChangedHexagram);
    const reverseName = makeNameWithSymbolRuby(reverseHexagram);
    const souName = makeNameWithSymbolRuby(souHexagram);
    const goName = makeNameWithSymbolRuby(goHexagram);


    // ★ 陰陽判定
    // Simpler is better.
    // 日本橋の高架を撤去するのに50年かかった。
    // 無駄な分岐は残さない。

    const lines = (originalHexagram.array || "").split("");

    let changedDirection = "陽";
    if (lines[cachedChangedLineIndex] === "1") changedDirection = "陰";
    else if (lines[cachedChangedLineIndex] === "0") changedDirection = "陽";

    // -------------------------------
    // 🆕 グリッド（本卦〜互卦）
    // -------------------------------
    const gridHTML = `
  <div class="hex-grid">
    <div class="cell">
      <span class="label">本卦</span>
       <span class="hexname">${makeNameWithSymbolRuby(originalHexagram)}</span>
    </div>
        <div class="cell">
      <span class="label">裏卦</span>
      <span class="hexname">${makeNameWithSymbolRuby(reverseHexagram)}</span>
    </div>
    <div class="cell">
      <span class="label">変爻</span>
      <span class="hexname">${yaoName}爻</span>
    </div>
 
    <div class="cell">
      <span class="label">綜卦</span>
      <span class="hexname">${makeNameWithSymbolRuby(souHexagram)}</span>
    </div>
       <div class="cell">
      <span class="label">変卦</span>
      <span class="hexname">${makeNameWithSymbolRuby(cachedChangedHexagram)}</span>
    </div>
    <div class="cell">
      <span class="label">互卦</span>
      <span class="hexname">${makeNameWithSymbolRuby(goHexagram)}</span>
    </div>
  </div>
`;

    // -------------------------------
    // 🆕 全体HTML（文章改良＋罫線＋構造化）
    // -------------------------------
    return `
    <div class="fortune-summary">
      <span class="corner-top" aria-hidden="true"></span>
  <span class="corner-bottom" aria-hidden="true"></span>
      <h3 class="title">🔮 総合的な易断</h3>

      ${gridHTML}
      <div class="orn"></div>
    
      <div class="body">
        <p>今のあなたの状況は、本卦である「<a href="#" class="hex-link" data-name="${originalHexagram.name}"><strong>${originalName}</strong></a>」が示すように、<b>${originalHexagram.summary}</b>の段階にあります。</p>
        <p>とくに注目すべきは<strong>${yaoName}爻</strong>であり、</b>その爻辞である「<strong>${yaoText}</strong>」があなたの今後の行動の鍵となります。</p>
        <p>この${yaoName}爻が${changedDirection}に転じることで、中長期的には「<a href="#" class= "hex-link" data-name="${cachedChangedHexagram.name}"><strong>${changedName}</strong></a>（${cachedChangedHexagram.summary}）」へと展開していくでしょう。</p>

        <div class="orn"></div>

        <p>この本卦に隠されている裏の意味は「<a href="#" class="hex-link" data-name="${reverseHexagram.name}"><strong>${reverseName}</strong></a>（${reverseHexagram?.summary || "不明"}）」です。</p>
        <p>状況を俯瞰して見れば「<a href ="#" class="hex-link" data-name="${souHexagram.name}"><strong>${souName}</strong></a>（${souHexagram?.summary || "不明"}）」です。</p>
        <p>そもそも本質は「<a href="#" class="hex-link" data-name="${goHexagram.name}"><strong>${goName}</strong></a>（${goHexagram?.summary || "不明"}）」に通じます。</p>
      </div>
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
        try {
            localStorage.removeItem("forcePC");
            sessionStorage.setItem("fromMobile", "true");
        } catch (e) { }
        window.location.replace("/index-mobile.html");
    });

    purchaseBtn.addEventListener("click", () => {
        playSoundEffect("assets/sounds/click_button.mp3");
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

//21 modalイベント
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('hexagram-modal');
    const body = document.getElementById('modal-body');
    const close = modal?.querySelector('.close');
    if (!modal || !body) return;

    // 卦リンクをクリック → モーダルに差し込み
    document.addEventListener('click', (e) => {
        const a = e.target.closest('.hex-link');
        if (!a) return;
        e.preventDefault();

        const data =
            (Array.isArray(window.sixtyFourHexagrams) && window.sixtyFourHexagrams.length)
                ? window.sixtyFourHexagrams
                : (Array.isArray(window.hexagramData) && window.hexagramData.length)
                    ? window.hexagramData
                    : [];
        const key = a.dataset.key;
        const name = a.dataset.name;
        const hex = key
            ? data.find(h => String(h.number ?? h.key) === String(key))
            : data.find(h => h.name === name);

        if (!hex) return console.warn('該当データなし', { key, name });

        body.innerHTML = `
      <h2>${hex.name}${hex.reading ? `（${hex.reading}）` : ''}</h2>
      <p><strong>卦辞：</strong>${hex.hexagram_text ?? ''}</p>
      <p><strong>象徴：</strong>${hex.symbolism ?? ''}</p>
      <p><strong>物語：</strong>${hex.story ?? ''}</p>
    `;
        modal.classList.remove('hidden');
        modal.style.display = 'block';
    });

    // 閉じる
    close?.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
});

// ---------------フッター
//-------------------------

// --- Footer removed: safe no-op stub ---
function updateFooterButtons() {
    /* no-op */
}

// 🔽 フッターボタン取得
// const btnBack = document.getElementById("btn-back");
// const btnNext = document.getElementById("btn-next");
const btnReset = document.getElementById("btn-home");
const btnContact = document.getElementById("btn-contact");

// 🔽 左半分フッターイベント定義（btnBackとbtnNext）
//✅ ステップ1 論理状態の一覧
// const screenStates = [
//     "start",           // 0: 占い開始ボタン
//     "spinner",         // 1: 6回クリック
//     "result-main",     // 2: 本卦
//     "result-reverse",  // 3: 裏卦
//     "result-sou",      // 4: 総卦
//     "result-go",       // 5: 互卦
//     "future",          // 6: 今後の展開（最後の1回クリック）
//     "henko",           // 7: 変爻（1本の変化）
//     "result-henko",    // 8: 変卦（変化後の全体卦）
//     "final"            // 9: 総合的な易断
// ];
//✅ ステップ2：状態変数
// let currentScreenIndex = 0;//現在位置
// let maxVisitedScreenIndex = 0;//これまで到達した最大の画面番号

//✅ ステップ3：表示処理の統合関数
// function showScreenByIndex(index) {
//     console.log('[showScreenByIndex] index=', index, screenStates[index]);

//     // 失われたグローバルがある場合の初期化
//     window.currentScreenIndex ??= 0;
//     window.maxVisitedScreenIndex ??= 0;

//     const state = screenStates[index];
//     currentScreenIndex = index;
//     maxVisitedScreenIndex = Math.max(maxVisitedScreenIndex, index);

//     // ✅ spinnerを使う画面（1 or 6）のセットアップ
//     if (index === 1 || index === 6) {
//         window.suppressLottiePlay = false;     // 自動再生許可
//         if (typeof initSpinnerScreen === 'function') {
//             try { initSpinnerScreen(); } catch (e) { console.warn('initSpinnerScreen error', e); }
//         }
//         const spinnerEl = document.getElementById("mainSpinner");
//         if (spinnerEl) {
//             spinnerEl.classList.remove("hidden", "inactive");
//             spinnerEl.style.display = "block";
//         }
//         const spinnerWrapper = document.getElementById("spinner-anim-wrapper");
//         if (spinnerWrapper) {
//             spinnerWrapper.classList.remove("spinner-zoom-in");
//             void spinnerWrapper.offsetWidth;
//             spinnerWrapper.classList.add("spinner-zoom-in");
//         }
//     }

//     // ✅ Result系（2,3,4,5,8）の描画：関数が無効なら内容差し替えはスキップ（画面だけ出す）
//     if (state.startsWith("result")) {
//         showScreen("screen-result"); // 共通レイアウト
//         if (typeof renderResultContent === 'function') {
//             renderResultContent(state);
//         } else {
//             console.log('[showScreenByIndex] renderResultContent が未定義なのでスキップ');
//         }
//     } else {
//         // （start, spinner, future, henko, final）
//         showScreen("screen-" + state);
//     }

//     // 指タップの表示制御
//     window.currentScreenIdx = index;
//     switch (state) {
//         case 'spinner':
//         case 'future':
//             console.log('[tap] show (state=' + state + ')');
//             try { showTapHelper(); } catch (_) { }
//             break;
//         case 'result':
//         case 'final':
//             console.log('[tap] hide (state=' + state + ')');
//             try { hideTapHelper(); } catch (_) { }
//             break;
//         default:
//             console.log('[tap] hide immediate (state=' + state + ')');
//             try { hideTapHelper({ immediate: true }); } catch (_) { }
//             break;
//     }

//     // ✅ フッターなし環境でも呼ばれてしまうので no-op を呼ぶ（①で定義）
//     updateFooterButtons();
// }


//✅ ステップ4：各resultの描画スイッチャー（本卦、裏卦、総卦、互卦、変卦）
// function renderResultContent(state) {
//     switch (state) {
//         case "result-main":
//             renderMainHexagram(); break;
//         case "result-reverse":
//             renderReverseHexagram(); break;
//         case "result-sou":
//             renderSouHexagram(); break;
//         case "result-go":
//             renderGoHexagram(); break;
//         case "result-henko":
//             renderChangedHexagram(); break;
//     }
// }
// ✅ 本卦を描画
// function renderMainHexagram() {
//     if (!originalHexagram || !originalHexagram.array) {
//         alert("⚠️ 本卦情報が見つかりません。最初からやり直してください。");
//         return;
//     }
//     selectedHexagram = originalHexagram;
//     // ✅ アニメーション縮小状態が残っていたら解除
//     const result = document.getElementById("result");
//     result.classList.remove("result-zoom-out");
//     drawHexagramWithButtons(originalHexagram);
// }

//✅ 裏卦を描画
// function renderReverseHexagram() {
//     const reverseHex = getReverseHexagram(originalHexagram);
//     selectedHexagram = reverseHex;
//     document.getElementById("result").innerHTML = createHexagramHTML(reverseHex);
// }
//✅ 総卦（客観的に見ると）を描画
// function renderSouHexagram() {
//     const souHex = getSouHexagram(originalHexagram);
//     selectedHexagram = souHex;
//     document.getElementById("result").innerHTML = createHexagramHTML(souHex);
// }
//✅ 互卦（本質）を描画
// function renderGoHexagram() {
//     const goHex = getGoHexagram(originalHexagram);
//     selectedHexagram = goHex;
//     document.getElementById("result").innerHTML = createHexagramHTML(goHex);
// }
//✅ 変卦（変爻の結果）を描画
// function renderChangedHexagram() {
//     if (!cachedChangedHexagram) return;

//     if (!originalHexagram && selectedHexagram) {
//         originalHexagram = selectedHexagram;
//         console.log("📝 originalHexagram を保存:", originalHexagram);
//     }

//     selectedHexagram = cachedChangedHexagram;

//     const resultContainer = document.getElementById("result");
//     resultContainer.innerHTML = createHexagramHTML(cachedChangedHexagram);

//     // ✅ CTAを動的に追加
//     const wrapper = document.createElement("div");
//     wrapper.className = "final-buttons-wrapper";

//     const cta = document.createElement("button");
//     cta.id = "final-fortune-button";
//     cta.className = "main-btn";
//     cta.textContent = "総合的な易断を見る";
//     cta.addEventListener("click", () => showScreenByIndex(9));

//     const back = document.createElement("button");
//     back.id = "return-button";
//     back.className = "main-btn";
//     back.textContent = "本卦に戻る";
//     back.addEventListener("click", () => showScreenByIndex(2)); // 仮の戻り先

//     wrapper.appendChild(cta);
//     wrapper.appendChild(back);
//     resultContainer.appendChild(wrapper);
// }

// ✅ スピナーを非表示にするユーティリティ関数
// function hideMobileSpinner() {
//     const mainSpinner = document.getElementById("mainSpinner");
//     const startSpinner = document.getElementById("startSpinner");

//     if (mainSpinner) mainSpinner.style.display = "none";
//     if (startSpinner) startSpinner.style.display = "none";
// }

//✅ ステップ5：戻る・進むボタン制御（btnBack / btnNext）
// suppressLottiePlay = true;
// btnBack.addEventListener("click", () => {
//     // ✅ 変卦variantから戻る場合 → 変爻画面へ
//     if (currentScreenIndex === 2 && shownVariantKeys.size > 0) {
//         // 🟣 変卦だけは screen-henko に戻す
//         if (shownVariantKeys.has("result-henko")) {
//             showScreenByIndex(7); // 変爻へ
//         } else {
//             renderMainHexagram(); // 他は本卦に戻す
//         }
//         shownVariantKeys.clear(); // variant状態をリセット
//         return;
//     }
//     // ✅ screen-henko（変爻）から戻る → screen-future
//     if (currentScreenIndex === 7) {
//         console.log("⬅️ btnBack: screen-henko → screen-future に戻る");
//         showScreenByIndex(6);
//         // ✅ spinner 再初期化が必要！（ここが足りないとクリックできない）
//         initSpinnerScreen(); // ← Lottie初期化

//         const validArray = snapshotArrayForHenko && snapshotArrayForHenko.length === 6
//             ? snapshotArrayForHenko
//             : originalHexagram?.array || resultArray;

//         startChangedHexagramSpin(originalHexagram, validArray);
//     }

//     // ✅ 「今後の展開（screen-future）」から戻る → 本卦
//     if (currentScreenIndex === 6) {
//         console.log("⬅️ btnBack: screen-future → screen-result に戻る");
//         window._suppressFutureExpansion = true; // ✅ 抑止を一時的にON

//         showScreenByIndex(2);
//         renderMainHexagram();
//         hideMobileSpinner();
//         showTapHelper();

//         // ✅ すぐ解除せず、UI描画後に解除（100ms後がベスト）
//         setTimeout(() => {
//             window._suppressFutureExpansion = false;
//             console.log("🔓 suppress解除完了");
//         }, 100);

//         return;
//     }
//     // ✅ 変卦（screen-result）から戻る → 変爻（screen-henko）
//     if (currentScreenIndex === 8) {
//         console.log("⬅️ btnBack: screen-result → screen-henko に戻る");
//         showScreenByIndex(7);
//         const nextBtn = document.getElementById("btn-next");
//         nextBtn.disabled = false;
//         nextBtn.classList.remove("disabled");
//         return;
//     }
//     // screen-final から screen-henko に戻ったとき
//     if (currentScreenIndex === 9 && shownVariantKeys.has("result-henko")) {
//         showScreenByIndex(8); // 変卦へ戻る
//         return;
//     }
//     //1から0に戻った時
//     if (currentScreenIndex === 1) {
//         showScreenByIndex(0);
//         resetStartScreen();
//         return;
//     }
// });
//進むボタン
// btnNext?.addEventListener("click", () => {
//     requestAnimationFrame(() => {
//         const nextBtn = document.getElementById("btn-next");
//         nextBtn.disabled = false;
//         nextBtn.classList.remove("disabled");
//     });
//     // ★ start(0) → spinner(1) に進むとき初期化
//     if (currentScreenIndex === 0) {
//         showScreenByIndex(1); // spinner画面へ遷移
//         revealOnFirstClick();

//         // 各種状態を初期化
//         isSpinning = false;
//         alreadyClicked = false;
//         clickCount = 0;
//         resultArray = "";
//         document.getElementById("hexagram-build")?.replaceChildren();
//         document.getElementById("spinner-anim-wrapper")?.classList.remove("spinner-feedback");
//         hideInstructionTextInitial();
//         requestAnimationFrame(hideInstructionTextInitial);

//         updateFooterButtons();
//         return; // 他の分岐に入らず終了
//     }


//     if (shownVariantKeys.size > 0) return;

//     // ✅ 本卦（screen 2）から進む場合
//     if (currentScreenIndex === 2) {
//         if (!cachedChangedHexagram) {
//             // ✅ 初回：「今後の展開」 → スピナー
//             console.log("➡️ btnNext: screen-result（本卦）→ screen-future（スピナー）");
//             handleFutureExpansion(originalHexagram);
//             return;
//         } else {
//             // ✅ 2回目以降：直接 変爻へ
//             console.log("➡️ btnNext: screen-result（本卦）→ screen-henko（変爻）");

//             if (!snapshotArrayForHenko || snapshotArrayForHenko.length !== 6) {
//                 console.error("❌ 無効な resultArray:", snapshotArrayForHenko);
//                 alert("変爻の計算に失敗しました。もう一度占ってください。");
//                 return;
//             }

//             if (typeof cachedChangedLineIndex !== "number") {
//                 console.error("❌ cachedChangedLineIndex が未定義です");
//                 alert("変爻の位置が不明です。もう一度占ってください。");
//                 return;
//             }

//             displayChangedLine(cachedChangedLineIndex, originalHexagram);
//             showScreenByIndex(7);
//             return;
//         }
//     }

//     if (currentScreenIndex === 6 && cachedChangedHexagram) {
//         if (!snapshotArrayForHenko || snapshotArrayForHenko.length !== 6) return;
//         if (typeof cachedChangedLineIndex !== "number") return;
//         displayChangedLine(cachedChangedLineIndex, originalHexagram);
//         showScreenByIndex(7);
//         return;
//     }

//     if (currentScreenIndex === 7) {
//         showCachedChangedHexagram(originalHexagram);
//         currentScreenIndex = 8;
//         return;
//     }

//     if (currentScreenIndex === 8) {
//         showFinalFortuneScreenMobile({ skipConfetti: true });
//         return;
//     }

//     if (currentScreenIndex < maxVisitedScreenIndex) {
//         showScreenByIndex(currentScreenIndex + 1);
//     }
// });

//✅ 戻る、進むボタンを有効／無効（＝半透明）にする制御関数
// function updateFooterButtons() {
//     // ✅ デバッグ用ログを最初に追加
//     console.log("➡️ updateFooterButtons", {
//         currentScreenIndex,//現在位置
//         maxVisitedScreenIndex,//最大画面
//         shouldDisableNext://「進む」ボタンを無効にする条件式
//             currentScreenIndex >= maxVisitedScreenIndex ||
//             currentScreenIndex === 1 ||
//             currentScreenIndex === 6
//     });
//     // 「戻る」ボタン（属性として付与）
//     if (currentScreenIndex <= 0) {
//         btnBack.setAttribute("disabled", "true");
//     } else {
//         btnBack.removeAttribute("disabled");
//     }

//     // 「進む」ボタンの判定条件
//     const shouldDisableNext =
//         currentScreenIndex >= maxVisitedScreenIndex ||
//         currentScreenIndex === 1 ||
//         currentScreenIndex === 6;

//     // ✅ 進むボタンの状態更新
//     if (shouldDisableNext) {
//         btnNext.disabled = true;
//     } else {
//         btnNext.disabled = false;
//     };
// }

// 🔽 戻る、進む以外のフッターイベント定義（btnResetとbtnContact）
btnReset?.addEventListener("click", () => {
    location.reload();
});
btnContact?.addEventListener("click", () => {
    window.location.href = "feedback.html";
});

// //本卦からスピナーに戻るときのスピナーのリセット
// function resetCastingState() {
//     appPhase = 'casting';
//     clickCount = 0;
//     resultArray = '';
//     cachedHenkoHexagram = null;
//     cachedChangedLineIndex = null;
//     shownVariantKeys?.clear?.();

//     // 既知のワークアラウンド：スピナーは cloneNode でリセット
//     const old = document.getElementById('mainSpinner');
//     const fresh = old.cloneNode(true);
//     old.parentNode.replaceChild(fresh, old);

//     // キャスティング用のクリックハンドラだけを付け直す
//     fresh.addEventListener('click', () => {
//         if (appPhase !== 'casting') return;
//         handleSpinnerClickCasting(); // ←従来の「6回カウントして本卦を出す」処理
//     });
// }

//start専用リセット関数
// function resetStartScreen() {
//     // --- スピナー：自動再生しない静止状態に（初期と同じ見た目） ---
//     suppressLottiePlay = true;
//     try { animation?.destroy?.(); } catch (_) { }
//     animation = null;

//     const sp = document.getElementById('mainSpinner');
//     if (sp) {
//         sp.classList.remove('hidden', 'inactive');
//         sp.style.display = 'block';  // 初期が非表示なら 'none' に変更
//     }
//     const wrapper = document.getElementById('spinner-anim-wrapper');
//     wrapper?.classList.remove('spinner-zoom-in', 'spinner-feedback');

//     if (typeof initSpinnerScreen === 'function') initSpinnerScreen();
//     try {
//         animation?.goToAndStop?.(0, true);
//         animation?.pause?.();
//     } catch (_) { }

//     // --- koResult を完全リセット：DOMごと置換→空＆hidden ---
//     (function resetKoResult() {
//         let el = document.getElementById('koResult');
//         if (!el) return;
//         const fresh = el.cloneNode(false); // 子要素・リスナごと一掃
//         fresh.id = 'koResult';
//         // 初期クラス（あなたの初期HTMLに合わせる）
//         fresh.className = 'ko-result line hidden';
//         // aria-live は初期HTMLの通りに
//         fresh.setAttribute('aria-live', 'polite');
//         el.replaceWith(fresh);
//     })();

//     // --- instructionText を完全リセット：DOMごと置換→空＆hidden ---
//     (function resetInstructionText() {
//         let el = document.getElementById('instructionText');
//         if (!el) return;
//         const fresh = el.cloneNode(false);
//         fresh.id = 'instructionText';
//         fresh.className = 'instruction hidden';
//         // 内部フラグやdata-*の残滓を断つ
//         fresh._locked = false;
//         el.replaceWith(fresh);
//     })();

//     // --- 途中まで積んだ爻・UIをクリア ---
//     document.getElementById('hexagram-build')?.replaceChildren();

//     // --- Startの案内（CTA）を初期表示に戻す ---
//     document.getElementById('startInstruction')
//         ?.classList.replace('hidden', 'visible');

//     // 「タップ誘導」は初期は出さない
//     try { hideTapHelper?.({ immediate: true }); } catch (_) { }

//     // Startボタン系を表示（存在する方だけ）
//     document.getElementById('btn-start')
//         ?.classList.remove('hidden', 'inactive');
//     document.querySelector('[data-action="start"]')
//         ?.classList.remove('hidden', 'inactive');

//     // --- 進行ステートを初期化（“情報が存在しない”状態へ） ---
//     isSpinning = false;
//     alreadyClicked = false;
//     clickCount = 0;
//     resultArray = '';
//     snapshotArrayForHenko = null;
//     cachedChangedLineIndex = null;
//     cachedChangedHexagram = null;
//     try { shownVariantKeys?.clear?.(); } catch (_) { }

//     // クリック履歴・一時値も消す（存在すれば）
//     try {
//         if (Array.isArray(clickHistory)) clickHistory.length = 0;
//         lastClickBit = undefined;
//         lastClickTimestamp = undefined;
//         spinStartTime = undefined;
//         yinYangBit = undefined;
//         currentFrameOnStop = undefined;
//     } catch (_) { }

//     // --- 遅延で何かを書き戻すルートを遮断（タイマー/RAF） ---
//     try {
//         if (window._spinnerTimers && window._spinnerTimers.size) {
//             for (const id of _spinnerTimers) clearTimeout(id);
//             _spinnerTimers.clear();
//         }
//         if (typeof _spinnerIntervalId !== 'undefined' && _spinnerIntervalId) {
//             clearInterval(_spinnerIntervalId);
//             _spinnerIntervalId = null;
//         }
//         if (typeof _spinnerRafId !== 'undefined' && _spinnerRafId) {
//             cancelAnimationFrame(_spinnerRafId);
//             _spinnerRafId = null;
//         }
//     } catch (_) { }
//     if (typeof _guideTimer !== 'undefined' && _guideTimer) {
//         clearTimeout(_guideTimer);
//         _guideTimer = null;
//     }
//     // ★ クリックを許可（前周のロックを解除）
//     if (typeof _spinnerLocked !== 'undefined') _spinnerLocked = false;

//     // 念のため hex の表示も初期に戻す（hiddenは外さない。表示は初回クリックで）
//     const hex = document.getElementById('hexagram-build');
//     if (hex) {
//         hex.style.removeProperty('display');
//         // ここでは hidden を付けない/外さない（表示タイミングはクリックで制御）
//     }
// }

// //ガイドとhexをvisibleにする関数
// function revealOnFirstClick() {
//     // ★ hex を表示（hidden 解除）
//     ['hexagram-build', 'hexagram', 'hexagram-wrap'].forEach(id => {
//         const el = document.getElementById(id);
//         if (el) {
//             el.classList.remove('hidden', 'hide');
//             el.style.removeProperty('display');
//         }
//     });

//     // ★ koResult を“表示可能”状態に（中身は updateInstruction が入れる）
//     const ko = document.getElementById('koResult');
//     if (ko) {
//         ko.classList.remove('hidden', 'hide');
//         // show は付けない：updateInstruction が付与・制御する
//         // 中身は空のままでOK（updateInstruction が書く）
//     }
// }

// //ガイドを空にする関数
// function hideInstructionTextInitial() {
//     const guide = document.getElementById('instructionText');
//     if (!guide) return;
//     guide.classList.add('hidden');   // 見た目を消す
//     guide.classList.remove('show', 'visible', 'hide', 'locked');
//     guide._locked = false;           // ロック解除
//     guide.textContent = '';          // 中身を空に（＝情報未取得に戻す）
//     // 残滓になりうるデータ属性も掃除
//     try {
//         delete guide.dataset.step;
//         delete guide.dataset.ready;
//         delete guide.dataset.state;
//     } catch (_) { }
// }

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