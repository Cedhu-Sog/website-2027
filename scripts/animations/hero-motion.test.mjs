import assert from 'node:assert/strict';
import { test } from 'node:test';
import { springStep, heroMotion, heroProgress, motionTarget } from '../../src/scripts/animations/hero-motion.ts';

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
  assert.deepEqual(motionTarget('polaroid', 100, -100, 0), { x: -12, y: 9 });
});

test('scroll stays within the hero and only moves bulb X and geometry Y', () => {
  assert.equal(heroProgress(-100, 100, 500), 0);
  assert.equal(heroProgress(350, 100, 500), .5);
  assert.equal(heroProgress(2000, 100, 500), 1);
  assert.equal(heroProgress(100, 100, 0), 0);
  for (const name of Object.keys(heroMotion)) {
    const target = motionTarget(name, 0, 0, 100);
    assert.deepEqual(target, name === 'bulb' ? { x: 30, y: 0 }
      : name === 'geometry' ? { x: 0, y: 30 } : { x: 0, y: 0 });
  }
});

test('pointer release preserves scroll; returning to top reverses it', () => {
  assert.deepEqual(motionTarget('bulb', 0, 0, 1), { x: 30, y: 0 });
  assert.deepEqual(motionTarget('geometry', 0, 0, .5), { x: 0, y: 15 });
  assert.deepEqual(motionTarget('bulb', 0, 0, 0), { x: 0, y: 0 });
  assert.deepEqual(motionTarget('bulb', 1, 1, 1), { x: 75, y: 32 });
  assert(Math.abs(motionTarget('bulb', 1, 1, 1, .65).y - 20.8) < 1e-12);
});

test('critical spring accelerates, brakes, settles and retains velocity on retarget', () => {
  let state = { position: 0, velocity: 0 };
  const speeds = [];
  for (let step = 0; step < 300; step++) {
    const next = springStep(state.position, state.velocity, 55, 16, 900);
    assert(next.position >= state.position && next.position <= 55);
    speeds.push(next.velocity); state = next;
  }
  assert(speeds[3] > speeds[0]);
  assert(Math.max(...speeds) > speeds[30]);
  assert.deepEqual(state, { position: 55, velocity: 0 });
  const moving = springStep(0, 0, 55, 100, 900);
  const reverse = springStep(moving.position, moving.velocity, -55, 0, 900);
  assert.equal(reverse.position, moving.position);
  assert.equal(reverse.velocity, moving.velocity);
});

test('spring is refresh-rate independent and clamps inactive-tab intervals', () => {
  const full = springStep(0, 0, 45, 16, 680);
  const half = springStep(0, 0, 45, 8, 680);
  const twice = springStep(half.position, half.velocity, 45, 8, 680);
  assert(Math.abs(full.position - twice.position) < 1e-12);
  assert(Math.abs(full.velocity - twice.velocity) < 1e-12);
  assert.deepEqual(springStep(0, 0, 45, 10000, 680), springStep(0, 0, 45, 64, 680));
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
  assert.equal(motifs[0].values.get('--hero-track-x'), '-42.000px');
  assert.equal(motifs[1].values.get('--hero-track-x'), '45.000px');
  hero.dispatchEvent(new Event('pointerleave')); flush();
  assert.equal(motifs[1].values.get('--hero-track-x'), '0.000px');
  window.scrollY = 350; window.dispatchEvent(new Event('scroll')); flush();
  assert.equal(motifs[1].values.get('--hero-track-x'), '15.000px');
  assert.equal(motifs[4].values.get('--hero-track-y'), '15.000px');
  const reduced = media.get('(prefers-reduced-motion: reduce)');
  reduced.matches = true; reduced.dispatchEvent(new Event('change'));
  assert(motifs.every(element => element.values.size === 0));
  assert.equal(frames.size, 0);
  host.disconnectedCallback();
  assert.equal(disconnected, 3);
  hero.dispatchEvent(event);
  assert.equal(frames.size, 0);
});
