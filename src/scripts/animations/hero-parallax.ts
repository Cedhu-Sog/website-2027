import { approach, clampUnit, heroMotion, heroProgress, motionTarget, type HeroMotionName } from './hero-motion.ts';

/** One controller composes pointer and scroll; CSS owns entrance and float. */
class HeroParallax extends HTMLElement {
  private cleanup?: () => void;

  connectedCallback() {
    const hero = this.closest<HTMLElement>('.hero');
    if (!hero || this.cleanup) return;
    const controller = new AbortController();
    const { signal } = controller;
    const desktop = matchMedia('(min-width: 62rem)');
    const wide = matchMedia('(min-width: 75rem)');
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const motifs = Array.from(hero.querySelectorAll<HTMLElement | SVGElement>('[data-hero-motion]'))
      .filter(element => Object.hasOwn(heroMotion, element.dataset.heroMotion!))
      .map(element => ({ element, name: element.dataset.heroMotion as HeroMotionName, x: 0, y: 0, ready: false }));
    let bounds = { left: 0, top: 0, width: 1, height: 1 };
    let pointerX = 0;
    let pointerY = 0;
    let progress = 0;
    let visible = false;
    let frame = 0;
    let previousTime = 0;
    const allowed = () => desktop.matches && finePointer.matches && !reduced.matches
      && document.documentElement.dataset.motion !== 'reduced';
    const stop = () => { cancelAnimationFrame(frame); frame = 0; previousTime = 0; };
    const tick = (time: number) => {
      frame = 0;
      const elapsed = previousTime ? Math.min(time - previousTime, 64) : 16;
      previousTime = time;
      let settling = false;
      for (const motif of motifs) {
        if (!motif.ready) continue;
        const target = motionTarget(motif.name, pointerX, pointerY, progress, wide.matches ? 1 : .65);
        motif.x = approach(motif.x, target.x, elapsed, heroMotion[motif.name].response);
        motif.y = approach(motif.y, target.y, elapsed, heroMotion[motif.name].response);
        motif.element.style.setProperty('--hero-track-x', `${motif.x.toFixed(3)}px`);
        motif.element.style.setProperty('--hero-track-y', `${motif.y.toFixed(3)}px`);
        settling ||= motif.x !== target.x || motif.y !== target.y;
      }
      if (settling) frame = requestAnimationFrame(tick);
      else previousTime = 0;
    };
    const wake = () => {
      if (!frame && visible && !document.hidden && allowed()) frame = requestAnimationFrame(tick);
    };
    const reset = () => {
      stop();
      pointerX = pointerY = progress = 0;
      motifs.forEach(motif => {
        motif.x = motif.y = 0;
        motif.element.style.removeProperty('--hero-track-x');
        motif.element.style.removeProperty('--hero-track-y');
      });
    };
    const measure = () => {
      const rect = hero.getBoundingClientRect();
      bounds = { left: rect.left + window.scrollX, top: rect.top + window.scrollY, width: rect.width, height: rect.height };
      progress = heroProgress(window.scrollY, bounds.top, bounds.height);
      wake();
    };
    const preferencesChanged = () => { reset(); if (allowed()) measure(); };
    const releasePointer = () => { pointerX = pointerY = 0; wake(); };

    hero.addEventListener('pointermove', event => {
      if (!allowed() || event.pointerType !== 'mouse') return;
      pointerX = clampUnit((event.clientX + window.scrollX - bounds.left) / bounds.width * 2 - 1);
      pointerY = clampUnit((event.clientY + window.scrollY - bounds.top) / bounds.height * 2 - 1);
      wake();
    }, { passive: true, signal });
    hero.addEventListener('pointerleave', releasePointer, { signal });
    hero.addEventListener('pointercancel', releasePointer, { signal });
    window.addEventListener('blur', releasePointer, { signal });
    window.addEventListener('scroll', () => {
      if (!visible || !allowed()) return;
      progress = heroProgress(window.scrollY, bounds.top, bounds.height);
      wake();
    }, { passive: true, signal });
    window.addEventListener('resize', measure, { passive: true, signal });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else { releasePointer(); measure(); }
    }, { signal });
    for (const media of [desktop, wide, finePointer, reduced]) media.addEventListener('change', preferencesChanged, { signal });
    const preferences = new MutationObserver(preferencesChanged);
    preferences.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    const size = new ResizeObserver(measure);
    size.observe(hero);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) { measure(); wake(); }
      else { stop(); pointerX = pointerY = 0; }
    });
    intersection.observe(hero);
    preferencesChanged();

    // Only finite entrances gate tracking. Ambient float never holds the gate.
    for (const motif of motifs) {
      void Promise.allSettled(motif.element.getAnimations({ subtree: true })
        .filter(animation => animation.effect?.getTiming().iterations !== Infinity)
        .map(animation => animation.finished)).then(() => {
        if (signal.aborted) return;
        motif.ready = true;
        motif.element.setAttribute('data-hero-entered', '');
        wake();
      });
    }
    this.cleanup = () => {
      controller.abort();
      preferences.disconnect();
      size.disconnect();
      intersection.disconnect();
      reset();
    };
  }

  disconnectedCallback() { this.cleanup?.(); this.cleanup = undefined; }
}
if (!customElements.get('hero-parallax')) customElements.define('hero-parallax', HeroParallax);
