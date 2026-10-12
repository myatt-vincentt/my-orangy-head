// My Orangy Head: every head in view (up to ORANGE.faces) becomes a 3D
// orange, with only that person's own eyes and mouth showing on it, live.
//
//   renderOrder −999  the camera (App.tsx's VideoBackground)
//   renderOrder 0     the orange (public/models/orange.glb) — pivoting about
//                     the face's centre with the head's turn, its centre up
//                     and back at the middle of the head (so it swings round
//                     to cover the back of the head as you turn), sized from
//                     the distance between the eyes and corrected for its
//                     distance from the camera; its stem and leaf bend in the
//                     vertex shader (a spring, leaf.ts)
//   renderOrder 100   the eyes and mouth, big — the camera seen through a mask
//                     of their outlines (features.ts; one colour channel per
//                     feature), each magnified about its own middle, the
//                     blurred edge fading into the peel's colour, an eye
//                     turning away fading out, all clipped to the orange's
//                     outline on screen; and rosy cheeks, glowing with a smile.
//                     A full-screen quad, drawn straight to clip space.
//   renderOrder 110   juice squirting from the mouth when it opens wide
//                     (juice.ts), as points in design px
//
// Face landmarks are in the tracker's input frame (top-left origin), which
// here matches the screen.
import { useEffect, useMemo } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  Quaternion,
  ShaderMaterial,
  SRGBColorSpace,
  type Texture,
  Vector3,
} from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useXRCameraTexture } from "@vincentt-xr/sdk/low-level";
import {
  FACE_LANDMARK_INDICES,
  FaceTracker,
  getFaceActionValue,
  TrackingAnchor,
  useFaceInfo,
  useFaceInfos,
} from "@vincentt-xr/sdk/tracking";

import {
  BLUSH,
  CUTOUT,
  JUICE,
  LIGHT,
  MODEL,
  ORANGE,
  PEEL,
  TURN,
} from "./config";
import { features } from "./features";
import { createJuice, stepJuice } from "./juice";
import { createLeaf, resetMotion, stepLeaf } from "./leaf";
import { orangeState } from "./state";

/** The GLB's own scale on the mesh (its "Orange" node). */
const NODE_SCALE = 2.54;
/** A frame longer than this (s) is a hitch: the leaf forgets the head's motion. */
const HITCH = 1 / 15;
/** The design screen's height (px): the juice's units. */
const DESIGN_H = 1280;
/** Mask colours: one channel per feature (eye, eye, lips). */
const CHANNELS = ["#ff0000", "#00ff00", "#0000ff"];

const cutoutVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }
`;
const cutoutFrag = /* glsl */ `
  uniform sampler2D uCamera;
  uniform sampler2D uMask;
  uniform float uCameraLinear;
  uniform float uHas;
  uniform vec2 uBlur;
  uniform vec2 uEdge;
  uniform vec3 uPeel;
  uniform float uTint;
  uniform vec2 uC0;
  uniform vec2 uC1;
  uniform vec2 uC2;
  uniform vec3 uMag;
  uniform vec2 uCheek0;
  uniform vec2 uCheek1;
  uniform vec2 uCheekR;
  uniform float uBlush;
  uniform vec3 uBlushColor;
  uniform vec3 uVis;
  uniform vec2 uClipC;
  uniform float uClipR;
  uniform float uAspect;
  varying vec2 vUv;
  vec3 fromSrgb(vec3 c) {
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
  }
  void main() {
    if (uHas < 0.5) discard;
    // The mask: one channel per feature (eye, eye, lips); a disc blur softens
    // its hard polygon edges.
    vec3 m = texture2D(uMask, vUv).rgb * 2.0;
    float wsum = 2.0;
    for (int j = 0; j < 12; j++) {
      float a12 = float(j) * 0.5235988;
      float ring = j < 6 ? 0.5 : 1.0;
      m += texture2D(uMask, vUv + vec2(cos(a12 + ring), sin(a12 + ring)) * uBlur * ring).rgb;
      wsum += 1.0;
    }
    m /= wsum;
    // An eye turning away out of sight fades out.
    m *= uVis;
    float mm = max(m.r, max(m.g, m.b));
    // Only on the orange: clipped to its outline on screen (a circle).
    float d = length(vec2((vUv.x - uClipC.x) * uAspect, vUv.y - uClipC.y));
    float clip = smoothstep(uClipR, uClipR * 0.93, d);
    float a = smoothstep(uEdge.x, uEdge.y, mm) * clip;
    // Rosy cheeks (under the features).
    float blush = max(
      smoothstep(1.0, 0.0, length((vUv - uCheek0) / uCheekR)),
      smoothstep(1.0, 0.0, length((vUv - uCheek1) / uCheekR))
    ) * uBlush * clip;
    if (a <= 0.0 && blush <= 0.003) discard;
    vec3 c = vec3(0.0);
    if (a > 0.0) {
      // Big cartoon features: each looks up the camera nearer its own middle.
      vec3 wt = m / max(1e-4, m.r + m.g + m.b);
      vec2 s = wt.r * (uC0 + (vUv - uC0) / uMag.x)
             + wt.g * (uC1 + (vUv - uC1) / uMag.y)
             + wt.b * (uC2 + (vUv - uC2) / uMag.z);
      c = texture2D(uCamera, s).rgb;
      if (uCameraLinear < 0.5) c = fromSrgb(c);
      // Toward the edge your skin takes the peel's colour, so it melts in.
      float edge = 1.0 - smoothstep(uEdge.x, 1.0, mm);
      c = mix(c, c * uPeel * 1.7, edge * uTint);
    }
    float b = blush * (1.0 - a);
    float alpha = a + b;
    gl_FragColor = vec4((c * a + uBlushColor * b) / max(alpha, 1e-4), alpha);
    #include <colorspace_fragment>
  }
`;

/** Points in design px, straight to clip space: the juice. */
const juiceVert = /* glsl */ `
  attribute vec3 color;
  attribute float size;
  attribute float alpha;
  uniform vec2 uDesign;
  uniform float uPxScale;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vAlpha = alpha;
    gl_PointSize = size * uPxScale;
    gl_Position = vec4(position.x / uDesign.x * 2.0 - 1.0, 1.0 - position.y / uDesign.y * 2.0, 0.0, 1.0);
  }
`;
/** A juice drop: a glossy orange bead with a white glint. */
const juiceFrag = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p) * 2.0;
    if (d > 1.0) discard;
    float body = smoothstep(1.0, 0.8, d);
    float glint = smoothstep(0.3, 0.0, length(p - vec2(-0.16, -0.16)));
    vec3 col = mix(vColor * (0.75 + 0.25 * (1.0 - d)), vec3(1.0), glint * 0.85);
    gl_FragColor = vec4(col, body * vAlpha * 0.92);
    #include <colorspace_fragment>
  }
`;

/** Bend the stem and leaf: vertices above MODEL.leafFrom rotate about the stem's base. */
const addLeafBend = (material: Material, bend: { value: number[] }) => {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBend = bend;
    shader.uniforms.uLeafFrom = { value: MODEL.leafFrom };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform vec2 uBend;\nuniform float uLeafFrom;",
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `#include <begin_vertex>
        float lw = smoothstep(uLeafFrom, uLeafFrom + 1.5, transformed.y);
        if (lw > 0.0) {
          vec3 lp = transformed - vec3(0.0, uLeafFrom, 0.0);
          float az = uBend.x * lw;
          float ax = uBend.y * lw;
          lp = vec3(cos(az) * lp.x - sin(az) * lp.y, sin(az) * lp.x + cos(az) * lp.y, lp.z);
          lp = vec3(lp.x, cos(ax) * lp.y - sin(ax) * lp.z, sin(ax) * lp.y + cos(ax) * lp.z);
          transformed = lp + vec3(0.0, uLeafFrom, 0.0);
        }`,
      );
  };
  material.needsUpdate = true;
};

const v = new Vector3();
const w = new Vector3();
const clipC = new Vector3();
const clipEdge = new Vector3();
const q = new Quaternion();
const xAxis = new Vector3();

/** One orange head, on face `index`. */
const Head = ({ index }: { index: number }) => {
  const { size, gl, camera } = useThree();
  const { scene: source } = useGLTF(MODEL.url);
  // Every reader asks for the same face count: the first one to load the
  // model sets it, and React sets children up before their parent.
  const face = useFaceInfo({
    active: true,
    faceIndex: index,
    numFaces: ORANGE.faces,
  });
  const cameraTexture = useXRCameraTexture() as Texture | null;

  const rig = useMemo(() => {
    const scene = source.clone(true);
    const bend = { value: [0, 0] };
    scene.traverse((o: Object3D) => {
      const mesh = o as Mesh;
      if (mesh.isMesh) {
        const mat = (mesh.material as Material).clone();
        // A glossier, juicier peel.
        if ("roughness" in mat)
          (mat as MeshStandardMaterial).roughness = PEEL.roughness;
        mesh.material = mat;
        addLeafBend(mat, bend);
      }
    });
    // root (world units) → tilt (the head's turn, about the face's centre)
    // → offset (up and back, to the head's centre) → fruit (sized) → model.
    const fruit = new Group();
    fruit.add(scene);
    const offset = new Group();
    offset.add(fruit);
    const tilt = new Group();
    tilt.add(offset);
    const root = new Group();
    root.add(tilt);
    return { root, tilt, offset, fruit, bend, leaf: createLeaf(), persp: 1 };
  }, [source]);

  // The eye/mouth mask: polygons drawn each frame into a small canvas.
  const aspect = size.width / Math.max(1, size.height);
  const cutout = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.height = CUTOUT.maskHeight;
    canvas.width = Math.max(2, Math.round(CUTOUT.maskHeight * aspect));
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const texture = new CanvasTexture(canvas);
    const material = new ShaderMaterial({
      uniforms: {
        uCamera: { value: null },
        uMask: { value: texture },
        uCameraLinear: { value: 0 },
        uHas: { value: 0 },
        uBlur: { value: [CUTOUT.blur / aspect, CUTOUT.blur] },
        uEdge: { value: [...CUTOUT.edge] },
        uPeel: { value: new Color(CUTOUT.peel) },
        uTint: { value: CUTOUT.tint },
        uC0: { value: [0.5, 0.5] },
        uC1: { value: [0.5, 0.5] },
        uC2: { value: [0.5, 0.5] },
        uMag: { value: [1, 1, 1] },
        uCheek0: { value: [0.4, 0.4] },
        uCheek1: { value: [0.6, 0.4] },
        uCheekR: { value: [0.1, 0.1] },
        uBlush: { value: 0 },
        uBlushColor: { value: new Color(BLUSH.color) },
        uVis: { value: [1, 1, 1] },
        uClipC: { value: [0.5, 0.5] },
        uClipR: { value: 0 },
        uAspect: { value: aspect },
      },
      vertexShader: cutoutVert,
      fragmentShader: cutoutFrag,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    return { canvas, ctx, texture, material };
    // Rebuilt only when the aspect changes noticeably (a rotation).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.round(aspect * 20)]);
  useEffect(
    () => () => {
      cutout.texture.dispose();
      cutout.material.dispose();
    },
    [cutout],
  );

  // Measuring sticks: empty groups on each eye.
  const eyes = useMemo(() => [new Group(), new Group()], []);

  // The juice: state and its points.
  const juice = useMemo(() => {
    const geometry = new BufferGeometry();
    const n = JUICE.max;
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(n * 3), 3),
    );
    geometry.setAttribute(
      "color",
      new BufferAttribute(new Float32Array(n * 3), 3),
    );
    geometry.setAttribute("size", new BufferAttribute(new Float32Array(n), 1));
    geometry.setAttribute("alpha", new BufferAttribute(new Float32Array(n), 1));
    const material = new ShaderMaterial({
      uniforms: { uDesign: { value: [1, 1] }, uPxScale: { value: 1 } },
      vertexShader: juiceVert,
      fragmentShader: juiceFrag,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const colors = JUICE.colors.map((c) => new Color(c));
    return {
      geometry,
      material,
      colors,
      sim: createJuice(),
      blush: BLUSH.rest,
    };
  }, []);
  useEffect(
    () => () => {
      juice.geometry.dispose();
      juice.material.dispose();
    },
    [juice],
  );

  // Dev hook for inspecting the head live.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      const hook = window as unknown as { __orange?: { heads: unknown[] } };
      hook.__orange ??= { heads: [] };
      hook.__orange.heads[index] = { state: orangeState, rig, cutout, juice };
    }
  }, [rig, cutout, juice, index]);

  useFrame((_state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    orangeState.faces[index] = !!face;
    rig.root.visible = !!face;
    const u = cutout.material.uniforms;
    u.uHas.value = face && cameraTexture ? 1 : 0;
    if (!face) return;

    eyes[0].getWorldPosition(v);
    eyes[1].getWorldPosition(w);
    const unit = v.distanceTo(w);
    const anchor = rig.root.parent;
    if (unit <= 1e-6 || !anchor) return;

    // Place the orange on the head's centre — up and back from the face, in
    // the head's own frame, so it swings round as the head turns — and size
    // it. It sits further from the camera than the face, so it's grown by
    // the ratio of the distances to look the same size on screen.
    const parentScale = anchor.getWorldScale(v).x || 1;
    rig.root.scale.setScalar(1 / parentScale);
    const { x: pitch, y: yaw } = face.pose.rotation;
    // Yaw is "+ toward the person's left", which on the mirrored screen turns
    // the face to screen-left: about +y that's a negative angle.
    rig.tilt.rotation.set(-pitch * TURN.pitch, -yaw * TURN.yaw, 0);
    rig.offset.position.set(0, ORANGE.up * unit, -ORANGE.back * unit);
    rig.root.updateWorldMatrix(true, true);
    anchor.getWorldPosition(v);
    rig.offset.getWorldPosition(w);
    rig.persp =
      camera.position.distanceTo(w) /
      Math.max(1e-6, camera.position.distanceTo(v));
    const radius = ORANGE.radius * unit * rig.persp;
    rig.fruit.scale.setScalar(radius / (MODEL.radius * NODE_SCALE));

    // Its outline on screen (a circle), to keep your eyes and mouth on it.
    clipC.copy(w).project(camera);
    clipEdge
      .set(0, 1, 0)
      .applyQuaternion(camera.quaternion)
      .multiplyScalar(radius)
      .add(w)
      .project(camera);
    u.uClipC.value = [clipC.x * 0.5 + 0.5, clipC.y * 0.5 + 0.5];
    u.uClipR.value = Math.hypot(
      ((clipEdge.x - clipC.x) / 2) * aspect,
      (clipEdge.y - clipC.y) / 2,
    );
    u.uAspect.value = aspect;

    // The leaf.
    anchor.getWorldQuaternion(q);
    xAxis.set(1, 0, 0).applyQuaternion(q);
    const roll = Math.atan2(xAxis.y, xAxis.x);
    anchor.getWorldPosition(w);
    if (rawDt > HITCH) resetMotion(rig.leaf);
    stepLeaf(rig.leaf, { x: w.x, y: w.y }, unit, roll, dt);
    rig.bend.value = [rig.leaf.bend.x, rig.leaf.bend.y];

    // Your eyes and mouth: each in its own channel, with its middle and
    // magnification for the shader (UV y up there).
    const { ctx, canvas } = cutout;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const feats = features(face.landmarks);
    const centres = [u.uC0, u.uC1, u.uC2];
    const mag = [1, 1, 1];
    feats.slice(0, 3).forEach((f, k) => {
      ctx.fillStyle = CHANNELS[k];
      ctx.beginPath();
      f.outline.forEach((p, i) => {
        const x = p.x * canvas.width;
        const y = p.y * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      centres[k].value = [f.centre.x, 1 - f.centre.y];
      mag[k] = f.magnify;
    });
    u.uMag.value = mag;
    // An eye turning away (much narrower than the other) fades out.
    if (feats.length >= 2) {
      const width = (f: (typeof feats)[number]) => {
        const xs = f.outline.map((p) => p.x);
        return Math.max(...xs) - Math.min(...xs);
      };
      const w0 = width(feats[0]);
      const w1 = width(feats[1]);
      const most = Math.max(w0, w1, 1e-6);
      const vis = (x: number) =>
        Math.max(
          0,
          Math.min(
            1,
            (x / most - CUTOUT.farEye[0]) /
              (CUTOUT.farEye[1] - CUTOUT.farEye[0]),
          ),
        );
      u.uVis.value = [vis(w0), vis(w1), 1];
    }
    cutout.texture.needsUpdate = true;
    u.uCamera.value = cameraTexture;
    u.uCameraLinear.value =
      cameraTexture?.colorSpace === SRGBColorSpace ? 1 : 0;

    // Rosy cheeks: below and outside each cheek point, glowing with a smile.
    const lm = face.landmarks;
    const eyeDist =
      feats.length >= 2
        ? Math.hypot(
            (feats[0].centre.x - feats[1].centre.x) * aspect,
            feats[0].centre.y - feats[1].centre.y,
          )
        : 0.1;
    const mid =
      feats.length >= 2 ? (feats[0].centre.x + feats[1].centre.x) / 2 : 0.5;
    const cheek = (key: "face.leftCheek" | "face.rightCheek") => {
      const p = lm[FACE_LANDMARK_INDICES[key]];
      const out = Math.sign(p.x - mid) * BLUSH.offset.out * eyeDist;
      return [p.x + out / aspect, 1 - (p.y + BLUSH.offset.down * eyeDist)];
    };
    u.uCheek0.value = cheek("face.leftCheek");
    u.uCheek1.value = cheek("face.rightCheek");
    const r = BLUSH.radius * eyeDist;
    u.uCheekR.value = [r / aspect, r];
    const bs = face.blendshapes;
    const smile = ((bs.mouthSmileLeft ?? 0) + (bs.mouthSmileRight ?? 0)) / 2;
    const k = Math.max(
      0,
      Math.min(
        1,
        (smile - BLUSH.smileFrom) / (BLUSH.smileFull - BLUSH.smileFrom),
      ),
    );
    const target = BLUSH.rest + (BLUSH.full - BLUSH.rest) * k;
    juice.blush += (target - juice.blush) * (1 - Math.exp(-BLUSH.follow * dt));
    u.uBlush.value = juice.blush;

    // Juice from the mouth when it opens wide.
    const mouth = lm[FACE_LANDMARK_INDICES["face.mouthCenter"]];
    stepJuice(
      juice.sim,
      orangeState.devMouthOpen ? 1 : getFaceActionValue(face, "mouthOpen"),
      { x: mouth.x * DESIGN_H * aspect, y: mouth.y * DESIGN_H },
      Math.max(0.6, Math.min(1.6, (eyeDist * DESIGN_H) / 150)),
      dt,
      Math.random,
    );
  });

  // The juice keeps falling even when the face is lost.
  useFrame((_state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    if (!face) stepJuice(juice.sim, null, null, 1, dt, Math.random);
    const g = juice.geometry;
    const pos = g.getAttribute("position") as BufferAttribute;
    const col = g.getAttribute("color") as BufferAttribute;
    const sz = g.getAttribute("size") as BufferAttribute;
    const al = g.getAttribute("alpha") as BufferAttribute;
    const { drops } = juice.sim;
    for (let i = 0; i < JUICE.max; i++) {
      const d = drops[i];
      if (!d) {
        al.setX(i, 0);
        continue;
      }
      pos.setXYZ(i, d.x, d.y, 0);
      const c = juice.colors[d.color];
      col.setXYZ(i, c.r, c.g, c.b);
      sz.setX(i, d.size);
      al.setX(i, Math.min(1, (d.life / d.max) * 2.5));
    }
    for (const a of [pos, col, sz, al]) a.needsUpdate = true;
    juice.material.uniforms.uDesign.value = [DESIGN_H * aspect, DESIGN_H];
    juice.material.uniforms.uPxScale.value =
      (size.height * gl.getPixelRatio()) / DESIGN_H;
  });

  return (
    <>
      <FaceTracker faceIndex={index} numFaces={ORANGE.faces}>
        <TrackingAnchor target="face.center" smoothing={ORANGE.smoothing}>
          <primitive object={rig.root} />
        </TrackingAnchor>
        <TrackingAnchor target="face.leftEye" smoothing={ORANGE.smoothing}>
          <primitive object={eyes[0]} />
        </TrackingAnchor>
        <TrackingAnchor target="face.rightEye" smoothing={ORANGE.smoothing}>
          <primitive object={eyes[1]} />
        </TrackingAnchor>
      </FaceTracker>
      <mesh
        name="eyesAndMouth"
        material={cutout.material}
        renderOrder={100}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
      </mesh>
      <points
        name="juice"
        geometry={juice.geometry}
        material={juice.material}
        renderOrder={110}
        frustumCulled={false}
      />
    </>
  );
};

useGLTF.preload(MODEL.url);

/** An orange on every face in view (up to ORANGE.faces). */
export const OrangeHead = () => {
  // Ask the face model for several faces.
  useFaceInfos({ numFaces: ORANGE.faces });
  return (
    <>
      <hemisphereLight args={[LIGHT.sky, LIGHT.ground, LIGHT.intensity]} />
      {Array.from({ length: ORANGE.faces }, (_, i) => (
        <Head key={i} index={i} />
      ))}
    </>
  );
};
