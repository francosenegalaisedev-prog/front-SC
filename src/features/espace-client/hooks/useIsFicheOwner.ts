import { useSession } from "../../../lib/session";
import { useDashboardFiches } from "./useDashboardFiches";

export type FicheOwnerStatus = {
  isOwner: boolean;
  isPending: boolean;
};

/**
 * Le visiteur est-il le propriétaire de cette fiche publique ?
 * - Si l'API publique renvoie `isOwner`, on l'utilise directement sans requête supplémentaire.
 * - Sinon (ancien serveur), on vérifie si la fiche figure dans `GET client/dashboard/fiches`
 *   (uniquement lorsqu'une session est ouverte).
 */
export function useFicheOwnerStatus(
  slug: string,
  serverIsOwner?: boolean,
): FicheOwnerStatus {
  const session = useSession();
  const hasServerValue = typeof serverIsOwner === "boolean";
  const shouldFallback = !hasServerValue && Boolean(session) && slug.length > 0;
  const mine = useDashboardFiches({
    enabled: shouldFallback,
  });

  if (hasServerValue) {
    return { isOwner: serverIsOwner, isPending: false };
  }
  return {
    isOwner: Boolean(session) && Boolean(mine.data?.some(f => f.slug === slug)),
    isPending: shouldFallback && mine.isPending,
  };
}

export function useIsFicheOwner(
  slug: string,
  serverIsOwner?: boolean,
): boolean {
  return useFicheOwnerStatus(slug, serverIsOwner).isOwner;
}
