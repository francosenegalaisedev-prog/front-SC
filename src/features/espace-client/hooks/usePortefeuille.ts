import { useEffect, useState } from "react";
import {
  listFiches,
  removeFiche,
  subscribePortefeuille,
  type PortefeuilleEntry,
} from "../lib/portefeuille";

export function usePortefeuille() {
  const [fiches, setFiches] = useState<PortefeuilleEntry[]>(listFiches);
  useEffect(
    () => subscribePortefeuille(() => setFiches(listFiches())),
    []
  );
  return { fiches, remove: removeFiche };
}
