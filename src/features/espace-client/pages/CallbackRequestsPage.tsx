import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../../lib/api";
import { errMsg } from "../../../lib/apiError";
import { useDashboardFiches } from "../hooks/useDashboardFiches";
import "./FicheStats.css";

const PAGE_SIZE = 10;

export type RappelStatus = "NOUVELLE" | "TRAITEE";

type CallbackRequest = {
  id: number;
  nom: string;
  telephone: string;
  email: string | null;
  societe: string | null;
  statut: RappelStatus;
  traiteeAt: string | null;
  createdAt: string;
  fiche: {
    id: number;
    slug: string;
    prenom: string;
    nom: string;
  };
};

type CallbackRequestsResponse = {
  demandes: CallbackRequest[];
  nouvellesCount?: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function whatsappHref(telephone: string) {
  const digits = telephone.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

function ficheLabel(fiche: { slug: string; prenom?: string; nom?: string }) {
  return [fiche.prenom, fiche.nom].filter(Boolean).join(" ") || fiche.slug;
}

export default function CallbackRequestsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [ficheId, setFicheId] = useState("");
  const [statut, setStatut] = useState<"" | RappelStatus>("");
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fichesQuery = useDashboardFiches();
  const trimmedSearch = search.trim();

  const requestsQuery = useQuery({
    queryKey: [
      "all-callback-requests",
      page,
      PAGE_SIZE,
      ficheId,
      statut,
      trimmedSearch,
    ],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (ficheId) params.set("ficheId", ficheId);
      if (statut) params.set("statut", statut);
      if (trimmedSearch) params.set("search", trimmedSearch);

      const response = await api.get<{ rappels: CallbackRequestsResponse }>(
        `fiches/rappels?${params.toString()}`,
        { signal },
      );
      return response.data.rappels;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (input: { id: number; statut: RappelStatus }) => {
      await api.patch(`fiches/rappels/${input.id}`, { statut: input.statut });
    },
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({
        queryKey: ["all-callback-requests"],
      });
      void queryClient.invalidateQueries({ queryKey: ["fiche-rappels"] });
    },
    onError: err => {
      setActionError(
        errMsg(err) || "Impossible de mettre à jour le statut du prospect.",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`fiches/rappels/${id}`);
    },
    onSuccess: () => {
      setConfirmDeleteId(null);
      setActionError(null);
      void queryClient.invalidateQueries({
        queryKey: ["all-callback-requests"],
      });
      void queryClient.invalidateQueries({ queryKey: ["fiche-rappels"] });
    },
    onError: err => {
      setActionError(errMsg(err) || "Impossible de supprimer ce prospect.");
    },
  });

  const data = requestsQuery.data;
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 0;
  const hasFilters = Boolean(ficheId || statut || trimmedSearch);
  const isMutating = statusMutation.isPending || deleteMutation.isPending;

  const resetFilters = () => {
    setFicheId("");
    setStatut("");
    setSearch("");
    setPage(1);
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    setActionError(null);
    try {
      const params = new URLSearchParams();
      if (ficheId) params.set("ficheId", ficheId);
      if (statut) params.set("statut", statut);
      if (trimmedSearch) params.set("search", trimmedSearch);
      const query = params.toString();
      const response = await api.get<Blob>(
        `fiches/rappels/export${query ? `?${query}` : ""}`,
        { responseType: "blob" },
      );
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([String(response.data)], {
              type: "text/csv;charset=utf-8",
            });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `prospects-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(errMsg(err) || "Impossible d'exporter vos prospects.");
    } finally {
      setExporting(false);
    }
  };

  const renderActions = (demande: CallbackRequest) => {
    const nextStatus: RappelStatus =
      demande.statut === "TRAITEE" ? "NOUVELLE" : "TRAITEE";
    const isConfirming = confirmDeleteId === demande.id;

    return (
      <div className="callback-actions">
        <button
          type="button"
          className="callback-action-btn is-primary"
          disabled={isMutating}
          onClick={() =>
            statusMutation.mutate({ id: demande.id, statut: nextStatus })
          }
        >
          {demande.statut === "TRAITEE" ? "Réouvrir" : "Marquer traité"}
        </button>
        {isConfirming ? (
          <>
            <button
              type="button"
              className="callback-action-btn is-danger"
              disabled={isMutating}
              onClick={() => deleteMutation.mutate(demande.id)}
            >
              Confirmer
            </button>
            <button
              type="button"
              className="callback-action-btn is-ghost"
              disabled={isMutating}
              onClick={() => setConfirmDeleteId(null)}
            >
              Annuler
            </button>
          </>
        ) : (
          <button
            type="button"
            className="callback-action-btn is-danger-outline"
            disabled={isMutating}
            onClick={() => setConfirmDeleteId(demande.id)}
          >
            Supprimer
          </button>
        )}
      </div>
    );
  };

  return (
    <section className="callback-requests-page">
      <header className="callback-requests-header">
        <div>
          <p className="callback-requests-eyebrow">Espace client</p>
          <h1>Prospects</h1>
          <p>
            Retrouvez les coordonnées laissées depuis le bouton « Échangez
            contact » de toutes vos fiches.
          </p>
        </div>
        <div className="callback-header-actions">
          <button
            type="button"
            className="callback-export-btn"
            onClick={() => void handleExport()}
            disabled={exporting || !(pagination?.total ?? 0)}
          >
            {exporting ? "Export…" : "↓ Exporter CSV"}
          </button>
          <button
            type="button"
            className="fiche-passage-refresh"
            onClick={() => void requestsQuery.refetch()}
            disabled={requestsQuery.isFetching}
            aria-label="Actualiser les prospects"
            title="Actualiser"
          >
            {requestsQuery.isFetching ? "…" : "↻"}
          </button>
        </div>
      </header>

      <div
        className="callback-requests-filters"
        role="search"
        aria-label="Filtrer les prospects"
      >
        <label>
          <span>Recherche</span>
          <input
            type="search"
            value={search}
            placeholder="Nom, téléphone, e-mail ou société…"
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          <span>Statut</span>
          <select
            value={statut}
            onChange={e => {
              setStatut(e.target.value as "" | RappelStatus);
              setPage(1);
            }}
          >
            <option value="">Tous les statuts</option>
            <option value="NOUVELLE">Nouveaux</option>
            <option value="TRAITEE">Traités</option>
          </select>
        </label>
        <label>
          <span>Fiche</span>
          <select
            value={ficheId}
            onChange={e => {
              setFicheId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Toutes les fiches</option>
            {(fichesQuery.data ?? []).map(fiche => (
              <option key={fiche.id} value={String(fiche.id)}>
                {ficheLabel(fiche)}
              </option>
            ))}
          </select>
        </label>
        {hasFilters && (
          <button
            type="button"
            className="callback-filter-reset"
            onClick={resetFilters}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {actionError && (
        <div className="callback-action-error" role="alert">
          {actionError}
        </div>
      )}

      {requestsQuery.isPending ? (
        <div className="callback-requests-state" role="status">
          Chargement des prospects…
        </div>
      ) : requestsQuery.isError ? (
        <div className="callback-requests-state" role="alert">
          <p>Impossible de charger les prospects.</p>
          <button
            type="button"
            onClick={() => void requestsQuery.refetch()}
            disabled={requestsQuery.isFetching}
          >
            {requestsQuery.isFetching ? "Chargement…" : "Réessayer"}
          </button>
        </div>
      ) : (
        <>
          <div className="callback-requests-summary">
            <div className="callback-requests-summary-metrics">
              <div>
                <span>
                  {hasFilters ? "Résultats filtrés" : "Total des prospects"}
                </span>
                <strong>{(pagination?.total ?? 0).toLocaleString("fr-FR")}</strong>
              </div>
              <div>
                <span>Nouveaux prospects</span>
                <strong className="is-accent">
                  {(data?.nouvellesCount ?? 0).toLocaleString("fr-FR")}
                </strong>
              </div>
            </div>
            <p>
              {pagination?.total
                ? `Page ${pagination.page} sur ${pagination.totalPages}`
                : "Aucun prospect enregistré"}
            </p>
          </div>

          {data?.demandes.length ? (
            <>
              <div className="fiche-passage-table-wrap callback-requests-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Contact</th>
                      <th>Téléphone</th>
                      <th>E-mail</th>
                      <th>Fiche concernée</th>
                      <th>Statut</th>
                      <th>Date de réception</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.demandes.map(demande => {
                      const waUrl = whatsappHref(demande.telephone);
                      const isTreated = demande.statut === "TRAITEE";
                      return (
                        <tr key={demande.id}>
                          <td>
                            <div className="callback-contact-cell">
                              <strong>{demande.nom}</strong>
                              {demande.societe && (
                                <span className="callback-company">
                                  {demande.societe}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="callback-phone-group">
                              <a
                                className="callback-phone"
                                href={`tel:${demande.telephone}`}
                              >
                                {demande.telephone}
                              </a>
                              {waUrl && (
                                <a
                                  className="callback-wa-link"
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Contacter ${demande.nom} sur WhatsApp`}
                                >
                                  WhatsApp
                                </a>
                              )}
                            </div>
                          </td>
                          <td>
                            {demande.email ? (
                              <a
                                className="callback-email-link"
                                href={`mailto:${demande.email}`}
                              >
                                {demande.email}
                              </a>
                            ) : (
                              <span className="callback-muted">—</span>
                            )}
                          </td>
                          <td>
                            <a
                              className="callback-fiche-link"
                              href={`/f/${encodeURIComponent(demande.fiche.slug)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {ficheLabel(demande.fiche)}
                            </a>
                          </td>
                          <td>
                            <span
                              className={`callback-status-pill ${isTreated ? "is-done" : "is-new"}`}
                            >
                              {isTreated ? "Traité" : "Nouveau"}
                            </span>
                          </td>
                          <td>{formatDate(demande.createdAt)}</td>
                          <td>{renderActions(demande)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="callback-requests-cards">
                {data.demandes.map(demande => {
                  const waUrl = whatsappHref(demande.telephone);
                  const isTreated = demande.statut === "TRAITEE";
                  return (
                    <article key={demande.id} className="callback-request-card">
                      <div className="callback-request-card-top">
                        <div className="callback-contact-cell">
                          <strong>{demande.nom}</strong>
                          {demande.societe && (
                            <span className="callback-company">
                              {demande.societe}
                            </span>
                          )}
                        </div>
                        <span
                          className={`callback-status-pill ${isTreated ? "is-done" : "is-new"}`}
                        >
                          {isTreated ? "Traité" : "Nouveau"}
                        </span>
                      </div>
                      <span className="callback-request-card-date">
                        {formatDate(demande.createdAt)}
                      </span>
                      {demande.email && (
                        <a
                          className="callback-email-link"
                          href={`mailto:${demande.email}`}
                        >
                          {demande.email}
                        </a>
                      )}
                      <div className="callback-request-card-meta">
                        <div className="callback-phone-group">
                          <a
                            className="callback-phone"
                            href={`tel:${demande.telephone}`}
                          >
                            {demande.telephone}
                          </a>
                          {waUrl && (
                            <a
                              className="callback-wa-link"
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                        <a
                          className="callback-fiche-link"
                          href={`/f/${encodeURIComponent(demande.fiche.slug)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {ficheLabel(demande.fiche)}
                        </a>
                      </div>
                      {renderActions(demande)}
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="callback-requests-empty">
              <h2>
                {hasFilters
                  ? "Aucun prospect ne correspond à ces filtres"
                  : "Aucun prospect pour le moment"}
              </h2>
              <p>
                {hasFilters
                  ? "Essayez d'élargir vos critères de recherche."
                  : "Les contacts envoyés depuis vos fiches publiques apparaîtront ici."}
              </p>
            </div>
          )}

          {totalPages > 1 && (
            <nav
              className="callback-requests-pagination"
              aria-label="Pagination des prospects"
            >
              <button
                type="button"
                onClick={() => setPage(current => Math.max(1, current - 1))}
                disabled={page <= 1 || requestsQuery.isFetching}
              >
                ← Précédent
              </button>
              <span>
                Page {pagination?.page ?? page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage(current => Math.min(totalPages, current + 1))
                }
                disabled={page >= totalPages || requestsQuery.isFetching}
              >
                Suivant →
              </button>
            </nav>
          )}
          <p className="callback-requests-footnote">
            Affichage de {data?.demandes.length ?? 0} prospect(s) par page, des
            plus récents aux plus anciens.
          </p>
        </>
      )}
    </section>
  );
}
