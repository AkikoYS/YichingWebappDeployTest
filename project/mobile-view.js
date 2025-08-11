// mobile-view.js（UI制御だけ・簡潔版）
(function () {
    // ---- 0) モバイル文脈の判定 ----
    const url = new URL(location.href);
    const qMobile = url.searchParams.get("mobile") === "1" || url.searchParams.get("mctx") === "1";
    const onIndexMobile = /\/index-mobile\.html$/i.test(location.pathname);

    // index-mobile直アクセス or ?mobile=1 でフラグ保持
    if (onIndexMobile || qMobile) {
        try { sessionStorage.setItem("fromMobileApp", "1"); } catch { }
    }
    const fromMobile = qMobile || sessionStorage.getItem("fromMobileApp") === "1";

    // ---- 1) HTMLにフラグ用クラス付与（CSSで出し分け）----
    if (fromMobile) document.documentElement.classList.add("from-mobile");
    if (/\/pc\/index\.html$/i.test(location.pathname)) {
        document.documentElement.classList.add("is-pc-home");
    }

    // ---- 2) DOM準備後にリンク調整 ----
    const ready = (fn) => (document.readyState === "loading")
        ? document.addEventListener("DOMContentLoaded", fn, { once: true })
        : fn();

    ready(() => {
        if (!fromMobile) return;

        // 2-1) ロゴ/ホームの戻り先を index-mobile.html に統一
        document.querySelectorAll('a[href$="index.html"], a[href="/index.html"]').forEach(a => {
            a.setAttribute("href", "/index-mobile.html");
        });

        // 2-2) 内部リンクを絶対化しつつ ?mobile=1 を統一付与（重複回避）
        const stampLinks = (root = document) => {
            root.querySelectorAll('a[href]').forEach(a => {
                const raw = a.getAttribute('href');
                if (!raw || raw.startsWith('#')) return;

                // 外部/ファイルは対象外
                const isExternal = /^https?:\/\//i.test(raw);
                const isFile = /\.(png|jpe?g|gif|webp|svg|pdf|zip|mp3|mp4|css|js)$/i.test(raw);
                if (isExternal || isFile) return;

                const t = new URL(raw, location.href);
                if (!(t.searchParams.has("mobile") || t.searchParams.has("mctx"))) {
                    t.searchParams.set("mobile", "1");
                }
                a.setAttribute('href', t.pathname + t.search + t.hash);
            });
        };
        stampLinks();

        // 2-3) 動的に追加されるリンクにも付与（UIフレームワーク対策）
        const mo = new MutationObserver(muts => {
            muts.forEach(m => m.addedNodes.forEach(n => {
                if (n.nodeType === 1) stampLinks(n);
            }));
        });
        mo.observe(document.documentElement, { childList: true, subtree: true });
    });
})();
