export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

export function randChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function distanceSquared(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function lerp(from, to, t) {
  return from + (to - from) * t;
}
