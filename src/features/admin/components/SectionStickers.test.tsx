// @vitest-environment jsdom
import { act, createElement as h } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SectionStickerAdmin } from "../../../types/admin";
import { adminApi } from "../admin.service";
import { FichePreviewPanel, SectionStickersTab } from "./SectionStickers";
import { ToastProvider } from "./ui";

vi.mock("../admin.service", () => ({
  adminApi: {
    listSectionStickers: vi.fn(),
    createSectionSticker: vi.fn(),
    setSectionStickerStatus: vi.fn(),
  },
}));

vi.mock("../../espace-client/lib/ficheApi", () => ({
  fetchFiche: vi.fn().mockResolvedValue({
    id: 10,
    slug: "chez-awa",
    formule: "pro",
    statut: "active",
    expiree: false,
    stickerSections: ["menu"],
    enLigneSeule: false,
    scansTotal: 0,
    updatedAt: "2026-11-23T00:00:00Z",
    prenom: "Awa",
    nom: "Ndiaye",
    fonction: "",
    entreprise: "Chez Awa",
    photo: "",
    logo: "",
    telephone: "",
    whatsapp: "",
    email: "",
    site: "",
    adresse: "",
    googlePlaceId: "",
    premierBouton: "whatsapp",
    messageWhatsapp: "",
    data: {
      secteur: "restaurant",
      horaires: [],
      onglets: [{ id: "menu", type: "menu", visible: true }],
    },
  }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const sampleSticker = (
  overrides: Partial<SectionStickerAdmin> = {},
): SectionStickerAdmin => ({
  id: 1,
  section: "menu",
  statut: "active",
  activatedAt: "2026-11-23T12:00:00Z",
  createdAt: "2026-11-23T12:00:00Z",
  updatedAt: "2026-11-23T12:00:00Z",
  fiche: {
    id: 10,
    slug: "chez-awa",
    prenom: "Awa",
    nom: "Ndiaye",
    entreprise: "Chez Awa",
  },
  client: { id: 7, nom: "Awa", email: "awa@sc.sn" },
  ...overrides,
});

const settle = async () => {
  for (let i = 0; i < 6; i++) {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  }
};

describe("SectionStickers admin (génération par l'administrateur)", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    host = document.createElement("div");
    root = createRoot(host);
  });

  afterEach(() => act(() => root.unmount()));

  it("FichePreviewPanel affiche les 7 sections autorisées et permet de générer un sticker", async () => {
    vi.mocked(adminApi.listSectionStickers).mockResolvedValue({
      demandes: [sampleSticker()],
    });
    vi.mocked(adminApi.createSectionSticker).mockResolvedValue({
      demande: sampleSticker({ id: 2, section: "avis" }),
    });

    await act(async () => {
      root.render(
        h(
          MemoryRouter,
          null,
          h(ToastProvider, null, h(FichePreviewPanel, { ficheId: 10 })),
        ),
      );
    });
    await settle();

    expect(host.querySelectorAll(".fd-ss li")).toHaveLength(7);
    expect(host.textContent).toContain("Réseaux sociaux");
    expect(host.textContent).toContain("Produits & prestations");
    expect(host.textContent).toContain("Galerie");
    expect(host.textContent).toContain("Échangez contact");
    expect(host.textContent).toContain("Avis Google");
    expect(host.textContent).toContain("Menu interactif");
    expect(host.textContent).toContain("Biens immobiliers");

    const generateBtns = Array.from(host.querySelectorAll("button")).filter(
      b => b.textContent === "Générer",
    );
    expect(generateBtns.length).toBe(6);

    await act(async () => {
      generateBtns[0].click();
      await Promise.resolve();
    });

    expect(adminApi.createSectionSticker).toHaveBeenCalledWith({
      ficheId: 10,
      section: "reseaux",
    });
  });

  it("SectionStickersTab liste les stickers générés et permet de désactiver", async () => {
    const onChanged = vi.fn();
    vi.mocked(adminApi.setSectionStickerStatus).mockResolvedValue({
      demande: sampleSticker({ statut: "desactivee" }),
    });

    await act(async () => {
      root.render(
        h(
          MemoryRouter,
          null,
          h(
            ToastProvider,
            null,
            h(SectionStickersTab, {
              data: [sampleSticker()],
              error: null,
              onChanged,
            }),
          ),
        ),
      );
    });

    expect(host.textContent).toContain("/s/chez-awa/menu");
    const disableBtn = Array.from(host.querySelectorAll("button")).find(
      b => b.textContent === "Désactiver",
    )!;
    await act(async () => {
      disableBtn.click();
      await Promise.resolve();
    });

    expect(adminApi.setSectionStickerStatus).toHaveBeenCalledWith(
      1,
      "desactivee",
    );
    expect(onChanged).toHaveBeenCalledOnce();
  });
});
