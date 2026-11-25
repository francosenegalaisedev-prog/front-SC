import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { IconSprite } from "../../../components/Icons";
import CardStudio from "../../../components/studio/CardStudio";
import useReveal from "../../../hooks/useReveal";
import { api } from "../../../lib/api";
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

const STATUS_META: Record<
  "envoyee" | "traitee" | "livree",
  { label: string; description: string; badgeClass: string; dotClass: string; step: number }
> = {
  envoyee: {
    label: "Envoyée",
    description: "Votre demande a bien été envoyée et est en attente de traitement par notre équipe.",
    badgeClass: "bg-sky-100 text-sky-900 border border-sky-200",
    dotClass: "bg-sky-600",
    step: 1,
  },
  traitee: {
    label: "Traitée",
    description: "Votre carte est en cours de finalisation / prête pour la livraison.",
    badgeClass: "bg-amber-100 text-amber-900 border border-amber-200",
    dotClass: "bg-amber-500",
    step: 2,
  },
  livree: {
    label: "Livrée",
    description: "Votre carte a été livrée.",
    badgeClass: "bg-emerald-100 text-emerald-900 border border-emerald-200",
    dotClass: "bg-emerald-600",
    step: 3,
  },
};
const TERMINAL_STATUSES = new Set(["livree"]);

const PLAN_LABELS: Record<Tier, string> = {
  essentielle: "Essentielle",
  pro: "Pro",
  signature: "Signature",
};

export default function ClientCartesPage() {
  useReveal();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"" | Tier>("");

  useEffect(() => {
    document.title = "Cartes — Support Connecté";
  }, []);

  const fichesQuery = useQuery({
    queryKey: ["client-cartes-fiches"],
    queryFn: ({ signal }) => getDashboardFiche(signal),
  });

  const settingsQuery = useQuery({
    queryKey: ["public", "app-settings"],
    queryFn: async () =>
      (await api.get<{ settings: { cardPriceFcfa?: number } }>("/public/settings"))
        .data.settings,
    staleTime: 60_000,
  });
  const cardPriceFcfa = settingsQuery.data?.cardPriceFcfa ?? 15_000;

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

  const filteredFiches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeFiches.filter(({ fiche, plan }) => {
      if (planFilter && plan !== planFilter) return false;
      if (!q) return true;
      const hay = [
        fiche.prenom,
        fiche.nom,
        fiche.slug,
        fiche.entreprise,
        fiche.fonction,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [activeFiches, planFilter, search]);

  const requestedFicheId = Number(searchParams.get("ficheId"));
  const selected =
    filteredFiches.find(item => item.fiche.id === requestedFicheId) ??
    filteredFiches[0] ??
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
            Sélectionnez une fiche active pour personnaliser librement et
            commander votre carte physique.
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
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Fiche sélectionnée ({filteredFiches.length} /{" "}
                {activeFiches.length} fiche{activeFiches.length > 1 ? "s" : ""}{" "}
                active{activeFiches.length > 1 ? "s" : ""})
              </p>
              {selected && (
                <span className="rounded-full bg-neutral-900 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  Formule {PLAN_LABELS[selected.plan]}
                </span>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_minmax(0,1.3fr)]">
              <label className="grid gap-1 text-xs font-medium text-neutral-600">
                Rechercher une fiche
                <input
                  type="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Nom, entreprise ou slug…"
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                />
              </label>

              <label className="grid gap-1 text-xs font-medium text-neutral-600">
                Filtrer par formule
                <select
                  value={planFilter}
                  onChange={e => setPlanFilter(e.target.value as "" | Tier)}
                  aria-label="Filtrer par formule"
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                >
                  <option value="">Toutes les formules</option>
                  <option value="essentielle">Essentielle</option>
                  <option value="pro">Pro</option>
                  <option value="signature">Signature</option>
                </select>
              </label>

              <label className="grid gap-1 text-xs font-medium text-neutral-600">
                Choisir la fiche active
                <select
                  aria-label="Choisir la fiche active"
                  value={selected ? String(selected.fiche.id) : ""}
                  disabled={filteredFiches.length === 0}
                  onChange={e => {
                    const id = Number(e.target.value);
                    if (id) selectFiche(id);
                  }}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 focus:border-[#EF1733] focus:outline-none disabled:bg-neutral-100"
                >
                  {filteredFiches.length === 0 ? (
                    <option value="">Aucune fiche ne correspond</option>
                  ) : (
                    filteredFiches.map(({ fiche, plan }) => {
                      const fullName =
                        `${fiche.prenom ?? ""} ${fiche.nom ?? ""}`.trim() ||
                        fiche.slug;
                      return (
                        <option key={fiche.id} value={fiche.id}>
                          {fullName}
                          {fiche.entreprise ? ` · ${fiche.entreprise}` : ""} (
                          /{fiche.slug}) — {PLAN_LABELS[plan]}
                        </option>
                      );
                    })
                  )}
                </select>
              </label>
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
              {(() => {
                const meta = STATUS_META[orderInProgress.statut] ?? STATUS_META.envoyee;
                const steps = [
                  { key: "envoyee", label: "Envoyée", num: 1 },
                  { key: "traitee", label: "Traitée", num: 2 },
                  { key: "livree", label: "Livrée", num: 3 },
                ] as const;
                return (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="db-k">Commande #{orderInProgress.id}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2.5">
                          <h2 className="text-lg font-semibold text-neutral-900">
                            Statut de votre demande
                          </h2>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}
                          >
                            <span className={`h-2 w-2 rounded-full ${meta.dotClass}`} aria-hidden="true" />
                            {meta.label}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-neutral-600">
                          {meta.description} Paiement à la livraison
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
                      <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white">
                        {PLAN_LABELS[orderInProgress.tier]}
                      </span>
                    </div>

                    <ol
                      className="mt-4 grid grid-cols-3 gap-2"
                      aria-label="Progression de votre demande de carte"
                    >
                      {steps.map(step => {
                        const reached = meta.step >= step.num;
                        const active = meta.step === step.num;
                        return (
                          <li
                            key={step.key}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${
                              active
                                ? meta.badgeClass
                                : reached
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                  : "border-neutral-200 bg-neutral-50 text-neutral-400"
                            }`}
                          >
                            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/80 text-[11px] font-bold">
                              {step.num}
                            </span>
                            <span>{step.label}</span>
                          </li>
                        );
                      })}
                    </ol>
                  </>
                );
              })()}

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
          <>
            {currentCard?.statut === "livree" && (
              <div className="db" style={{ paddingBottom: 0 }}>
                <div className="db-card mb-6 flex flex-wrap items-center justify-between gap-3 border border-emerald-200 bg-emerald-50/60">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_META.livree.badgeClass}`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${STATUS_META.livree.dotClass}`}
                        aria-hidden="true"
                      />
                      {STATUS_META.livree.label}
                    </span>
                    <span className="text-sm text-neutral-700">
                      Dernière commande (#{currentCard.id}) livrée. Vous pouvez
                      commander une nouvelle carte ci-dessous si besoin.
                    </span>
                  </div>
                </div>
              </div>
            )}
            <CardStudio
            designer
            cardPriceFcfa={cardPriceFcfa}
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
                  { carte },
                );
              },
            }}
          />
          </>
        ))}
    </section>
  );
}
