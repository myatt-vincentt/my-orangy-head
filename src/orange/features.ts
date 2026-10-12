// Your eyes and mouth — pure, unit-tested (orange.test.ts). The SDK's
// face-region outlines ("eyes", "lips"; the mouth is inside the lips), each
// with its middle and how much it's magnified (big cartoon features), widened
// so a little skin around shows and the magnified feature fits. Screen UV
// (0..1, y down — face landmarks are in the tracker's input frame, which
// matches the screen).
import { FACE_REGION_POLYGONS } from "@vincentt-xr/sdk/low-level";

import { CUTOUT } from "./config";

export type P2 = { x: number; y: number };

/**
 * The outlines we cut: both eyes, and the lips (the mouth is inside them).
 * Read on first use, not at import (the template's own tests load the app
 * with this SDK module mocked).
 */
let regions: typeof FACE_REGION_POLYGONS | null = null;
const cutRegions = () => {
  regions ??= FACE_REGION_POLYGONS.filter(
    (r) => r.label === "eyes" || r.label === "lips",
  );
  return regions;
};

const centroidOf = (pts: readonly P2[]): P2 => {
  const c = pts.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), {
    x: 0,
    y: 0,
  });
  return { x: c.x / Math.max(1, pts.length), y: c.y / Math.max(1, pts.length) };
};

/** Widen a polygon about its centroid by (sx, sy). */
export const widen = (pts: readonly P2[], sx: number, sy: number): P2[] => {
  if (!pts.length) return [];
  const c = centroidOf(pts);
  return pts.map((p) => ({
    x: c.x + (p.x - c.x) * sx,
    y: c.y + (p.y - c.y) * sy,
  }));
};

export type Feature = {
  kind: "eye" | "lips";
  /** The feature's middle (screen UV, y down), and how much it's magnified about it. */
  centre: P2;
  magnify: number;
  /** The cut-out outline, widened for the skin around and for the magnifying. */
  outline: P2[];
};

/** Both eyes, then the lips, for a face's landmarks (empty without them). */
export const features = (landmarks: readonly P2[] | undefined): Feature[] => {
  if (!landmarks || landmarks.length < 468) return [];
  const out: Feature[] = [];
  for (const region of cutRegions()) {
    const eye = region.label === "eyes";
    const k = eye ? CUTOUT.eyes : CUTOUT.lips;
    const magnify = eye ? CUTOUT.magnify.eyes : CUTOUT.magnify.lips;
    for (const poly of region.polygons) {
      const pts = poly.map((i) => landmarks[i]).filter(Boolean);
      out.push({
        kind: eye ? "eye" : "lips",
        centre: centroidOf(pts),
        magnify,
        outline: widen(pts, k.x * magnify, k.y * magnify),
      });
    }
  }
  return out;
};
