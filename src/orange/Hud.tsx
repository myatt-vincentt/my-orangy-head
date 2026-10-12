// The HUD, as HTML over the scene:
//   top     "Look at the camera" while no face is in view
//   bottom  the model's credit (CC BY-NC 4.0 asks for it)
// React state changes only when what's shown does.
import { useEffect, useState } from "react";
import { Html } from "@react-three/drei";

import { MODEL } from "./config";
import { orangeState } from "./state";

export const Hud = () => {
  const [noFace, setNoFace] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = !orangeState.faces.some(Boolean);
      setNoFace((v) => (v === next ? v : next));
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Html fullscreen zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          fontFamily: '"Nunito", "Space Grotesk", system-ui, sans-serif',
        }}
      >
        <div
          aria-live="polite"
          style={{
            position: "absolute",
            top: 18,
            left: "50%",
            transform: `translate(-50%, ${noFace ? 0 : -10}px)`,
            opacity: noFace ? 1 : 0,
            transition: "opacity 0.4s, transform 0.4s",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 18px",
            borderRadius: 999,
            background: "#fff4e6",
            border: "3px solid #e86a00",
            boxShadow: "0 4px 0 #e86a00",
            color: "#a34a00",
            fontSize: 17,
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: 22 }}>🍊</span>
          <span>Look at the camera</span>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 10,
            color: "rgba(255, 255, 255, 0.75)",
            textShadow: "0 1px 2px rgba(0, 0, 0, 0.6)",
          }}
        >
          {MODEL.credit}
        </div>
      </div>
    </Html>
  );
};
