// @vitest-environment jsdom
import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { act, createElement as h } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "../../../../../lib/api";
import { FICHES } from "../../../../../test/fixtures/fiches";
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

  const submitForm = async (nom: string, telephone: string) => {
    act(() => {
      root.render(h(RappelView, { fiche: FICHES[0] }));
    });
    const nomInput = host.querySelector<HTMLInputElement>('input[name="nom"]')!;
    const telInput = host.querySelector<HTMLInputElement>(
      'input[name="telephone"]',
    )!;
    nomInput.value = nom;
    telInput.value = telephone;

    await act(async () => {
      host
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
  };

  it("envoie la demande et affiche la confirmation", async () => {
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

    await submitForm("Moussa Diop", "+221 77 123 45 67");

    expect(sentBody).toEqual({
      nom: "Moussa Diop",
      telephone: "+221 77 123 45 67",
      website: "",
    });
    expect(host.textContent).toContain("Votre demande a bien été envoyée");
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
