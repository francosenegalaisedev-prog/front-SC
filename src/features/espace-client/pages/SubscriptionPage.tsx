import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ApiFicheSummary } from "../../../types";
import {
  FicheListControls,
  FichePagination,
} from "../components/FicheListControls";
import { StatCard } from "../components/StatCard";
import { CardRequestDialog } from "../components/subscription/CardRequestDialog";
import { PaymentModal } from "../components/subscription/PaymentModal";
import { PlansPanel } from "../components/subscription/PlansPanel";
import { SubscriptionFichesList } from "../components/subscription/SubscriptionFichesList";
import { getDashboardFiche, getKpi } from "../espaceClient.service";
import {
  DEFAULT_FICHE_LIST_FILTERS,
  filterFiches,
  pageFiches,
  type FicheListFilters,
} from "../lib/ficheList";
import { renewalInfo } from "../lib/renewal";

export type SubscriptionKpi = {
  data: {
    nbrFiche: number;
    nbrFicheActive: number;
    nbrPayingFiche: number;
  };
};

const getExpiryFilter = (
  value: string | null,
): FicheListFilters["expiry"] => {
  if (
    value === "expiring" ||
    value === "expiring-7" ||
    value === "expiring-15" ||
    value === "expired" ||
    value === "no-expiry"
  )
    return value;
  return "all";
};

export default function SubscriptionPage() {
  const queryClient = useQueryClient();
  const [paymentFiche, setPaymentFiche] = useState<ApiFicheSummary | null>(
    null,
  );
  // /abonnements?renew=<id> : ouvre directement la fenêtre de renouvellement de cette fiche (liens du tableau de bord et de l'éditeur).
  const [searchParams, setSearchParams] = useSearchParams();
  const renewId = Number(searchParams.get("renew")) || null;
  const renewHandled = useRef(false);
  const clearRenewParam = () =>
    setSearchParams(
      params => {
        params.delete("renew");
        return params;
      },
      { replace: true },
    );
  const closePayment = () => {
    setPaymentFiche(null);
    if (searchParams.has("renew")) clearRenewParam();
  };
  const [cardFiche, setCardFiche] = useState<ApiFicheSummary | null>(null);
  const [showPlans, setShowPlans] = useState(false);
  const [filters, setFilters] = useState<FicheListFilters>(() => ({
    ...DEFAULT_FICHE_LIST_FILTERS,
    expiry: getExpiryFilter(searchParams.get("expiry")),
  }));
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!cardFiche) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCardFiche(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cardFiche]);

  const {
    data: fiches,
    isPending: isFichesPending,
    isError: isFichesError,
    error: fichesError,
    refetch,
    isFetching,
  } = useQuery<ApiFicheSummary[]>({
    queryKey: ["ficheSubscriptionPage"],
    queryFn: ({ signal }) => getDashboardFiche(signal),
  });

  useEffect(() => {
    if (!renewId || renewHandled.current || !fiches) return;
    renewHandled.current = true;
    const target = fiches.find(f => f.id === renewId);
    if (target && renewalInfo(target).expired) setPaymentFiche(target);
    else clearRenewParam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renewId, fiches]);

  const ficheCount = fiches?.length ?? 0;
  const filteredFiches = useMemo(
    () => filterFiches(fiches ?? [], filters),
    [fiches, filters],
  );
  const pageData = pageFiches(filteredFiches, page);
  const updateFilters = (next: FicheListFilters) => {
    setFilters(next);
    setPage(1);
  };

  const { data: kpi } = useQuery<SubscriptionKpi>({
    queryKey: ["kpiSubscription"],
    queryFn: getKpi,
  });

  return (
    <div className="min-h-full bg-transparent px-4 py-6 text-[#111111] sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#EF1733]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#EF1733]" /> Espace
              client
            </div>
            <h1 className="font-[Cormorant_Garamond,Georgia,serif] text-4xl font-semibold tracking-tight text-[#08090A] sm:text-5xl">
              Abonnements & formules
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d665d] sm:text-base">
              Retrouvez vos fiches et découvrez la formule qui correspond à vos
              besoins.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPlans(value => !value)}
            aria-expanded={showPlans}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-[#e3dfd8] bg-white px-4 py-3 text-sm font-semibold text-[#25221e] shadow-[0_6px_20px_rgba(0,0,0,0.05)] transition hover:border-[#08090A] hover:bg-[#f4f1eb] md:self-auto"
          >
            <span aria-hidden="true">✦</span>
            {showPlans ? "Masquer nos formules" : "Voir nos formules"}
            <span
              className={`transition-transform ${showPlans ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              ⌄
            </span>
          </button>
        </header>

        <section
          aria-label="Statistiques"
          className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <StatCard
            label="Toutes mes fiches"
            caption="Fiches enregistrées"
            icon="▤"
            stat={kpi?.data.nbrFiche as number}
          />
          <StatCard
            label="Fiches actives"
            caption="Prêtes à être consultées"
            icon="↗"
            stat={kpi?.data.nbrFicheActive as number}
          />
          <StatCard
            label="Abonnements payants"
            caption="Formules Pro et Signature"
            icon="✧"
            stat={kpi?.data.nbrPayingFiche as number}
          />
        </section>

        <div
          className={`grid items-start gap-6 ${showPlans ? "xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]" : "grid-cols-1"}`}
        >
          <section
            className="min-w-0 overflow-hidden rounded-2xl border border-[#e3dfd8] bg-white shadow-[0_6px_20px_rgba(0,0,0,0.05)] shadow-black/[0.05]"
            aria-labelledby="subscription-fiches-title"
          >
            <div className="flex flex-col justify-between gap-3 border-b border-[#eee9e1] px-5 py-5 sm:flex-row sm:items-center sm:px-6">
              <div>
                <h2
                  id="subscription-fiches-title"
                  className="text-lg font-semibold tracking-tight text-[#08090A]"
                >
                  Mes fiches
                </h2>
                <p className="mt-1 text-sm text-[#6d665d]">
                  {ficheCount} fiche{ficheCount > 1 ? "s" : ""} au total
                </p>
              </div>
            </div>
            {isFichesPending ? (
              <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-[#6d665d]">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#e3dfd8] border-t-rose-600" />
                Chargement des fiches…
              </div>
            ) : isFichesError ? (
              <div className="px-6 py-12 text-center" role="alert">
                <p className="font-semibold text-[#111111]">
                  Impossible de charger vos fiches
                </p>
                <p className="mt-2 text-sm text-[#6d665d]">
                  {isAxiosError(fichesError) &&
                  fichesError.response?.status === 401
                    ? "Votre session a expiré. Reconnectez-vous pour continuer."
                    : "Vérifiez votre connexion puis réessayez."}
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="mt-4 rounded-xl bg-[#08090A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isFetching ? "Chargement…" : "Réessayer"}
                </button>
              </div>
            ) : !fiches?.length ? (
              <div className="px-6 py-14 text-center">
                <div
                  className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eee9e1] text-2xl text-[#6d665d]"
                  aria-hidden="true"
                >
                  ▤
                </div>
                <h3 className="mt-4 font-semibold text-[#111111]">
                  Aucune fiche pour le moment
                </h3>
                <p className="mt-1 text-sm text-[#6d665d]">
                  Vos fiches apparaîtront ici dès qu'elles seront disponibles.
                </p>
              </div>
            ) : (
              <>
                <FicheListControls filters={filters} onChange={updateFilters} />
                {pageData.items.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <p className="text-sm text-[#6d665d]">
                      Aucune fiche ne correspond à ces filtres.
                    </p>
                    <button
                      type="button"
                      onClick={() => updateFilters(DEFAULT_FICHE_LIST_FILTERS)}
                      className="mt-3 rounded-lg border border-[#e3dfd8] bg-white px-3 py-2 text-sm font-semibold text-[#25221e]"
                    >
                      Effacer les filtres
                    </button>
                  </div>
                ) : (
                  <SubscriptionFichesList
                    items={pageData.items}
                    onSelectPayment={setPaymentFiche}
                    onSelectCard={setCardFiche}
                  />
                )}
                <FichePagination
                  currentPage={pageData.currentPage}
                  pageCount={pageData.pageCount}
                  startIndex={pageData.startIndex}
                  endIndex={pageData.endIndex}
                  total={filteredFiches.length}
                  onPageChange={setPage}
                />
              </>
            )}
          </section>
          {showPlans && <PlansPanel onClose={() => setShowPlans(false)} />}
        </div>

        <p className="mt-6 text-xs leading-5 text-[#8d8a85]">
          Les tarifs et remises affichés proviennent des paramètres actifs. Le
          montant final est confirmé par le serveur avant validation.
        </p>
      </div>

      {paymentFiche && (
        <PaymentModal
          fiche={paymentFiche}
          onClose={closePayment}
          onSuccess={() => {
            void queryClient.invalidateQueries({
              queryKey: ["ficheSubscriptionPage"],
            });
            void queryClient.invalidateQueries({
              queryKey: ["kpiSubscription"],
            });
          }}
        />
      )}

      {cardFiche && (
        <CardRequestDialog
          fiche={cardFiche}
          onClose={() => setCardFiche(null)}
        />
      )}
    </div>
  );
}
