import { Link } from "react-router";
import type { ApiFicheSummary } from "../../../../types";
import {
  completion,
  daysLeft,
  displayName,
  health,
  SECTEUR_LABEL,
  subscriptionEndsAt,
} from "../../lib/dashboard";
import { renewPath } from "../../lib/renewal";
import { HEALTH_PILL } from "./DashboardKpis";

type Props = {
  fiche: ApiFicheSummary;
  selected: boolean;
  deletePending: boolean;
  onSelect: () => void;
  onEdit: (ficheId: number) => void;
  onDelete: (fiche: ApiFicheSummary) => void;
};

export function DashboardFicheCard({
  fiche,
  selected,
  deletePending,
  onSelect,
  onEdit,
  onDelete,
}: Props) {
  const h = health(fiche);
  const c = completion(fiche);
  const subscription = fiche.subscriptions?.[0] ?? fiche.abonnementActif;

  return (
    <li className={selected ? "on" : ""}>
      <button className="db-pick" onClick={onSelect} aria-pressed={selected}>
        <span className="db-av">
          {fiche.logo ? (
            <img src={fiche.logo} alt="" />
          ) : (
            displayName(fiche).charAt(0)
          )}
        </span>

        <span className="db-meta">
          <b>{displayName(fiche)}</b>
          <small>{fiche.fonction}</small>
        </span>

        {fiche.secteur && (
          <em className="db-tag">{SECTEUR_LABEL[fiche.secteur]}</em>
        )}
      </button>

      <div className="db-row">
        <span className={`db-pill ${HEALTH_PILL[h].cls}`}>
          {HEALTH_PILL[h].text(daysLeft(subscriptionEndsAt(fiche)))}
        </span>

        {subscription && (
          <span className="db-plan">
            {subscription.plan?.nom ?? subscription.plan?.type}
          </span>
        )}

        {fiche.enLigneSeule && !subscription && (
          <span className="db-plan free">Créée gratuitement</span>
        )}

        <span className="db-scans">
          <b>{fiche.scansTotal}</b> passage{fiche.scansTotal > 1 ? "s" : ""}
        </span>

        <span className="db-act">
          {h === "expired" && (
            <Link className="db-public-link" to={renewPath(fiche.id)}>
              Renouveler
            </Link>
          )}

          {h !== "draft" && (
            <a
              className="db-public-link"
              href={`/f/${encodeURIComponent(fiche.slug)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Fiche publique
            </a>
          )}

          {h !== "draft" && (
            <a
              className="db-public-link"
              href={`/f/${encodeURIComponent(fiche.slug)}?install=1`}
            >
              Installer
            </a>
          )}

          <button className="pri" onClick={() => onEdit(fiche.id)}>
            Modifier
          </button>

          <button
            type="button"
            className="db-delete-btn"
            onClick={() => onDelete(fiche)}
            disabled={deletePending}
          >
            Supprimer
          </button>
        </span>
      </div>

      <div className="db-comp" title={`Fiche complète à ${c} %`}>
        <i>
          <u style={{ width: `${c}%` }} />
        </i>
        <span>{c} % complète</span>
      </div>
    </li>
  );
}
