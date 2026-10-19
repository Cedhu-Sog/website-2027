/** Only decorative SVGs move. Each motif belongs to exactly one input group. */
class HeroParallax extends HTMLElement {
  private cleanup?: () => void;

  connectedCallback() {
    const hero = this.closest<HTMLElement>('.hero');
    if (!hero || this.cleanup) return;

    const controller = new AbortController();
    const { signal } = controller;
    const desktop = matchMedia('(min-width: 48rem)');
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const motifs = Array.from(this.querySelectorAll<SVGElement>('[data-parallax]')).map(element => ({
      element,
      pointer: element.dataset.parallax === 'pointer',
      depth: Number(element.dataset.depth),
    }));
    let bounds = { left: 0, top: 0, width: 1, height: 1 };
    let pointerX = 0;
    let pointerY = 0;
    let currentX = 0;
    let currentY = 0;
    let progress = 0;
    let currentProgress = 0;
    let visible = true;
    let frame = 0;
    let previousTime = 0;

    const allowed = () => desktop.matches && !reduced.matches
      && document.documentElement.dataset.motion !== 'reduced';
    const scrollProgress = () => Math.max(0, Math.min(1, (window.scrollY - bounds.top) / bounds.height));
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
    };
    const render = () => {
      for (const motif of motifs) {
        const x = motif.pointer ? currentX * motif.depth : 0;
        const y = motif.pointer ? currentY * motif.depth : currentProgress * motif.depth;
        const rotation = motif.pointer ? 0 : currentProgress * Math.sign(motif.depth) * 2;
        motif.element.style.transform = `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0) rotate(${rotation.toFixed(3)}deg)`;
      }
    };
    const tick = (time: number) => {
      frame = 0;
      const elapsed = previousTime ? Math.min(time - previousTime, 64) : 16;
      previousTime = time;
      const blend = 1 - Math.exp(-elapsed / 90);
      currentX += (pointerX - currentX) * blend;
      currentY += (pointerY - currentY) * blend;
      currentProgress += (progress - currentProgress) * blend;
      const settling = Math.abs(pointerX - currentX) + Math.abs(pointerY - currentY)
        + Math.abs(progress - currentProgress) > .0005;
      if (!settling) {
        currentX = pointerX;
        currentY = pointerY;
        currentProgress = progress;
      }
      render();
      if (settling) frame = requestAnimationFrame(tick);
      else previousTime = 0;
    };
    const wake = () => {
      if (!frame && visible && !document.hidden && allowed()) frame = requestAnimationFrame(tick);
    };
    const reset = () => {
      stop();
      pointerX = pointerY = currentX = currentY = 0;
      currentProgress = progress = 0;
      motifs.forEach(({ element }) => element.style.removeProperty('transform'));
    };
    const measure = () => {
      const rect = hero.getBoundingClientRect();
      bounds = { left: rect.left + window.scrollX, top: rect.top + window.scrollY, width: rect.width, height: rect.height };
      progress = scrollProgress();
      wake();
    };
    const preferencesChanged = () => {
      reset();
      if (allowed()) {
        measure();
        currentProgress = progress;
        render();
      }
    };

    hero.addEventListener('pointermove', event => {
      if (!allowed() || !finePointer.matches || event.pointerType !== 'mouse') return;
      pointerX = Math.max(-1, Math.min(1, (event.clientX + window.scrollX - bounds.left) / bounds.width * 2 - 1));
      pointerY = Math.max(-1, Math.min(1, (event.clientY + window.scrollY - bounds.top) / bounds.height * 2 - 1));
      wake();
    }, { passive: true, signal });
    const releasePointer = () => { pointerX = pointerY = 0; wake(); };
    hero.addEventListener('pointerleave', releasePointer, { signal });
    hero.addEventListener('pointercancel', releasePointer, { signal });
    window.addEventListener('blur', releasePointer, { signal });
    window.addEventListener('scroll', () => {
      if (!allowed()) return;
      progress = scrollProgress();
      wake();
    }, { passive: true, signal });
    window.addEventListener('resize', measure, { passive: true, signal });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else { releasePointer(); measure(); }
    }, { signal });
    for (const media of [desktop, finePointer, reduced]) media.addEventListener('change', preferencesChanged, { signal });
    const preferences = new MutationObserver(preferencesChanged);
    preferences.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    const size = new ResizeObserver(measure);
    size.observe(hero);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) { progress = scrollProgress(); wake(); }
      else { stop(); pointerX = pointerY = currentX = currentY = 0; }
    });
    intersection.observe(hero);
    preferencesChanged();

    this.cleanup = () => {
      controller.abort();
      preferences.disconnect();
      size.disconnect();
      intersection.disconnect();
      reset();
    };
  }

  disconnectedCallback() {
    this.cleanup?.();
    this.cleanup = undefined;
  }
}

if (!customElements.get('hero-parallax')) customElements.define('hero-parallax', HeroParallax);
export {};
