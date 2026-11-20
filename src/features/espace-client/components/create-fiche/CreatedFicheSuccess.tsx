import type { FichePurchaseInput } from "../../espaceClient.service";
import type { CreatedFiche } from "./createFicheForm.utils";
import { PlanBar } from "./PlanBar";

export function CreatedFicheSuccess({
  created,
  createdQuantity,
  publicBaseUrl,
}: {
  created: CreatedFiche;
  createdQuantity: number;
  publicBaseUrl: string;
}) {
  const url = `${publicBaseUrl}/fiche/${created.slug}`;
  const createdPlan: FichePurchaseInput["plan"] =
    created.formule.toLowerCase() === "pro"
      ? "pro"
      : created.formule.toLowerCase() === "signature"
        ? "signature"
        : "essentielle";

  return (
    <div className="cf">
      <PlanBar plan={createdPlan} />
      <div className="cf-box" role="status">
        <h2>
          {createdQuantity > 1
            ? `${createdQuantity} fiches sont créées`
            : "Ta fiche est créée"}
        </h2>
        <p className="cf-sub">Elle est en ligne à cette adresse :</p>
        <a className="cf-link" href={url} target="_blank" rel="noreferrer">
          {url}
        </a>
        <p className="cf-note">
          Ajoute maintenant ta présentation, tes réseaux sociaux et ta
          localisation depuis l'éditeur.
        </p>
        <a
          className="cf-btn"
          href={`/f/${encodeURIComponent(created.slug)}?install=1`}
        >
          Installer cette fiche comme application
        </a>
      </div>
    </div>
  );
}
