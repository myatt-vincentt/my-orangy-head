// Shared live state: the head writes it, the HUD reads it. Plain mutable
// fields (no React state).
export const orangeState = {
  /** Which faces (by index) are in view. */
  faces: [] as boolean[],
  /** Dev: the J key held — act as if the mouth were wide open. */
  devMouthOpen: false,
};
