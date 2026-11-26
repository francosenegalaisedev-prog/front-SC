import type { FicheRecord } from "../../../types";

const KEY = "sc.portefeuille.v1";
const EVENT = "sc:portefeuille";

export interface PortefeuilleEntry {
  slug: string;
  name: string;
  logo?: string;
  scannedAt: number;
  snapshot?: FicheRecord; // pour ouvrir la fiche hors ligne
}

export function listFiches(): PortefeuilleEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(list: PortefeuilleEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* stockage plein ou indisponible */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function addFiche(
  fiche: FicheRecord,
  name: string,
  logo?: string
): void {
  const rest = listFiches().filter((e) => e.slug !== fiche.slug);
  save([
    { slug: fiche.slug, name, logo, scannedAt: Date.now(), snapshot: fiche },
    ...rest,
  ]);
}

export function removeFiche(slug: string): void {
  save(listFiches().filter((e) => e.slug !== slug));
}

export function subscribePortefeuille(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function getSnapshot(slug: string): FicheRecord | undefined {
  return listFiches().find((e) => e.slug === slug)?.snapshot;
}
