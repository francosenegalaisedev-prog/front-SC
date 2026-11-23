// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement as h } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiSectionSticker, FicheRecord } from "../../../../../types";
import { getSectionStickers } from "../../../espaceClient.service";
import StickerBox from "./StickerBox";

vi.mock("../../../espaceClient.service", () => ({
  getSectionStickers: vi.fn(),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const fichePro: FicheRecord = {
  id: 5,
  slug: "chez-awa",
  formule: "signature",
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
  dateEcheance: null,
  data: {
    secteur: "restaurant",
    onglets: [
      { id: "menu", type: "menu", visible: true },
      { id: "avis", type: "avis", visible: true },
      { id: "horaires", type: "horaires", visible: true },
    ],
  },
};

describe("StickerBox (lecture seule côté client)", () => {
  let host: HTMLDivElement;
  let root: Root;

  const renderBox = async (fiche: FicheRecord, list: ApiSectionSticker[]) => {
    vi.mocked(getSectionStickers).mockResolvedValue(list);
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    await act(async () => {
      root.render(
        h(
          MemoryRouter,
          null,
          h(QueryClientProvider, { client: qc }, h(StickerBox, { fiche })),
        ),
      );
    });
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    host = document.createElement("div");
    root = createRoot(host);
  });

  afterEach(() => act(() => root.unmount()));

  it("affiche les stickers actifs générés par l'admin sans aucun formulaire de demande", async () => {
    await renderBox(fichePro, [
      {
        id: 1,
        section: "menu",
        statut: "active",
        createdAt: "2026-11-23T00:00:00Z",
        activatedAt: "2026-11-23T00:00:00Z",
      },
    ]);

    expect(host.querySelector("form")).toBeNull();
    expect(host.textContent).toContain("/s/chez-awa/menu");
    expect(host.textContent).toContain("Copier le lien");
    expect(host.textContent).toContain("QR (SVG)");
  });

  it("affiche un message d'information si aucun sticker n'a été généré par l'admin", async () => {
    await renderBox(fichePro, []);

    expect(host.querySelector("form")).toBeNull();
    expect(host.textContent).toContain(
      "Aucun sticker par section n’a encore été généré",
    );
  });

  it("verrouille la section pour la formule Essentielle", async () => {
    await renderBox({ ...fichePro, formule: "essentielle" }, []);
    expect(getSectionStickers).not.toHaveBeenCalled();
    expect(host.textContent).toContain("disponibles à partir de la formule Pro");
  });
});
