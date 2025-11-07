let isHexagramOrder = false; // 八卦構成順かどうかのトグル用フラグ
let hexagramData = []; // JSONから読み込んだ六十四卦データ

// 🔁 JSONデータを取得
fetch("hexagram.json")
    .then((res) => res.json())
    .then((data) => {
        hexagramData = data;
        // 代入後すぐ ↓ を追加
        window.hexagramData = hexagramData;  // ← 他ファイルから参照可にする
        window.dispatchEvent(new CustomEvent('hexagrams:ready', { detail: hexagramData })); // ← 準備完了の合図

        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            renderGridCards(); // ✅ スマホ用カード表示
        } else {
            buildHexagramTable(); // ✅ PC用テーブル表示
        }
    });



//初期化時に画面を見て表示、非表示を切り替え
document.addEventListener("DOMContentLoaded", () => {
    const isMobile = window.innerWidth <= 768;
    const table = document.getElementById("hexTable");
    const grid = document.getElementById("hex-grid");
    const toggleBtn = document.getElementById("toggleBtn");

    if (isMobile) {
        // スマホならテーブル非表示、グリッド表示、トグル非表示
        if (table) table.style.display = "none";
        if (grid) grid.style.display = "grid";
        if (toggleBtn) toggleBtn.style.display = "none";
    } else {
        // PCならグリッド非表示（テーブルはデフォルトで表示される）
        if (grid) grid.style.display = "none";
        if (toggleBtn) toggleBtn.style.display = "inline-block";
    }
});

// 🔠 卦配列（number)をUnicode六十四卦に変換（HTMLエスケープ）
function getHexagramSymbol(number) {
    const codePoint = 0x4DC0 + (number - 1);
    return `&#x${codePoint.toString(16).toUpperCase()};`;
}

// 📄 表の構築処理
function buildHexagramTable() {
    const hexTable = document.getElementById("hexTable");
    hexTable.innerHTML = "";

    const tops = ["坤（地）", "艮（山）", "坎（水）", "巽（風）", "震（雷）", "離（火）", "兌（沢）", "乾（天）"];
    const sides = ["乾（天）", "兌（沢）", "離（火）", "震（雷）", "巽（風）", "坎（水）", "艮（山）", "坤（地）"];

    if (!isHexagramOrder) {
        const trHeader = document.createElement("tr");
        const corner = document.createElement("th");
        corner.className = "corner-cell";
        corner.innerHTML = '<span class="upper-label">外卦</span><span class="lower-label">内卦</span>';
        trHeader.appendChild(corner);

        tops.forEach(t => {
            const th = document.createElement("th");
            th.className = "header-top";
            th.textContent = t;
            trHeader.appendChild(th);
        });

        hexTable.appendChild(trHeader);

        for (let row = 0; row < 8; row++) {
            const tr = document.createElement("tr");
            const th = document.createElement("th");
            th.className = "header-side";
            th.textContent = sides[row];
            tr.appendChild(th);

            for (let col = 0; col < 8; col++) {
                const hex = hexagramData.find(h => h.row === row && h.col === col);
                if (!hex) continue;
                const symbol = getHexagramSymbol(hex.number);
                const displayName = `${hex.number} ${hex.name}`;
                const td = document.createElement("td");
                td.innerHTML = `<div class="hexagram">${symbol}</div><div><a href="#" class="hex-link" data-name="${hex.name}" style="font-size:1em;">${displayName}</a></div>`;
                tr.appendChild(td);
            }
            hexTable.appendChild(tr);
        }
    } else {
        for (let i = 0; i < 8; i++) {
            const tr = document.createElement("tr");
            for (let j = 0; j < 8; j++) {
                const hex = hexagramData.find(h => h.number === i * 8 + j + 1);
                if (!hex) continue;
                const symbol = getHexagramSymbol(hex.number);
                const displayName = `${hex.number} ${hex.name}`;
                const td = document.createElement("td");
                td.innerHTML = `<div class="hexagram">${symbol}</div><div><a href="#" class="hex-link" data-name="${hex.name}" style="font-size:1em;">${displayName}</a></div>`;
                tr.appendChild(td);
            }
            hexTable.appendChild(tr);
        }
    }

    setupModalEvents();
}
// 🔁 表の表示順切替
function toggleHexagramOrder() {
    isHexagramOrder = !isHexagramOrder;
    document.getElementById("toggleBtn").textContent =
        isHexagramOrder ? "八卦構成順に表示" : "卦番号順に表示";
    buildHexagramTable();
}
//レスポンシブ対応
function renderGridCards() {
    const hexGrid = document.getElementById("hex-grid");
    if (!hexGrid || !hexagramData) return;

    hexGrid.innerHTML = ""; // 一度リセット

    for (let i = 0; i < 64; i++) {
        const hex = hexagramData.find(h => h.number === i + 1);
        if (!hex) continue;

        const symbol = getHexagramSymbol(hex.number);
        const card = document.createElement("div");
        card.className = "hexagram-card";
        card.innerHTML = `
        <div class="hexagram-content">
        <div class="hexagram-number">第${hex.number}卦</div>
        <div class="hexagram-symbol hex-link" data-name="${hex.name}" style="font-size:5em;">
    ${symbol}</div>
         <div class="hexagram-name"> 
         <a href="#" class="hex-link" data-name="${hex.name}"> ${hex.name}</a>
        </div></div>
      `;
        hexGrid.appendChild(card);
    }
    setupModalEvents(); // ✅ スマホでもモーダル機能を有効に
}


// 📦 モーダル表示処理
function setupModalEvents() {
    document.querySelectorAll(".hex-link").forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const name = e.target.dataset.name;
            const hex = hexagramData.find((h) => h.name === name);
            if (!hex) return;
            const modal = document.getElementById("hexagram-modal");
            const body = document.getElementById("modal-body");
            body.innerHTML = `
                <h2>${hex.name}（${hex.reading}）</h2>
                <p><strong>卦辞：</strong>${hex.hexagram_text}</p>
                <p><strong>象徴：</strong>${hex.symbolism}</p>
                <p><strong>物語：</strong>${hex.story}</p>
            `;
            modal.classList.remove("hidden");
            modal.style.display = "block";
        });
    });

    document.querySelector(".modal .close").onclick = () => {
        document.getElementById("hexagram-modal").style.display = "none";
    };

    window.onclick = (e) => {
        if (e.target === document.getElementById("hexagram-modal")) {
            document.getElementById("hexagram-modal").style.display = "none";
        }
    };
}


