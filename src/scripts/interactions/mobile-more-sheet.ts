export {};

const sheet = document.querySelector<HTMLDialogElement>('#mobile-more-sheet');
const trigger = document.querySelector<HTMLButtonElement>('[data-more-trigger]');
const fallback = document.querySelector<HTMLAnchorElement>('[data-more-fallback]');
// Match the existing tablet layout boundary in the navigation styles.
const mobile = window.matchMedia('(width < 48rem)');

if (sheet && trigger && fallback) {
  trigger.hidden = false;
  fallback.hidden = true;

  const release = () => {
    delete document.documentElement.dataset.mobileSheetOpen;
    delete sheet.dataset.closing;
    trigger.setAttribute('aria-expanded', 'false');
    if (mobile.matches) trigger.focus({ preventScroll: true });
    else document.querySelector<HTMLAnchorElement>('.site-header__brand')?.focus({ preventScroll: true });
  };

  const close = async () => {
    if (!sheet.open || sheet.hasAttribute('data-closing')) return;
    sheet.dataset.closing = '';
    // Wait for CSS, including reduced-motion overrides, without a duplicate timer.
    await Promise.allSettled(sheet.getAnimations().map(animation => animation.finished));
    if (sheet.open) sheet.close();
  };

  trigger.addEventListener('click', () => {
    if (!mobile.matches || sheet.open) return;
    document.documentElement.dataset.mobileSheetOpen = '';
    trigger.setAttribute('aria-expanded', 'true');
    sheet.showModal();
    sheet.scrollTop = 0;
  });

  sheet.querySelectorAll<HTMLButtonElement>('[data-more-close]').forEach(button => {
    button.addEventListener('click', () => { void close(); });
  });
  sheet.addEventListener('cancel', event => {
    event.preventDefault();
    void close();
  });
  // The native backdrop targets the dialog; its content wrapper stays inside.
  sheet.addEventListener('click', event => {
    if (event.target === sheet) void close();
  });
  sheet.addEventListener('close', release);
  sheet.querySelectorAll<HTMLAnchorElement>('a').forEach(link => {
    link.addEventListener('click', () => { sheet.close(); });
  });
  mobile.addEventListener('change', () => {
    if (!mobile.matches && sheet.open) sheet.close();
  });
  window.addEventListener('pagehide', () => {
    if (sheet.open) sheet.close();
    delete document.documentElement.dataset.mobileSheetOpen;
  });
}
