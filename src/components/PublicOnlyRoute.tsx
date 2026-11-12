import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "../lib/session";

/**
 * Garde pour les pages réservées aux visiteurs non connectés
 * (connexion, inscription, éventuellement la page d'accueil).
 *
 * Fonctionnement :
 * - `useSession()` (voir `src/lib/session.ts`) renvoie la session stockée sur
 *   l'appareil, ou `null` si l'utilisateur n'est pas connecté.
 * - Session absente : la page demandée s'affiche normalement.
 * - Session présente : redirection vers `/dashboard`.
 *
 * C'est ce qui permet, dans la PWA installée, d'arriver directement sur le
 * dashboard tant que l'utilisateur ne s'est pas déconnecté, sans repasser par
 * l'écran de connexion.
 *
 * `replace` remplace l'entrée courante de l'historique, pour que le bouton
 * « retour » ne ramène pas sur la page de connexion.
 *
 * @example
 * <Route
 *   path="/login"
 *   element={
 *     <PublicOnlyRoute>
 *       <LoginPage />
 *     </PublicOnlyRoute>
 *   }
 * />
 */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const session = useSession();
  return session ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}