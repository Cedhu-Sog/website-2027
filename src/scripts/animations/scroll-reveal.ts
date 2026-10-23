const instances = new WeakMap<HTMLElement, () => void>();
const viewportTiming = { activation: .8, catchUp: .35, settleAfter: 1000 } as const;

/** Opt-in enhancement: only offscreen content is prepared, never server HTML. */
export function initScrollReveal(root: HTMLElement): () => void {
  instances.get(root)?.();
  const elements = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
  const controller = new AbortController();
  const { signal } = controller;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let observer: IntersectionObserver | undefined;
  let observerMargin: string | undefined;
  let preferences: MutationObserver | undefined;
  const pending = new Set<HTMLElement>();
  const timers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();

  const finish = (element: HTMLElement) => {
    element.dataset.revealState = 'done';
    pending.delete(element);
    observer?.unobserve(element);
    clearTimeout(timers.get(element));
    timers.delete(element);
  };
  const cleanup = () => {
    controller.abort();
    observer?.disconnect();
    preferences?.disconnect();
    elements.forEach(finish);
    if (instances.get(root) === cleanup) instances.delete(root);
  };
  instances.set(root, cleanup);

  const motionReduced = () => reduced.matches || document.documentElement.dataset.motion === 'reduced';
  const visibleHeight = () => Math.min(window.innerHeight, window.visualViewport?.height ?? window.innerHeight);
  const revealAnchor = () => {
    let target: HTMLElement | null = null;
    try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); }
    catch { /* Malformed fragments do not prevent enhancement. */ }
    if (target) elements.filter(element => element.contains(target) || target.contains(element)).forEach(finish);
  };

  try {
    if (!('IntersectionObserver' in window) || motionReduced()) {
      cleanup();
      return cleanup;
    }

    const observe = () => {
      // IO percentage margins use width. Derive pixels from the current visible
      // height, including Safari's changing browser chrome / visual viewport.
      const height = visibleHeight();
      const rootMargin = `0px 0px -${Math.round(window.innerHeight - height * viewportTiming.activation)}px 0px`;
      if (observer && observerMargin === rootMargin) return;
      observer?.disconnect();
      observer = new IntersectionObserver(entries => {
        try {
          for (const entry of entries) {
            const element = entry.target as HTMLElement;
            if (!pending.has(element) && !timers.has(element)) continue;
            // A jump past the entry band or an exit during the delay must not
            // make the visitor wait for content they have already reached.
            if (entry.boundingClientRect.bottom <= 0
              || (entry.isIntersecting && entry.boundingClientRect.top < height * viewportTiming.catchUp)
              || (timers.has(element) && !entry.isIntersecting)) finish(element);
            else if (entry.isIntersecting) {
              if (timers.has(element)) continue; // Never restart a running entrance.
              pending.delete(element);
              element.dataset.revealState = 'running';
              // Also settle when transitionend is suppressed or a tab is backgrounded.
              timers.set(element, setTimeout(() => finish(element), viewportTiming.settleAfter));
            }
          }
        } catch { cleanup(); }
      }, { threshold: 0, rootMargin });
      observerMargin = rootMargin;
      pending.forEach(element => observer!.observe(element));
      timers.forEach((_, element) => observer!.observe(element));
    };

    // Read all geometry before writing states. Anything already on screen stays visible.
    const candidates = elements.filter(element => !element.dataset.revealState
      && !element.contains(document.activeElement)
      && element.getBoundingClientRect().top >= window.innerHeight);
    candidates.forEach(element => pending.add(element));
    observe(); // Successfully create and register the observer BEFORE hiding anything.
    candidates.forEach(element => { element.dataset.revealState = 'pending'; });
    revealAnchor();

    root.addEventListener('focusin', event => {
      if (event.target instanceof Element) {
        elements.filter(element => element.contains(event.target as Element)).forEach(finish);
      }
    }, { signal });
    root.addEventListener('transitionend', event => {
      if (event.target instanceof HTMLElement && event.propertyName === 'opacity'
        && event.target.dataset.revealState === 'running') finish(event.target);
    }, { signal });
    window.addEventListener('hashchange', revealAnchor, { signal });
    const refreshViewport = () => {
      try { observe(); } catch { cleanup(); }
    };
    window.addEventListener('resize', refreshViewport, { passive: true, signal });
    window.visualViewport?.addEventListener('resize', refreshViewport, { passive: true, signal });
    reduced.addEventListener('change', () => { if (motionReduced()) cleanup(); }, { signal });
    preferences = new MutationObserver(() => { if (motionReduced()) cleanup(); });
    preferences.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    window.addEventListener('pagehide', cleanup, { once: true, signal });
    document.addEventListener('astro:before-swap', cleanup, { once: true, signal });
  } catch {
    cleanup(); // Partial initialization must fail open as well.
  }
  return cleanup;
}
