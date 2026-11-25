import { api } from "../../lib/api";
import { ApiError, errorStatus, toApiError } from "../../lib/apiError";
import { clearSession, saveSession } from "../../lib/session";
import { IRegister, Login } from "../../types";

/*
  Appels d'authentification. Toutes les erreurs remontent en `ApiError` (message lisible + code + statut).
  La session (jeton + utilisateur) n'est lue et écrite que par lib/session.ts.
*/

export interface LoginResponse {
  user: {
    id: number;
    email: string;
    nom: string;
    role: "CLIENT" | "ADMIN";
    emailVerified: boolean;
    hasPassword?: boolean;
    twoFaEnabled?: boolean;
  };
  token: string;
}

export interface TwoFaChallengeResponse {
  requires2fa: true;
  tempToken: string;
}

export type LoginResult = LoginResponse | TwoFaChallengeResponse;

export function isTwoFaChallenge(
  res: LoginResult | void | TwoFaChallengeResponse,
): res is TwoFaChallengeResponse {
  return Boolean(
    res &&
      typeof res === "object" &&
      "requires2fa" in res &&
      res.requires2fa === true &&
      typeof res.tempToken === "string",
  );
}

export async function register(registerData: IRegister) {
  try {
    const res = await api.post("/auth/register", {
      email: registerData.email,
      password: registerData.password,
      nom: registerData.name,
    });
    return res.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function loginWithGoogle(
  credential: string,
): Promise<LoginResult> {
  try {
    const res = await api.post<LoginResult>("/auth/google", { credential });
    if (isTwoFaChallenge(res.data)) {
      return res.data;
    }
    const { token, user } = res.data;
    saveSession({
      token,
      user: {
        id: user.id,
        role: user.role,
        name: user.nom,
        email: user.email,
        emailVerified: user.emailVerified,
        hasPassword: user.hasPassword,
        twoFaEnabled: user.twoFaEnabled,
      },
    });
    return res.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function login(loginData: Login): Promise<LoginResult> {
  try {
    const res = await api.post<LoginResult>("/auth/login", loginData);
    if (isTwoFaChallenge(res.data)) {
      return res.data;
    }
    const { token, user } = res.data;
    saveSession({
      token,
      user: {
        id: user.id,
        role: user.role,
        name: user.nom,
        email: user.email,
        emailVerified: user.emailVerified,
        hasPassword: user.hasPassword,
        twoFaEnabled: user.twoFaEnabled,
      },
    });
    return res.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function completeTwoFaLogin(payload: {
  tempToken: string;
  code: string;
}): Promise<LoginResponse> {
  try {
    const res = await api.post<LoginResponse>("/auth/2fa/login", payload);
    const { token, user } = res.data;
    saveSession({
      token,
      user: {
        id: user.id,
        role: user.role,
        name: user.nom,
        email: user.email,
        emailVerified: user.emailVerified,
        hasPassword: user.hasPassword,
        twoFaEnabled: user.twoFaEnabled,
      },
    });
    return res.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function setup2fa(): Promise<{
  qrCode: string;
  manualKey: string;
}> {
  try {
    const res = await api.post<{ qrCode: string; manualKey: string }>(
      "/auth/2fa/enable",
    );
    return res.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function verify2fa(
  otpCode: string,
): Promise<{ recoveryCodes: string[] }> {
  try {
    const res = await api.post<{ recoveryCodes: string[] }>("/auth/2fa/verify", {
      otpCode,
    });
    return res.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function disable2fa(payload: {
  password?: string;
  code?: string;
}): Promise<{ ok: true }> {
  try {
    const res = await api.post<{ ok: true }>("/auth/2fa/disable", payload);
    return res.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getCurrentUser(): Promise<LoginResponse["user"]> {
  try {
    const res = await api.get<{ user: LoginResponse["user"] }>("/auth/me");
    return res.data.user;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function resendVerificationEmail(): Promise<void> {
  try {
    await api.post("/auth/resend-verification");
  } catch (error) {
    throw toApiError(error);
  }
}

export async function updateCurrentProfile(payload: {
  nom: string;
  email: string;
}): Promise<LoginResponse["user"]> {
  try {
    const res = await api.patch<{ user: LoginResponse["user"] }>(
      "/auth/me",
      payload,
    );
    return res.data.user;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function changeCurrentPassword(payload: {
  currentPassword: string;
  password: string;
}): Promise<{ ok: true }> {
  try {
    await api.patch("/auth/me/password", payload);
    return { ok: true };
  } catch (error) {
    throw toApiError(error);
  }
}

export async function requestAccountDeletion(payload: {
  password?: string;
  confirmEmail?: string;
  reason?: string;
}): Promise<{ ok: true; deletionScheduledAt: string; graceDays: number }> {
  try {
    const res = await api.post<{
      ok: true;
      deletionScheduledAt: string;
      graceDays: number;
    }>("/auth/me/delete-request", payload);
    clearSession();
    return res.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function cancelAccountDeletion(payload: {
  email?: string;
  password?: string;
  credential?: string;
}): Promise<LoginResponse> {
  try {
    const res = await api.post<LoginResponse>(
      "/auth/cancel-deletion",
      payload,
    );
    const { token, user } = res.data;
    saveSession({
      token,
      user: {
        id: user.id,
        role: user.role,
        name: user.nom,
        email: user.email,
        emailVerified: user.emailVerified,
        hasPassword: user.hasPassword,
      },
    });
    return res.data;
  } catch (error) {
    throw toApiError(error);
  }
}

/** Prévient le serveur (avec le jeton), puis supprime la session locale quoi qu'il arrive. */
export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    /* session déjà expirée ou serveur injoignable : on quitte quand même */
  } finally {
    clearSession();
  }
}

export async function verifyEmail(token: string): Promise<void> {
  try {
    await api.post("/auth/verify-email", { token });
  } catch (error) {
    throw toApiError(
      error,
      "La vérification a échoué. Le lien est peut-être expiré.",
    );
  }
}

export async function forgotPassword(email: string): Promise<void> {
  try {
    await api.post("/auth/forgot-password", { email });
  } catch (error) {
    throw toApiError(error);
  }
}

export async function resetPassword(payload: {
  token: string;
  password: string;
}): Promise<void> {
  try {
    await api.post("/auth/reset-password", payload);
  } catch (error) {
    throw toApiError(error);
  }
}

/* ───────── Back-office (administrateurs) ───────── */

/**
 * Vérifie que le jeton courant est celui d'un administrateur (GET /auth/me) et mémorise l'identité dans la session.
 * Si /auth/me ne donne pas le rôle, une route réservée aux admins tranche (403 = compte non administrateur).
 */
export async function verifyAdminSession(): Promise<void> {
  const refuse = () => {
    clearSession();
    return new ApiError("Ce compte n’est pas administrateur.", "INTERDIT", 403);
  };
  try {
    const res = await api.get<Record<string, unknown>>("/auth/me");
    const u = (
      res.data.user && typeof res.data.user === "object"
        ? res.data.user
        : res.data
    ) as Record<string, unknown>;
    const role = typeof u.role === "string" ? u.role.toLowerCase() : undefined;
    if (role && role !== "admin") throw refuse();
    if (!role) {
      try {
        await api.get("/admin/stats");
      } catch (e) {
        if (errorStatus(e) === 403) throw refuse();
        throw e;
      }
    }
    const email = typeof u.email === "string" ? u.email : "";
    const name = typeof u.nom === "string" ? u.nom : "";
    saveSession({
      token: "",
      user: {
        id: typeof u.id === "number" ? u.id : undefined,
        role: "ADMIN",
        name,
        email,
      },
    });
  } catch (error) {
    throw toApiError(error);
  }
}

/** Connexion administrateur : POST /auth/admin/login (pose le cookie httpOnly), puis vérification du rôle. */
export async function adminLogin(
  loginData: Login,
): Promise<TwoFaChallengeResponse | void> {
  try {
    const res = await api.post<{
      token?: string;
      user?: unknown;
      requires2fa?: boolean;
      tempToken?: string;
    }>("/auth/admin/login", loginData);
    if (res.data.requires2fa && res.data.tempToken) {
      return { requires2fa: true, tempToken: res.data.tempToken };
    }
    if (!res.data.token && !res.data.user)
      throw new ApiError("Réponse de connexion inattendue.");
    saveSession({
      token: res.data.token ?? "",
      user: { name: "", email: loginData.email, role: "ADMIN" },
    });
    await verifyAdminSession();
  } catch (error) {
    clearSession();
    throw toApiError(error);
  }
}

export async function completeAdminTwoFaLogin(payload: {
  tempToken: string;
  code: string;
}): Promise<void> {
  try {
    const res = await api.post<{ token?: string; user?: unknown }>(
      "/auth/2fa/login",
      payload,
    );
    if (!res.data.token && !res.data.user)
      throw new ApiError("Réponse de connexion inattendue.");
    saveSession({
      token: res.data.token ?? "",
      user: { name: "", email: "", role: "ADMIN" },
    });
    await verifyAdminSession();
  } catch (error) {
    clearSession();
    throw toApiError(error);
  }
}
