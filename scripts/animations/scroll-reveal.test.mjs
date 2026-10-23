import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initScrollReveal } from '../../src/scripts/animations/scroll-reveal.ts';

// Small DOM/observer doubles exercise lifecycle and failure paths without dependencies.
function environment({ reduced = false, supported = true, fails = false, hash = '', visualHeight } = {}) {
  class Element extends EventTarget {
    dataset = {};
    children = [];
    constructor(top = 1200) { super(); this.top = top; }
    contains(target) { return this === target || this.children.some(child => child.contains(target)); }
    getBoundingClientRect() { return { top: this.top, bottom: this.top + 200 }; }
    querySelectorAll() { return this.children; }
  }
  const visible = new Element(800);
  const card = new Element();
  const root = new Element();
  root.children = [visible, card];
  const document = new EventTarget();
  document.documentElement = new Element();
  document.activeElement = null;
  document.getElementById = id => id === 'card' ? card : null;
  const window = new EventTarget();
  window.innerHeight = 900;
  if (visualHeight !== undefined) {
    window.visualViewport = new EventTarget();
    window.visualViewport.height = visualHeight;
  }
  const media = new EventTarget();
  media.matches = reduced;
  const intersections = [];
  class IntersectionObserver {
    observed = new Set();
    constructor(callback, options) {
      if (fails) throw Error('Observer unavailable');
      this.callback = callback;
      this.options = options;
      intersections.push(this);
    }
    observe(element) { this.observed.add(element); }
    unobserve(element) { this.observed.delete(element); }
    disconnect() { this.observed.clear(); }
    enter(element, { intersecting = true, top = 650, bottom = top + 200 } = {}) {
      this.callback([{ target: element, isIntersecting: intersecting, boundingClientRect: { top, bottom } }]);
    }
  }
  let mutation;
  class MutationObserver {
    constructor(callback) { mutation = callback; }
    observe() {}
    disconnect() {}
  }
  if (supported) window.IntersectionObserver = IntersectionObserver;
  Object.assign(globalThis, {
    window, document, Element, HTMLElement: Element, IntersectionObserver, MutationObserver,
    matchMedia: () => media, location: { hash },
  });
  return { root, card, visible, window, document, media, intersections, mutate: () => mutation?.() };
}

test('keeps restored visible HTML visible; activates at 80% of viewport height', () => {
  const env = environment();
  const cleanup = initScrollReveal(env.root);
  assert.equal(env.visible.dataset.revealState, undefined);
  assert.equal(env.card.dataset.revealState, 'pending');
  const observer = env.intersections[0];
  assert.equal(observer.options.rootMargin, '0px 0px -180px 0px');
  assert.equal(observer.options.threshold, 0);
  observer.enter(env.card);
  assert.equal(env.card.dataset.revealState, 'running');
  assert.equal(observer.observed.size, 1, 'Observe until completion to catch fast exits');
  observer.enter(env.card);
  assert.equal(env.card.dataset.revealState, 'running');
  cleanup();
  assert.equal(env.card.dataset.revealState, 'done');
  assert.equal(observer.observed.size, 0);
});

test('a tall element can start at the activation edge without a fractional threshold', () => {
  const env = environment();
  const cleanup = initScrollReveal(env.root);
  env.intersections[0].enter(env.card, { top: 710, bottom: 3000 });
  assert.equal(env.card.dataset.revealState, 'running');
  cleanup();
});

test('a jump well into the viewport skips the delay and settles immediately', () => {
  const env = environment();
  const cleanup = initScrollReveal(env.root);
  env.intersections[0].enter(env.card, { top: 200, bottom: 600 });
  assert.equal(env.card.dataset.revealState, 'done');
  cleanup();
});

test('a running entrance is released on fast exit instead of waiting through its delay', () => {
  const env = environment();
  const cleanup = initScrollReveal(env.root);
  env.intersections[0].enter(env.card);
  env.intersections[0].enter(env.card, { intersecting: false, top: -250, bottom: -50 });
  assert.equal(env.card.dataset.revealState, 'done');
  assert.equal(env.intersections[0].observed.size, 0);
  cleanup();
});

test('duplicate entries do not restart the fallback or replay a finished entrance', context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const env = environment();
  const cleanup = initScrollReveal(env.root);
  const observer = env.intersections[0];
  observer.enter(env.card);
  context.mock.timers.tick(400);
  observer.enter(env.card);
  context.mock.timers.tick(550);
  assert.equal(env.card.dataset.revealState, 'running', 'Do not cut off duration plus delay');
  context.mock.timers.tick(50);
  assert.equal(env.card.dataset.revealState, 'done');
  observer.enter(env.card);
  assert.equal(env.card.dataset.revealState, 'done');
  cleanup();
});

test('fast scroll past a tall block releases it immediately', () => {
  const env = environment();
  const cleanup = initScrollReveal(env.root);
  env.intersections[0].enter(env.card, { intersecting: false, bottom: -50 });
  assert.equal(env.card.dataset.revealState, 'done');
  cleanup();
});

for (const options of [{ reduced: true }, { supported: false }, { fails: true }]) {
  test(`fails open: ${JSON.stringify(options)}`, () => {
    const env = environment(options);
    initScrollReveal(env.root);
    assert.equal(env.card.dataset.revealState, 'done');
    assert.equal(env.visible.dataset.revealState, 'done');
  });
}

test('OS and site motion changes release all prepared content', () => {
  for (const mode of ['os', 'site']) {
    for (const running of [false, true]) {
      const env = environment();
      initScrollReveal(env.root);
      if (running) env.intersections[0].enter(env.card);
      if (mode === 'os') { env.media.matches = true; env.media.dispatchEvent(new Event('change')); }
      else { env.document.documentElement.dataset.motion = 'reduced'; env.mutate(); }
      assert.equal(env.card.dataset.revealState, 'done');
      assert.equal(env.intersections[0].observed.size, 0);
    }
  }
});

test('focus reveals an interactive descendant before or during its delay', () => {
  for (const running of [false, true]) {
    const env = environment();
    const link = new HTMLElement();
    env.card.children.push(link);
    const cleanup = initScrollReveal(env.root);
    if (running) env.intersections[0].enter(env.card);
    const event = new Event('focusin');
    Object.defineProperty(event, 'target', { value: link });
    env.root.dispatchEvent(event);
    assert.equal(env.card.dataset.revealState, 'done');
    cleanup();
  }
});

test('initial and changed anchors reveal their destination', () => {
  for (const initial of [true, false]) {
    const env = environment({ hash: initial ? '#card' : '' });
    const cleanup = initScrollReveal(env.root);
    if (!initial) {
      env.intersections[0].enter(env.card);
      location.hash = '#card'; env.window.dispatchEvent(new Event('hashchange'));
    }
    assert.equal(env.card.dataset.revealState, 'done');
    cleanup();
  }
});

test('resize refreshes the observer; reinitialization never hides visited content', () => {
  const env = environment();
  initScrollReveal(env.root);
  env.window.innerHeight = 700;
  env.window.dispatchEvent(new Event('resize'));
  assert.equal(env.intersections[0].observed.size, 0);
  assert.equal(env.intersections[1].options.rootMargin, '0px 0px -140px 0px');
  const cleanup = initScrollReveal(env.root);
  assert.equal(env.intersections[1].observed.size, 0);
  assert.equal(env.card.dataset.revealState, 'done');
  assert.equal(env.intersections[2].observed.size, 0);
  cleanup();
});

test('visual viewport resizing refreshes the Safari trigger and cleanup removes its listener', () => {
  const env = environment({ visualHeight: 800 });
  const cleanup = initScrollReveal(env.root);
  assert.equal(env.intersections[0].options.rootMargin, '0px 0px -260px 0px');
  env.window.dispatchEvent(new Event('resize'));
  assert.equal(env.intersections.length, 1, 'Ignore duplicate window/visual resize notifications');
  env.intersections[0].enter(env.card);
  env.window.visualViewport.height = 750;
  env.window.visualViewport.dispatchEvent(new Event('resize'));
  assert.equal(env.intersections[1].options.rootMargin, '0px 0px -300px 0px');
  assert(env.intersections[1].observed.has(env.card), 'Running entrances remain observed after resize');
  cleanup();
  env.window.visualViewport.dispatchEvent(new Event('resize'));
  assert.equal(env.intersections.length, 2);
});

test('empty groups and navigation teardown remain safe', () => {
  const env = environment();
  initScrollReveal(env.root);
  env.window.dispatchEvent(new Event('pagehide'));
  assert.equal(env.card.dataset.revealState, 'done');
  assert.equal(env.intersections[0].observed.size, 0);
  env.root.children = [];
  assert.doesNotThrow(() => initScrollReveal(env.root)());
});
