import { useCallback, useEffect, useState } from "react";
import type { FicheRecord } from "../../../types";
import { applyFicheManifest, applyPortefeuilleManifest } from "../lib/fichePwa";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

export function useFichePwa(
  fiche: Pick<FicheRecord, "slug" | "entreprise" | "prenom" | "nom"> | undefined,
  mode: "owner" | "visitor" = "owner"
) {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);

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

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }, [promptEvent]);

  const isIOS =
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;

  return { canInstall: !!promptEvent, install, installed, isIOS };
}
