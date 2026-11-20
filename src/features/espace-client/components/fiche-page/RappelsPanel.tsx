import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../../../lib/api";
import { errMsg } from "../../../../lib/apiError";

type RappelStatus = "NOUVELLE" | "TRAITEE";

type RappelRequest = {
  id: number;
  nom: string;
  telephone: string;
  statut: RappelStatus;
  traiteeAt: string | null;
  createdAt: string;
};

type RappelsResponse = {
  ficheId: number;
  total: number;
  nouvellesCount?: number;
  demandes: RappelRequest[];
};

function whatsappHref(telephone: string) {
  const digits = telephone.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

export function RappelsPanel({ ficheId }: { ficheId: number }) {
  const queryClient = useQueryClient();
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const rappelsQuery = useQuery({
    queryKey: ["fiche-rappels", ficheId],
    enabled: Number.isInteger(ficheId) && ficheId > 0,
    queryFn: async ({ signal }) => {
      const response = await api.get<{ rappels: RappelsResponse }>(
        `fiches/${ficheId}/rappels`,
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
        queryKey: ["fiche-rappels", ficheId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["all-callback-requests"],
      });
    },
    onError: err => {
      setActionError(
        errMsg(err) || "Impossible de mettre à jour le statut de la demande.",
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
        queryKey: ["fiche-rappels", ficheId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["all-callback-requests"],
      });
    },
    onError: err => {
      setActionError(errMsg(err) || "Impossible de supprimer cette demande.");
    },
  });

  const isMutating = statusMutation.isPending || deleteMutation.isPending;

  return (
    <section
      className="fiche-passage-panel fiche-rappels-panel"
      aria-labelledby="fiche-rappels-title"
    >
      <div className="fiche-passage-heading">
        <div>
          <h2 id="fiche-rappels-title">Demandes de rappel</h2>
          <p>Les coordonnées laissées depuis le bloc « Être rappelé ».</p>
        </div>
        <button
          type="button"
          className="fiche-passage-refresh"
          onClick={() => void rappelsQuery.refetch()}
          disabled={rappelsQuery.isFetching}
          aria-label="Actualiser les demandes"
          title="Actualiser"
        >
          {rappelsQuery.isFetching ? "…" : "↻"}
        </button>
      </div>

      {actionError && (
        <div className="callback-action-error" role="alert">
          {actionError}
        </div>
      )}

      {rappelsQuery.isPending ? (
        <p className="fiche-passage-state" role="status">
          Chargement des demandes…
        </p>
      ) : rappelsQuery.isError ? (
        <div className="fiche-passage-state" role="alert">
          <p>Impossible de charger les demandes de rappel.</p>
          <button type="button" onClick={() => void rappelsQuery.refetch()}>
            Réessayer
          </button>
        </div>
      ) : (
        <>
          <div className="fiche-passage-cards fiche-rappel-summary">
            <div className="fiche-passage-card">
              <span>Total des demandes</span>
              <strong>
                {(rappelsQuery.data?.total ?? 0).toLocaleString("fr-FR")}
              </strong>
            </div>
            <div className="fiche-passage-card">
              <span>Nouvelles à rappeler</span>
              <strong>
                {(rappelsQuery.data?.nouvellesCount ?? 0).toLocaleString(
                  "fr-FR",
                )}
              </strong>
            </div>
          </div>
          {rappelsQuery.data?.demandes.length ? (
            <div className="fiche-passage-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Téléphone</th>
                    <th>Statut</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rappelsQuery.data.demandes.map(demande => {
                    const waUrl = whatsappHref(demande.telephone);
                    const isTreated = demande.statut === "TRAITEE";
                    const nextStatus: RappelStatus = isTreated
                      ? "NOUVELLE"
                      : "TRAITEE";
                    const isConfirming = confirmDeleteId === demande.id;

                    return (
                      <tr key={demande.id}>
                        <td>{demande.nom}</td>
                        <td>
                          <div className="callback-phone-group">
                            <a href={`tel:${demande.telephone}`}>
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
                        </td>
                        <td>
                          <span
                            className={`callback-status-pill ${isTreated ? "is-done" : "is-new"}`}
                          >
                            {isTreated ? "Traitée" : "Nouvelle"}
                          </span>
                        </td>
                        <td>
                          {new Intl.DateTimeFormat("fr-FR", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(demande.createdAt))}
                        </td>
                        <td>
                          <div className="callback-actions">
                            <button
                              type="button"
                              className="callback-action-btn is-primary"
                              disabled={isMutating}
                              onClick={() =>
                                statusMutation.mutate({
                                  id: demande.id,
                                  statut: nextStatus,
                                })
                              }
                            >
                              {isTreated ? "Réouvrir" : "Traiter"}
                            </button>
                            {isConfirming ? (
                              <>
                                <button
                                  type="button"
                                  className="callback-action-btn is-danger"
                                  disabled={isMutating}
                                  onClick={() =>
                                    deleteMutation.mutate(demande.id)
                                  }
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="fiche-passage-empty">
              Aucune demande de rappel pour le moment.
            </p>
          )}
          <p className="fiche-passage-filter-hint">
            Les demandes les plus récentes sont affichées en premier (maximum
            100).
          </p>
        </>
      )}
    </section>
  );
}
