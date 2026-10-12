// Orange juice — pure, unit-tested (orange.test.ts). Open your mouth wide and
// it squirts: a burst as it opens, then a stream while it stays open. Each
// droplet flies out of the mouth (fanned around down-and-out), falls, fades.
// Design px (the 1280-tall screen, y down).
import { JUICE } from "./config";

export type Drop = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: number;
};

export type Juice = {
  drops: Drop[];
  /** The mouth was open last frame; stream droplets owed. */
  open: boolean;
  debt: number;
  /** Squirts so far. */
  squirts: number;
};

export const createJuice = (): Juice => ({
  drops: [],
  open: false,
  debt: 0,
  squirts: 0,
});

const between = ([a, b]: readonly [number, number], random: () => number) =>
  a + (b - a) * random();

const spawn = (
  j: Juice,
  at: { x: number; y: number },
  scale: number,
  random: () => number,
) => {
  if (j.drops.length >= JUICE.max) j.drops.shift();
  // Mostly downward and out to either side, some straight at you.
  const a = Math.PI / 2 + (random() * 2 - 1) * JUICE.spread;
  const v = between(JUICE.speed, random) * scale;
  const life = between(JUICE.life, random);
  j.drops.push({
    x: at.x,
    y: at.y,
    vx: Math.cos(a) * v,
    vy: Math.sin(a) * v - 260 * scale,
    life,
    max: life,
    size: between(JUICE.size, random) * scale,
    color: Math.floor(random() * JUICE.colors.length) % JUICE.colors.length,
  });
};

/**
 * Advance one frame. `mouthOpen`: the mouth-open value (null: no face);
 * `mouth`: the mouth (design px); `scale`: the face's size relative to usual,
 * so the juice fits the face.
 */
export const stepJuice = (
  j: Juice,
  mouthOpen: number | null,
  mouth: { x: number; y: number } | null,
  scale: number,
  dt: number,
  random: () => number,
) => {
  const open = mouthOpen !== null && mouth !== null && mouthOpen > JUICE.open;
  if (open && mouth) {
    if (!j.open) {
      j.squirts++;
      for (let i = 0; i < JUICE.burst; i++) spawn(j, mouth, scale, random);
    }
    j.debt += JUICE.stream * dt;
    while (j.debt >= 1) {
      j.debt -= 1;
      spawn(j, mouth, scale, random);
    }
  } else j.debt = 0;
  j.open = open;
  for (const d of j.drops) {
    d.life -= dt;
    d.vy += JUICE.gravity * dt;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
  }
  j.drops = j.drops.filter((d) => d.life > 0);
};
