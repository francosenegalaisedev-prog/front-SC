import { Link } from "react-router";
import type { ApiFicheSummary } from "../../../../types";
import type { Health } from "../../lib/dashboard";
import {
  daysLeft,
  displayName,
  health,
  subscriptionEndsAt,
} from "../../lib/dashboard";
import { renewPath } from "../../lib/renewal";

export const HEALTH_PILL: Record<
  Health,
  { cls: string; text: (d: number | null) => string }
> = {
  ok: { cls: "ok", text: () => "En ligne" },
  soon: { cls: "warn", text: d => `Expire dans ${d} j` },
  expired: { cls: "bad", text: () => "Expirée" },
  suspended: { cls: "bad", text: () => "Suspendue" },
  draft: { cls: "warn", text: () => "Brouillon" },
};

export function DashboardAlerts({ fiches }: { fiches: ApiFicheSummary[] }) {
  const alerts = fiches.filter(
    fiche => !["ok", "draft"].includes(health(fiche)),
  );
  if (alerts.length === 0) return null;

  return (
    <ul className="db-alerts" role="status">
      {alerts.map(fiche => {
        const h = health(fiche);
        return (
          <li key={fiche.id} className={HEALTH_PILL[h].cls}>
            <b>{displayName(fiche)}</b> —{" "}
            {HEALTH_PILL[h].text(daysLeft(subscriptionEndsAt(fiche)))}.{" "}
            {h === "expired" ? (
              <Link to={renewPath(fiche.id)}>Renouveler</Link>
            ) : (
              <Link to="/espace-client/abonnements">Voir</Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function DashboardKpis({ fiches }: { fiches: ApiFicheSummary[] }) {
  const scans = fiches.reduce((sum, fiche) => sum + fiche.scansTotal, 0);
  const expiredCount = fiches.filter(
    fiche => health(fiche) === "expired",
  ).length;
  const expiringCount = fiches.filter(
    fiche => health(fiche) === "soon",
  ).length;

  return (
    <section className="db-kpis" aria-label="Chiffres clés">
      <div className="db-kpi">
        <span>Fiches</span>
        <b>{fiches.length}</b>
        <small>{fiches.filter(f => health(f) === "ok").length} en ligne</small>
      </div>

      <div className="db-kpi">
        <span>Passages NFC · QR</span>
        <b>{scans.toLocaleString("fr-FR")}</b>
        <small>
          {scans === 0
            ? "partagez votre QR pour commencer"
            : "toutes fiches confondues"}
        </small>
      </div>

      <Link
        className="db-kpi db-kpi-link"
        to="/espace-client/abonnements?expiry=expired"
        aria-label={`Fiches expirées : ${expiredCount}. Voir les abonnements`}
      >
        <span>Fiches expirées</span>
        <b>{expiredCount}</b>
        <small>Voir les abonnements</small>
      </Link>

      <Link
        className="db-kpi db-kpi-link"
        to="/espace-client/abonnements?expiry=expiring"
        aria-label={`Fiches à renouveler bientôt : ${expiringCount}. Voir les abonnements`}
      >
        <span>À renouveler bientôt</span>
        <b>{expiringCount}</b>
        <small>Selon la durée de l’abonnement</small>
      </Link>
    </section>
  );
}
