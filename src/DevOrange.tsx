// DevOrange.tsx — dev-only key for the built-in preview, where no sample video
// opens its mouth wide:
//   J (hold)   act as if the mouth were wide open: juice squirts
// Never reaches production: Scene.tsx lazy-imports this behind an inline
// `process.env.NODE_ENV` check, which esbuild folds.
import { useEffect } from "react";

import { orangeState } from "./orange/state";

const DevOrange = () => {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" || e.key === "J") orangeState.devMouthOpen = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "j" || e.key === "J") orangeState.devMouthOpen = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  return null;
};

export default DevOrange;
