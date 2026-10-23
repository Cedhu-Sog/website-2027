import assert from 'node:assert/strict';
import { test } from 'node:test';
import { approach, heroMotion, heroProgress, motionTarget } from '../../src/scripts/animations/hero-motion.ts';

test('pointer quadrants produce opposing groups and bounded displacements', () => {
  for (const x of [-1, 1]) for (const y of [-1, 1]) {
    for (const name of ['bulb', 'pencil', 'wave']) {
      const target = motionTarget(name, x, y, 0);
      assert.equal(Math.sign(target.x), x);
      assert.equal(Math.sign(target.y), y);
    }
    for (const name of ['sparkle', 'asterisk', 'geometry', 'dots', 'polaroid']) {
      const target = motionTarget(name, x, y, 0);
      assert.equal(Math.sign(target.x), -x);
      assert.equal(Math.sign(target.y), -y);
    }
  }
  assert.deepEqual(motionTarget('polaroid', 100, -100, 0), { x: -3, y: 2 });
});

test('scroll stays within the hero and only moves bulb X and geometry Y', () => {
  assert.equal(heroProgress(-100, 100, 500), 0);
  assert.equal(heroProgress(350, 100, 500), .5);
  assert.equal(heroProgress(2000, 100, 500), 1);
  assert.equal(heroProgress(100, 100, 0), 0);
  for (const name of Object.keys(heroMotion)) {
    const target = motionTarget(name, 0, 0, 100);
    assert.deepEqual(target, name === 'bulb' ? { x: 14, y: 0 }
      : name === 'geometry' ? { x: 0, y: 12 } : { x: 0, y: 0 });
  }
});

test('pointer release preserves scroll; returning to top reverses it', () => {
  assert.deepEqual(motionTarget('bulb', 0, 0, 1), { x: 14, y: 0 });
  assert.deepEqual(motionTarget('geometry', 0, 0, .5), { x: 0, y: 6 });
  assert.deepEqual(motionTarget('bulb', 0, 0, 0), { x: 0, y: 0 });
  assert.deepEqual(motionTarget('bulb', 1, 1, 1), { x: 22, y: 6 });
  assert(Math.abs(motionTarget('bulb', 1, 1, 1, .65).y - 3.9) < 1e-12);
});

test('damping preserves direction without overshoot and gives distinct inertia', () => {
  const fast = approach(0, 6, 16, heroMotion.pencil.response);
  const slow = approach(0, 6, 16, heroMotion.wave.response);
  assert(fast > slow && slow > 0 && fast < 6);
  let current = -9;
  for (let step = 0; step < 300; step++) {
    const next = approach(current, 9, 16, 220);
    assert(next >= current && next <= 9);
    current = next;
  }
  assert.equal(current, 9); // The shared RAF can stop at rest.
});

test('response remains consistent between 60 Hz and 120 Hz', () => {
  const full = approach(0, 8, 16, 130);
  const half = approach(approach(0, 8, 8, 130), 8, 8, 130);
  assert(Math.abs(full - half) < 1e-12);
});

test('controller shares listeners, settles RAF, resets preferences and cleans up', async () => {
  const frames = new Map();
  let nextFrame = 0;
  let time = 0;
  let measurements = 0;
  const media = new Map();
  class Element extends EventTarget {
    dataset = {};
    values = new Map();
    counts = new Map();
    style = {
      setProperty: (key, value) => this.values.set(key, value),
      removeProperty: key => this.values.delete(key),
    };
    closest() { return hero; }
    addEventListener(name, listener, options) {
      this.counts.set(name, (this.counts.get(name) ?? 0) + 1);
      super.addEventListener(name, listener, options);
    }
    setAttribute(name) { this.dataset[name] = ''; }
    getAnimations() { return []; }
    getBoundingClientRect() {
      measurements++;
      return { left: 0, top: 100 - window.scrollY, width: 1000, height: 500 };
    }
    querySelectorAll() { return motifs; }
  }
  const hero = new Element();
  const motifs = Object.keys(heroMotion).map(name => {
    const element = new Element();
    element.dataset.heroMotion = name;
    return element;
  });
  const window = new EventTarget();
  window.scrollX = window.scrollY = 0;
  const document = new EventTarget();
  document.documentElement = new Element();
  document.hidden = false;
  let definition;
  let intersection;
  let disconnected = 0;
  class Observer {
    constructor(callback) { this.callback = callback; }
    observe() {}
    disconnect() { disconnected++; }
  }
  Object.assign(globalThis, {
    HTMLElement: Element, window, document,
    matchMedia: query => {
      if (!media.has(query)) {
        const value = new EventTarget();
        value.matches = !query.includes('reduce');
        media.set(query, value);
      }
      return media.get(query);
    },
    customElements: { get: () => undefined, define: (_name, value) => { definition = value; } },
    MutationObserver: Observer, ResizeObserver: Observer,
    IntersectionObserver: class extends Observer {
      constructor(callback) { super(callback); intersection = this; }
    },
    requestAnimationFrame: callback => { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
  });
  const flush = () => {
    for (let count = 0; frames.size && count < 500; count++) {
      const callbacks = [...frames.values()]; frames.clear(); time += 16;
      callbacks.forEach(callback => callback(time));
    }
    assert.equal(frames.size, 0, 'RAF must stop when all motifs settle');
  };
  await import('../../src/scripts/animations/hero-parallax.ts');
  const host = new definition();
  host.connectedCallback();
  host.connectedCallback();
  assert.equal(hero.counts.get('pointermove'), 1);
  await new Promise(resolve => setImmediate(resolve));
  intersection.callback([{ isIntersecting: true }]);
  const event = new Event('pointermove');
  Object.assign(event, { clientX: 1000, clientY: 600, pointerType: 'mouse' });
  hero.dispatchEvent(event);
  const before = measurements;
  flush();
  assert.equal(measurements, before, 'No layout measurements inside RAF');
  assert.equal(motifs[0].values.get('--hero-track-x'), '-7.000px');
  assert.equal(motifs[1].values.get('--hero-track-x'), '8.000px');
  hero.dispatchEvent(new Event('pointerleave')); flush();
  assert.equal(motifs[1].values.get('--hero-track-x'), '0.000px');
  window.scrollY = 350; window.dispatchEvent(new Event('scroll')); flush();
  assert.equal(motifs[1].values.get('--hero-track-x'), '7.000px');
  assert.equal(motifs[4].values.get('--hero-track-y'), '6.000px');
  const reduced = media.get('(prefers-reduced-motion: reduce)');
  reduced.matches = true; reduced.dispatchEvent(new Event('change'));
  assert(motifs.every(element => element.values.size === 0));
  assert.equal(frames.size, 0);
  host.disconnectedCallback();
  assert.equal(disconnected, 3);
  hero.dispatchEvent(event);
  assert.equal(frames.size, 0);
});
