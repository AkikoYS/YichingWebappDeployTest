//八卦
const TRIGRAMS = window.TRIGRAMS ?? [
    {
        key: "兌", kana: "だ", pinyin: "duì", symbol: "☱", dir: 270,
        shape: "二陽の上に陰", nature: "沢", direction: "西",
        traits: ["喜悦", "和合", "楽しみ"], image: ["少女", "コミュニケーション"]
    },
    {
        key: "乾", kana: "けん", pinyin: "qián", symbol: "☰", dir: 315,
        shape: "すべて陽", nature: "天", direction: "北西",
        traits: ["剛健", "創造"], image: ["父", "リーダーシップ"]
    },
    {
        key: "坎", kana: "かん", pinyin: "kǎn", symbol: "☵", dir: 0,
        shape: "陰が陽を包む", nature: "水", direction: "北",
        traits: ["陥没", "危険", "知恵"], image: ["中男", "困難"]
    },
    {
        key: "艮", kana: "ごん", pinyin: "gèn", symbol: "☶", dir: 45,
        shape: "二陰が陽を抑える", nature: "山", direction: "北東",
        traits: ["静止", "節制", "境界"], image: ["少男", "門戸を閉ざす"]
    },
    {
        key: "震", kana: "しん", pinyin: "zhèn", symbol: "☳", dir: 90,
        shape: "二陰の下で陽が発生", nature: "雷", direction: "東",
        traits: ["動", "発端", "驚き", "活動"], image: ["長男", "行動力"]
    },
    {
        key: "巽", kana: "そん", pinyin: "xùn", symbol: "☴", dir: 135,
        shape: "二陽の下に陰が入り込む", nature: "風(木)", direction: "南東",
        traits: ["入", "浸透", "柔順"], image: ["長女", "交渉・説得"]
    },
    {
        key: "離", kana: "り", pinyin: "lí", symbol: "☲", dir: 180,
        shape: "中が空虚で陽気を発散", nature: "火", direction: "南",
        traits: ["明朗", "文明", "可視化"], image: ["中女", "学び"]
    },
    {
        key: "坤", kana: "こん", pinyin: "kūn", symbol: "☷", dir: 225,
        shape: "すべて陰", nature: "地", direction: "南西",
        traits: ["受容", "従順", "量"], image: ["母", "安定"]
    },
];

// 2) クリック領域（単一SVG方式を使っている前提） 
// 単一SVG方式 前提
const svg = document.querySelector('.bagua-svg');
const toast = document.getElementById('toast');
const toastBody = toast.querySelector('.toast-body');
let toastVisible = false;

// 1) 既存の当たり判定をクリア（重複クリックを防止）
svg.querySelectorAll('path[data-role="hit"]').forEach(p => p.remove());

// 2) 調整値
const RADIAL_NUDGE_PX = -150;  // ← ここを変えると確実に内外半径が動く
const CX = 500, CY = 500;
const R_OUT_BASE = 520, R_IN_BASE = 300;
const R_OUT = R_OUT_BASE + RADIAL_NUDGE_PX;
const R_IN = R_IN_BASE + RADIAL_NUDGE_PX;
const SLICE = 45 * Math.PI / 180;

// 3) 生成
for (const t of TRIGRAMS) {
    const a0 = t.dir * Math.PI / 180 - SLICE / 2;
    const a1 = t.dir * Math.PI / 180 + SLICE / 2;
    const P = (r, a) => [CX + r * Math.cos(a), CY + r * Math.sin(a)];

    const [x0, y0] = P(R_OUT, a0);
    const [x1, y1] = P(R_OUT, a1);
    const [x2, y2] = P(R_IN, a1);
    const [x3, y3] = P(R_IN, a0);

    const d = `M ${x0} ${y0}
             A ${R_OUT} ${R_OUT} 0 0 1 ${x1} ${y1}
             L ${x2} ${y2}
             A ${R_IN} ${R_IN} 0 0 0 ${x3} ${y3}
             Z`;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);                          // ★ 忘れがち
    path.setAttribute('fill', 'transparent');
    path.setAttribute('tabindex', '0');
    path.dataset.role = 'hit';                          // ★ 後で消す用の印
    path.dataset.key = t.key;

    // ★ モバイルでも確実に反応させる：pointerup/click 両方
    const fire = () => showToast(formatTrigram(t));
    path.addEventListener('pointerup', fire, { passive: true });
    path.addEventListener('click', fire);

    svg.appendChild(path);
}

// 4) デバッグ可視化（押下領域が動くか確認用。Dキーで切替）
let __debug = false;
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'd') return;
    __debug = !__debug;
    svg.querySelectorAll('path[data-role="hit"]').forEach(p => {
        p.style.fill = __debug ? 'rgba(0,128,255,.15)' : 'transparent';
        p.style.stroke = __debug ? 'rgba(0,128,255,.6)' : 'none';
        p.style.strokeWidth = __debug ? '2' : '0';
    });
});

// 3) トースト生成 
function showToast(text) {
    toastBody.textContent = text ?? '';
    toast.classList.add('show');
    toastVisible = true;
}
/** トースト領域をクリックしたら閉じる */
toast.addEventListener('click', () => {
    if (!toastVisible) return;
    toast.classList.remove('show');
    toastVisible = false;
});


// 4) 文面フォーマット（ここを好きに変えられます） 
function formatTrigram(t) {
    // 例：坎 → かたち：陰が陽を包む…
    const lines = [
        `【${t.key}（${t.kana} / ${t.pinyin}） ${t.symbol}】`,
        `かたち：${t.shape}`,
        `自然　：${t.nature}`,
        `方位　：${t.direction}`,
        `性質　：${t.traits.join("・")}`,
        `イメージ：${t.image.join("・")}`,
    ];
    // 効果音があれば
    if (typeof playSoundEffect === 'function') {
        try { playSoundEffect('/assets/sounds/click_toast.mp3'); } catch { }
    }
    return lines.join('\n');
}

// --- デバッグ用：Dキーで当たり判定を可視化 ---
let dbg = false;
document.addEventListener('keydown', e => {
    if (e.key.toLowerCase() !== 'd') return;
    dbg = !dbg;
    svg.querySelectorAll('path[data-role="hit"]').forEach(p => {
        p.style.fill = dbg ? 'rgba(0,128,255,.18)' : 'transparent';
        p.style.stroke = dbg ? 'rgba(0,128,255,.5)' : 'none';
        p.style.strokeWidth = dbg ? '2' : '0';
    });
});

