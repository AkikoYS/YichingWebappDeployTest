// mobile-view.js
// 目的：index-mobile.html から来た場合のみ、ログインUI/ログ系メニューを非表示、
// 戻るリンクを index-mobile.html に差し替え、遷移先にもフラグを継承する

(function () {
    const url = new URL(location.href);

    // クエリパラメータ判定
    const fromQuery = url.searchParams.get("mobile") === "1" || url.searchParams.get("mctx") === "1";

    // index-mobile.html 自身を開いた場合、またはクエリで判定できた場合はマーカーを保存
    const isIndexMobile = /\/index-mobile\.html$/i.test(location.pathname);
    if (isIndexMobile || fromQuery) {
        try { sessionStorage.setItem("fromMobileApp", "1"); } catch (e) { }
    }

    // 最終的な判定
    const fromMobileApp = sessionStorage.getItem("fromMobileApp") === "1" || fromQuery;

    // index-mobile.html の場合、全リンクに ?mobile=1 を付与
    document.addEventListener("DOMContentLoaded", () => {
        if (isIndexMobile) {
            document.querySelectorAll("a[href]").forEach(a => {
                const href = a.getAttribute("href");
                if (!href || href.startsWith("#") || href.startsWith("http") ||
                    /\.(png|jpg|jpeg|gif|webp|svg|pdf|zip|mp3|mp4|css|js)$/i.test(href)) return;
                const t = new URL(href, location.origin);
                t.searchParams.set("mobile", "1");
                // ✅ 常に絶対パスにする
                a.setAttribute("href", "/" + t.pathname.replace(/^\/+/, "") + t.search + t.hash);
            });
        }
    });

    // モバイル版経由でなければ終了（PC版をスマホで表示している場合などは処理しない）
    if (!fromMobileApp) return;

    // 認証を無効化（auth.js 側で利用）
    window.__DISABLE_AUTH__ = true;
    document.documentElement.classList.add("mobile-view");

    // DOM 読み込み後のUI調整
    document.addEventListener("DOMContentLoaded", () => {
        // 「index.html」への戻りリンクを「index-mobile.html」に差し替え
        document.querySelectorAll('a[href="index.html"], a[href="/index.html"]').forEach(a => {
            a.setAttribute("href", "/index-mobile.html");
        });

        // ログ関連メニュー・ログインUIを非表示
        const hideSelectors = [
            ".menu-logs",
            'a[href*="log.html"]',
            ".login-ui",
            ".logout-ui",
            ".account-ui",
            ".requires-auth"
        ];
        hideSelectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => el.remove());
        });

        // 他ページリンクにも ?mobile=1 を引き継ぎ
        document.querySelectorAll("a[href]").forEach(a => {
            const href = a.getAttribute("href");
            if (!href || href.startsWith("#") || href.startsWith("http") ||
                /\.(png|jpg|jpeg|gif|webp|svg|pdf|zip|mp3|mp4|css|js)$/i.test(href)) return;
            const t = new URL(href, location.origin);
            if (!t.searchParams.has("mobile")) {
                t.searchParams.set("mobile", "1");
            }
            // ✅ 常に絶対パスにする
            a.setAttribute("href", "/" + t.pathname.replace(/^\/+/, "") + t.search + t.hash);
        });
    });
})();
