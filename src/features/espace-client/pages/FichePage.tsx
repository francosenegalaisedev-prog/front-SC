import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Fiche from "../components/Fiche";
import PhonePreview from "../components/PhonePreview";
import { FicheCardSection } from "../components/fiche-page/FicheCardSection";
import { PassageStatsPanel } from "../components/fiche-page/PassageStatsPanel";
import { RappelsPanel } from "../components/fiche-page/RappelsPanel";
import { fetchFiche } from "../lib/ficheApi";
import "./FicheStats.css";

function FicheDashboardPanel({
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
  const [activeSection, setActiveSection] = useState<
    "overview" | "rappels" | "carte"
  >("overview");

  const sections = [
    {
      id: "overview" as const,
      label: "Statistiques",
      description: "Passages et sources",
    },
    {
      id: "rappels" as const,
      label: "Demandes de rappel",
      description: "Coordonnées reçues",
    },
    { id: "carte" as const, label: "Carte", description: "Carte physique NFC" },
  ];

  return (
    <div className="fiche-dashboard">
      <header className="fiche-dashboard-header">
        <div>
          <h2>Tableau de bord de la fiche</h2>
          <p>
            Suivez les passages, les demandes de rappel et le suivi de votre
            carte.
          </p>
        </div>
      </header>
      <nav
        className="fiche-dashboard-nav"
        aria-label="Rubriques du tableau de bord de la fiche"
      >
        {sections.map(section => (
          <button
            key={section.id}
            type="button"
            className={activeSection === section.id ? "active" : ""}
            aria-current={activeSection === section.id ? "page" : undefined}
            onClick={() => setActiveSection(section.id)}
          >
            <strong>{section.label}</strong>
            <span>{section.description}</span>
          </button>
        ))}
      </nav>
      {activeSection === "overview" ? (
        <PassageStatsPanel ficheId={ficheId} />
      ) : activeSection === "rappels" ? (
        <RappelsPanel ficheId={ficheId} />
      ) : (
        <FicheCardSection
          ficheId={ficheId}
          formula={formula}
          eligible={eligible}
          ficheName={ficheName}
        />
      )}
    </div>
  );
}

export function FichePage() {
  const { id } = useParams<{ id: string }>();
  const ficheId = Number(id);

  const {
    data: fiche,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["fiche-preview", ficheId],
    enabled: Number.isInteger(ficheId) && ficheId > 0,
    queryFn: ({ signal }) => fetchFiche(`fiches/${ficheId}`, signal),
  });

  if (!Number.isInteger(ficheId) || ficheId <= 0) {
    return (
      <div className="fiche-preview-state" role="alert">
        <h1>Fiche invalide</h1>
        <p>L’identifiant de la fiche est invalide.</p>
        <Link to="/espace-client">Retour au tableau de bord</Link>
      </div>
    );
  }

  if (isPending) {
    return (
      <p className="fiche-preview-state" role="status">
        Chargement de la prévisualisation…
      </p>
    );
  }

  if (isError) {
    const status = isAxiosError(error) ? error.response?.status : undefined;
    const message =
      status === 401
        ? "Votre session a expiré. Reconnectez-vous pour accéder à cette fiche."
        : status === 403 || status === 404
          ? "Cette fiche est introuvable ou vous n’avez pas le droit d’y accéder."
          : "Impossible de charger cette fiche. Vérifiez votre connexion puis réessayez.";

    return (
      <div className="fiche-preview-state" role="alert">
        <h1>Prévisualisation indisponible</h1>
        <p>{message}</p>
        {status === 401 ? (
          <Link to="/login">Se connecter</Link>
        ) : (
          <button onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Chargement…" : "Réessayer"}
          </button>
        )}
        <p>
          <Link to="/espace-client">Retour au tableau de bord</Link>
        </p>
      </div>
    );
  }

  if (!fiche) {
    return <p className="fiche-preview-state">Aucune fiche trouvée.</p>;
  }

  return (
    <section
      aria-label={`Prévisualisation de la fiche de ${fiche.prenom} ${fiche.nom}`}
    >
      <div className="fiche-preview-toolbar">
        <Link to="/espace-client">← Retour au tableau de bord</Link>
        <a
          href={`/f/${encodeURIComponent(fiche.slug)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fiche-public-link"
        >
          Fiche publique ↗
        </a>
      </div>
      <div className="fiche-preview-layout">
        <PhonePreview>
          {scroller => (
            <Fiche
              key={fiche.id}
              fiche={fiche}
              scrollerRef={scroller}
              ownerTools
            />
          )}
        </PhonePreview>
        <FicheDashboardPanel
          ficheId={fiche.id}
          formula={fiche.formule}
          eligible={fiche.statut === "active" && !fiche.expiree}
          ficheName={`${fiche.prenom} ${fiche.nom}`.trim()}
        />
      </div>
    </section>
  );
}
