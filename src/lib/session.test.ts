// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSession,
  getSession,
  getToken,
  saveSession,
  subscribeSession,
} from "./session";

const user = { name: "Awa", email: "awa@exemple.sn" };
const jwt = (exp?: number) =>
  `h.${btoa(JSON.stringify(exp === undefined ? {} : { exp })).replace(/=/g, "")}.s`;

beforeEach(() => localStorage.clear());
afterEach(() => {
  clearSession();
  vi.useRealTimers();
});

describe("session (cookie httpOnly)", () => {
  it("enregistre l'utilisateur sans jamais stocker le JWT dans localStorage", () => {
    saveSession({ token: "secret-jwt", user });
    expect(getToken()).toBeNull();
    expect(localStorage.getItem("client_token")).toBeNull();
    expect(getSession()?.user).toEqual(user);
  });

  it("nettoie un éventuel ancien client_token dans localStorage lors de saveSession", () => {
    localStorage.setItem("client_token", "legacy-jwt");
    saveSession({ token: "new-jwt", user });
    expect(localStorage.getItem("client_token")).toBeNull();
    expect(getSession()?.user).toEqual(user);
  });

  it("ignore un utilisateur illisible ou incomplet", () => {
    localStorage.setItem("client_user", "{pas du json");
    expect(getSession()).toBeNull();
    localStorage.setItem("client_user", JSON.stringify({ name: "x" }));
    expect(getSession()).toBeNull();
  });

  it("clearSession ne supprime que la session, pas le reste du stockage", () => {
    localStorage.setItem("autre", "garde-moi");
    saveSession({ token: "abc", user });
    clearSession();
    expect(getSession()).toBeNull();
    expect(localStorage.getItem("autre")).toBe("garde-moi");
  });

  it("prévient les abonnés à la connexion et à la déconnexion", () => {
    const listener = vi.fn();
    const off = subscribeSession(listener);
    saveSession({ token: "abc", user });
    clearSession();
    expect(listener).toHaveBeenCalledTimes(2);
    off();
    saveSession({ token: "abc", user });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("réagit à une déconnexion dans un autre onglet (événement storage)", () => {
    saveSession({ token: "abc", user });
    const listener = vi.fn();
    const off = subscribeSession(listener);
    localStorage.clear();
    window.dispatchEvent(new StorageEvent("storage", { key: "client_user" }));
    expect(listener).toHaveBeenCalled();
    expect(getSession()).toBeNull();
    off();
  });

  it("refuse une session dont l'expiration connue est dépassée", () => {
    saveSession({ token: jwt(Math.floor(Date.now() / 1000) - 60), user });
    expect(getSession()).toBeNull();
  });

  it("se déconnecte automatiquement à l'expiration de la session", () => {
    vi.useFakeTimers();
    saveSession({ token: jwt(Math.floor(Date.now() / 1000) + 60), user });
    expect(getSession()).not.toBeNull();
    const listener = vi.fn();
    subscribeSession(listener);
    vi.advanceTimersByTime(61_000);
    expect(getSession()).toBeNull();
    expect(localStorage.getItem("client_user")).toBeNull();
    expect(listener).toHaveBeenCalled();
  });
});
