/** Browser-local A2UI canvas skin preference. */

/** Available A2UI-only visual skins. */
export const A2UI_SKINS = ["studio", "soft", "contrast"] as const;
export type A2uiSkin = typeof A2UI_SKINS[number];

const STORAGE_KEY = "dsh.a2ui.skin";
let skin: A2uiSkin = readSkin();
const listeners = new Set<() => void>();

/** Return the active browser-local skin. */
export function getA2uiSkin(): A2uiSkin { return skin; }

/** Subscribe to skin changes. */
export function subscribeA2uiSkin(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Persist and publish one supported A2UI skin. */
export function setA2uiSkin(next: A2uiSkin): void {
  if (skin === next) return;
  skin = next;
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Storage is optional in embedded clients. */ }
  for (const listener of listeners) listener();
}

function readSkin(): A2uiSkin {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return A2UI_SKINS.includes(stored as A2uiSkin) ? stored as A2uiSkin : "studio";
  } catch { return "studio"; }
}
