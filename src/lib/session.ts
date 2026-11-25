import { useSyncExternalStore } from "react";

/*
  Session du client connecté (cookie httpOnly côté serveur).
  - Le JWT n'est JAMAIS stocké dans localStorage (protection contre l'exfiltration par XSS).
  - Seules les métadonnées publiques de l'utilisateur (`client_user`) sont conservées en local
    pour l'affichage immédiat de l'interface ; le serveur reste seul juge via le cookie `sc_session`.
*/

export interface SessionUser {
  name: string;
  email: string;
  id?: number;
  role?: "CLIENT" | "ADMIN";
  emailVerified?: boolean;
  hasPassword?: boolean;
  twoFaEnabled?: boolean;
}
export interface Session {
  token: string;
  user: SessionUser;
}

const LEGACY_TOKEN_KEY = "client_token";
const USER_KEY = "client_user";

/* ───────── stockage (localStorage, avec repli mémoire si indisponible : navigation privée, quota…) ───────── */

const memory = new Map<string, string>();
const store = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      memory.set(key, value);
    }
  },
  remove(key: string) {
    memory.delete(key);
    try {
      localStorage.removeItem(key);
    } catch {
      /* rien à supprimer */
    }
  },
};

/* ───────── lecture ───────── */

const isSessionUser = (v: unknown): v is SessionUser =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as SessionUser).name === "string" &&
  typeof (v as SessionUser).email === "string";

/** Date d'expiration (ms) lue dans le champ `exp` d'un JWT en mémoire uniquement (le serveur reste juge). */
function expiryOf(token: string): number | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

let cache: { raw: string; session: Session | null; expiresAt: number | null } =
  {
    raw: "",
    session: null,
    expiresAt: null,
  };

function read(): Session | null {
  const rawUser = store.get(USER_KEY);
  const raw = rawUser ?? "";
  if (raw !== cache.raw) {
    let session: Session | null = null;
    if (rawUser) {
      try {
        const user: unknown = JSON.parse(rawUser);
        if (isSessionUser(user)) session = { token: "", user };
      } catch {
        /* utilisateur illisible : session ignorée */
      }
    }
    cache = {
      raw,
      session,
      expiresAt: session ? cache.expiresAt : null,
    };
  }
  if (
    cache.session &&
    cache.expiresAt !== null &&
    Date.now() >= cache.expiresAt
  ) {
    return null;
  }
  return cache.session;
}

/* ───────── abonnements (rendu React, autres onglets, expiration) ───────── */

const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());
let timer: ReturnType<typeof setTimeout> | undefined;

function armExpiry() {
  clearTimeout(timer);
  const s = read();
  if (!s || cache.expiresAt === null) return;
  const wait = Math.min(
    Math.max(cache.expiresAt - Date.now(), 0) + 50,
    2 ** 31 - 1,
  );
  timer = setTimeout(() => (read() ? armExpiry() : clearSession()), wait);
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === USER_KEY || e.key === LEGACY_TOKEN_KEY) {
      armExpiry();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/* ───────── API publique ───────── */

export const getSession = (): Session | null => read();

/** Le JWT vit désormais dans un cookie httpOnly inaccessible au JavaScript. */
export const getToken = (): string | null => null;

export function saveSession(session: { user: SessionUser; token?: string }): void {
  // Nettoyage de l'ancienne clé JWT si présente (migration douce vers cookie httpOnly).
  store.remove(LEGACY_TOKEN_KEY);
  const expiresAt = session.token ? expiryOf(session.token) : null;
  const serialized = JSON.stringify(session.user);
  store.set(USER_KEY, serialized);
  cache = {
    raw: serialized,
    session: { token: "", user: session.user },
    expiresAt,
  };
  armExpiry();
  notify();
}

/** Supprime la session locale (déconnexion, session refusée ou expirée). Ne touche à rien d'autre dans le stockage. */
export function clearSession(): void {
  clearTimeout(timer);
  store.remove(LEGACY_TOKEN_KEY);
  store.remove(USER_KEY);
  cache = { raw: "", session: null, expiresAt: null };
  notify();
}

/** Session courante dans un composant : se met à jour à la connexion, à la déconnexion, à l'expiration et entre onglets. */
export const useSession = (): Session | null =>
  useSyncExternalStore(subscribeSession, getSession, () => null);

// Nettoyage automatique de l'ancien jeton localStorage s'il existe encore.
store.remove(LEGACY_TOKEN_KEY);
armExpiry();
