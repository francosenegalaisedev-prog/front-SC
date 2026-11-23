// @vitest-environment jsdom
import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { login, logout } from "../features/auth/auth.service";
import { api } from "./api";
import { ApiError } from "./apiError";
import { clearSession, getSession, saveSession } from "./session";

type Call = { url?: string; withCredentials?: boolean; xRequestedWith?: string };
let calls: Call[] = [];
let respond: (config: InternalAxiosRequestConfig) => {
  status: number;
  data?: unknown;
};
const original = api.defaults.adapter;

beforeEach(() => {
  localStorage.clear();
  calls = [];
  respond = () => ({ status: 200, data: {} });
  api.defaults.adapter = async config => {
    calls.push({
      url: config.url,
      withCredentials: config.withCredentials,
      xRequestedWith: config.headers["X-Requested-With"] as string | undefined,
    });
    const { status, data } = respond(config);
    const response = { status, data, statusText: "", headers: {}, config };
    if (status >= 400)
      throw new AxiosError("fail", String(status), config, undefined, response);
    return response;
  };
});
afterEach(() => {
  api.defaults.adapter = original;
  clearSession();
});

const user = { name: "Awa", email: "awa@exemple.sn" };

describe("client HTTP (cookie httpOnly)", () => {
  it("active withCredentials et envoie X-Requested-With sur les requêtes API", async () => {
    saveSession({ token: "T1", user });
    await api.get("/fiches/1");
    expect(calls[0]).toEqual({
      url: "/fiches/1",
      withCredentials: true,
      xRequestedWith: "XMLHttpRequest",
    });
  });

  it("supprime la session locale quand le serveur répond 401 sur une route protégée", async () => {
    saveSession({ token: "T1", user });
    respond = () => ({ status: 401, data: {} });
    await expect(api.get("/client/dashboard/fiches")).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(getSession()).toBeNull();
  });

  it("garde la session sur un 403 ou un 500", async () => {
    saveSession({ token: "T1", user });
    respond = () => ({ status: 403, data: {} });
    await expect(api.get("/x")).rejects.toBeTruthy();
    respond = () => ({ status: 500, data: {} });
    await expect(api.get("/x")).rejects.toBeTruthy();
    expect(getSession()).not.toBeNull();
  });

  it("remplace les détails techniques des erreurs serveur par un message sûr", async () => {
    respond = () => ({
      status: 500,
      data: {
        error: {
          code: "DB_ERROR",
          message: "postgres://internal-host/password",
        },
      },
    });

    await expect(api.get("/x")).rejects.toMatchObject({
      message: "Une erreur technique est survenue. Réessayez plus tard.",
      response: {
        status: 500,
        data: {
          error: {
            code: "ERREUR_SERVEUR",
            message: "Une erreur technique est survenue. Réessayez plus tard.",
          },
        },
      },
    });
  });

  it("normalise les erreurs réseau sans réponse serveur", async () => {
    api.defaults.adapter = async () => {
      throw new AxiosError("ECONNREFUSED postgres://internal-host");
    };

    await expect(api.get("/x")).rejects.toMatchObject({
      message:
        "Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.",
    });
  });

  it("un 401 de connexion (mauvais mot de passe) ne touche pas la session existante", async () => {
    saveSession({ token: "T1", user });
    respond = () => ({
      status: 401,
      data: { error: { message: "Identifiants invalides." } },
    });
    await expect(
      login({ email: "a@b.sn", password: "x" }),
    ).rejects.toMatchObject({
      message: "Identifiants invalides.",
      status: 401,
    });
    expect(getSession()).not.toBeNull();
  });
});

describe("auth.service", () => {
  it("login enregistre l'utilisateur sans stocker de JWT en localStorage", async () => {
    respond = () => ({
      status: 200,
      data: {
        token: "T2",
        user: {
          id: 7,
          email: "awa@exemple.sn",
          nom: "Awa",
          role: "CLIENT",
          emailVerified: true,
        },
      },
    });
    await login({ email: "awa@exemple.sn", password: "secret" });
    expect(localStorage.getItem("client_token")).toBeNull();
    expect(getSession()).toEqual({
      token: "",
      user: {
        id: 7,
        role: "CLIENT",
        name: "Awa",
        email: "awa@exemple.sn",
        emailVerified: true,
      },
    });
  });

  it("login échoue en ApiError et n'ouvre pas de session", async () => {
    respond = () => ({
      status: 401,
      data: { error: { message: "Identifiants invalides." } },
    });
    const p = login({ email: "a@b.sn", password: "x" });
    await expect(p).rejects.toBeInstanceOf(ApiError);
    expect(getSession()).toBeNull();
  });

  it("logout appelle /auth/logout avec credentials puis efface la session locale", async () => {
    saveSession({ token: "T3", user });
    await logout();
    expect(calls[0]).toMatchObject({
      url: "/auth/logout",
      withCredentials: true,
    });
    expect(getSession()).toBeNull();
  });

  it("logout efface la session même si le serveur est injoignable", async () => {
    saveSession({ token: "T3", user });
    respond = () => ({ status: 500 });
    await expect(logout()).resolves.toBeUndefined();
    expect(getSession()).toBeNull();
  });
});
