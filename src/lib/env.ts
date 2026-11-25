export const ENV: Partial<ImportMetaEnv> =
  (typeof import.meta !== "undefined" && import.meta.env) || {};

const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i;

/**
 * Origine publique de l'application (pour QR codes, liens de partage, stickers).
 * Si `VITE_PUBLIC_APP_URL` pointe sur localhost mais que la page est ouverte via un tunnel
 * ou un vrai domaine (ex. `https://xxx.trycloudflare.com`), on utilise `window.location.origin`.
 */
export function publicAppOrigin(): string {
  const configured = (ENV.VITE_PUBLIC_APP_URL ?? "").trim().replace(/\/+$/, "");
  const browserOrigin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin.replace(/\/+$/, "")
      : "";

  if (
    browserOrigin &&
    !LOCALHOST_RE.test(browserOrigin) &&
    (!configured || LOCALHOST_RE.test(configured))
  ) {
    return browserOrigin;
  }
  return configured || browserOrigin;
}
