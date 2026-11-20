import type { ApiFicheSummary } from "../../../../types";
import { CardRequestPanel } from "../CardRequestPanel";
import { getPlan } from "./PlansPanel";

export function CardRequestDialog({
  fiche,
  onClose,
}: {
  fiche: ApiFicheSummary;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-request-dialog-title"
    >
      <div className="my-auto w-full max-w-3xl rounded-2xl bg-[#f7f5f1] p-3 shadow-2xl sm:p-5">
        <div className="flex items-center justify-between gap-4 px-2 pb-3">
          <h2
            id="card-request-dialog-title"
            className="font-semibold text-[#111111]"
          >
            Demande de carte — {fiche.prenom} {fiche.nom}
          </h2>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="Fermer la demande de carte"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl text-[#6d665d] hover:bg-white"
          >
            ×
          </button>
        </div>
        <CardRequestPanel
          ficheId={fiche.id}
          formula={getPlan(fiche) ?? "essentielle"}
          eligible={fiche.statut === "ACTIVE" && !!getPlan(fiche)}
        />
      </div>
    </div>
  );
}
