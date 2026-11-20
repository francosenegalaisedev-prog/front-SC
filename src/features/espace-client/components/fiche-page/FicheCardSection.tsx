import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  getCardRequest,
  type CardModelPreview,
} from "../../espaceClient.service";
import { CardRequestPanel } from "../CardRequestPanel";

function FicheCardFaces({ modele }: { modele: CardModelPreview }) {
  return (
    <div
      className="fiche-card-model-faces"
      aria-label={`Aperçu de la carte ${modele.nom}`}
    >
      {(
        [
          ["Recto", modele.rectoUrl],
          ["Verso", modele.versoUrl],
        ] as const
      ).map(([face, url]) => (
        <figure key={face}>
          <div className="fiche-card-model-image">
            <img src={url} alt={`${modele.nom} — ${face.toLowerCase()}`} />
          </div>
          <figcaption>{face}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function FicheCardModelPreview({ ficheId }: { ficheId: number }) {
  const query = useQuery({
    queryKey: ["card-request", ficheId],
    queryFn: () => getCardRequest(ficheId),
  });
  const modele = query.data?.modele;

  if (query.isPending) {
    return (
      <p className="fiche-card-model-status" role="status">
        Chargement de l’aperçu de la carte…
      </p>
    );
  }
  if (query.isError) {
    return (
      <div className="fiche-card-model-status" role="alert">
        <p>Impossible de charger l’aperçu de la carte.</p>
        <button type="button" onClick={() => void query.refetch()}>
          Réessayer
        </button>
      </div>
    );
  }
  if (!modele) {
    return (
      <p className="fiche-card-model-status">
        Aucun modèle de carte n’est configuré pour votre formule.
      </p>
    );
  }
  return <FicheCardFaces modele={modele} />;
}

export function FicheCardSection({
  ficheId,
  formula,
  eligible,
  ficheName,
}: {
  ficheId: number;
  formula: string;
  eligible: boolean;
  ficheName: string;
}) {
  const [cardDialogOpen, setCardDialogOpen] = useState(false);

  useEffect(() => {
    if (!cardDialogOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCardDialogOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cardDialogOpen]);

  return (
    <section className="fiche-card-request">
      {eligible && <FicheCardModelPreview ficheId={ficheId} />}
      <div className="fiche-card-request-copy">
        <p className="fiche-card-request-eyebrow">Carte physique NFC</p>
        <h3>Votre fiche, toujours à portée de main.</h3>
        <p>
          Demandez une carte NFC liée à cette fiche. Indiquez vos coordonnées de
          livraison et notre équipe s’occupe du suivi.
        </p>
        <button
          type="button"
          className="fiche-card-request-button"
          onClick={() => setCardDialogOpen(true)}
        >
          Demander une carte <span aria-hidden="true">↗</span>
        </button>
      </div>
      {cardDialogOpen && (
        <div
          className="fiche-card-dialog-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              setCardDialogOpen(false);
            }
          }}
        >
          <section
            className="fiche-card-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fiche-card-dialog-title"
          >
            <header>
              <div>
                <p className="fiche-card-request-eyebrow">Carte physique NFC</p>
                <h3 id="fiche-card-dialog-title">
                  Demande de carte — {ficheName}
                </h3>
              </div>
              <button
                type="button"
                autoFocus
                onClick={() => setCardDialogOpen(false)}
                aria-label="Fermer la demande de carte"
              >
                ×
              </button>
            </header>
            <CardRequestPanel
              ficheId={ficheId}
              formula={formula}
              eligible={eligible}
            />
          </section>
        </div>
      )}
    </section>
  );
}
