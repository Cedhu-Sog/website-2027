export {};

const header = document.querySelector<HTMLElement>('[data-adaptive-header]');
const sentinel = document.querySelector<HTMLElement>('[data-header-sentinel]');
const utility = header?.querySelector<HTMLElement>('.site-header__utility');

if (header && sentinel && utility && 'IntersectionObserver' in window) {
  const root = document.documentElement;
  const desktop = window.matchMedia('(min-width: 62rem) and (hover: hover) and (pointer: fine)');
  let requestedCompact = false;

  const render = () => {
    // Never hide a platform link while it holds keyboard focus.
    const compact = desktop.matches && requestedCompact && !utility.contains(document.activeElement);
    root.toggleAttribute('data-header-compact', compact);
    utility.inert = compact;
    if (compact) utility.setAttribute('aria-hidden', 'true');
    else utility.removeAttribute('aria-hidden');
  };

  const observer = new IntersectionObserver(([entry]) => {
    // The global marker spans 60–80px. This hysteresis avoids threshold flicker.
    if (!entry.isIntersecting && entry.boundingClientRect.bottom <= 0) requestedCompact = true;
    else if (entry.intersectionRatio === 1) requestedCompact = false;
    render();
  }, { threshold: [0, 1] });

  const configure = () => {
    observer.disconnect();
    root.toggleAttribute('data-header-adaptive', desktop.matches);
    if (desktop.matches) {
      // One startup/resize measurement also restores bfcache without flashing full.
      const marker = sentinel.getBoundingClientRect();
      if (marker.bottom <= 0) requestedCompact = true;
      else if (marker.top >= 0) requestedCompact = false;
      observer.observe(sentinel);
    } else requestedCompact = false;
    render();
  };
  const onFocusChange = () => queueMicrotask(render);
  const start = () => {
    // addEventListener is idempotent for these stable callbacks, including bfcache.
    desktop.addEventListener('change', configure);
    utility.addEventListener('focusin', onFocusChange);
    utility.addEventListener('focusout', onFocusChange);
    configure();
  };
  const stop = () => {
    observer.disconnect();
    desktop.removeEventListener('change', configure);
    utility.removeEventListener('focusin', onFocusChange);
    utility.removeEventListener('focusout', onFocusChange);
  };

  // Native Astro navigation loads a fresh document; lifecycle hooks cover bfcache.
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', start);
  start();
}
