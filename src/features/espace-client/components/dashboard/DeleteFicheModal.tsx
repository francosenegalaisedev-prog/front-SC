import { toApiError } from "../../../../lib/apiError";
import type { ApiFicheSummary } from "../../../../types";
import { displayName, fmtDate } from "../../lib/dashboard";

type Props = {
  fiche: ApiFicheSummary;
  isDeleting: boolean;
  isDrafting: boolean;
  error: unknown;
  onCancel: () => void;
  onSetDraft: () => void;
  onConfirmDelete: () => void;
};

export function DeleteFicheModal({
  fiche,
  isDeleting,
  isDrafting,
  error,
  onCancel,
  onSetDraft,
  onConfirmDelete,
}: Props) {
  const busy = isDeleting || isDrafting;
  const selectedSubscription =
    fiche.latestSubscription ??
    fiche.subscriptions?.find(s => s.status === "ACTIVE") ??
    fiche.subscriptions?.[0];
  const hasActiveSubscription = selectedSubscription?.status === "ACTIVE";

  return (
    <div
      className="db-modal-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !busy) {
          onCancel();
        }
      }}
    >
      <section
        className="db-delete-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="db-delete-title"
        aria-describedby="db-delete-description"
      >
        <div className="db-delete-icon" aria-hidden="true">
          !
        </div>

        <h2 id="db-delete-title">Supprimer cette fiche ?</h2>

        <p className="db-delete-name">{displayName(fiche)}</p>

        {hasActiveSubscription ? (
          <div className="db-delete-warning">
            <strong>Attention : abonnement actif</strong>

            <p id="db-delete-description">
              Cette fiche possède un abonnement actif
              {selectedSubscription?.plan?.type
                ? ` (${selectedSubscription.plan.type})`
                : ""}
              {selectedSubscription?.endsAt
                ? ` jusqu’au ${fmtDate(selectedSubscription.endsAt)}`
                : ""}
              .
            </p>

            <p>
              La suppression définitive retire la fiche et ses contenus, mais
              conserve ses abonnements et paiements dans l’historique financier
              administrateur. Vous pouvez aussi la mettre en brouillon sans la
              supprimer.
            </p>
          </div>
        ) : (
          <p id="db-delete-description">
            Voulez-vous vraiment supprimer cette fiche ? Cette action peut être
            définitive.
          </p>
        )}

        {Boolean(error) && (
          <div className="db-delete-error" role="alert">
            {toApiError(error).message}
          </div>
        )}

        <div className="db-delete-actions">
          <button
            type="button"
            className="db-delete-cancel"
            onClick={onCancel}
            disabled={busy}
          >
            Annuler
          </button>

          <button type="button" onClick={onSetDraft} disabled={busy}>
            {isDrafting ? "Mise en brouillon…" : "Mettre en brouillon"}
          </button>

          <button
            type="button"
            className="db-delete-confirm"
            onClick={onConfirmDelete}
            disabled={busy}
          >
            {isDeleting ? "Suppression…" : "Supprimer définitivement"}
          </button>
        </div>
      </section>
    </div>
  );
}
