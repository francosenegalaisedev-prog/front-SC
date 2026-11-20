// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { InternalAxiosRequestConfig } from "axios";
import { act, createElement as h } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "../../../lib/api";
import CallbackRequestsPage from "./CallbackRequestsPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const waitFor = async (predicate: () => boolean, timeoutMs = 1500) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
  }
};

describe("CallbackRequestsPage", () => {
  const originalAdapter = api.defaults.adapter;
  let root: Root;
  let host: HTMLDivElement;
  let queryClient: QueryClient;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    act(() => root.unmount());
    queryClient.clear();
    host.remove();
  });

  const renderPage = () => {
    act(() => {
      root.render(
        h(
          QueryClientProvider,
          { client: queryClient },
          h(CallbackRequestsPage),
        ),
      );
    });
  };

  it("affiche les demandes, le statut, le compteur nouvelles et le lien WhatsApp", async () => {
    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      const url = String(config.url ?? "");
      if (url.includes("client/dashboard/fiches")) {
        return {
          status: 200,
          data: [{ id: 1, slug: "le-sunset", prenom: "Moussa", nom: "Diop" }],
          statusText: "",
          headers: {},
          config,
        };
      }
      return {
        status: 200,
        data: {
          rappels: {
            nouvellesCount: 1,
            demandes: [
              {
                id: 10,
                nom: "Aminata Fall",
                telephone: "+221 77 123 45 67",
                statut: "NOUVELLE",
                traiteeAt: null,
                createdAt: "2026-11-20T12:00:00.000Z",
                fiche: {
                  id: 1,
                  slug: "le-sunset",
                  prenom: "Moussa",
                  nom: "Diop",
                },
              },
            ],
            pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
          },
        },
        statusText: "",
        headers: {},
        config,
      };
    };

    renderPage();
    await waitFor(() => host.textContent?.includes("Aminata Fall") ?? false);

    expect(host.textContent).toContain("Aminata Fall");
    expect(host.textContent).toContain("Nouvelle");
    const waLink = host.querySelector<HTMLAnchorElement>(
      'a[href="https://wa.me/221771234567"]',
    );
    expect(waLink).not.toBeNull();
  });

  it("transmet les filtres de statut dans la requête API", async () => {
    const requestedUrls: string[] = [];
    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      const url = String(config.url ?? "");
      requestedUrls.push(url);
      if (url.includes("client/dashboard/fiches")) {
        return { status: 200, data: [], statusText: "", headers: {}, config };
      }
      return {
        status: 200,
        data: {
          rappels: {
            nouvellesCount: 0,
            demandes: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
          },
        },
        statusText: "",
        headers: {},
        config,
      };
    };

    renderPage();
    await waitFor(() => requestedUrls.some(url => url.includes("fiches/rappels")));

    const statusSelect = host.querySelector<HTMLSelectElement>(
      ".callback-requests-filters select",
    )!;
    await act(async () => {
      statusSelect.value = "TRAITEE";
      statusSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await waitFor(() => requestedUrls.some(url => url.includes("statut=TRAITEE")));

    expect(
      requestedUrls.some(url => url.includes("statut=TRAITEE")),
    ).toBe(true);
  });

  it("permet de marquer une demande comme traitée puis de la supprimer", async () => {
    const calls: { method: string; url: string; data?: unknown }[] = [];
    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      const method = (config.method ?? "get").toUpperCase();
      const url = String(config.url ?? "");
      calls.push({
        method,
        url,
        data: config.data ? JSON.parse(String(config.data)) : undefined,
      });

      if (url.includes("client/dashboard/fiches")) {
        return { status: 200, data: [], statusText: "", headers: {}, config };
      }
      if (method === "PATCH") {
        return {
          status: 200,
          data: { ok: true, demande: { id: 10, statut: "TRAITEE" } },
          statusText: "",
          headers: {},
          config,
        };
      }
      if (method === "DELETE") {
        return {
          status: 200,
          data: { ok: true, deleted: true, id: 10 },
          statusText: "",
          headers: {},
          config,
        };
      }
      return {
        status: 200,
        data: {
          rappels: {
            nouvellesCount: 1,
            demandes: [
              {
                id: 10,
                nom: "Aminata Fall",
                telephone: "+221771234567",
                statut: "NOUVELLE",
                traiteeAt: null,
                createdAt: "2026-11-20T12:00:00.000Z",
                fiche: {
                  id: 1,
                  slug: "le-sunset",
                  prenom: "Moussa",
                  nom: "Diop",
                },
              },
            ],
            pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
          },
        },
        statusText: "",
        headers: {},
        config,
      };
    };

    renderPage();
    await waitFor(() => host.textContent?.includes("Marquer traitée") ?? false);

    const treatButton = Array.from(host.querySelectorAll("button")).find(btn =>
      btn.textContent?.includes("Marquer traitée"),
    )!;
    await act(async () => {
      treatButton.click();
    });
    await waitFor(() => calls.some(c => c.method === "PATCH"));

    expect(calls).toContainEqual({
      method: "PATCH",
      url: "fiches/rappels/10",
      data: { statut: "TRAITEE" },
    });

    const deleteButton = Array.from(host.querySelectorAll("button")).find(btn =>
      btn.textContent?.includes("Supprimer"),
    )!;
    await act(async () => {
      deleteButton.click();
    });

    const confirmButton = Array.from(host.querySelectorAll("button")).find(
      btn => btn.textContent?.includes("Confirmer"),
    )!;
    await act(async () => {
      confirmButton.click();
    });
    await waitFor(() => calls.some(c => c.method === "DELETE"));

    expect(calls).toContainEqual({
      method: "DELETE",
      url: "fiches/rappels/10",
      data: undefined,
    });
  });
});
