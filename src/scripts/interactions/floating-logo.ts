export {};

const originalLogo = document.querySelector<HTMLImageElement>('.site-header--scroll-logo .site-header__brand img');
const floatingLogo = document.querySelector<HTMLAnchorElement>('[data-floating-logo]');

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
    // Only a logo that has passed above the viewport can activate the capsule.
    setVisible(compactViewport.matches && !entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
  }, { threshold: 0 });

  const observeLogo = () => {
    observer.disconnect();
    setVisible(false);
    if (compactViewport.matches) observer.observe(originalLogo);
  };

  compactViewport.addEventListener('change', observeLogo);
  window.addEventListener('pageshow', observeLogo);
  observeLogo();
}
