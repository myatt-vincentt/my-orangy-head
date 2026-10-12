// Every tunable in one place.

/**
 * The model: "Orange" (https://skfb.ly/6UL6I) by bariacg, licensed CC BY-NC
 * 4.0 (http://creativecommons.org/licenses/by-nc/4.0/) — credited on screen
 * and in the README. Model units: the fruit's radius, and the height above
 * which the stem and leaf start (they bend from there).
 */
export const MODEL = {
  url: "/models/orange.glb",
  credit: '"Orange" by bariacg (skfb.ly/6UL6I), CC BY-NC 4.0',
  /** Mesh-local units (before the GLB's own ×2.54 node scale). */
  radius: 15.59,
  leafFrom: 14.6,
};

/**
 * The orange on your head, in units of the distance between your eyes: its
 * radius (big enough to swallow the whole head — crown, hair and ears — like a
 * fruit-head lens), and where its centre sits from your face's centre in
 * your head's own frame: up (your face is in its lower half) and back (the
 * middle of your head, so it swings round as you turn).
 */
export const ORANGE = {
  radius: 2.75,
  up: 1.05,
  back: 1.6,
  smoothing: 15,
  /** Oranges for up to this many faces at once. */
  faces: 3,
};

/** How much of the head's turn the orange takes (pitch, yaw; roll comes from the anchor). */
export const TURN = { pitch: 1, yaw: 1 };

/**
 * Your eyes and mouth, cut from the camera: each outline widened about its
 * middle (x, y), drawn into a small mask, blurred (share of the screen
 * height) and faded into the peel's colour at the edge.
 */
export const CUTOUT = {
  eyes: { x: 1.45, y: 2.3 },
  lips: { x: 1.22, y: 1.45 },
  /**
   * Big cartoon features: each is magnified this much about its own middle
   * (the cut-out grows to match).
   */
  magnify: { eyes: 1.7, lips: 1.5 },
  /**
   * An eye fades out as you turn away from it: hidden when it's this narrow
   * next to the other eye, fully shown from this wide.
   */
  farEye: [0.35, 0.6] as const,
  /** The mask canvas's height (px); its width follows the screen. */
  maskHeight: 256,
  blur: 0.012,
  /** Mask levels for the soft edge, and how strongly the edge takes the peel's colour. */
  edge: [0.25, 0.75] as const,
  tint: 0.45,
  peel: "#f28a1e",
};

/**
 * The bouncy leaf: a damped spring (per second) bending the stem and leaf,
 * shoved by the head's acceleration (in eye distances / s²) and its roll,
 * bent at most this far (radians).
 */
export const LEAF = {
  stiffness: 70,
  damping: 5,
  push: 0.012,
  roll: 0.35,
  maxShove: 120,
  max: 0.75,
};

/** A soft sky / ground light so the orange is bright all round (the scene's one light is top-right). */
export const LIGHT = { sky: "#fff4e0", ground: "#ffb070", intensity: 1.1 };

/**
 * Rosy cheeks on the peel: pink blush on each cheek (radius in eye
 * distances), always a little, glowing up to full when you smile (the smile
 * blendshapes' mean, from `smileFrom` to `smileFull`).
 */
export const BLUSH = {
  color: "#ff5e8a",
  radius: 0.42,
  /** Pushed this far down and out from the cheek landmark (eye distances). */
  offset: { out: 0.08, down: 0.1 },
  rest: 0.45,
  full: 0.8,
  smileFrom: 0.15,
  smileFull: 0.6,
  /** How fast it follows (per second). */
  follow: 6,
};

/** A glossier peel: the model's roughness, lowered (it multiplies the roughness map). */
export const PEEL = { roughness: 0.32 };

/**
 * Juice: open your mouth wide (the SDK's mouthOpen action above `open`) and
 * it squirts — a burst, then a stream while it stays open — droplets flying
 * out and falling (design px: the 1280-tall screen, y down; seconds).
 */
export const JUICE = {
  open: 0.55,
  burst: 30,
  stream: 55,
  /** Launch speed, spread (radians either side of straight down-and-out), gravity. */
  speed: [380, 820] as const,
  spread: 1.15,
  gravity: 1700,
  life: [0.6, 1.1] as const,
  size: [18, 42] as const,
  max: 260,
  colors: ["#ff9a1a", "#ffb43a", "#ff8000", "#ffd060"],
};
