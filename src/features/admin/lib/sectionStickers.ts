import { TAB_TYPES } from "../../../lib/plans";
import type { TabType } from "../../../types";
import type { SectionStickerAdmin } from "../../../types/admin";
import { ALLOWED_STICKER_SECTIONS } from "../../espace-client/lib/stickerSections";

/* Stickers par section : libellés et actions possibles côté administration. */
type Statut = SectionStickerAdmin["statut"];

export const ADMIN_STICKER_SECTIONS: readonly {
  key: TabType;
  label: string;
}[] = ALLOWED_STICKER_SECTIONS.map(key => ({
  key,
  label: TAB_TYPES[key].label,
}));

export const SS_STATUT: Record<Statut, { label: string; tone: string }> = {
  active: { label: "Activé", tone: "green" },
  desactivee: { label: "Désactivé", tone: "grey" },
};

export const sectionLabel = (key: string): string =>
  key in TAB_TYPES ? TAB_TYPES[key as TabType].label : key;

export type SectionDecision = "active" | "desactivee";

export const DECISIONS: Record<
  Statut,
  { to: SectionDecision; label: string; primary?: boolean }[]
> = {
  active: [{ to: "desactivee", label: "Désactiver" }],
  desactivee: [{ to: "active", label: "Réactiver", primary: true }],
};

export const DECISION_DONE: Record<SectionDecision, string> = {
  active: "Sticker activé : le client voit maintenant son lien et son QR",
  desactivee: "Sticker désactivé : la page redevient la fiche complète",
};

export const displayName = (f: SectionStickerAdmin["fiche"]) =>
  f.entreprise?.trim() ||
  [f.prenom, f.nom].filter(Boolean).join(" ").trim() ||
  f.slug;
