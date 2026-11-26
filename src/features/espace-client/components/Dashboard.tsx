import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { isAuthFailure } from "../../../lib/apiError";
import { clearSession } from "../../../lib/session";
import "../../../styles/dashboard.css";
import { deleteFiche, setFicheDraft } from "../espaceClient.service";
import {
  dashboardFichesKey,
  useDashboardFiches,
} from "../hooks/useDashboardFiches";
import { checks, completion, displayName } from "../lib/dashboard";
import {
  DEFAULT_FICHE_LIST_FILTERS,
  filterFiches,
  pageFiches,
  type FicheListFilters,
} from "../lib/ficheList";
import CreateFicheForm from "../pages/CreateFicheForm";
import { FicheListControls, FichePagination } from "./FicheListControls";
import { DashboardFicheCard } from "./dashboard/DashboardFicheCard";
import { DashboardAlerts, DashboardKpis } from "./dashboard/DashboardKpis";
import { DeleteFicheModal } from "./dashboard/DeleteFicheModal";

interface Props {
  user: { name: string };
  onEdit: (ficheId: number) => void;
}

type Fiche = NonNullable<ReturnType<typeof useDashboardFiches>["data"]>[number];

function Skeleton() {
  return (
    <div className="db" aria-busy="true" aria-label="Chargement">
      <div className="db-sk h" />
      <div className="db-kpis">
        <div className="db-sk k" />
        <div className="db-sk k" />
        <div className="db-sk k" />
      </div>
      <div className="db-sk l" />
      <div className="db-sk l" />
    </div>
  );
}

export default function Dashboard({ user, onEdit }: Props) {
  const queryClient = useQueryClient();

  const {
    data: fiches,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useDashboardFiches();

  const [sel, setSel] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [ficheToDelete, setFicheToDelete] = useState<Fiche | null>(null);
  const [filters, setFilters] = useState(DEFAULT_FICHE_LIST_FILTERS);
  const [page, setPage] = useState(1);

  const filteredFiches = useMemo(
    () => filterFiches(fiches ?? [], filters),
    [fiches, filters],
  );

  const pageData = pageFiches(filteredFiches, page);

  const updateFilters = (next: FicheListFilters) => {
    setFilters(next);
    setPage(1);
  };

  const deleteMutation = useMutation({
    mutationKey: ["deleteFiche"],
    mutationFn: (ficheId: number) => deleteFiche(ficheId),
    onSuccess: async (_result, ficheId) => {
      setFicheToDelete(null);
      setSel(current => {
        const deletedFiche = fiches?.find(f => f.id === ficheId);
        return current === deletedFiche?.slug ? undefined : current;
      });
      await queryClient.invalidateQueries({ queryKey: dashboardFichesKey });
    },
  });

  const draftMutation = useMutation({
    mutationKey: ["setFicheDraft"],
    mutationFn: (ficheId: number) => setFicheDraft(ficheId),
    onSuccess: async () => {
      setFicheToDelete(null);
      await queryClient.invalidateQueries({ queryKey: dashboardFichesKey });
    },
  });

  const handleDelete = (fiche: Fiche) => {
    deleteMutation.reset();
    draftMutation.reset();
    setFicheToDelete(fiche);
  };

  const handleCreated = () => {
    setCreateOpen(false);
    void queryClient.invalidateQueries({ queryKey: dashboardFichesKey });
  };

  const createDialog = createOpen ? (
    <div
      className="db-modal-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          setCreateOpen(false);
        }
      }}
    >
      <section
        className="db-create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="db-create-title"
      >
        <header className="db-create-modal-head">
          <div>
            <p className="db-k">Nouvelle fiche</p>
            <h2 id="db-create-title">Créer une fiche</h2>
          </div>

          <button
            type="button"
            className="db-create-close"
            onClick={() => setCreateOpen(false)}
            aria-label="Fermer la fenêtre de création"
          >
            ×
          </button>
        </header>

        <CreateFicheForm
          onCreated={handleCreated}
          onUnauthorized={() => {
            setCreateOpen(false);
            clearSession();
          }}
        />
      </section>
    </div>
  ) : null;

  if (isPending) return <Skeleton />;

  if (isError) {
    const expired = isAuthFailure(error);

    return (
      <div className="db">
        <div className="db-state" role="alert">
          <h2>
            {expired ? "Session expirée" : "Impossible de charger vos fiches"}
          </h2>

          <p>
            {expired
              ? "Reconnectez-vous pour retrouver votre espace."
              : "Vérifiez votre connexion puis réessayez."}
          </p>

          {expired ? (
            <a className="db-copy" href="/login">
              Se connecter
            </a>
          ) : (
            <button
              className="db-copy"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? "Chargement…" : "Réessayer"}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!fiches.length) {
    return (
      <div className="db">
        <div className="db-state">
          <h2>Aucune fiche pour le moment</h2>
          <p>
            Créez votre première fiche connectée pour commencer à la
            personnaliser.
          </p>

          <button className="db-create-btn" onClick={() => setCreateOpen(true)}>
            + Créer ma fiche
          </button>
        </div>

        {createDialog}
      </div>
    );
  }

  const cur = pageData.items.find(f => f.slug === sel) ?? pageData.items[0];
  const missing = cur ? checks(cur).filter(c => !c.ok) : [];
  const pc = cur ? completion(cur) : 0;

  return (
    <div className="db">
      <header className="db-head">
        <div className="db-head-row">
          <div>
            <p className="db-k">Espace client</p>
            <h1>Bonjour {user.name.split(" ")[0]}</h1>
            <p className="db-sub">Voici l’état de vos fiches connectées.</p>
          </div>

          <button className="db-create-btn" onClick={() => setCreateOpen(true)}>
            + Créer une fiche
          </button>
        </div>
      </header>

      <DashboardAlerts fiches={fiches} />
      <DashboardKpis fiches={fiches} />

      <div className="db-grid">
        <section aria-label="Mes fiches">
          <h2>Mes fiches</h2>

          <FicheListControls filters={filters} onChange={updateFilters} />

          {pageData.items.length === 0 ? (
            <div className="db-state">
              <p>Aucune fiche ne correspond à ces filtres.</p>

              <button
                className="db-copy"
                onClick={() => updateFilters(DEFAULT_FICHE_LIST_FILTERS)}
              >
                Effacer les filtres
              </button>
            </div>
          ) : (
            <ul className="db-list">
              {pageData.items.map(fiche => (
                <DashboardFicheCard
                  key={fiche.id}
                  fiche={fiche}
                  selected={fiche.id === cur?.id}
                  deletePending={deleteMutation.isPending}
                  onSelect={() => setSel(fiche.slug)}
                  onEdit={onEdit}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          )}

          <FichePagination
            currentPage={pageData.currentPage}
            pageCount={pageData.pageCount}
            startIndex={pageData.startIndex}
            endIndex={pageData.endIndex}
            total={filteredFiches.length}
            onPageChange={setPage}
          />
        </section>

        {cur && (
          <aside
            className="db-side"
            aria-label={`Détail de ${displayName(cur)}`}
          >
            <div className="db-card">
              <h2>Compléter « {displayName(cur)} »</h2>

              <p className="db-sub2">
                {pc === 100
                  ? "Votre fiche est complète, bravo."
                  : `${missing.length} élément${missing.length > 1 ? "s" : ""} à ajouter pour convaincre vos clients.`}
              </p>

              <ul className="db-todo">
                {checks(cur).map(check => (
                  <li key={check.key} className={check.ok ? "ok" : ""}>
                    <span aria-hidden="true">{check.ok ? "✓" : ""}</span>
                    {check.label}
                  </li>
                ))}
              </ul>

              {pc < 100 && (
                <button className="db-copy pri" onClick={() => onEdit(cur.id)}>
                  Compléter ma fiche
                </button>
              )}
            </div>
          </aside>
        )}
      </div>

      {createDialog}

      {ficheToDelete && (
        <DeleteFicheModal
          fiche={ficheToDelete}
          isDeleting={deleteMutation.isPending}
          isDrafting={draftMutation.isPending}
          error={
            draftMutation.isError
              ? draftMutation.error
              : deleteMutation.isError
                ? deleteMutation.error
                : null
          }
          onCancel={() => {
            setFicheToDelete(null);
            deleteMutation.reset();
            draftMutation.reset();
          }}
          onSetDraft={() => {
            if (!deleteMutation.isPending && !draftMutation.isPending) {
              draftMutation.mutate(ficheToDelete.id);
            }
          }}
          onConfirmDelete={() => {
            if (!deleteMutation.isPending && !draftMutation.isPending) {
              deleteMutation.mutate(ficheToDelete.id);
            }
          }}
        />
      )}
    </div>
  );
}
