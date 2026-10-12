# Plan — My Orangy Head

Your head becomes a 3D orange; only your own eyes and mouth show on it, live. A fun
fruit-head lens. Built 2026-10-12.

## Decisions (the user's)

- Model: `public/models/orange.glb` — "Orange" by bariacg, CC BY-NC 4.0. Flagged as
  non-commercial; the user chose to use it, with the credit on screen and in the README.
- Reference: a "Peachy Face" lens. Soft-blended eye and mouth cut-outs; the camera as is behind.
- Extra: a bouncy leaf. Then "must completely cover the whole head" — the orange swallows the
  crown, hair and ears (long hair on the shoulders stays, as in those lenses).
- Round 2 (picked 1, 4, 5 of 10 ideas): big cartoon eyes and mouth, juice squirt, rosy cheeks
  and a glossier peel.
- Round 3 (from the user's screenshots): turned heads, close range and several people.

## How it works

- **Placement** (`OrangeHead.tsx`): `FaceTracker` (per face index, every consumer asking for
  the same `numFaces` — the first to load the model sets it, and React sets children up first)
  with `face.center` / eye anchors. root → tilt (the head's pitch and yaw; the SDK's yaw is "+
  toward the person's left", which on the mirrored screen is a negative turn about +y) →
  offset (up 1.05, back 1.6 eye distances, in the head's frame: the middle of the head) →
  fruit (radius 2.75 eye distances × camera-distance ratio, so it looks the same size near or
  far) → the model.
- **Leaf** (`leaf.ts`, pure): a damped spring per axis, shoved by the head's acceleration and
  roll (motion forgotten after a frame hitch); vertices above the fruit's top rotate about the
  stem's base in the vertex shader.
- **Eyes and mouth** (`features.ts`, pure; the shader in `OrangeHead.tsx`): the SDK's
  `FACE_REGION_POLYGONS` ("eyes", "lips"), widened about each middle (skin margin × magnify),
  drawn into a small mask — one colour channel per feature. A full-screen quad blurs it (13
  taps), looks up the camera nearer each feature's middle (magnified 1.7× eyes, 1.5× mouth),
  tints the soft edge toward the peel, fades an eye that's much narrower than the other (turning
  away), and clips everything to the orange's projected outline (a circle).
- **Cheeks**: pink blush below and outside the cheek landmarks, 0.45 → 0.8 with the smile
  blendshapes. **Peel**: roughness lowered to 0.32 for a glossy highlight, plus a warm
  hemisphere light.
- **Juice** (`juice.ts`, pure): the `mouthOpen` action above 0.55 — a burst of 30, then 55/s
  while open; glossy orange and yellow beads, flung down and out, falling.
