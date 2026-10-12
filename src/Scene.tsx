// Scene.tsx — My Orangy Head: your head is a 3D orange, with only your own
// eyes and mouth showing on it, live; its leaf bounces as you move.
// See PLAN.md.
import { lazy, Suspense } from "react";

import { ExperienceStatus } from "./orange/ExperienceStatus";
import { Hud } from "./orange/Hud";
import { OrangeHead } from "./orange/OrangeHead";

// Dev-only tools (media switcher; J for a wide-open mouth) for previewing
// without a camera. Lazy and behind a constant esbuild folds to false in
// production. Two rules: `process.env.NODE_ENV`, not `import.meta.env.DEV`
// (vincentt-xr/v2-template#112); and write the check INSIDE each ternary —
// hoisted into a `const`, esbuild keeps the dead branch.
const DevMediaSwitcher =
  process.env.NODE_ENV !== "production"
    ? lazy(() => import("./DevMediaSwitcher"))
    : null;
const DevOrange =
  process.env.NODE_ENV !== "production"
    ? lazy(() => import("./DevOrange"))
    : null;

export const Scene = () => (
  <>
    <ExperienceStatus />
    {/* The model loads through a suspending loader. */}
    <Suspense fallback={null}>
      <OrangeHead />
    </Suspense>
    <Hud />
    {DevMediaSwitcher ? (
      <Suspense fallback={null}>
        <DevMediaSwitcher />
      </Suspense>
    ) : null}
    {DevOrange ? (
      <Suspense fallback={null}>
        <DevOrange />
      </Suspense>
    ) : null}
  </>
);
