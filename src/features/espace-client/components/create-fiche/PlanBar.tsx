import type { FichePurchaseInput } from "../../espaceClient.service";

export function PlanBar({
  plan,
  freeSlots,
}: {
  plan: FichePurchaseInput["plan"];
  freeSlots?: number;
}) {
  const formula =
    plan === "pro" ? "Pro" : plan === "signature" ? "Signature" : "Essentielle";
  return (
    <div className="cf-plan">
      <div>
        <small>Formule</small>
        <b>{formula}</b>
      </div>
      <span>
        {plan === "essentielle" && freeSlots
          ? `${freeSlots} place(s) gratuite(s) restante(s)`
          : plan === "essentielle"
            ? "Emplacement payant"
            : "Abonnement"}
      </span>
    </div>
  );
}
