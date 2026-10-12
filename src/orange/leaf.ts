// The bouncy leaf — pure, unit-tested (orange.test.ts). A damped spring per
// axis bends the stem and leaf: sideways (x) and forward / back (y). The
// head's acceleration shoves it the other way (it lags, then springs back and
// wobbles), and the head's roll swings it sideways.
import { LEAF } from "./config";

export type Leaf = {
  bend: { x: number; y: number };
  vel: { x: number; y: number };
  lastPos: { x: number; y: number } | null;
  lastVel: { x: number; y: number } | null;
  lastRoll: number | null;
};

export const createLeaf = (): Leaf => ({
  bend: { x: 0, y: 0 },
  vel: { x: 0, y: 0 },
  lastPos: null,
  lastVel: null,
  lastRoll: null,
});

/** Forget the head's motion (after a hitch: a long frame would read as a jolt). */
export const resetMotion = (l: Leaf) => {
  l.lastPos = null;
  l.lastVel = null;
  l.lastRoll = null;
};

/**
 * Advance one frame. `pos`: the head on screen (world units), `unit`: the
 * distance between the eyes (world units), `roll`: the head's tilt (radians).
 */
export const stepLeaf = (
  l: Leaf,
  pos: { x: number; y: number },
  unit: number,
  roll: number,
  dt: number,
) => {
  if (dt <= 0) return;
  const u = Math.max(1e-6, unit);
  let ax = 0;
  let ay = 0;
  if (l.lastPos) {
    const v = {
      x: (pos.x - l.lastPos.x) / u / dt,
      y: (pos.y - l.lastPos.y) / u / dt,
    };
    if (l.lastVel) {
      ax = (v.x - l.lastVel.x) / dt;
      ay = (v.y - l.lastVel.y) / dt;
      const a = Math.hypot(ax, ay);
      if (a > LEAF.maxShove) {
        ax *= LEAF.maxShove / a;
        ay *= LEAF.maxShove / a;
      }
    }
    l.lastVel = v;
  }
  l.lastPos = { ...pos };
  const rollVel = l.lastRoll === null ? 0 : (roll - l.lastRoll) / dt;
  l.lastRoll = roll;
  // Pushed against the motion; the roll swings it the other way too.
  const fx =
    -LEAF.stiffness * l.bend.x -
    LEAF.damping * l.vel.x +
    LEAF.stiffness * (LEAF.push * ax - LEAF.roll * rollVel * dt * 10);
  const fy =
    -LEAF.stiffness * l.bend.y -
    LEAF.damping * l.vel.y +
    LEAF.stiffness * LEAF.push * ay;
  l.vel.x += fx * dt;
  l.vel.y += fy * dt;
  l.bend.x = Math.max(-LEAF.max, Math.min(LEAF.max, l.bend.x + l.vel.x * dt));
  l.bend.y = Math.max(-LEAF.max, Math.min(LEAF.max, l.bend.y + l.vel.y * dt));
};
