import { Link } from "react-router-dom";

export function FicheCardSection({
  ficheId,
  eligible,
}: {
  ficheId: number;
  formula?: string;
  eligible: boolean;
  ficheName?: string;
}) {
  return (
    <section className="fiche-card-request">
      <div className="fiche-card-request-copy">
        <p className="fiche-card-request-eyebrow">Carte physique NFC</p>
        <h3>Votre fiche, toujours à portée de main.</h3>
        <p>
          {eligible
            ? "Personnalisez votre carte NFC selon votre formule et envoyez votre demande directement depuis l’atelier Cartes."
            : "Activez un abonnement et publiez votre fiche pour pouvoir commander votre carte physique NFC."}
        </p>
        <Link
          to={`/espace-client/cartes?ficheId=${ficheId}`}
          className="fiche-card-request-button"
        >
          Demander une carte <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  );
}
