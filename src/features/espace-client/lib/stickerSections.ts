import { TAB_TYPES, TEMPLATES, visibleTabs } from "../../../lib/plans";
import type { ApiSectionSticker, FicheRecord, Onglet, TabType } from "../../../types";

/*
  Stickers « par section » : générés par l'administration pour UNE des 7 sections autorisées
  (Réseaux sociaux, Produits & prestations, Galerie, Échangez contact, Avis Google, Menu interactif, Biens immobiliers).
  URL : /s/:slug/:section
  L'état de la fiche conditionne celui du sticker (si la fiche est suspendue/expirée, fallback sur la fiche complète).
*/

export const STICKER_PREFIX = "/s";

export const ALLOWED_STICKER_SECTIONS: readonly TabType[] = [
  "reseaux",
  "catalogue",
  "galerie",
  "rappel",
  "avis",
  "menu",
  "biens",
];
export const ALLOWED_STICKER_SECTIONS_SET = new Set<string>(
  ALLOWED_STICKER_SECTIONS,
);

/** Pro et Signature seulement (l'Essentielle n'a pas de stickers par section). */
export const hasStickers = (fiche: Pick<FicheRecord, "formule">): boolean =>
  fiche.formule === "pro" || fiche.formule === "signature";

export const sectionKey = (tab: Onglet): string => tab.type;

export const stickerPath = (slug: string, key: string): string =>
  `${STICKER_PREFIX}/${encodeURIComponent(slug)}/${encodeURIComponent(key)}`;

export const sectionTitle = (tab: Onglet): string =>
  tab.titre || TAB_TYPES[tab.type].label;

export type StickerResolution =
  | { tab: Onglet }
  | { fallback: "plan" | "missing" | "inactive" };

export interface ResolveOptions {
  requireActive?: boolean;
}

export function resolveStickerSection(
  fiche: FicheRecord,
  key: string,
  { requireActive = true }: ResolveOptions = {},
): StickerResolution {
  if (!hasStickers(fiche)) return { fallback: "plan" };
  if (!ALLOWED_STICKER_SECTIONS_SET.has(key)) return { fallback: "missing" };
  const tab = visibleTabs(fiche).find(
    t => ALLOWED_STICKER_SECTIONS_SET.has(t.type) && (t.id === key || sectionKey(t) === key),
  );
  if (!tab) return { fallback: "missing" };
  if (requireActive) {
    if (fiche.statut && fiche.statut !== "active")
      return { fallback: "inactive" };
    if (!fiche.stickerSections?.includes(sectionKey(tab)))
      return { fallback: "inactive" };
  }
  return { tab };
}

export interface StickerSectionInfo {
  key: string;
  tab: Onglet;
  primary: boolean;
}

/** Sections autorisées qu'un sticker peut ouvrir : celle du secteur d'abord, puis les autres. */
export function stickerSections(fiche: FicheRecord): StickerSectionInfo[] {
  if (!hasStickers(fiche)) return [];
  const tabs = visibleTabs(fiche).filter(t =>
    ALLOWED_STICKER_SECTIONS_SET.has(t.type),
  );
  const wanted = fiche.data.secteur ? TEMPLATES[fiche.data.secteur].tabs : [];
  const primaryType = wanted.find(type => tabs.some(t => t.type === type));
  const infos = tabs.map(tab => ({
    key: sectionKey(tab),
    tab,
    primary: tab.type === primaryType,
  }));
  return [...infos.filter(i => i.primary), ...infos.filter(i => !i.primary)];
}

/** Dernier sticker de chaque section autorisée. */
export function latestBySection(
  demandes: ApiSectionSticker[],
): Map<string, ApiSectionSticker> {
  const latest = new Map<string, ApiSectionSticker>();
  for (const d of demandes) {
    if (!ALLOWED_STICKER_SECTIONS_SET.has(d.section)) continue;
    const current = latest.get(d.section);
    if (
      !current ||
      d.createdAt > current.createdAt ||
      (d.createdAt === current.createdAt && d.id > current.id)
    ) {
      latest.set(d.section, d);
    }
  }
  return latest;
}
