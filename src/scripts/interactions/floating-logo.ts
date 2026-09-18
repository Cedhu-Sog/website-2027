export {};

// BaseLayout supplies a trigger on every page, independently of its hero.
// If the marker is omitted, the shared header logo remains a geometric fallback.
const originalLogo = document.querySelector<HTMLElement>('[data-floating-logo-trigger]')
  ?? document.querySelector<HTMLImageElement>('.site-header__brand img');
const floatingLogo = document.querySelector<HTMLAnchorElement>('[data-floating-logo]');
const header = originalLogo?.closest<HTMLElement>('.site-header');

if (originalLogo && floatingLogo && 'IntersectionObserver' in window) {
  // Match the existing desktop navigation breakpoint.
  const compactViewport = window.matchMedia('(width < 62rem)');
  const setVisible = (visible: boolean) => {
    floatingLogo.toggleAttribute('data-visible', visible);
    floatingLogo.inert = !visible;
    floatingLogo.setAttribute('aria-hidden', String(!visible));
    floatingLogo.tabIndex = visible ? 0 : -1;
  };

  const observer = new IntersectionObserver(([entry]) => {
    // Fade the initial bar as the original logo starts leaving the top edge.
    header?.toggleAttribute('data-receding', compactViewport.matches && entry.intersectionRatio < 1 && entry.boundingClientRect.top < 0);
    // Only a logo that has passed above the viewport can activate the capsule.
    setVisible(compactViewport.matches && !entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
  }, { threshold: [0, 1] });

  const observeLogo = () => {
    observer.disconnect();
    setVisible(false);
    header?.removeAttribute('data-receding');
    if (compactViewport.matches) observer.observe(originalLogo);
  };

  const start = () => {
    // Registering the same callback is idempotent, including the first pageshow.
    compactViewport.addEventListener('change', observeLogo);
    observeLogo();
  };
  const stop = () => {
    observer.disconnect();
    compactViewport.removeEventListener('change', observeLogo);
  };

  // Native page navigation destroys document listeners. These hooks also cover
  // Safari's back/forward cache, which preserves the document and its script.
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', start);
  start();
}
