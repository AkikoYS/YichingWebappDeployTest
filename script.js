
import { auth, db, firebaseReady, onAuthStateChanged, provider } from "./firebase/firebase.js";
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";


// ============1 初期設定 ===========
//状況管理用関数
let result;
let isSpinning = false; // 回転中かどうか
let clickCount = 0; // クリック回数（最大６）
let resultArray = ""; // 結果の配列
let clickTime = 0; // 最後のクリック時刻
let alreadyClicked = false;//クリック済みかどうかのフラグ
let selectedHexagram = null;//現在表示されている卦
let originalHexagram = null;//最初に表示された卦（本卦）
let futureExpansionUsed = false;//今後の展開が行われたか？
let cachedChangedHexagram = null;//変爻の一時保存
let cachedChangedLineIndex = null; // ✅ 追加: 変爻のインデックス
let shownVariantKeys = new Set();  // ✅ 追加: バリアント表示履歴
let originalProgressMessages = [];//本卦の進行状況メッセージの保存
let currentRotation = 0;
let finalFortuneReady = false;// ← 総合的な易断ボタン表示の可否管理
let currentPdfUri = null;
let saveButton = null;
let userQuestion = "";
let currentUser = null;
let isRestoringFromTemp = false; // ✅ 復元中フラグ

// 🔽 占いの状態を復元（最初に呼び出す）
document.addEventListener("DOMContentLoaded", () => {
    result = document.getElementById("result");
    restoreFortuneFromTemp();
});

// Firebase 初期化後にユーザー状態を監視
firebaseReady.then(() => {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) {
            console.log("✅ ログイン中:", user.email || "匿名ユーザー");
        } else {
            console.log("🕳 未ログイン状態です");
        }
    });
});

// ============ 2. DOM取得 ===========
const resetButton = document.getElementById("reset-button");
const spinnerContainer = document.getElementById("lottie-spinner");
const progressContainer = document.getElementById("progress-container");
const questionInput = document.getElementById("question-input");
const warningText = document.getElementById("question-warning");


// ============3-1 スピナー初期化 ===========
// Lottieアニメーションの設定（スピナー初期化）
const spinnerAnimation = lottie.loadAnimation({
    container: spinnerContainer,
    renderer: 'svg',
    loop: true,
    autoplay: false,
    path: 'assets/animations/spinner-animation.json',
    rendererSettings: {
        preserveAspectRatio: 'none' // ← これがポイント！
    }
});

// ============4 ユーティリティ関数（ほかの処理をたすける） ===========
//ルビ
function applyRubyToHexagramNamesWithJson(html, hexagramList) {
    hexagramList.forEach(hex => {
        const name = hex.name;
        const reading = hex.reading;

        // 正規表現で全体を置換（重複や含まれがちな名前も対応）
        const rubyTag = `<ruby>${name}<rt>${reading}</rt></ruby>`;
        const nameRegex = new RegExp(name, "g");
        html = html.replace(nameRegex, rubyTag);
    });
    return html;
}
//進行状況メッセージを初期化
function initializeProgressMessages() {
    progressContainer.innerHTML = "";

    for (let i = 0; i < 6; i++) {
        const div = document.createElement("div");
        div.className = "spinner-progress-message";
        div.id = `progress-line-${i}`;
        div.innerHTML = "";
        progressContainer.appendChild(div);
    }
}
//本卦の進行状況メッセージ
function restoreOriginalProgressMessages() {
    if (!originalProgressMessages || originalProgressMessages.length !== 6) {
        console.warn("originalProgressMessages が正しく保存されていません。");
        return;
    }
    for (let i = 0; i < 6; i++) {
        const targetLine = document.getElementById(`progress-line-${i}`);
        if (targetLine) {
            targetLine.innerHTML = originalProgressMessages[i];
            targetLine.style.color = "";       // 赤色などをリセット
            targetLine.style.fontWeight = "";  // 太字もリセット
        }
    }
}
//保存された進行状況メッセージ
function saveOriginalProgressMessages() {
    originalProgressMessages = []; // リセット
    for (let i = 0; i < 6; i++) {
        const line = document.getElementById(`progress-line-${i}`);
        if (line) {
            originalProgressMessages.push(line.innerHTML);
        }
    }
}
//スピナー縮小（PC用）
function shrinkSpinnerForPC() {
    const spinner = document.getElementById("lottie-spinner");
    if (!spinner) return;

    if (window.innerWidth > 768) {
        spinner.classList.remove("spinner-expand");
        void spinner.offsetWidth;
        spinner.classList.add("spinner-shrink");
    } else {
        spinner.classList.remove("spinner-appear");
        void spinner.offsetWidth;
        spinner.classList.add("spinner-disappear");
    }
}
//スピナー拡大（PC用）
function expandSpinnerForPC() {
    const spinner = document.getElementById("lottie-spinner");
    if (!spinner) return;

    if (window.innerWidth > 768) {
        spinner.classList.remove("spinner-shrink");
        void spinner.offsetWidth;
        spinner.classList.add("spinner-expand");

    } else {
        spinner.classList.remove("spinner-disappear");
        void spinner.offsetWidth;
        spinner.classList.add("spinner-appear");
    }
}
// ✅ スピナーをふわっと表示（再拡大、スマホ）
function showSpinnerAnimated() {
    const spinner = document.getElementById('lottie-spinner');
    if (!spinner) return;

    spinner.style.display = 'block';
    spinner.classList.remove('spinner-disappear');
    void spinner.offsetWidth; // ← 再描画トリガー
    spinner.classList.add('spinner-appear');
}
// ✅ スピナーをふわっと縮小して非表示(スマホ)
function hideSpinnerAnimated() {
    const spinner = document.getElementById('lottie-spinner');
    if (!spinner) return;

    spinner.classList.remove('spinner-appear');
    void spinner.offsetWidth;
    spinner.classList.add('spinner-disappear');

    setTimeout(() => {
        spinner.style.display = 'none';
    }, 600); // CSSのアニメ時間と一致
}
// ✅ スピナーのリセット
function resetSpinnerState() {
    const spinner = document.getElementById("lottie-spinner");
    if (spinner) {
        spinner.classList.remove("spinner-shrink", "spinner-expand");
        spinner.style.width = "280px";
        spinner.style.height = "280px";
        spinner.style.marginTop = "0";
        spinner.style.marginBottom = "20px";
        spinner.style.transform = "none";
        spinner.style.display = "block";
    }
}
// ✅ 結果表示をふわっとせり上げる
function revealResult() {
    const result = document.getElementById('result');
    if (!result) return;

    result.classList.add('result-reveal');
}
//総合的な易断ボタン生成の条件
function allVariantsShown() {
    return cachedChangedHexagram !== null;
}
//易断ボタンの表示、非表示
function maybeShowFinalFortuneButton() {
    // 変卦が決定していることを確認（変爻だけでなく変卦）
    console.log("✅ maybeShowFinalFortuneButton 実行", cachedChangedHexagram);
    if (!cachedChangedHexagram) return;

    let finalButton = document.getElementById("final-fortune-button");

    // ボタンが存在しないなら生成して追加
    if (!finalButton) {
        finalButton = document.createElement("button");
        finalButton.id = "final-fortune-button";
        finalButton.textContent = "総合的な易断を見る";
        finalButton.className = "variant-button";
        finalButton.onclick = () => {
            playSoundEffect("assets/sounds/click_final.mp3");
            displayFinalFortune();
        }

        const result = document.getElementById("result");
        if (result) {
            // ✅ 他のボタンの下に配置
            const variantButtons = document.getElementById("variant-buttons");
            if (variantButtons && variantButtons.parentNode === result) {
                result.insertBefore(finalButton, variantButtons.nextSibling);
            } else {
                result.appendChild(finalButton);
            }
            console.log("✅ ボタンを result に追加しました");
        } else {
            console.warn("⚠️ result が存在しません");
        }
    } else {
        console.log("✅ 既存のボタンを使用");
    }

    // 表示を有効にする
    finalButton.style.display = "block";
    console.log("✅ ボタンを表示しました");
}
//h2テキストのアップデート
function updateInstructionText(text) {
    const instructionText = document.getElementById("instructionText");
    if (instructionText) {
        instructionText.textContent = text;
    }
}
//スピナーと進行状況メッセージを非表示にする
function hideSpinnerAndProgress() {
    const spinnerContainer = document.getElementById("lottie-spinner");
    if (spinnerContainer) spinnerContainer.style.display = "none";

    const progressContainer = document.getElementById("progress-container");
    if (progressContainer) progressContainer.style.display = "none";
}
//補助関数
function triggerPdfDownload(uri) {
    const link = document.createElement("a");
    link.href = uri;
    link.download = "易断結果.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
//トースト表示
function showToast(message, options = {}) {
    const {
        id = null,
        duration = 4000,
        isWarning = false,
        buttonText = null,
        buttonCallback = null
    } = options;

    if (id && document.getElementById(id)) return;

    const toast = document.createElement("div");
    if (id) toast.id = id;

    toast.classList.add("custom-toast");
    toast.style.background = "#666666";
    toast.style.color = "#fff";

    const messageElem = document.createElement("span");
    messageElem.textContent = message;
    toast.appendChild(messageElem);

    if (buttonText && typeof buttonCallback === "function") {
        const button = document.createElement("button");
        button.textContent = buttonText;
        button.style.padding = "6px 12px";
        button.style.border = "none";
        button.style.borderRadius = "4px";
        button.style.background = "#4caf50";
        button.style.color = "#fff";
        button.style.cursor = "pointer";
        button.onclick = () => {
            buttonCallback();
            toast.remove();
        };
        toast.appendChild(button);
    }

    // ✅ トーストコンテナに追加（なければ作る）
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.style.position = "fixed";
        container.style.bottom = "20px";
        container.style.right = "20px";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "12px";
        container.style.zIndex = "9999";
        document.body.appendChild(container);
    }

    // スタイル調整
    toast.style.padding = "12px 16px";
    toast.style.borderRadius = "8px";
    toast.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
    toast.style.fontSize = "0.95em";
    toast.style.display = "flex";
    toast.style.alignItems = "center";
    toast.style.gap = "12px";
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s ease";

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = "1";
    });

    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
//保存関数
function saveFortuneToTemp() {
    const state = {
        originalHexagram,
        cachedChangedHexagram,
        cachedChangedLineIndex,
        selectedHexagram,
        userQuestion
    };
    localStorage.setItem("iching_fortune_temp", JSON.stringify(state));
    console.log("✅ 状態を一時保存しました");
}
//復元関数
function restoreFortuneFromTemp() {
    const saved = localStorage.getItem("iching_fortune_temp");
    if (!saved) return;

    try {
        const state = JSON.parse(saved);

        // ✅ 入力が完了していない状態では復元しない（初回アクセス防止）
        if (!state.userQuestion || state.userQuestion.trim() === "") {
            console.log("🔁 復元スキップ: 占い内容が空です");
            return;
        }

        // ✅ 本当に初回（スピナーが1回もクリックされていない）なら復元しない
        if (clickCount === 0) {
            console.log("🔁 復元スキップ: まだ占いが始まっていません");
            return;
        }

        originalHexagram = state.originalHexagram;
        cachedChangedHexagram = state.cachedChangedHexagram;
        cachedChangedLineIndex = state.cachedChangedLineIndex;
        selectedHexagram = state.selectedHexagram;
        userQuestion = state.userQuestion;

        isRestoringFromTemp = true;
        showHexagram(originalHexagram, true);
        showVariantButtons(originalHexagram);
        maybeShowFinalFortuneButton();
        isRestoringFromTemp = false;

        console.log("✅ 占い状態を復元しました");
    } catch (e) {
        console.error("❌ 復元エラー:", e);
    }

}
// ✅ スピナー停止時に音を鳴らす（beep）
function playSoundEffect(src) {
    const audio = new Audio(src);
    audio.volume = 0.5; // 音量（0〜1で調整）
    audio.play();
}

// ===== 5. 表示処理 =====
// 卦の表示処理の関数（まずスピナー縮小）
function showHexagram(hexagram, isOriginal = false) {
    if (!result) {
        console.warn("❌ result が未定義です");
        return;
    }
    selectedHexagram = hexagram;

    // ✅ スピナーを縮小（スマホは消す）→ 結果表示を後にまわす
    if (isOriginal && window.innerWidth <= 768) {
        hideSpinnerAnimated();
        setTimeout(() => renderHexagramHTML(hexagram, isOriginal), 600); // アニメーション完了後に表示
    } else {
        shrinkSpinnerForPC();
        setTimeout(() => renderHexagramHTML(hexagram, isOriginal), 600);
    }
}
// 卦の表示処理（次に結果が表示）
function renderHexagramHTML(hexagram, isOriginal) {
    result.innerHTML = createHexagramHTML(hexagram);
    updateResultBorder();

    // ✅ 1回だけ originalHexagram に保存
    if (isOriginal && !originalHexagram) {
        originalHexagram = hexagram;

        // ✅ 本卦としての進行状況メッセージを保存
        originalProgressMessages = [];
        const progressLines = Array.from(progressContainer.children);
        for (let line of progressLines) {
            originalProgressMessages.push(line.innerHTML);
        }
    }

    if (!isOriginal && originalHexagram) {
        const backButton = createBackToOriginalButton();
        result.appendChild(backButton);
    }

    if (isOriginal) {
        showVariantButtons(hexagram);
    }
    // ✅ 🔽🔽🔽 必ず描画後に実行する！
    setTimeout(() => {
        maybeShowFinalFortuneButton();
    }, 0); // 0msでも「描画
}

//卦の結果を示すHTML構成の関数
function createHexagramHTML(hexagram) {
    const description = hexagram.description || "説明は準備中です";
    const formattedDescription = description.replace(/\n/g, "<br>");
    // ✅ name にルビを振る
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
//「本卦に戻る」ボタン生成関数
function createBackToOriginalButton() {
    const button = document.createElement("button");
    button.textContent = "本卦に戻る";
    button.className = "variant-button";
    button.id = "back-to-original-button";
    button.onclick = () => {
        playSoundEffect("assets/sounds/click_button.mp3");
        const existingBackButton = document.getElementById("back-to-original-button");
        if (existingBackButton) existingBackButton.remove();

        result.innerHTML = "";
        updateResultBorder();

        if (originalHexagram) {
            selectedHexagram = originalHexagram;
            shownVariantKeys.clear();
            futureExpansionUsed = false;

            // ✅ 進行状況メッセージを先に復元する
            restoreOriginalProgressMessages();

            // ✅ 本卦を表示
            showHexagram(originalHexagram, true);

            // ✅ 総合的な易断の条件が整っているときだけ h2 を更新
            const instructionText = document.getElementById("instructionText");
            if (instructionText && allVariantsShown()) {
                instructionText.textContent = "総合的な易断がととのいました";
            };

            // ✅ バリアントボタンを再生成
            showVariantButtons(originalHexagram);
            maybeShowFinalFortuneButton();

        } else {
            result.innerHTML = `<div class='error-message'>本卦のデータが存在しません。</div>`;
            console.error("originalHexagram is not defined");
        }
    };
    return button;
}
// VariantButtons（4つ）表示の関数
function showVariantButtons(originalHexagram) {
    // VariantButtonsがすでに表示されていれば削除
    const existing = document.getElementById("variant-buttons");
    if (existing) existing.remove();

    const wrapper = document.createElement("div");
    wrapper.className = "variant-button-wrapper";
    wrapper.id = "variant-buttons";

    const variants = [
        { label: "今後の展開", key: "future-expansion" },
        { label: "裏の意味", key: "reverse" },
        { label: "客観的に運命を見ると", key: "sou" },
        { label: "卦の本質は", key: "go" }
    ];

    variants.forEach(variant => {
        const button = document.createElement("button");
        button.textContent = variant.label;
        button.classList.add("variant-button");

        button.onclick = () => {
            playSoundEffect("assets/sounds/click_button.mp3")// ボタン音
            const buttonContainer = document.getElementById("variant-buttons");
            if (buttonContainer) buttonContainer.remove();

            if (variant.key === "future-expansion") {
                handleFutureExpansion(originalHexagram);
            } else {
                const variantHex = sixtyFourHexagrams.find(h => h.number === selectedHexagram[variant.key]);
                if (variantHex) {
                    if (!shownVariantKeys.has(variant.key)) {
                        result.innerHTML = `<div class="waiting-message">占い結果を読み取っています...</div>`;
                        updateResultBorder();
                        setTimeout(() => {
                            showHexagram(variantHex);
                            shownVariantKeys.add(variant.key);
                        }, 1000);
                    } else {
                        showHexagram(variantHex);
                    }
                }
            }
        };

        wrapper.appendChild(button);
    });

    // 💡 総合的な易断ボタン（あらかじめ追加、非表示にしておく）
    const finalBtn = document.createElement("button");
    finalBtn.id = "final-fortune-button";
    finalBtn.textContent = "総合的な易断";
    finalBtn.classList.add("variant-button");
    finalBtn.style.display = "none"; // ← 初期は非表示
    finalBtn.onclick = () => {
        playSoundEffect("assets/sounds/click_final.mp3");
        displayFinalFortune();
    }

    // ボタンを一段下に配置（全体で一括append）
    result.appendChild(wrapper);
    result.appendChild(finalBtn);

    // ボタンの表示を判定して切り替える
    maybeShowFinalFortuneButton();
}
//結果ボーダー関数
function updateResultBorder() {
    if (result.innerHTML.trim() === "") {
        result.style.border = "none";
        result.style.height = "0";
        result.style.padding = "0";
        result.style.margin = "0";
        result.style.background = "transparent";
        result.style.boxShadow = "none";
    } else {
        result.style.border = "1px solid #ccc";
        result.style.background = "#ffffff";
        result.style.borderRadius = "10px";
        result.style.marginTop = "30px";
        result.style.padding = "20px";
        result.style.maxWidth = "700px";
        result.style.marginLeft = "auto";
        result.style.marginRight = "auto";
        result.style.boxShadow = "0 0 10px rgba(0,0,0,0.1)";
        result.style.height = "auto";
    }
}
//googleログインを促すトースト表示
export function handleLoginRequiredAction(callback) {
    firebaseReady.then(async () => {
        if (auth.currentUser) {
            callback(); // ✅ ログイン済みなら処理続行
        } else {
            showToast("この操作にはGoogleログインが必要です", {
                id: "login-toast",
                isWarning: true,
                buttonText: "🔐 ログイン",
                buttonCallback: async () => {
                    try {
                        await signInWithPopup(auth, provider);
                        console.log("✅ Googleログイン成功");
                        callback(); // ログイン後に再実行
                    } catch (error) {
                        console.error("❌ Googleログイン失敗:", error);
                        showToast("❌ Googleログインに失敗しました", {
                            isWarning: true,
                            duration: 5000
                        });
                    }
                }
            });
        }
    });
}

// ===== 6. 今後の展開関連処理 =====
// 今後の展開（変爻と変卦）の準備関数
function prepareForFutureExpansion() {
    result.innerHTML = "";
    updateResultBorder();
    const instructionText = document.getElementById("instructionText");
    if (!futureExpansionUsed && instructionText) {
        instructionText.innerHTML = "今度は１回だけクリック！";
    }
    spinnerAnimation.stop();
    isSpinning = false;
}
// 今後の展開（変卦）のメイン処理（１回目と２回目以降の分岐、易断ボタンを表示）
function handleFutureExpansion(originalHex) {
    if (!originalHex) originalHex = originalHexagram;
    resetButton.style.display = "none";

    const isFirstTime = !futureExpansionUsed && !cachedChangedHexagram;

    // ✅ スピナーを再表示（初回のみ）
    if (isFirstTime && window.innerWidth <= 768) {
        showSpinnerAnimated();
    } else {
        expandSpinnerForPC();
    }

    // ✅ 初回 or キャッシュ表示
    if (isFirstTime) {
        setupSpinnerForChangedHexagram(originalHex);
    } else {
        showCachedChangedHexagram(originalHex);
    }

    // ✅ バリアント表示記録＆ボタン表示（ここは共通）
    shownVariantKeys.add("future-expansion");
    maybeShowFinalFortuneButton();
}
//今後の展開ボタン１回目クリック後のセットアップ処理
function setupSpinnerForChangedHexagram(originalHex) {
    prepareForFutureExpansion();//スピナーやresultをリセットしておく
    futureExpansionUsed = true;//１回目のボタンを押したことにする

    //arrayが6桁ない場合はエラーを返す（用心）
    if (resultArray.length !== 6) {
        console.error("正しい卦が得られていません。6桁の陰陽データが必要です。");
        result.innerHTML = `<div class="error-message">卦のデータが不足しています。</div>`;
        return;
    }
    startChangedHexagramSpin(originalHex);
}

//今後の展開ボタン１回目クリックにより変爻と変卦を決めるロジック
function startChangedHexagramSpin(originalHex) {
    let clickedOnce = false;//１回目と2回目のクリックを区別

    spinnerContainer.onclick = () => {
        if (!clickedOnce) {
            spinnerAnimation.play();
            isSpinning = true;
            clickedOnce = true;
            return;
        }
        spinnerAnimation.goToAndStop(spinnerAnimation.currentFrame, true);
        isSpinning = false;
        playSoundEffect("assets/sounds/click.mp3");

        //ランダムな位置で爻を反転させ、変卦を生成
        cachedChangedLineIndex = Math.floor(Math.random() * 6);
        const changedArray = resultArray.split("").map((bit, i) =>
            i === cachedChangedLineIndex ? (bit === "0" ? "1" : "0") : bit
        );
        const changedArrayString = changedArray.join("");
        const hexagramCandidate = getHexagramByArray(changedArrayString);

        if (!hexagramCandidate) {
            console.error("変卦が見つかりませんでした: ", changedArrayString);
            result.innerHTML = `<div class="error-message">変卦が見つかりませんでした（${changedArrayString}）</div>`;
        } else {
            cachedChangedHexagram = hexagramCandidate;
            finalFortuneReady = true;
            displayChangedLine(cachedChangedLineIndex, originalHex);
        }
        spinnerContainer.onclick = null; //クリックイベントを解除
    }
};

//今後の展開ボタンの2回目以降クリック処理
function showCachedChangedHexagram(originalHex) {
    if (cachedChangedHexagram) {
        const instructionText = document.getElementById("instructionText");
        if (instructionText) {
            instructionText.innerHTML = "もうすぐ総合的な運勢が出ます";
        }
        resetButton.style.display = "block";
        showChangedHexagram(cachedChangedHexagram, originalHex);
        maybeShowFinalFortuneButton();
    } else {
        console.warn("cachedChangedHexagram is null: 変卦が未生成の状態で2回目の展開が呼ばれました。");
        result.innerHTML = `<div class=\"error-message\">変卦データが存在しません。最初からやり直してください。</div>`;
    }
}

// 変爻の情報表示と、爻辞の表示処理
function displayChangedLine(index, hexagram) {
    const yaoNames = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];

    // 全ての progress-line の色と太字をリセット
    for (let i = 0; i < 6; i++) {
        const line = document.getElementById(`progress-line-${i}`);
        if (line) {
            line.style.color = "";
            line.style.fontWeight = "";
        }
    }
    // 対象の爻を赤く太字にする
    const targetLine = document.getElementById(`progress-line-${index}`);
    if (targetLine) {
        targetLine.style.color = "#c9302c";
        targetLine.style.fontWeight = "bold";
    }

    // 結果表示(テキストとSVG)
    result.innerHTML = `
    <div style="text-align:center;">
        <strong>変爻は${yaoNames[index]}です</strong>
    </div>
`;

    // ✅ スピナーをふわっと消す)(スマホ)/縮小する（PC）
    if (window.innerWidth <= 768) {
        hideSpinnerAnimated();
    } else {
        shrinkSpinnerForPC();
    }

    updateResultBorder();

    setTimeout(() => {
        const instructionText = document.getElementById("instructionText");
        if (instructionText) {
            instructionText.innerHTML = "もうすぐ総合的な運勢が出ます...";
        }

        const yaoText = hexagram.yao_descriptions?.[(index + 1).toString()] || "該当する爻辞が見つかりません。";
        const nameWithRuby = `<ruby>${hexagram.name}<rt>${hexagram.reading}</rt></ruby>`;
        const yaoName = yaoNames[index];
        const title = `第${hexagram.number}卦：${nameWithRuby} の ${yaoName}`;
        const svgPath = `assets/images/hexagram_lines/${hexagram.number}_${index + 1}.svg`;
        // ✅ ここで画像の読み込み確認
        const img = new Image();
        img.src = svgPath;
        img.onload = () => console.log("✅ 画像読み込み成功:", svgPath);
        img.onerror = () => console.error("❌ 画像読み込み失敗:", svgPath);

        result.innerHTML = `
            <div class="hexagram-title">${title}</div>
            <div class="description-text-henko">${yaoText}</div>
                    <div class="hexagram-svg">
            <img src="${svgPath}" alt="卦象 第${hexagram.number}卦 ${yaoNames[index]}" style="width: 80px; height: auto;"></div>
        </div>
        `;
        createFutureButton(hexagram, index);
    }, 1500);
}

//「長い目で見るとどうなるか？」ボタン作成
function createFutureButton(originalHexagram, index) {
    const button = document.createElement("button");
    button.textContent = "長い目で見るとどうなる？";
    button.classList.add("variant-button");
    button.style.display = "block";
    button.style.margin = "20px auto";
    button.onclick = () => {
        playSoundEffect("assets/sounds/click_button.mp3");
        toggleYinYangAtIndex(index);
        const changedArray = resultArray.split("").map((bit, i) =>
            i === index ? (bit === "0" ? "1" : "0") : bit
        );
        const changedHexagram = getHexagramByArray(changedArray.join(""));
        cachedChangedHexagram = changedHexagram;

        showChangedHexagram(changedHexagram, originalHexagram, true);

    };
    result.appendChild(button);
}

//変卦の表示処理（遅延あるなし）
function showChangedHexagram(hexagram, originalHexagram, delay = false) {
    if (delay) {
        result.innerHTML = `<div class="waiting-message">占い結果が表示されます...</div>`;
        updateResultBorder();
        setTimeout(() => {
            if (hexagram) {
                showHexagram(hexagram);
                resetButton.style.display = "none";

                maybeShowFinalFortuneButton();
            } else {
                result.innerHTML = `<div class="error-message">該当する変卦が見つかりませんでした。</div>`;
            }
        }, 1000);
    } else {
        if (hexagram) {
            showHexagram(hexagram);
            resetButton.style.display = "none";

        } else {
            result.innerHTML = `<div class="error-message">該当する変卦が見つかりませんでした。</div>`;
        }
    }

}
// 爻の陰陽を反転させる関数
function toggleYinYangAtIndex(index) {
    const line = document.getElementById(`progress-line-${index}`);
    if (!line) return;

    if (line.innerHTML.includes("陰")) {
        line.innerHTML = line.innerHTML.replace("陰", "<strong>陽</strong>");
    } else if (line.innerHTML.includes("陽")) {
        line.innerHTML = line.innerHTML.replace("陽", "<strong>陰</strong>");
    }

    // スタイルは維持（赤・太字のまま）
    line.style.color = "#c9302c";
    line.style.fontWeight = "bold";
}

// ===== 7. イベントハンドラ =====
//占い開始ボタン
document.getElementById("start-button").addEventListener("click", async () => {
    playSoundEffect("assets/sounds/click_button.mp3")
    const input = document.getElementById("question-input");
    userQuestion = input.value.trim();

    // 入力チェック（50文字以内）
    if (userQuestion.length > 50) {
        document.getElementById("question-warning").style.display = "block";
        return;
    }

    // // ✅ localStorage に保存（ai-advice.html 用）
    // localStorage.setItem("userQuestion", userQuestion);

    // // ✅ Firestore に保存（ログイン済み想定）
    // try {
    //     const user = auth.currentUser;
    //     const userId = user ? user.uid : "anonymous";

    //     await addDoc(collection(db, "ai_requests"), {
    //         userId: userId,
    //         question: userQuestion,
    //         createdAt: new Date()
    //     });

    //     console.log("✅ Firestore に保存されました");

    // } catch (error) {
    //     console.error("❌ Firestore 保存エラー:", error);
    // }

    // ➡️ 既存のフェードイン・アウト処理
    const questionSection = document.getElementById("question-section");
    const mainApp = document.getElementById("main-app");

    questionSection.classList.remove("show");

    setTimeout(() => {
        questionSection.style.display = "none";
        mainApp.style.display = "block";

        setTimeout(() => {
            mainApp.classList.add("show");
        }, 20);
    }, 1000);
});
//占う内容が制限文字数を超えた警告
questionInput.addEventListener("input", () => {
    if (questionInput.value.length > 50) {
        warningText.style.display = "block";
    } else {
        warningText.style.display = "none";
    }
});
//スピナー処理
spinnerContainer.addEventListener("click", () => {
    if (alreadyClicked) return;

    if (!isSpinning) {
        isSpinning = true;
        clickTime = Date.now();
        spinnerAnimation.play();
        if (clickCount === 0) {
            initializeProgressMessages();  // ✅ 最初のクリック時に6行の空行を用意
        }

    } else {
        playSoundEffect("assets/sounds/click.mp3")// 停止処理（beep付き）
        isSpinning = false;
        const currentFrame = spinnerAnimation.currentFrame;
        spinnerAnimation.goToAndStop(currentFrame, true);

        const yinYang = Math.random() < 0.5 ? "0" : "1";
        resultArray += yinYang;
        clickCount++;

        const progress = getProgressMessage(clickCount, yinYang);
        setTimeout(() => {
            const targetLine = document.getElementById(`progress-line-${clickCount - 1}`);
            if (targetLine) {
                targetLine.innerHTML = progress;
            }
        }, 200);

        if (clickCount >= 6) {
            setTimeout(() => {
                result.innerHTML = `<div class="waiting-message">本卦を表示します...</div>`;
                updateResultBorder();

                setTimeout(() => {
                    const instructionText = document.getElementById("instructionText");
                    if (instructionText) {
                        instructionText.textContent = "今後の展開ボタンを押したら、もう一度スピナーが出てきます";
                    }
                    selectedHexagram = getHexagramByArray(resultArray);
                    originalHexagram = selectedHexagram;
                    if (selectedHexagram) {
                        showHexagram(selectedHexagram, true);
                        saveOriginalProgressMessages();
                        showVariantButtons(originalHexagram);
                    } else {
                        result.innerHTML = `<div class="error-message">該当する卦が見つかりませんでした（${resultArray}）</div>`;
                    }
                    updateResultBorder();
                    resetButton.style.display = "none";
                }, 1500);
            }, 500);

            alreadyClicked = true;
        }
    }
});

//リセットボタンによる初期化（もう一度占う）
resetButton.style.display = "none";
resetButton.addEventListener("click", () => {
    playSoundEffect("assets/sounds/click_button.mp3");
    // 🔁 保存ボタン初期化・非表示
    const saveButton = document.getElementById("save-button");
    if (saveButton) {
        saveButton.disabled = false;
        saveButton.style.opacity = 1;
        saveButton.textContent = "▶️ 出た卦をログに保存";
        saveButton.style.backgroundColor = "";
        saveButton.style.display = "none"; // 非表示にするなら最後に
    }
    // 🔁 スピナー状態のリセット
    resetSpinnerState();

    // 🔁 AI助言ボックス（CTA）を削除
    const ctaBox = document.querySelector(".ai-cta-box");
    if (ctaBox) ctaBox.remove();

    // 🔁 総合的な易断ボタンを削除
    const finalButton = document.getElementById("final-fortune-button");
    if (finalButton) finalButton.remove();

    // 🔁 結果・進行状況・アニメーションのリセット
    document.getElementById("progress-container").innerHTML = '';
    result.innerHTML = "";
    spinnerAnimation.stop();
    currentRotation = 0;
    updateResultBorder();

    // 🔁 変数の初期化
    clickCount = 0;
    resultArray = "";
    alreadyClicked = false;
    isSpinning = false;
    cachedChangedHexagram = null;
    cachedChangedLineIndex = null;
    shownVariantKeys.clear();
    selectedHexagram = null;
    originalProgressMessages = [];

    // 🔁 「保存済メッセージ」が残っていれば削除
    const saveNotice = document.querySelector(".save-notice");
    if (saveNotice) saveNotice.remove();
    // ✅ スピナーと進行状況メッセージを再表示
    const spinnerContainer = document.getElementById("lottie-spinner");
    if (spinnerContainer) {
        spinnerContainer.style.display = "block";
    }
    const progressContainer = document.getElementById("progress-container");
    if (progressContainer) {
        progressContainer.style.display = "flex";
    }
    //h2テキスト初期化
    const instructionText = document.getElementById("instructionText");
    if (instructionText) {
        instructionText.innerHTML = "こころに念じながら６回クリックしてください";
    }
    // ✅ 表示を最初の画面に戻す
    const questionSection = document.getElementById("question-section");
    const mainApp = document.getElementById("main-app");
    // ✅ 占いたい内容の入力欄をクリア
    const questionInput = document.getElementById("question-input");
    if (questionInput) {
        questionInput.value = "";
    }
    resetButton.style.display = "none"; // ← 最後に再確認として
    // フェードアウト mainApp
    mainApp.classList.remove("show");
    setTimeout(() => {
        mainApp.style.display = "none";
        // フェードイン questionSection
        questionSection.style.display = "block";
        setTimeout(() => {
            questionSection.classList.add("show");
        }, 20);
    }, 1000);
});

// ===== 6. 総合的な易断表示処理 =====
//表示ボタンを押したときの処理（1.5秒で結果表示）
// ✅ displayFinalFortune: 総合易断の表示、保存ボタン表示、PDF生成は10秒後にモーダル確認
function displayFinalFortune() {
    if (!originalHexagram || !cachedChangedHexagram || cachedChangedLineIndex === null) {
        result.innerHTML = "<div class='error-message'>必要な情報がそろっていません。</div>";
        return;
    }
    updateInstructionText("卦を保存して記録を残しましょう");

    // ✅ 背景を暗くする
    const overlay = document.getElementById("fortune-overlay");
    overlay.classList.remove("hidden");
    overlay.classList.add("visible");

    setTimeout(() => {
        hideSpinnerAndProgress();

        const summaryHTML = generateFortuneSummaryHTML();
        // const rubyHTML = applyRubyToHexagramNamesWithJson(summaryHTML, sixtyFourHexagrams);
        result.innerHTML = summaryHTML;
        setTimeout(() => {
            const fortuneSummaryHTML = document.querySelector(".fortune-summary");
            const fortuneSummaryText = fortuneSummaryHTML?.innerText || "";
            localStorage.setItem("fortuneSummary", fortuneSummaryText);
            console.log("🌟 fortuneSummary 保存:", fortuneSummaryText);
        }, 100); // 少し遅らせてDOM反映を確実に

        const wrapper = document.getElementById("final-fortune-wrapper");
        const confettiDiv = document.getElementById("confetti-lottie");

        if (wrapper) {
            // 🌸 巻物展開
            wrapper.classList.remove("hidden");
            wrapper.classList.add("expanded");

            // 🌸 花吹雪アニメーション再生
            confettiDiv.innerHTML = "";
            confettiDiv.style.display = "block";
            lottie.loadAnimation({
                container: confettiDiv,
                renderer: "svg",
                loop: false,
                autoplay: true,
                path: "assets/animations/confetti.json" // 実パスに合わせて変更
            });
            overlay.classList.remove("visible");
            overlay.classList.add("hidden");

            // 一定時間後に非表示
            setTimeout(() => {
                confettiDiv.style.display = "none";

            }, 3000);
        }

        // 🌟 占い情報を保存
        const reverseHex = sixtyFourHexagrams.find(h => h.number === originalHexagram.reverse);
        const souHex = sixtyFourHexagrams.find(h => h.number === originalHexagram.sou);
        const goHex = sixtyFourHexagrams.find(h => h.number === originalHexagram.go);

        localStorage.setItem("userQuestion", userQuestion);
        localStorage.setItem("originalHexagram", JSON.stringify(originalHexagram));
        localStorage.setItem("changedHexagram", JSON.stringify(cachedChangedHexagram));
        localStorage.setItem("reverseHexagram", JSON.stringify(reverseHex));
        localStorage.setItem("souHexagram", JSON.stringify(souHex));
        localStorage.setItem("goHexagram", JSON.stringify(goHex));
        localStorage.setItem("changedLineIndex", cachedChangedLineIndex);
        console.log("保存内容確認:", {
            userQuestion,
            originalHexagram,
            cachedChangedHexagram,
            reverseHex,
            souHex,
            goHex,
            cachedChangedLineIndex
        });

        renderSaveButton();

        // ✅ CTAを保存ボタンの上に追加（遅延して安全に）
        setTimeout(() => {
            const saveButton = document.getElementById("save-button");
            if (saveButton && saveButton.parentNode) {
                const ctaBox = document.createElement("div");
                ctaBox.className = "ai-cta-box";
                ctaBox.innerHTML = `
                  <p><strong>さらに詳しいアドバイスが必要ですか？</strong></p>
                  <p>あなたの悩みに寄り添い、5000字で実践的な助言を差し上げます。</p>
                  <button id="purchase-button">くわしいAI助言を見る（100円）</button>
                `;
                saveButton.parentNode.insertBefore(ctaBox, saveButton);

                document.getElementById("purchase-button").addEventListener("click", () => {
                    playSoundEffect("assets/sounds/click_button.mp3")// ボタン音
                    handleLoginRequiredAction(() => {
                        window.location.href = "ai-advice.html";
                    });
                });
            } else {
                console.warn("save-buttonが見つかりませんでした");
            }
        }, 0);

        // ✅ リセットボタンの表示
        const resetButton = document.getElementById("reset-button");
        if (resetButton) resetButton.style.display = "inline-block";

        // ✅ PDFの生成（1回限り）
        if (!window.pdfAlreadyGenerated) {
            window.pdfAlreadyGenerated = true;
            setTimeout(() => {
                generatePdfFromSummary((pdfUri) => {
                    currentPdfUri = pdfUri;
                    showPdfDownloadToast(pdfUri);
                });
            }, 1000);
        }
    }, 1000);
}
//総合的な易断の内容
function generateFortuneSummaryHTML() {
    const reverseHex = sixtyFourHexagrams.find(h => h.number === originalHexagram.reverse);
    const souHex = sixtyFourHexagrams.find(h => h.number === originalHexagram.sou);
    const goHex = sixtyFourHexagrams.find(h => h.number === originalHexagram.go);

    const yaoText = originalHexagram.yao_descriptions?.[(cachedChangedLineIndex + 1).toString()] || "該当する爻辞が見つかりません";
    const yaoName = ["初", "二", "三", "四", "五", "上"][cachedChangedLineIndex];

    const originalName = `<ruby>${originalHexagram.name}<rt>${originalHexagram.reading}</rt></ruby>`;
    const changedName = `<ruby>${cachedChangedHexagram.name}<rt>${cachedChangedHexagram.reading}</rt></ruby>`;
    const reverseName = reverseHex ? `<ruby>${reverseHex.name}<rt>${reverseHex.reading}</rt></ruby>` : "不明";
    const souName = souHex ? `<ruby>${souHex.name}<rt>${souHex.reading}</rt></ruby>` : "不明";
    const goName = goHex ? `<ruby>${goHex.name}<rt>${goHex.reading}</rt></ruby>` : "不明";

    return `
    <div id="final-fortune-wrapper" class="final-fortune hidden">
    <div id="confetti-lottie"></div>
        <div class="fortune-summary">
            <h3>🔮 総合的な易断</h3>
            <p>今のあなたの状況は、本卦である「<strong>${originalName}</strong>（${originalHexagram.summary}）」に示されています。<strong>${originalHexagram.description}</strong></p>
            <p>とくに注目すべきは <strong>${yaoName}爻</strong> の変化であり、</p>
            <p>この爻辞である「<strong>${yaoText}</strong>」があなたの今後の行動の鍵です。</p>
            <p>この変化により、中長期的に状況は「<strong>${changedName}</strong> (${cachedChangedHexagram.summary})」へと展開していきます。</p>
            <hr>
            <p>この本卦に隠されている裏の意味は「<strong>${reverseName || "不明"}</strong> (${reverseHex?.summary || "不明"})」です。</p>
            <p>状況を俯瞰すると「<strong>${souName || "不明"}</strong> (${souHex?.summary || "不明"})」となります。</p>
            <p>そもそも本質は「<strong>${goName || "不明"}</strong> (${goHex?.summary || "不明"})」です。</p>
        </div></div>
    `;
}
//結果保存ボタンを生成、ログインしてなければトースト表示
function renderSaveButton(pdfUri) {
    // PDF URI を保存しておく（あとで再利用できる）
    currentPdfUri = pdfUri;

    // すでにあるなら再生成しない
    if (document.getElementById("save-button")) return;

    const saveButton = document.createElement("button");
    saveButton.textContent = "▶️ 出た卦をログに保存";
    saveButton.id = "save-button";
    saveButton.className = "variant-button";
    saveButton.style.display = "inline-block";
    saveButton.style.marginRight = "10px";
    saveButton.style.padding = "10px 20px";

    //googleにログイン
    saveButton.onclick = () => {
        playSoundEffect("assets/sounds/click_button.mp3");
        handleLoginRequiredAction(() => {
            saveCurrentFortuneToLog(currentPdfUri);
        });
    };
    const resetButton = document.getElementById("reset-button");
    if (resetButton && resetButton.parentNode) {
        resetButton.parentNode.style.textAlign = "center";
        resetButton.parentNode.insertBefore(saveButton, resetButton);
        resetButton.style.display = "inline-block";
    }
}
//結果保存ログ（Firebase）
function saveCurrentFortuneToLog(pdfUri) {
    if (!originalHexagram || !cachedChangedHexagram || cachedChangedLineIndex === null) {
        showToast("保存に必要な情報がそろっていません。", {
            id: "incomplete-toast",
            isWarning: true,
            duration: 5000
        });
        return;
    }

    const timestamp = new Date().toLocaleString("ja-JP", {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });

    const logEntry = {
        timestamp,
        question: userQuestion || "(未記入)",
        original: {
            number: originalHexagram.number,
            name: originalHexagram.name,
            summary: originalHexagram.summary,
            image: `hexagram_${String(originalHexagram.number).padStart(2, "0")}.svg`
        },
        changed: {
            number: cachedChangedHexagram.number,
            name: cachedChangedHexagram.name,
            summary: cachedChangedHexagram.summary,
            image: `hexagram_${String(cachedChangedHexagram.number).padStart(2, "0")}.svg`
        },
        changedLine: {
            index: cachedChangedLineIndex,
            label: getYaoName(cachedChangedLineIndex) + "爻",
            yaoText: originalHexagram.yao_descriptions?.[(cachedChangedLineIndex + 1).toString()] || "不明"
        },
        reverse: {
            number: originalHexagram.reverse,
            name: getHexagramByNumber(originalHexagram.reverse)?.name,
            summary: getHexagramByNumber(originalHexagram.reverse)?.summary,
            image: `hexagram_${String(originalHexagram.reverse).padStart(2, "0")}.svg`
        },
        sou: {
            number: originalHexagram.sou,
            name: getHexagramByNumber(originalHexagram.sou)?.name,
            summary: getHexagramByNumber(originalHexagram.sou)?.summary,
            image: `hexagram_${String(originalHexagram.sou).padStart(2, "0")}.svg`
        },
        go: {
            number: originalHexagram.go,
            name: getHexagramByNumber(originalHexagram.go)?.name,
            summary: getHexagramByNumber(originalHexagram.go)?.summary,
            image: `hexagram_${String(originalHexagram.go).padStart(2, "0")}.svg`
        },
        pdfStatus: pdfUri ? "✅ PDFダウンロード済み" : "未ダウンロード"
    };

    if (auth?.currentUser && db) {
        const firestoreEntry = {
            ...logEntry,
            uid: auth.currentUser.uid,
            timestamp: serverTimestamp()
        };

        addDoc(collection(db, "logs"), firestoreEntry)
            .then((docRef) => {
                console.log("✅ Firestore に保存成功:", docRef.id);
                // 🔽 ここで占い状態をローカルストレージにも一時保存
                saveFortuneToTemp();
                showToast("✅ ログが保存されました", { duration: 4000 });
            })
            .catch((error) => {
                console.error("❌ Firestore 保存エラー:", error);
                showToast(`❌ Firestore 保存に失敗しました", ${error.message}`, {
                    isWarning: true,
                    duration: 6000
                }

                );
            });
    } else {
        showToast("⚠️ Googleにログインしてください", {
            id: "login-toast",
            isWarning: true,
            duration: 5000
        });
        return;
    }
    // ✅ ボタンを無効化・状態表示変更
    const saveButton = document.getElementById("save-button");
    if (saveButton) {
        saveButton.disabled = true;
        saveButton.style.opacity = 0.6;
        saveButton.style.backgroundColor = "#000000";

        // 中身を空にしてからリンク付きのテキストを挿入
        saveButton.textContent = ""; // 初期化

        const staticText = document.createTextNode("✅ ");
        const link = document.createElement("a");
        link.href = "log.html";
        link.textContent = "ログ一覧ページ";
        link.className = "save-link";
        const suffix = document.createTextNode(" に保存しました");

        saveButton.appendChild(staticText);
        saveButton.appendChild(link);
        saveButton.appendChild(suffix);
    }

    document.getElementById("instructionText").textContent = "";
}
//PDFを保存しますか？というトースト表示
function showPdfDownloadToast(pdfUri) {
    showToast("易断結果をPDFにできます", {
        id: "pdf-toast",
        duration: 10000,
        buttonText: "📄 ダウンロード",
        buttonCallback: () => triggerPdfDownload(pdfUri)
    });
}
//易断のPDF化
function generatePdfFromSummary(callback) {
    const summaryElement = document.querySelector(".fortune-summary");
    if (!summaryElement) return;

    const originalBg = summaryElement.style.backgroundColor;
    summaryElement.style.backgroundColor = "transparent";

    html2pdf().set({
        margin: 10,
        filename: '易断結果.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            backgroundColor: null
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    })
        .from(summaryElement)
        .outputPdf('datauristring')
        .then(pdfUri => {
            summaryElement.style.backgroundColor = originalBg;
            if (typeof callback === "function") {
                callback(pdfUri);
            }
        });
}
//firebaseの呼び込み
firebaseReady.then(() => {
    console.log("🔥 Firebase 準備完了");

    const saveButton = document.getElementById("save-button");
    if (saveButton) {
        saveButton.addEventListener("click", () => {
            playSoundEffect("assets/sounds/click_button.mp3")// ボタン音
            generatePdfFromSummary((pdfUri) => {
                saveCurrentFortuneToLog(pdfUri);
            });
        });
    }
});


