import { clamp, clampUnit, heroMotion, heroProgress, motionTarget, springStep, type HeroMotionName, type Travel } from './hero-motion.ts';

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
      .map(element => ({ element, name: element.dataset.heroMotion as HeroMotionName,
        x: 0, y: 0, vx: 0, vy: 0, ready: false, safe: true, travel: undefined as Travel | undefined }));
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
        if (!motif.ready || !motif.safe) continue;
        const target = motionTarget(motif.name, pointerX, pointerY, progress, wide.matches ? 1 : .72);
        if (motif.travel) {
          target.x = clamp(target.x, motif.travel.minX, motif.travel.maxX);
          target.y = clamp(target.y, motif.travel.minY, motif.travel.maxY);
        }
        const x = springStep(motif.x, motif.vx, target.x, elapsed, heroMotion[motif.name].response);
        const y = springStep(motif.y, motif.vy, target.y, elapsed, heroMotion[motif.name].response);
        motif.x = motif.travel ? clamp(x.position, motif.travel.minX, motif.travel.maxX) : x.position;
        motif.y = motif.travel ? clamp(y.position, motif.travel.minY, motif.travel.maxY) : y.position;
        motif.vx = motif.x === x.position ? x.velocity : 0;
        motif.vy = motif.y === y.position ? y.velocity : 0;
        motif.element.style.setProperty('--hero-track-x', `${motif.x.toFixed(3)}px`);
        motif.element.style.setProperty('--hero-track-y', `${motif.y.toFixed(3)}px`);
        settling ||= motif.x !== target.x || motif.y !== target.y || motif.vx !== 0 || motif.vy !== 0;
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
        motif.x = motif.y = motif.vx = motif.vy = 0;
        motif.element.style.removeProperty('--hero-track-x');
        motif.element.style.removeProperty('--hero-track-y');
      });
    };
    // Free rectangles are measured only on layout changes. Pointer/RAF never
    // reads geometry or tests collisions. Long copy can retire an unsafe slot.
    const layoutSlots = () => {
      if (!hero.querySelector) return;
      const copy = hero.querySelector<HTMLElement>('.hero__copy');
      const visual = hero.querySelector<HTMLElement>('.hero__visual');
      const foot = hero.querySelector<HTMLElement>('.hero__foot');
      const caption = hero.querySelector<HTMLElement>('.hero__caption-top');
      const inset = hero.querySelector<HTMLElement>('.hero__inset');
      if (!copy || !visual || !foot || !caption || !inset) return;
      const h = hero.getBoundingClientRect();
      const c = copy.getBoundingClientRect();
      const v = visual.getBoundingClientRect();
      const f = foot.getBoundingClientRect();
      const label = caption.getBoundingClientRect();
      const photoBottom = Math.max(...Array.from(hero.querySelectorAll<HTMLElement>(
        '.hero__photo, .hero__moments, .hero__moments figcaption',
      )).map(element => element.getBoundingClientRect().bottom));
      const pad = 20;
      const insetLeft = v.left + inset.offsetLeft;
      const upper = { left: h.left + pad, right: c.right - pad, top: h.top + pad, bottom: c.top - pad };
      const lower = { left: h.left + pad, right: c.right - pad, top: c.bottom + pad, bottom: f.top - pad };
      const photoTop = { left: v.left + pad, right: insetLeft - pad,
        top: desktop.matches ? h.top + pad : v.top + pad, bottom: label.top - pad };
      // The wide collage has a taller free pocket beside (not above) its label.
      // Use it for the bulb so its vertical travel can remain expressive too.
      const mainPhoto = hero.querySelector<HTMLElement>('.hero__photo');
      if (desktop.matches && mainPhoto && photoTop.right - label.right - pad >= 120) {
        photoTop.left = label.right + pad;
        photoTop.bottom = mainPhoto.getBoundingClientRect().top - pad;
      }
      const photoLower = { left: v.left + pad, right: v.right - pad, top: photoBottom + pad, bottom: f.top - pad };
      const compact = !desktop.matches;
      for (const motif of motifs) {
        if (motif.name === 'polaroid') continue;
        const style = getComputedStyle(motif.element);
        const width = parseFloat(style.width);
        const viewBox = motif.element.getAttribute('viewBox')?.split(' ').map(Number);
        const height = viewBox ? width * viewBox[3] / viewBox[2] : parseFloat(style.height);
        const slot = motif.name === 'sparkle' || motif.name === 'pencil' ? upper
          : motif.name === 'wave' || motif.name === 'geometry' ? lower
          : motif.name === 'bulb' ? photoTop : photoLower;
        const region = compact ? (motif.name === 'geometry' ? photoLower : photoTop) : slot;
        const fraction = { sparkle: .24, pencil: .86, wave: .16, geometry: .62, bulb: .45, asterisk: .84, dots: .35 }[motif.name];
        const fx = compact ? (motif.name === 'sparkle' ? .1 : .7) : fraction;
        const x = region.left + (region.right - region.left - width) * fx;
        const y = region.top + (region.bottom - region.top - height) / 2;
        motif.safe = Number.isFinite(x + y) && region.right - region.left >= width + 16
          && region.bottom - region.top >= height + 8
          && (!compact || ['sparkle', 'bulb', 'geometry'].includes(motif.name));
        motif.element.setAttribute('data-hero-safe', String(motif.safe));
        if (!motif.safe) {
          motif.x = motif.y = motif.vx = motif.vy = 0;
          motif.element.style.removeProperty('--hero-track-x');
          motif.element.style.removeProperty('--hero-track-y');
          continue;
        }
        motif.travel = { minX: region.left - x, maxX: region.right - x - width,
          minY: region.top - y, maxY: region.bottom - y - height };
        const safeX = clamp(motif.x, motif.travel.minX, motif.travel.maxX);
        const safeY = clamp(motif.y, motif.travel.minY, motif.travel.maxY);
        if (safeX !== motif.x) motif.vx = 0;
        if (safeY !== motif.y) motif.vy = 0;
        motif.x = safeX; motif.y = safeY;
        if (allowed()) {
          motif.element.style.setProperty('--hero-track-x', `${motif.x.toFixed(3)}px`);
          motif.element.style.setProperty('--hero-track-y', `${motif.y.toFixed(3)}px`);
        }
        motif.element.style.setProperty('--hero-slot-x', `${(x - h.left).toFixed(2)}px`);
        motif.element.style.setProperty('--hero-slot-y', `${(y - h.top).toFixed(2)}px`);
        motif.element.style.setProperty('--hero-entry-x', `${clamp(parseFloat(style.getPropertyValue('--hero-enter-from-x')) || 0, motif.travel.minX, motif.travel.maxX)}px`);
        motif.element.style.setProperty('--hero-entry-y', `${clamp(parseFloat(style.getPropertyValue('--hero-enter-from-y')) || 0, motif.travel.minY, motif.travel.maxY)}px`);
      }
      this.setAttribute('data-hero-layout', '');
    };
    const measure = () => {
      const rect = hero.getBoundingClientRect();
      bounds = { left: rect.left + window.scrollX, top: rect.top + window.scrollY, width: rect.width, height: rect.height };
      progress = heroProgress(window.scrollY, bounds.top, bounds.height);
      layoutSlots();
      wake();
    };
    const preferencesChanged = () => { reset(); measure(); };
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
    for (const target of hero.querySelectorAll<HTMLElement>('.hero__copy, .hero__visual')) size.observe(target);
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
