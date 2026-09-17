export {};
const dropdowns = document.querySelectorAll<HTMLDetailsElement>('[data-nav-dropdown]');
const mobileMenu = document.querySelector<HTMLDetailsElement>('#mobile-menu');
dropdowns.forEach(menu => {
  menu.addEventListener('toggle', () => {
    if (menu.open) dropdowns.forEach(other => { if (other !== menu) other.open = false; });
  });
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  [...dropdowns, mobileMenu].forEach(menu => {
    if (menu?.open) {
      menu.open = false;
      menu.querySelector<HTMLElement>('summary')?.focus();
    }
  });
});
document.addEventListener('click', event => {
  if (!(event.target instanceof Node)) return;
  const target = event.target;
  [...dropdowns, mobileMenu].forEach(menu => { if (menu?.open && !menu.contains(target)) menu.open = false; });
});
// A mobile disclosure must not reopen unexpectedly after resizing back from desktop.
window.matchMedia('(min-width: 62rem)').addEventListener('change', event => {
  if (event.matches && mobileMenu) mobileMenu.open = false;
});
window.matchMedia('(width < 48rem)').addEventListener('change', event => {
  if (event.matches && mobileMenu) mobileMenu.open = false;
});
