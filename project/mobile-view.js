// mobile-view.js
(function () {
  const q = new URL(location.href).searchParams;

  // 現在のHTMLがあるディレクトリ（例: /project/）
  const BASE = location.pathname.replace(/[^/]*$/, '');

  // 現在地判定（末尾だけ見る）
  const onPCHome = /\/index\.html$/i.test(location.pathname) || location.pathname.endsWith('/');
  const onMobileHome = /\/index-mobile\.html$/i.test(location.pathname);
  const currentCtx = onPCHome ? 'pc' : (onMobileHome ? 'mobile' : 'unknown');

  // 明示オーバーライド > 画面幅
  const wantsPC = q.get('pc') === '1';
  const wantsMobile = q.get('mobile') === '1';
  const mqMobile = matchMedia('(max-width: 768px)');
  const desiredCtx = wantsPC ? 'pc' : wantsMobile ? 'mobile' : (mqMobile.matches ? 'mobile' : 'pc');

  // ここから作るURLはすべて相対（BASE起点）。ローカル/本番どちらもOK
  const HOME = {
    pc: `${BASE}index.html?pc=1`,
    mobile: `${BASE}index-mobile.html?mobile=1`
  };

  // ホーム上のみ自動切替（実ページ優先）
  if (!(wantsPC || wantsMobile) && (onPCHome || onMobileHome) && desiredCtx !== currentCtx) {
    location.replace(HOME[desiredCtx]);
    return;
  }

  // 早期に html に文脈をセット（CSS保険）
  const earlyCtx = (currentCtx === 'unknown') ? desiredCtx : currentCtx;
  document.documentElement.setAttribute('data-context', earlyCtx);

  // DOM後にナビ正規化
  const ready = (fn) => (document.readyState !== 'loading') ? fn() : document.addEventListener('DOMContentLoaded', fn);
  ready(() => {
    const ctx = (currentCtx === 'unknown') ? desiredCtx : currentCtx;

    // bodyクラス（CSSで使う場合用）
    document.body.classList.remove('ctx-pc', 'ctx-mobile');
    document.body.classList.add(ctx === 'pc' ? 'ctx-pc' : 'ctx-mobile');

    // ホームは今の版へ
    document.querySelectorAll('[data-home-link]')
      .forEach(a => a.setAttribute('href', HOME[ctx]));

    // 切替リンクのhref固定（相対）
    document.querySelectorAll('[data-switch="to-pc"]').forEach(a => a.setAttribute('href', HOME.pc));
    document.querySelectorAll('[data-switch="to-mobile"]').forEach(a => a.setAttribute('href', HOME.mobile));

    // 今が pc → to-mobile を表示、今が mobile → to-pc を表示
    const showSel = (ctx === 'pc') ? '[data-switch="to-mobile"]' : '[data-switch="to-pc"]';
    const hideSel = (ctx === 'pc') ? '[data-switch="to-pc"]' : '[data-switch="to-mobile"]';
    document.querySelectorAll(showSel).forEach(el => { el.style.setProperty('display', 'block', 'important'); el.hidden = false; });
    document.querySelectorAll(hideSel).forEach(el => { el.style.setProperty('display', 'none', 'important'); });

    // スマホ幅のときだけ「自分自身のページ」をナビから除去（PC幅では残す）
    const hideSelfIfMobile = () => {
      if (!mqMobile.matches) return;
      const here = location.pathname.replace(/\/+$/, '');
      document.querySelectorAll('nav .nav-link[href]').forEach(a => {
        const p = new URL(a.getAttribute('href'), location.origin).pathname.replace(/\/+$/, '');
        if (p === here) a.closest('li')?.remove();
      });
    };
    hideSelfIfMobile();
    mqMobile.addEventListener?.('change', hideSelfIfMobile);
  });
})();
