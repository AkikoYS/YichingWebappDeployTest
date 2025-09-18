console.log("✅ logic.js 読み込み完了");

// ✅ hexagram.json を読み込み、使う前に必ず待てるようにする
window.hexagramsReady = fetch("./hexagram.json", { cache: "no-store" })
    .then((res) => {
        if (!res.ok) throw new Error(`JSON読み込み失敗: HTTP ${res.status}`);
        return res.json();
    })
    .then((data) => {
        window.HEXAGRAMS = data; // 既存ロジック互換のためグローバルに置く
        return data;
    })
    .catch((err) => {
        console.error(err);
        window.HEXAGRAMS = [];   // フォールバック
        return [];
    });

// ✅ 卦検索（防御的）
function getHexagramByArray(bin) {
    const list = window.HEXAGRAMS || [];
    return list.find((h) => h.array === bin) || null;
}

// 全64卦データを格納する変数
let sixtyFourHexagrams = [];

// 番号から卦を取得
function getHexagramByNumber(number) {
    return sixtyFourHexagrams.find(hexagram => hexagram.number === number);
}

// 配列から卦を取得
function getHexagramByArray(arrayString) {
    return sixtyFourHexagrams.find(hexagram => hexagram.array === arrayString);
}

// ✅ index.html / index-mobile.html と同じディレクトリにある hexagram.json を読む
fetch("./hexagram.json", { cache: "no-store" })
    .then(res => res.ok ? res.json() : Promise.reject("JSON読み込み失敗"))
    .then(data => {
        sixtyFourHexagrams = data;
    })
    .catch(err => console.error(err));

//進行状況メッセージ
function getProgressMessage(clickCount, yinYang) {
    const yinYangText = yinYang === "0" ? "<strong>陰</strong>" : "<strong>陽</strong>";
    switch (clickCount) {
        case 1: return `初爻: ${yinYangText}`;
        case 2: return `二爻: ${yinYangText}`;
        case 3: return `三爻: ${yinYangText}`;
        case 4: return `四爻: ${yinYangText}`;
        case 5: return `五爻: ${yinYangText}`;
        case 6: return `上爻: ${yinYangText}`;
        default: return "";
    }
}

//ログ保存用
function getYaoName(index) {
    return ["初", "二", "三", "四", "五", "上"][index] || "不明";
}
//総合的な易断にルビ
function applyRubyToHexagramNamesWithJson(html, hexagramList) {
    hexagramList.forEach(hex => {
        const name = hex.name;
        const reading = hex.reading;
        const rubyTag = `<ruby>${name}<rt>${reading}</rt></ruby>`;
        const nameRegex = new RegExp(name, "g");
        html = html.replace(nameRegex, rubyTag);
    });
    return html;
}

//HTMLをテキストに転換
function stripHtml(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.innerText.trim();
  }



