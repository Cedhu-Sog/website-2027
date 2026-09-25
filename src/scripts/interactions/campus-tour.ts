/** Share swipe detection between tour activation and the bounded touch parallax. */
export function mountCampusTour(host: HTMLElement, signal: AbortSignal, wake: () => void) {
  const trigger = host.querySelector<HTMLButtonElement>('.cedhu-3d__trigger');
  const dialog = host.querySelector<HTMLDialogElement>('dialog');
  const video = dialog?.querySelector('video');
  if (!trigger || !dialog || !video) return;
  const options = { signal };
  let pointer: { id: number; x: number; y: number; touch: boolean; intent: 'pending' | 'horizontal' | 'vertical' } | undefined;
  let dragged = false;
  let closing = false;
  let closeVersion = 0;
  trigger.disabled = false;

  const touchOffset = (offset: number) => {
    host.dispatchEvent(new CustomEvent('campus-touch-offset', { detail: offset }));
  };
  const endGesture = () => {
    if (pointer?.touch) touchOffset(0);
    if (pointer && trigger.hasPointerCapture(pointer.id)) trigger.releasePointerCapture(pointer.id);
    pointer = undefined;
  };
  trigger.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || pointer) {
      dragged = true;
      if (event.pointerType === 'touch') endGesture();
      return;
    }
    dragged = false;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, touch: event.pointerType === 'touch', intent: 'pending' };
    // Touch uses native implicit capture; pan-y can cancel it to scroll the page.
    if (!pointer.touch) trigger.setPointerCapture(event.pointerId);
  }, options);
  trigger.addEventListener('pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (Math.hypot(dx, dy) > 8) dragged = true;
    if (!pointer.touch || !dragged) return;
    // Vertical intent wins permanently for this gesture, including after a turn.
    if (Math.abs(dy) > Math.abs(dx)) pointer.intent = 'vertical';
    else if (pointer.intent === 'pending' && Math.abs(dx) > Math.abs(dy) * 1.2) pointer.intent = 'horizontal';
    const offset = pointer.intent === 'horizontal'
      ? Math.min(1, Math.max(-1, dx / Math.max(1, trigger.clientWidth / 2)))
      : 0;
    touchOffset(offset);
  }, options);
  trigger.addEventListener('pointerup', event => {
    if (pointer?.id !== event.pointerId) return;
    dragged ||= Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 8;
    // The mobile canvas can extend beyond the button's layout box into the gutters.
    const hitArea = pointer.touch ? host.querySelector('canvas') ?? trigger : trigger;
    const bounds = hitArea.getBoundingClientRect();
    dragged ||= event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
    endGesture();
  }, options);
  trigger.addEventListener('pointercancel', () => { dragged = true; endGesture(); }, options);
  trigger.addEventListener('lostpointercapture', () => {
    if (pointer) { dragged = true; endGesture(); }
  }, options);

  const restore = () => {
    closeVersion++;
    video.pause();
    closing = false;
    dialog.removeAttribute('data-closing');
    host.removeAttribute('data-tour-open');
    delete document.documentElement.dataset.campusTourOpen;
    if (host.isConnected) trigger.focus({ preventScroll: true });
    wake();
  };
  const close = async () => {
    if (!dialog.open || closing) return;
    closing = true;
    const version = ++closeVersion;
    video.pause();
    dialog.setAttribute('data-closing', '');
    host.removeAttribute('data-tour-open');
    // Wait for CSS exit animations, including their reduced-motion override.
    await Promise.allSettled(dialog.getAnimations().map(animation => animation.finished));
    if (!signal.aborted && version === closeVersion) dialog.close();
  };
  trigger.addEventListener('click', event => {
    if (event.detail !== 0 && dragged) { event.preventDefault(); return; }
    if (dialog.open) return;
    endGesture();
    dialog.showModal();
    host.setAttribute('data-tour-open', '');
    document.documentElement.dataset.campusTourOpen = '';
    wake();
    video.currentTime = 0;
    void video.play().catch(() => { /* Native controls remain available if autoplay is blocked. */ });
  }, options);
  dialog.querySelector('button')?.addEventListener('click', () => { void close(); }, options);
  dialog.addEventListener('cancel', event => { event.preventDefault(); void close(); }, options);
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) void close();
  }, options);
  dialog.addEventListener('close', restore, options);
  video.addEventListener('error', () => {
    const error = dialog.querySelector<HTMLElement>('.cedhu-3d__video-error');
    if (error) error.hidden = false;
  }, options);
  const cleanup = () => {
    endGesture();
    if (dialog.open) { dialog.close(); restore(); }
  };
  window.addEventListener('pagehide', cleanup, options);
  signal.addEventListener('abort', cleanup, { once: true });
}
