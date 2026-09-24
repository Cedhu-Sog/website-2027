// Only this small controller loads with the page. Three.js loads on intersection.
import { mountCampusTour } from '../interactions/campus-tour';

class Cedhu3D extends HTMLElement {
  private observer?: IntersectionObserver;
  private controller?: AbortController;
  private wake?: () => void;
  private active = false;
  private interaction?: AbortController;

  connectedCallback() {
    this.interaction = new AbortController();
    mountCampusTour(this, this.interaction.signal, () => this.wake?.());
    if (!('IntersectionObserver' in window)) return;
    this.observer = new IntersectionObserver(([entry]) => {
      this.active = entry.isIntersecting;
      if (this.active && !this.controller) {
        this.controller = new AbortController();
        void this.mount(this.controller.signal);
      }
      this.wake?.();
    });
    this.observer.observe(this);
  }

  disconnectedCallback() {
    this.interaction?.abort();
    this.observer?.disconnect();
    this.controller?.abort();
    this.controller = undefined;
    this.wake = undefined;
    this.active = false;
    this.removeAttribute('data-ready');
  }

  private async mount(signal: AbortSignal) {
    try {
      const { mountCampus } = await import('./cedhu-3d-scene');
      if (signal.aborted) return;
      const wake = await mountCampus(this, signal, () => this.active && !this.hasAttribute('data-tour-open'));
      if (!signal.aborted) this.wake = wake;
    } catch (error) {
      if (!signal.aborted) {
        this.removeAttribute('data-ready');
        console.warn('CEDHU: se mantiene la imagen de respaldo de la maqueta.', error);
      }
    }
  }
}

if (!customElements.get('cedhu-3d')) customElements.define('cedhu-3d', Cedhu3D);
