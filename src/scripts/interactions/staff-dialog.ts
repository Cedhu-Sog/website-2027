export {};

// The native disclosure remains usable if JavaScript or <dialog> is unavailable.
if (typeof HTMLDialogElement !== 'undefined' && 'showModal' in HTMLDialogElement.prototype) {
  document.querySelectorAll<HTMLElement>('[data-staff-card]').forEach(card => {
    const dialog = card.querySelector<HTMLDialogElement>('.staff-dialog');
    const trigger = card.querySelector<HTMLButtonElement>('[data-staff-open]');
    const fallback = card.querySelector<HTMLDetailsElement>('[data-staff-fallback]');
    const details = card.querySelector<HTMLElement>('[data-staff-details]');
    const target = dialog?.querySelector<HTMLElement>('[data-staff-dialog-content]');
    if (!dialog || !trigger || !fallback || !details || !target) return;

    // Move the server-rendered content; never maintain a second copy of the data.
    target.append(details);
    fallback.hidden = true;
    trigger.hidden = false;

    trigger.addEventListener('click', () => {
      if (dialog.open) return;
      dialog.showModal();
      document.documentElement.dataset.staffDialogOpen = '';
      trigger.setAttribute('aria-expanded', 'true');
      dialog.scrollTop = 0;
      dialog.querySelector<HTMLElement>('[data-staff-title]')?.focus({ preventScroll: true });
    });
    dialog.querySelector<HTMLButtonElement>('[data-staff-close]')?.addEventListener('click', () => dialog.close());
    // Escape and keyboard focus containment are handled by the native modal.
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
    dialog.addEventListener('close', () => {
      delete document.documentElement.dataset.staffDialogOpen;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus({ preventScroll: true });
    });
    window.addEventListener('pagehide', () => {
      if (dialog.open) dialog.close();
      delete document.documentElement.dataset.staffDialogOpen;
    });
  });
}
