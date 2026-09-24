/** Pointer gestures share one threshold for rotation and activation. */
export function mountCampusTour(host: HTMLElement, signal: AbortSignal, wake: () => void) {
  const trigger = host.querySelector<HTMLButtonElement>('.cedhu-3d__trigger');
  const dialog = host.querySelector<HTMLDialogElement>('dialog');
  const video = dialog?.querySelector('video');
  if (!trigger || !dialog || !video) return;
  const options = { signal };
  let pointer: { id: number; x: number; y: number; lastX: number; lastY: number } | undefined;
  let dragged = false;
  let closing = false;
  let closeVersion = 0;
  trigger.disabled = false;

  const endGesture = () => {
    if (pointer && trigger.hasPointerCapture(pointer.id)) trigger.releasePointerCapture(pointer.id);
    pointer = undefined;
    host.removeAttribute('data-dragging');
  };
  trigger.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || pointer) { dragged = true; return; }
    dragged = false;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY };
    trigger.setPointerCapture(event.pointerId);
  }, options);
  trigger.addEventListener('pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 8) dragged = true;
    if (dragged) {
      host.setAttribute('data-dragging', '');
      host.dispatchEvent(new CustomEvent('campus-rotate', { detail: {
        x: (event.clientX - pointer.lastX) / trigger.clientWidth,
        y: (event.clientY - pointer.lastY) / trigger.clientHeight,
      } }));
    }
    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;
  }, options);
  trigger.addEventListener('pointerup', event => {
    if (pointer?.id !== event.pointerId) return;
    dragged ||= Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 8;
    const bounds = trigger.getBoundingClientRect();
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
