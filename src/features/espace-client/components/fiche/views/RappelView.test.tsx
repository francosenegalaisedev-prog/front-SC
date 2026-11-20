// @vitest-environment jsdom
import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { act, createElement as h } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "../../../../../lib/api";
import { FICHES } from "../../../../../test/fixtures/fiches";
import Fiche from "../../Fiche";
import RappelView from "./RappelView";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("RappelView", () => {
  const originalAdapter = api.defaults.adapter;
  let root: Root;
  let host: HTMLDivElement;

  beforeEach(() => {
    window.history.replaceState({}, "", "/f/le-sunset");
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    act(() => root.unmount());
    host.remove();
  });

  const submitForm = async (
    nom: string,
    telephone: string,
    email = "",
    societe = "",
  ) => {
    act(() => {
      root.render(
        h(RappelView, {
          fiche: FICHES[0],
          tab: { id: "rappel", type: "rappel", titre: "Être rappelé", visible: true },
        }),
      );
    });
    const nomInput = host.querySelector<HTMLInputElement>('input[name="nom"]')!;
    const telInput = host.querySelector<HTMLInputElement>(
      'input[name="telephone"]',
    )!;
    const emailInput = host.querySelector<HTMLInputElement>(
      'input[name="email"]',
    )!;
    const societeInput = host.querySelector<HTMLInputElement>(
      'input[name="societe"]',
    )!;
    nomInput.value = nom;
    telInput.value = telephone;
    emailInput.value = email;
    societeInput.value = societe;

    await act(async () => {
      host
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
  };

  it("envoie la demande avec e-mail et société et affiche la confirmation", async () => {
    let sentBody: unknown;
    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      sentBody = JSON.parse(String(config.data));
      return {
        status: 201,
        data: { ok: true, demande: { id: 1 } },
        statusText: "",
        headers: {},
        config,
      };
    };

    await submitForm(
      "Moussa Diop",
      "+221 77 123 45 67",
      "moussa@exemple.sn",
      "Atelier Dakar",
    );

    expect(sentBody).toEqual({
      nom: "Moussa Diop",
      telephone: "+221 77 123 45 67",
      email: "moussa@exemple.sn",
      societe: "Atelier Dakar",
      website: "",
    });
    expect(host.textContent).toContain("Vos coordonnées ont bien été transmises");
  });

  it("affiche le bouton Échangez contact sous les boutons de contact et ouvre le formulaire en modale", async () => {
    const signatureFiche = FICHES.find(f => f.formule === "signature") ?? FICHES[0];
    act(() => {
      root.render(h(Fiche, { fiche: signatureFiche }));
    });

    const cta = host.querySelector<HTMLButtonElement>(".f-rappel-cta");
    expect(cta).not.toBeNull();
    expect(cta?.textContent).toContain("Échangez contact");
    // Aucun formulaire ouvert avant le clic, et pas de section rappel dans .f-body
    expect(host.querySelector(".f-body form.f-form")).toBeNull();
    expect(host.querySelector('[role="dialog"]')).toBeNull();

    await act(async () => {
      cta!.click();
    });

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.querySelector('input[name="email"]')).not.toBeNull();
    expect(dialog?.querySelector('input[name="societe"]')).not.toBeNull();
  });

  it("affiche le message d'erreur précis retourné par le serveur", async () => {
    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError("fail", "429", config, undefined, {
        status: 429,
        statusText: "",
        headers: {},
        config,
        data: {
          error: {
            code: "DEMANDE_DEJA_ENVOYEE",
            message:
              "Une demande de rappel a déjà été envoyée récemment avec ce numéro.",
          },
        },
      });
    };

    await submitForm("Moussa Diop", "+221 77 123 45 67");

    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      "Une demande de rappel a déjà été envoyée récemment avec ce numéro.",
    );
  });

  it("bloque l'envoi réseau en mode aperçu (/espace-client)", async () => {
    window.history.replaceState({}, "", "/espace-client/editeur/1");
    let called = false;
    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      called = true;
      return { status: 201, data: {}, statusText: "", headers: {}, config };
    };

    await submitForm("Moussa Diop", "+221 77 123 45 67");

    expect(called).toBe(false);
    expect(host.textContent).toContain("Mode aperçu");
  });
});
