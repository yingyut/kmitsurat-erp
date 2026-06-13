import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export type UIDensity = "compact" | "normal" | "spacious";

const FONT_SIZE: Record<UIDensity, string> = {
  compact:  "13.5px",
  normal:   "15px",
  spacious: "17px",
};

const STORAGE_KEY = (uid: string) => `kmit_disp_${uid}`;
const ADMIN_DEFAULT_DOC = "settings/ui_defaults";

export function applyDensity(density: UIDensity) {
  document.documentElement.setAttribute("data-density", density);
  document.documentElement.style.setProperty("--root-font-size", FONT_SIZE[density]);
}

export function loadUserDensity(userId: string): UIDensity {
  try {
    const v = localStorage.getItem(STORAGE_KEY(userId)) as UIDensity | null;
    if (v && v in FONT_SIZE) return v;
  } catch {}
  return "normal";
}

export function saveUserDensity(userId: string, density: UIDensity) {
  try { localStorage.setItem(STORAGE_KEY(userId), density); } catch {}
}

export async function loadAdminDefault(): Promise<UIDensity> {
  try {
    const [col, id] = ADMIN_DEFAULT_DOC.split("/");
    const snap = await getDoc(doc(db, col, id));
    if (snap.exists()) {
      const v = snap.data()?.density as UIDensity;
      if (v && v in FONT_SIZE) return v;
    }
  } catch {}
  return "normal";
}

export async function saveAdminDefault(density: UIDensity) {
  const [col, id] = ADMIN_DEFAULT_DOC.split("/");
  await setDoc(doc(db, col, id), { density }, { merge: true });
}
