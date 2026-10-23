/** Signed pointer amplitudes in CSS pixels; response is a damping time in ms. */
export const heroMotion = {
  sparkle: { x: -7, y: -5, response: 130, scrollX: 0, scrollY: 0 },
  bulb: { x: 8, y: 6, response: 120, scrollX: 14, scrollY: 0 },
  pencil: { x: 6, y: 5, response: 75, scrollX: 0, scrollY: 0 },
  wave: { x: 9, y: 6, response: 220, scrollX: 0, scrollY: 0 },
  geometry: { x: -6, y: -7, response: 190, scrollX: 0, scrollY: 12 },
  asterisk: { x: -8, y: -5, response: 85, scrollX: 0, scrollY: 0 },
  dots: { x: -5, y: -5, response: 145, scrollX: 0, scrollY: 0 },
  polaroid: { x: -3, y: -2, response: 240, scrollX: 0, scrollY: 0 },
} as const;
export type HeroMotionName = keyof typeof heroMotion;
export const clampUnit = (value: number) => Math.max(-1, Math.min(1, value));
export const heroProgress = (scroll: number, top: number, height: number) =>
  Math.max(0, Math.min(1, (scroll - top) / Math.max(1, height)));

export function motionTarget(name: HeroMotionName, x: number, y: number, progress: number, strength = 1) {
  const profile = heroMotion[name];
  const bounded = Math.max(0, Math.min(1, progress));
  return {
    x: (clampUnit(x) * profile.x + bounded * profile.scrollX) * strength,
    y: (clampUnit(y) * profile.y + bounded * profile.scrollY) * strength,
  };
}

/** Exponential damping is consistent across refresh rates and stops at rest. */
export function approach(current: number, target: number, elapsed: number, response: number) {
  const next = current + (target - current) * (1 - Math.exp(-elapsed / response));
  return Math.abs(target - next) < .01 ? target : next;
}
