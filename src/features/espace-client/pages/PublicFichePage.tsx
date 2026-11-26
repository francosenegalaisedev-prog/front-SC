import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Fiche from "../../espace-client/components/Fiche";
import PublicFicheState from "../components/PublicFicheState";
import InstallFicheButton from "../components/InstallFicheButton";
import { useFichePwa } from "../hooks/useFichePwa";
import { ficheDisplayName } from "../lib/fichePwa";
import { addFiche, getSnapshot } from "../lib/portefeuille";
import { useFicheOwnerStatus } from "../hooks/useIsFicheOwner";
import { usePassage, type PassageSource } from "../hooks/usePassage";
import { fetchFiche } from "../lib/ficheApi";
import "./FicheStats.css";
export default function PublicFichePage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const requestedSource = searchParams.get("source");
  const source: PassageSource =
    requestedSource === "qr" || requestedSource === "nfc"
      ? requestedSource
      : "direct";

  const fromCache = useRef(false);
  const ficheQuery = useQuery({
    queryKey: ["public-fiche", slug],
    enabled: slug.length > 0,
    // Sans cela, react-query met la requête en pause quand il n'y a pas de réseau.
    networkMode: "always",
    queryFn: async ({ signal }) => {
      try {
        const fiche = await fetchFiche(
          `fiches/public/${encodeURIComponent(slug)}`,
          signal
        );
        fromCache.current = false;
        return fiche;
      } catch (e) {
        const snap = getSnapshot(slug);
        // Réseau absent : on montre la copie enregistrée. Une vraie erreur
        // du serveur (fiche introuvable) reste une erreur.
        if (snap && (!navigator.onLine || e instanceof TypeError)) {
          fromCache.current = true;
          return snap;
        }
        throw e;
      }
    },
    retry: false,
  });

  usePassage(slug, source, Boolean(ficheQuery.data));
  // Le QR et le bouton « NFC · QR » sont des outils du propriétaire : un visiteur ne les voit jamais.
  const { isOwner, isPending: ownerPending } = useFicheOwnerStatus(
    slug,
    ficheQuery.data?.isOwner,
  );
  const pwa = useFichePwa(ficheQuery.data, isOwner ? "owner" : "visitor");
  const autoInstall = searchParams.get("install") === "1";

  useEffect(() => {
    const f = ficheQuery.data;
    if (!f || ownerPending || isOwner || fromCache.current) return;
    addFiche(f, ficheDisplayName(f), f.logo || undefined);
  }, [ficheQuery.data, ownerPending, isOwner]);

  const showLoader = ficheQuery.isPending;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {showLoader ? (
        <motion.div
          key="loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PublicFicheState loading />
        </motion.div>
      ) : ficheQuery.isError || !ficheQuery.data ? (
        <motion.div
          key="error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PublicFicheState error={ficheQuery.error} />
        </motion.div>
      ) : (
        <motion.main
          key={`fiche-${ficheQuery.data.id}`}
          className="fiche-public-page"
          ref={scrollerRef}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Fiche
            key={ficheQuery.data.id}
            fiche={ficheQuery.data}
            scrollerRef={scrollerRef}
            ownerTools={isOwner}
          />
          {fromCache.current && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 40,
                padding: "6px 12px",
                background: "#111",
                color: "#fff",
                fontSize: 12,
                textAlign: "center",
              }}
            >
              Hors ligne : version enregistrée sur ton téléphone
            </div>
          )}
          <InstallFicheButton
            name={ficheDisplayName(ficheQuery.data)}
            {...pwa}
            label={isOwner ? undefined : "Garder mes fiches sur mon téléphone"}
            autoStart={isOwner ? autoInstall : true}
          />
        </motion.main>
      )}
    </AnimatePresence>
  );
}
