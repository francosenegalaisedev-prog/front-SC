import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { IconSprite } from "../../../components/Icons";
import CardStudio from "../../../components/studio/CardStudio";
import useReveal from "../../../hooks/useReveal";
import type { Tier } from "../../../lib/print";
import "../../../styles/contact.css";
import "../../../styles/dashboard.css";
import "../../../styles/studio.css";
import { getPlan } from "../components/subscription/PlansPanel";
import {
  getCardRequest,
  getDashboardFiche,
  type CardRequestState,
} from "../espaceClient.service";

const STATUS_LABELS: Record<string, string> = {
  a_imprimer: "En attente de production",
  imprimee: "Imprimée",
  encodee: "Encodée",
  testee: "Testée",
  livree: "Livrée",
  annulee: "Annulée",
};
const TERMINAL_STATUSES = new Set(["livree", "annulee"]);

const PLAN_LABELS: Record<Tier, string> = {
  essentielle: "Essentielle",
  pro: "Pro",
  signature: "Signature",
};

export default function ClientCartesPage() {
  useReveal();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    document.title = "Cartes — Support Connecté";
  }, []);

  const fichesQuery = useQuery({
    queryKey: ["client-cartes-fiches"],
    queryFn: ({ signal }) => getDashboardFiche(signal),
  });

  // Seules les fiches actives disposant d'une formule active sont éligibles à une demande de carte.
  const activeFiches = useMemo(() => {
    const all = fichesQuery.data ?? [];
    return all
      .map(fiche => {
        const plan = getPlan(fiche)?.toLowerCase() as Tier | undefined;
        return { fiche, plan };
      })
      .filter(
        (item): item is { fiche: (typeof all)[number]; plan: Tier } =>
          item.fiche.statut === "ACTIVE" &&
          (item.plan === "essentielle" ||
            item.plan === "pro" ||
            item.plan === "signature"),
      );
  }, [fichesQuery.data]);

  const requestedFicheId = Number(searchParams.get("ficheId"));
  const selected =
    activeFiches.find(item => item.fiche.id === requestedFicheId) ??
    activeFiches[0] ??
    null;

  const selectFiche = (ficheId: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("ficheId", String(ficheId));
    setSearchParams(next, { replace: true });
  };

  const cardQuery = useQuery({
    queryKey: ["card-request", selected?.fiche.id],
    enabled: Boolean(selected),
    queryFn: () => getCardRequest(selected!.fiche.id),
    refetchInterval: query => {
      const status = query.state.data?.carte?.statut;
      return status && !TERMINAL_STATUSES.has(status) ? 30_000 : false;
    },
  });

  const currentCard = cardQuery.data?.carte ?? null;
  const orderInProgress =
    currentCard && !TERMINAL_STATUSES.has(currentCard.statut)
      ? currentCard
      : null;

  return (
    <section className="client-cartes-page">
      <IconSprite />

      <div className="db" style={{ paddingBottom: 0 }}>
        <header className="db-head">
          <p className="db-k">Espace client</p>
          <h1>Mes cartes NFC</h1>
          <p className="db-sub">
            Sélectionnez une fiche active pour composer et commander votre carte
            physique selon sa formule.
          </p>
        </header>

        {fichesQuery.isPending ? (
          <p className="text-sm text-neutral-600" role="status">
            Chargement de vos fiches actives…
          </p>
        ) : fichesQuery.isError ? (
          <div className="db-card" role="alert">
            <p className="text-sm text-red-700">
              Impossible de charger vos fiches.
            </p>
            <button
              type="button"
              onClick={() => void fichesQuery.refetch()}
              className="mt-2 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Réessayer
            </button>
          </div>
        ) : activeFiches.length === 0 ? (
          <div className="db-card">
            <h2 className="text-base font-semibold text-neutral-900">
              Aucune fiche active disponible
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Pour commander une carte NFC, vous devez disposer d’au moins une
              fiche publiée avec un abonnement actif.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/espace-client"
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Voir mes fiches
              </Link>
              <Link
                to="/espace-client/abonnements"
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800"
              >
                Gérer mes abonnements
              </Link>
            </div>
          </div>
        ) : (
          <div className="db-card mb-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Fiches actives ({activeFiches.length})
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {activeFiches.map(({ fiche, plan }) => {
                const isSelected = selected?.fiche.id === fiche.id;
                const fullName =
                  `${fiche.prenom ?? ""} ${fiche.nom ?? ""}`.trim() ||
                  fiche.slug;
                return (
                  <button
                    key={fiche.id}
                    type="button"
                    onClick={() => selectFiche(fiche.id)}
                    aria-pressed={isSelected}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? "border-[#EF1733] bg-[#fff5f6] ring-2 ring-[#EF1733]/20"
                        : "border-neutral-200 bg-white hover:border-neutral-400"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900">
                        {fullName}
                      </p>
                      <p className="truncate text-xs text-neutral-500">
                        /{fiche.slug}
                        {fiche.entreprise ? ` · ${fiche.entreprise}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-neutral-900 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                      {PLAN_LABELS[plan]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selected &&
        (cardQuery.isPending ? (
          <div className="db">
            <p className="text-sm text-neutral-600" role="status">
              Vérification des commandes pour cette fiche…
            </p>
          </div>
        ) : orderInProgress ? (
          <div className="db">
            <div className="db-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="db-k">Commande #{orderInProgress.id}</p>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    {STATUS_LABELS[orderInProgress.statut] ??
                      "Demande en cours"}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    Une demande de carte est déjà en cours pour cette fiche.
                    Paiement à la livraison
                    {orderInProgress.montantFcfa != null
                      ? ` (${orderInProgress.montantFcfa.toLocaleString("fr-FR")} FCFA)`
                      : ""}
                    .
                  </p>
                  {orderInProgress.adresseLivraison && (
                    <p className="mt-2 text-xs text-neutral-500">
                      Livraison : {orderInProgress.adresseLivraison}
                      {orderInProgress.telephoneLivraison
                        ? ` · ${orderInProgress.telephoneLivraison}`
                        : ""}
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                  {PLAN_LABELS[orderInProgress.tier]}
                </span>
              </div>

              {(orderInProgress.rectoUrl || orderInProgress.versoUrl) && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {orderInProgress.rectoUrl && (
                    <figure>
                      <img
                        src={orderInProgress.rectoUrl}
                        alt="Recto de votre carte commandée"
                        className="aspect-[1.586] w-full rounded-xl object-cover shadow"
                      />
                      <figcaption className="mt-1.5 text-xs text-neutral-500">
                        Recto
                      </figcaption>
                    </figure>
                  )}
                  {orderInProgress.versoUrl && (
                    <figure>
                      <img
                        src={orderInProgress.versoUrl}
                        alt="Verso de votre carte commandée"
                        className="aspect-[1.586] w-full rounded-xl object-cover shadow"
                      />
                      <figcaption className="mt-1.5 text-xs text-neutral-500">
                        Verso
                      </figcaption>
                    </figure>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <CardStudio
            designer
            clientFiche={{
              id: selected.fiche.id,
              slug: selected.fiche.slug,
              tier: selected.plan,
              name: `${selected.fiche.prenom ?? ""} ${selected.fiche.nom ?? ""}`.trim(),
              role: selected.fiche.fonction ?? "",
              company: selected.fiche.entreprise ?? "",
              phone: selected.fiche.telephone ?? selected.fiche.whatsapp ?? "",
              email: selected.fiche.email ?? "",
              onSubmitted: carte => {
                queryClient.setQueryData<CardRequestState>(
                  ["card-request", selected.fiche.id],
                  prev => ({ modele: prev?.modele ?? null, carte }),
                );
              },
            }}
          />
        ))}
    </section>
  );
}
