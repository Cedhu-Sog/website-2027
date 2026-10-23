/** Signed amplitudes (px) and approximate settling time (ms), critically damped. */
export const heroMotion = {
  sparkle: { x: -42, y: -32, response: 600, scrollX: 0, scrollY: 0 },
  bulb: { x: 45, y: 32, response: 680, scrollX: 30, scrollY: 0 },
  pencil: { x: 38, y: 28, response: 520, scrollX: 0, scrollY: 0 },
  wave: { x: 55, y: 38, response: 900, scrollX: 0, scrollY: 0 },
  geometry: { x: -35, y: -45, response: 820, scrollX: 0, scrollY: 30 },
  asterisk: { x: -48, y: -34, response: 460, scrollX: 0, scrollY: 0 },
  dots: { x: -38, y: -30, response: 700, scrollX: 0, scrollY: 0 },
  polaroid: { x: -12, y: -9, response: 950, scrollX: 0, scrollY: 0 },
} as const;
export type HeroMotionName = keyof typeof heroMotion;
export type Travel = { minX: number; maxX: number; minY: number; maxY: number };
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const clampUnit = (value: number) => clamp(value, -1, 1);
export const heroProgress = (scroll: number, top: number, height: number) =>
  clamp((scroll - top) / Math.max(1, height), 0, 1);

export function motionTarget(name: HeroMotionName, x: number, y: number, progress: number, strength = 1) {
  const profile = heroMotion[name];
  const bounded = clamp(progress, 0, 1);
  return {
    x: (clampUnit(x) * profile.x + bounded * profile.scrollX) * strength,
    y: (clampUnit(y) * profile.y + bounded * profile.scrollY) * strength,
  };
}

/** Exact critical spring solution: retains velocity on retarget, without timers.
 * Position and velocity use CSS px and seconds. Clamp long inactive-tab intervals.
 */
export function springStep(position: number, velocity: number, target: number, elapsed: number, response: number) {
  const dt = clamp(elapsed, 0, 64) / 1000;
  const omega = 6640 / response;
  const offset = position - target;
  const term = velocity + omega * offset;
  const decay = Math.exp(-omega * dt);
  const next = target + (offset + term * dt) * decay;
  const speed = (velocity - omega * term * dt) * decay;
  return Math.abs(target - next) < .025 && Math.abs(speed) < .05
    ? { position: target, velocity: 0 } : { position: next, velocity: speed };
}
