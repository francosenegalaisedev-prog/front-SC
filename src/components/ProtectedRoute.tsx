import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "../lib/session";

/**
 * Garde pour les pages privées (dashboard, production, QR codes, etc.).
 *
 * Fonctionnement :
 * - `useSession()` (voir `src/lib/session.ts`) renvoie la session stockée sur
 *   l'appareil, ou `null` si l'utilisateur n'est pas connecté, s'est déconnecté
 *   ou si son jeton JWT a expiré.
 * - Session présente : la page demandée s'affiche normalement.
 * - Session absente : redirection vers `/login`.
 *
 * Comme `useSession` se met à jour à la connexion, à la déconnexion, à
 * l'expiration du jeton et entre onglets, la garde réagit toute seule : pas
 * besoin de recharger la page.
 *
 * `replace` remplace l'entrée courante de l'historique, pour que le bouton
 * « retour » ne ramène pas sur la page protégée qui vient de rediriger.
 *
 * @example
 * <Route
 *   path="/dashboard"
 *   element={
 *     <ProtectedRoute>
 *       <DashboardPage />
 *     </ProtectedRoute>
 *   }
 * />
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const session = useSession();
  return session ? <>{children}</> : <Navigate to="/login" replace />;
}