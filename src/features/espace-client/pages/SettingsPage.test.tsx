// @vitest-environment jsdom
import { act, createElement as h } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../lib/apiError";
import {
  changeCurrentPassword,
  forgotPassword,
  updateCurrentProfile,
} from "../../auth/auth.service";
import SettingsPage from "./SettingsPage";

vi.mock("../../auth/auth.service", () => ({
  forgotPassword: vi.fn(),
  updateCurrentProfile: vi.fn(),
  changeCurrentPassword: vi.fn(),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("Paramètres client : réinitialisation du mot de passe", () => {
  let root: Root;
  let host: HTMLDivElement;

  beforeEach(() => {
    vi.mocked(forgotPassword).mockReset();
    vi.mocked(updateCurrentProfile).mockReset();
    vi.mocked(changeCurrentPassword).mockReset();
    host = document.createElement("div");
    root = createRoot(host);
    const user = { name: "Awa Ndiaye", email: "awa@example.sn" };
    act(() => {
      root.render(
        h(
          MemoryRouter,
          null,
          h(
            Routes,
            null,
            h(
              Route,
              { element: h(Outlet, { context: { user } }) },
              h(Route, { path: "/", element: h(SettingsPage) }),
            ),
          ),
        ),
      );
    });
  });

  afterEach(() => act(() => root.unmount()));

  it("envoie le lien à l’adresse du compte et affiche une confirmation", async () => {
    vi.mocked(forgotPassword).mockResolvedValue();

    await act(async () => {
      host.querySelector<HTMLButtonElement>(".st-reset-action")!.click();
      await Promise.resolve();
    });

    expect(forgotPassword).toHaveBeenCalledOnce();
    expect(forgotPassword).toHaveBeenCalledWith("awa@example.sn");
    expect(host.textContent).toContain("La demande a été prise en compte");
    expect(host.querySelector('[role="status"]')).toBeTruthy();
  });

  it("affiche une erreur explicite si l’envoi échoue", async () => {
    vi.mocked(forgotPassword).mockRejectedValue(
      new ApiError(
        "Vérifiez votre connexion et réessayez.",
        "NETWORK",
        0,
      ),
    );

    await act(async () => {
      host.querySelector<HTMLButtonElement>(".st-reset-action")!.click();
      await Promise.resolve();
    });

    expect(host.textContent).toContain(
      "Impossible d’envoyer le lien : Vérifiez votre connexion et réessayez.",
    );
    expect(host.querySelector('[role="alert"]')).toBeTruthy();
  });

  it("met à jour le profil utilisateur via updateCurrentProfile", async () => {
    vi.mocked(updateCurrentProfile).mockResolvedValue({
      id: 1,
      nom: "Awa Diallo",
      email: "awa.diallo@example.sn",
      role: "CLIENT",
      emailVerified: true,
    });

    const inputs = host.querySelectorAll<HTMLInputElement>("input");
    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;

    await act(async () => {
      nativeSetter.call(inputs[0], "Awa Diallo");
      inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
      nativeSetter.call(inputs[1], "awa.diallo@example.sn");
      inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      host
        .querySelectorAll<HTMLFormElement>("form")[0]
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(updateCurrentProfile).toHaveBeenCalledWith({
      nom: "Awa Diallo",
      email: "awa.diallo@example.sn",
    });
    expect(host.textContent).toContain(
      "Vos informations de profil ont été mises à jour.",
    );
  });

  it("change le mot de passe via changeCurrentPassword", async () => {
    vi.mocked(changeCurrentPassword).mockResolvedValue({ ok: true });

    const passwordInputs = host.querySelectorAll<HTMLInputElement>(
      'input[type="password"]',
    );
    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;

    await act(async () => {
      nativeSetter.call(passwordInputs[0], "OldPass123");
      passwordInputs[0].dispatchEvent(new Event("input", { bubbles: true }));
      nativeSetter.call(passwordInputs[1], "NewPass456");
      passwordInputs[1].dispatchEvent(new Event("input", { bubbles: true }));
      nativeSetter.call(passwordInputs[2], "NewPass456");
      passwordInputs[2].dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      host
        .querySelectorAll<HTMLFormElement>("form")[1]
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(changeCurrentPassword).toHaveBeenCalledWith({
      currentPassword: "OldPass123",
      password: "NewPass456",
    });
    expect(host.textContent).toContain("Votre mot de passe a été modifié.");
  });
});
