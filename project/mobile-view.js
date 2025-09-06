// mobile-view.js（UI制御だけ・PC優先ロジックに修正）
(function () {
    // ---- A) 端末/強制フラグの判定 ----
    const url = new URL(location.href);
    const q = url.searchParams;
    const onIndexMobile = /\/index-mobile\.html$/i.test(location.pathname);
    const qMobile = q.get("mobile") === "1" || q.get("mctx") === "1";
    const qPC = q.get("pc") === "1";

    // PC/モバイル強制（任意運用）
    const forcePC = qPC || localStorage.getItem("forcePC") === "true";
    const forceMobile = qMobile || localStorage.getItem("forceMobile") === "true";

    // 端末判定（PC優先・UA非依存）
    const isCoarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
    const isNarrow = typeof matchMedia === "function" && matchMedia("(max-width: 820px)").matches;
    const deviceLooksMobile = isCoarse || isNarrow;

    // 優先ルール: forcePC > forceMobile > 端末見た目
    const preferredMode = forcePC ? "pc" : (forceMobile ? "mobile" : (deviceLooksMobile ? "mobile" : "pc"));

    // ---- B) モバイル文脈フラグの維持（“本当にモバイルのときだけ”）----
    if (onIndexMobile || qMobile) {
        try { sessionStorage.setItem("fromMobileApp", "1"); } catch { }
    }
    const fromMobileStored = sessionStorage.getItem("fromMobileApp") === "1";
    const fromMobileActive = (preferredMode !== "pc") && (qMobile || onIndexMobile || fromMobileStored);

    // ---- C) HTMLにクラス付与（CSS出し分け用）----
    if (fromMobileActive) document.documentElement.classList.add("from-mobile");
    if (/\/pc\/index\.html$/i.test(location.pathname)) {
        document.documentElement.classList.add("is-pc-home");
    }

    // ---- D) 汎用DOM Ready ----
    const ready = (fn) =>
        (document.readyState === "loading")
            ? document.addEventListener("DOMContentLoaded", fn, { once: true })
            : fn();

    // ---- E) 共通: HOMEリンクの正規化（PCは常に index.html / モバイルは index-mobile.html?mobile=1）----
    function normalizeHomeLinks(mode) {
        const toIndex = (mode === "pc") ? "index.html" : "index-mobile.html?mobile=1";
        document.querySelectorAll('a[href$="index.html"], a[href="/index.html"], a[href$="index-mobile.html"], a[href="/index-mobile.html"], a[data-home-link], a.home-link')
            .forEach(a => a.setAttribute("href", toIndex));
    }

    // ---- F) ?mobile=1 の付与/除去（内部リンクのみ対象）----
    function stampLinksForMobile(root = document) {
        root.querySelectorAll("a[href]").forEach(a => {
            const raw = a.getAttribute("href");
            if (!raw || raw.startsWith("#")) return;
            const isExternal = /^https?:\/\//i.test(raw);
            const isFile = /\.(png|jpe?g|gif|webp|svg|pdf|zip|mp3|mp4|css|js)$/i.test(raw);
            if (isExternal || isFile) return;

            const t = new URL(raw, location.href);
            if (!(t.searchParams.has("mobile") || t.searchParams.has("mctx"))) {
                t.searchParams.set("mobile", "1");
            }
            a.setAttribute("href", t.pathname + t.search + t.hash);
        });
    }
    function stripMobileParams(root = document) {
        root.querySelectorAll("a[href]").forEach(a => {
            const raw = a.getAttribute("href");
            if (!raw || raw.startsWith("#")) return;
            const isExternal = /^https?:\/\//i.test(raw);
            if (isExternal) return;
            const t = new URL(raw, location.href);
            t.searchParams.delete("mobile");
            t.searchParams.delete("mctx");
            a.setAttribute("href", t.pathname + t.search + t.hash);
        });
    }


    // ---- H) 実行 ----
    ready(() => {
        // 1) PC優先のHOME正規化
        normalizeHomeLinks(preferredMode);

        // 2) PC時は “モバイル文脈” を無視＆クリーンアップ
        if (preferredMode === "pc") {
            try { sessionStorage.removeItem("fromMobileApp"); } catch { }
            stripMobileParams(document);           // 既存リンクから ?mobile を除去
            return;                                // 以降の「モバイル向け書き換え」は実行しない
        }

        // 3) モバイル文脈なら既存のロジックを継続
        if (!fromMobileActive) return;

        // 3-1) ロゴ/ホームの戻り先をモバイルに統一（再掲：normalizeで済むが安全のため二重化）
        document.querySelectorAll('a[href$="index.html"], a[href="/index.html"]').forEach(a => {
            a.setAttribute("href", "index-mobile.html");
        });

        // 3-2) 内部リンクに ?mobile=1 を統一付与（重複回避済）
        stampLinksForMobile();

        // 3-3) 動的追加にも対応
        const mo = new MutationObserver(muts => {
            muts.forEach(m => m.addedNodes.forEach(n => {
                if (n.nodeType === 1) {
                    if (preferredMode === "mobile") stampLinksForMobile(n);
                }
            }));
        });
        mo.observe(document.documentElement, { childList: true, subtree: true });


    });
})();
