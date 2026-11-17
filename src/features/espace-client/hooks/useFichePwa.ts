import { useCallback, useEffect, useState } from "react";
import type { FicheRecord } from "../../../types";
import { applyFicheManifest, applyPortefeuilleManifest } from "../lib/fichePwa";
import {
  clearDeferred,
  getDeferred,
  subscribeInstall,
  wasInstalled,
} from "../lib/installPrompt";

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

export function useFichePwa(
  fiche: Pick<FicheRecord, "slug" | "entreprise" | "prenom" | "nom"> | undefined,
  mode: "owner" | "visitor" = "owner"
) {
  const [canInstall, setCanInstall] = useState(() => !!getDeferred());
  const [installed, setInstalled] = useState(
    () => isStandalone() || wasInstalled()
  );

  const slug = fiche?.slug;
  const entreprise = fiche?.entreprise;
  const prenom = fiche?.prenom;
  const nom = fiche?.nom;

  useEffect(() => {
    if (!slug) return;
    if (mode === "visitor") return applyPortefeuilleManifest();
    return applyFicheManifest({
      slug,
      entreprise: entreprise ?? "",
      prenom: prenom ?? "",
      nom: nom ?? "",
    });
  }, [slug, entreprise, prenom, nom, mode]);

  useEffect(
    () =>
      subscribeInstall(() => {
        setCanInstall(!!getDeferred());
        setInstalled(isStandalone() || wasInstalled());
      }),
    []
  );

  const install = useCallback(async () => {
    const ev = getDeferred();
    if (!ev) return;
    try {
      await ev.prompt();
      await ev.userChoice;
    } catch {
      /* geste utilisateur manquant ou prompt déjà utilisé */
    }
    clearDeferred();
  }, []);

  const isIOS =
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;

  return { canInstall, install, installed, isIOS };
}
