import { describe, expect, it } from "vitest";
import type { FicheRecord } from "../../../types";
import {
  ALLOWED_STICKER_SECTIONS,
  hasStickers,
  latestBySection,
  resolveStickerSection,
  stickerPath,
  stickerSections,
} from "./stickerSections";

const makeFiche = (overrides: Partial<FicheRecord> = {}): FicheRecord => ({
  id: 1,
  slug: "le-sunset",
  formule: "signature",
  statut: "active",
  expiree: false,
  stickerSections: ["menu", "avis"],
  enLigneSeule: false,
  scansTotal: 0,
  updatedAt: "2026-11-23T00:00:00Z",
  prenom: "Rose",
  nom: "Ndiaye",
  fonction: "",
  entreprise: "Le Sunset",
  photo: "",
  logo: "",
  telephone: "",
  whatsapp: "",
  email: "",
  site: "",
  adresse: "",
  googlePlaceId: "",
  dateEcheance: null,
  data: {
    secteur: "restaurant",
    onglets: [
      { id: "menu", type: "menu", visible: true },
      { id: "horaires", type: "horaires", visible: true },
      { id: "avis", type: "avis", visible: true },
      { id: "reseaux", type: "reseaux", visible: true },
      { id: "presentation", type: "presentation", visible: true },
      { id: "texte-1", type: "texte", visible: true, titre: "Infos" },
    ],
  },
  ...overrides,
});

describe("stickerSections (7 sections autorisées)", () => {
  it("autorise exactement les 7 sections demandées", () => {
    expect(ALLOWED_STICKER_SECTIONS).toEqual([
      "reseaux",
      "catalogue",
      "galerie",
      "rappel",
      "avis",
      "menu",
      "biens",
    ]);
  });

  it("hasStickers : Pro et Signature uniquement", () => {
    expect(hasStickers({ formule: "essentielle" })).toBe(false);
    expect(hasStickers({ formule: "pro" })).toBe(true);
    expect(hasStickers({ formule: "signature" })).toBe(true);
  });

  it("stickerSections exclut les sections non autorisées (horaires, presentation, texte)", () => {
    const sections = stickerSections(makeFiche());
    expect(sections.map(s => s.key)).toEqual(["menu", "avis", "reseaux"]);
  });

  it("resolveStickerSection retourne la section si autorisée, active et fiche active", () => {
    expect(resolveStickerSection(makeFiche(), "menu")).toMatchObject({
      tab: { type: "menu" },
    });
    expect(resolveStickerSection(makeFiche(), "horaires")).toEqual({
      fallback: "missing",
    });
    expect(resolveStickerSection(makeFiche(), "reseaux")).toEqual({
      fallback: "inactive",
    });
    expect(
      resolveStickerSection(makeFiche(), "reseaux", { requireActive: false }),
    ).toMatchObject({ tab: { type: "reseaux" } });
  });

  it("l'état de la fiche conditionne celui du sticker (fiche suspendue → inactive)", () => {
    expect(
      resolveStickerSection(makeFiche({ statut: "suspendue" }), "menu"),
    ).toEqual({ fallback: "inactive" });
  });

  it("stickerPath encode proprement le slug et la section", () => {
    expect(stickerPath("le-sunset", "menu")).toBe("/s/le-sunset/menu");
  });

  it("latestBySection ignore les sections hors liste autorisée", () => {
    const map = latestBySection([
      {
        id: 1,
        section: "horaires",
        statut: "active",
        createdAt: "2026-11-23T00:00:00Z",
        activatedAt: "2026-11-23T00:00:00Z",
      },
      {
        id: 2,
        section: "menu",
        statut: "active",
        createdAt: "2026-11-23T00:00:00Z",
        activatedAt: "2026-11-23T00:00:00Z",
      },
    ]);
    expect(map.has("horaires")).toBe(false);
    expect(map.get("menu")?.id).toBe(2);
  });
});
