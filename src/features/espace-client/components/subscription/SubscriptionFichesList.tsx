import type { ApiFicheSummary } from "../../../../types";
import { renewalInfo } from "../../lib/renewal";
import { getPlan, initials, PlanPill } from "./PlansPanel";

function getSubscriptionExpiry(fiche: ApiFicheSummary) {
  const subscription =
    fiche.subscriptions?.[0] ??
    fiche.latestSubscription ??
    fiche.abonnementActif;
  if (!subscription)
    return { dateLabel: "Aucun abonnement actif", remainingLabel: null };

  const endsAt = subscription.endsAt;
  if (endsAt === null)
    return {
      dateLabel:
        subscription.status === "CANCELED"
          ? "Abonnement annulé"
          : subscription.status === "EXPIRED"
            ? "Abonnement expiré"
            : "Sans échéance",
      remainingLabel: null,
    };

  const endDate = new Date(`${endsAt.slice(0, 10)}T00:00:00Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const daysRemaining = Math.ceil(
    (endDate.getTime() - today.getTime()) / 86_400_000,
  );

  return {
    dateLabel: new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(endDate),
    remainingLabel:
      daysRemaining < 0
        ? "Échéance dépassée"
        : daysRemaining === 0
          ? "Expire aujourd’hui"
          : `${daysRemaining} jour${daysRemaining > 1 ? "s" : ""} restant${daysRemaining > 1 ? "s" : ""}`,
  };
}

function SubscriptionExpiry({ fiche }: { fiche: ApiFicheSummary }) {
  const expiry = getSubscriptionExpiry(fiche);
  return (
    <div className="text-sm text-[#6d665d]">
      <span>{expiry.dateLabel}</span>
      {expiry.remainingLabel && (
        <span className="mt-1 block text-xs text-[#8d8a85]">
          {expiry.remainingLabel}
        </span>
      )}
    </div>
  );
}

type Props = {
  items: ApiFicheSummary[];
  onSelectPayment: (fiche: ApiFicheSummary) => void;
  onSelectCard: (fiche: ApiFicheSummary) => void;
};

export function SubscriptionFichesList({
  items,
  onSelectPayment,
  onSelectCard,
}: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead className="bg-[#f7f5f1] text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6d665d]">
            <tr>
              <th className="px-5 py-3.5">Fiche</th>
              <th className="px-4 py-3.5">Formule</th>
              <th className="px-4 py-3.5">Secteur</th>
              <th className="px-4 py-3.5">Téléphone</th>
              <th className="px-4 py-3.5">WhatsApp</th>
              <th className="px-4 py-3.5">Échéance</th>
              <th className="px-5 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(fiche => (
              <tr key={fiche.id} className="transition hover:bg-transparent">
                <td className="px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {fiche.logo ? (
                      <img
                        src={fiche.logo}
                        alt={`Logo de ${fiche.prenom} ${fiche.nom}`}
                        className="h-10 w-10 shrink-0 rounded-xl border border-[#e3dfd8] object-cover"
                      />
                    ) : (
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#08090A] text-xs font-bold tracking-wide text-white">
                        {initials(fiche.prenom, fiche.nom)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="max-w-[200px] truncate text-sm font-semibold text-[#111111]">
                        {fiche.prenom} {fiche.nom}
                      </p>
                      <p className="mt-0.5 max-w-[200px] truncate text-xs text-[#8d8a85]">
                        {fiche.entreprise ||
                          fiche.fonction ||
                          "Fiche professionnelle"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <PlanPill plan={getPlan(fiche)} />
                </td>
                <td className="px-4 py-4 text-sm text-[#6d665d]">
                  {fiche.secteur
                    ? fiche.secteur.charAt(0) +
                      fiche.secteur.slice(1).toLowerCase()
                    : "—"}
                </td>
                <td className="px-4 py-4 text-sm text-[#6d665d]">
                  {fiche.telephone || "—"}
                </td>
                <td className="px-4 py-4 text-sm text-[#6d665d]">
                  {fiche.whatsapp || "—"}
                </td>
                <td className="px-4 py-4 text-sm text-[#6d665d]">
                  <SubscriptionExpiry fiche={fiche} />
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex flex-col items-end gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectPayment(fiche)}
                      className="whitespace-nowrap rounded-lg bg-[#08090A] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#c9142b] focus:outline-none focus:ring-2 focus:ring-[#EF1733] focus:ring-offset-2"
                    >
                      {renewalInfo(fiche).expired ? (
                        "Renouveler"
                      ) : (
                        <>
                          Voir formule <span aria-hidden="true">↗</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectCard(fiche)}
                      disabled={fiche.statut !== "ACTIVE" || !getPlan(fiche)}
                      title={
                        fiche.statut !== "ACTIVE" || !getPlan(fiche)
                          ? "Une fiche publiée avec un abonnement actif est nécessaire."
                          : undefined
                      }
                      className="whitespace-nowrap rounded-lg border border-[#e3dfd8] bg-white px-3.5 py-2 text-xs font-semibold text-[#25221e] transition hover:border-[#08090A] hover:bg-[#f7f5f1] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Demander une carte
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-slate-100 md:hidden">
        {items.map(fiche => (
          <article key={fiche.id} className="p-4">
            <div className="flex items-start gap-3">
              {fiche.logo ? (
                <img
                  src={fiche.logo}
                  alt={`Logo de ${fiche.prenom} ${fiche.nom}`}
                  className="h-12 w-12 shrink-0 rounded-xl border border-[#e3dfd8] object-cover"
                />
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#08090A] text-xs font-bold text-white">
                  {initials(fiche.prenom, fiche.nom)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-[#111111]">
                  {fiche.prenom} {fiche.nom}
                </h3>
                <p className="mt-1 text-xs text-[#6d665d]">
                  {fiche.secteur
                    ? fiche.secteur.charAt(0) +
                      fiche.secteur.slice(1).toLowerCase()
                    : "Secteur non renseigné"}
                </p>
                <div className="mt-2">
                  <PlanPill plan={getPlan(fiche)} />
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#f4f1eb] p-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#8d8a85]">
                  Téléphone
                </p>
                <p className="mt-1 break-words text-sm text-[#4a443c]">
                  {fiche.telephone || "—"}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#8d8a85]">
                  WhatsApp
                </p>
                <p className="mt-1 break-words text-sm text-[#4a443c]">
                  {fiche.whatsapp || "—"}
                </p>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-[#f4f1eb] px-3 py-2">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#8d8a85]">
                Échéance
              </p>
              <SubscriptionExpiry fiche={fiche} />
            </div>
            <button
              type="button"
              onClick={() => onSelectPayment(fiche)}
              className="mt-3 w-full rounded-xl bg-[#08090A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#c9142b]"
            >
              {renewalInfo(fiche).expired ? (
                "Renouveler"
              ) : (
                <>
                  Voir formule <span aria-hidden="true">↗</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => onSelectCard(fiche)}
              disabled={fiche.statut !== "ACTIVE" || !getPlan(fiche)}
              className="mt-2 w-full rounded-xl border border-[#e3dfd8] bg-white px-4 py-3 text-sm font-semibold text-[#25221e] transition hover:border-[#08090A] hover:bg-[#f7f5f1] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Demander une carte
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
