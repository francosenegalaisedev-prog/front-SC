// @vitest-environment jsdom
import { act, createElement as h } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../lib/apiError";
import {
  changeCurrentPassword,
  disable2fa,
  forgotPassword,
  getCurrentUser,
  requestAccountDeletion,
  setup2fa,
  updateCurrentProfile,
  verify2fa,
} from "../../auth/auth.service";
import SettingsPage from "./SettingsPage";

vi.mock("../../auth/auth.service", () => ({
  forgotPassword: vi.fn(),
  updateCurrentProfile: vi.fn(),
  changeCurrentPassword: vi.fn(),
  requestAccountDeletion: vi.fn(),
  getCurrentUser: vi.fn(),
  setup2fa: vi.fn(),
  verify2fa: vi.fn(),
  disable2fa: vi.fn(),
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
    vi.mocked(requestAccountDeletion).mockReset();
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(setup2fa).mockReset();
    vi.mocked(verify2fa).mockReset();
    vi.mocked(disable2fa).mockReset();
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 1,
      nom: "Awa Ndiaye",
      email: "awa@example.sn",
      role: "CLIENT",
      emailVerified: true,
      twoFaEnabled: false,
    });
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

  it("permet de programmer la suppression du compte avec mot de passe (délai 30 jours)", async () => {
    vi.mocked(requestAccountDeletion).mockResolvedValue({
      ok: true,
      deletionScheduledAt: "2026-12-23T12:00:00.000Z",
      graceDays: 30,
    });

    const openBtn = Array.from(host.querySelectorAll("button")).find(b =>
      b.textContent?.includes("Demander la suppression de mon compte"),
    )!;
    await act(async () => {
      openBtn.click();
    });

    const forms = host.querySelectorAll<HTMLFormElement>("form");
    const deleteForm = forms[2];
    const pwdInput = deleteForm.querySelector<HTMLInputElement>(
      'input[type="password"]',
    )!;
    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;

    await act(async () => {
      nativeSetter.call(pwdInput, "MonMotDePasse1");
      pwdInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      deleteForm.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(requestAccountDeletion).toHaveBeenCalledWith({
      password: "MonMotDePasse1",
    });
  });

  it("permet d'activer puis désactiver la double authentification (2FA)", async () => {
    vi.mocked(setup2fa).mockResolvedValue({
      qrCode: "data:image/png;base64,FAKEQR",
      manualKey: "JBSWY3DPEHPK3PXP",
    });
    vi.mocked(verify2fa).mockResolvedValue({
      recoveryCodes: ["AAAA-1111", "BBBB-2222"],
    });
    vi.mocked(disable2fa).mockResolvedValue({ ok: true });

    const enableBtn = Array.from(host.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Activer la double authentification"),
    )!;
    await act(async () => {
      enableBtn.click();
      await Promise.resolve();
    });

    expect(setup2fa).toHaveBeenCalledOnce();
    expect(host.textContent).toContain("JBSWY3DPEHPK3PXP");

    const otpInput = host.querySelector<HTMLInputElement>(
      'input[placeholder="123456"]',
    )!;
    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    await act(async () => {
      nativeSetter.call(otpInput, "654321");
      otpInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      otpInput.form!.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(verify2fa).toHaveBeenCalledWith("654321");
    expect(host.textContent).toContain("AAAA-1111");
    expect(host.textContent).toContain("Activée");

    const disableBtn = Array.from(host.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Désactiver la double authentification"),
    )!;
    await act(async () => {
      disableBtn.click();
    });

    const disablePwdInput = host.querySelectorAll<HTMLInputElement>(
      'input[type="password"]',
    );
    const pwdInput = disablePwdInput[disablePwdInput.length - 1];
    await act(async () => {
      nativeSetter.call(pwdInput, "Secret123!");
      pwdInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      pwdInput.form!.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(disable2fa).toHaveBeenCalledWith({ password: "Secret123!" });
    expect(host.textContent).toContain("Désactivée");
  });
});
