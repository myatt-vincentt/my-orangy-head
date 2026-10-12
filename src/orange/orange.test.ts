import { describe, expect, it } from "vitest";

import { CUTOUT, JUICE, LEAF } from "./config";
import { features, widen } from "./features";
import { createJuice, stepJuice } from "./juice";
import { createLeaf, stepLeaf } from "./leaf";

describe("eye and mouth cut-outs", () => {
  it("widens an outline about its middle", () => {
    const square = [
      { x: 0.4, y: 0.4 },
      { x: 0.6, y: 0.4 },
      { x: 0.6, y: 0.6 },
      { x: 0.4, y: 0.6 },
    ];
    const w = widen(square, 2, 3);
    expect(w[0].x).toBeCloseTo(0.3);
    expect(w[0].y).toBeCloseTo(0.2);
    expect(w[2].x).toBeCloseTo(0.7);
    expect(w[2].y).toBeCloseTo(0.8);
  });

  it("cuts both eyes and the lips, magnified about their middles", () => {
    expect(features(undefined)).toEqual([]);
    // A fake face: every landmark on a small circle around the middle.
    const face = Array.from({ length: 478 }, (_, i) => ({
      x: 0.5 + 0.1 * Math.cos(i),
      y: 0.5 + 0.1 * Math.sin(i),
    }));
    const f = features(face);
    expect(f.map((x) => x.kind)).toEqual(["eye", "eye", "lips"]);
    expect(f.map((x) => x.outline.length)).toEqual([16, 16, 20]);
    expect(f[0].magnify).toBe(CUTOUT.magnify.eyes);
    expect(f[2].magnify).toBe(CUTOUT.magnify.lips);
    // The outline reaches past the landmarks (skin margin × magnifying),
    // about the feature's middle.
    const reach = (
      pts: { x: number; y: number }[],
      c: { x: number; y: number },
    ) => Math.max(...pts.map((p) => Math.hypot(p.x - c.x, p.y - c.y)));
    for (const x of f) {
      expect(reach(x.outline, x.centre)).toBeGreaterThan(0.1 * 1.4);
      expect(Math.abs(x.centre.x - 0.5)).toBeLessThan(0.12);
    }
  });
});

describe("juice", () => {
  const mouth = { x: 360, y: 700 };
  it("squirts when the mouth opens wide: a burst, then a stream; droplets fall and fade", () => {
    const j = createJuice();
    let t = 0;
    const step = (open: number | null, s = 1 / 60) => {
      stepJuice(j, open, mouth, 1, s, Math.random);
      t += s;
    };
    for (let i = 0; i < 30; i++) step(0.1);
    expect(j.drops.length).toBe(0);
    step(0.9);
    expect(j.squirts).toBe(1);
    expect(j.drops.length).toBeGreaterThanOrEqual(JUICE.burst);
    for (let i = 0; i < 30; i++) step(0.9);
    expect(j.drops.length).toBeGreaterThan(JUICE.burst + 20);
    expect(j.squirts).toBe(1); // one squirt while it stays open
    // They fall.
    const d = j.drops[j.drops.length - 1];
    const y0 = d.y;
    for (let i = 0; i < 20; i++) step(0.1);
    expect(d.y).toBeGreaterThan(y0);
    for (let i = 0; i < 90; i++) step(0.1);
    expect(j.drops.length).toBe(0);
    expect(t).toBeGreaterThan(2);
  });

  it("no face, no juice", () => {
    const j = createJuice();
    stepJuice(j, null, null, 1, 1 / 60, Math.random);
    expect(j.drops.length).toBe(0);
  });
});

describe("bouncy leaf", () => {
  const run = (
    l: ReturnType<typeof createLeaf>,
    seconds: number,
    at: (t: number) => { x: number; y: number },
    roll: (t: number) => number = () => 0,
  ) => {
    const seen: number[] = [];
    for (let t = 0; t < seconds; t += 1 / 60) {
      stepLeaf(l, at(t), 1, roll(t), 1 / 60);
      seen.push(l.bend.x);
    }
    return seen;
  };

  it("rests straight with the head still", () => {
    const l = createLeaf();
    run(l, 2, () => ({ x: 0, y: 0 }));
    expect(Math.abs(l.bend.x)).toBeLessThan(1e-6);
    expect(Math.abs(l.bend.y)).toBeLessThan(1e-6);
  });

  it("move your head: it swings, springs back past straight, and settles", () => {
    const l = createLeaf();
    run(l, 0.5, () => ({ x: 0, y: 0 }));
    const seen = run(l, 2.5, (t) => ({
      x: 0.6 * Math.min(1, t / 0.2) ** 2,
      y: 0,
    }));
    expect(Math.min(...seen)).toBeLessThan(-0.05);
    expect(Math.max(...seen)).toBeGreaterThan(0.01); // wobbles past straight
    expect(Math.abs(l.bend.x)).toBeLessThan(0.01); // and settles
    expect(Math.max(...seen.map(Math.abs))).toBeLessThanOrEqual(LEAF.max);
  });

  it("tilting the head swings it", () => {
    const l = createLeaf();
    const seen = run(
      l,
      1,
      () => ({ x: 0, y: 0 }),
      (t) => 0.5 * Math.min(1, t / 0.2),
    );
    expect(Math.max(...seen.map(Math.abs))).toBeGreaterThan(0.03);
  });
});
