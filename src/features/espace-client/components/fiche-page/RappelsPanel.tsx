import { useQuery } from "@tanstack/react-query";
import { api } from "../../../../lib/api";

type RappelRequest = {
  id: number;
  nom: string;
  telephone: string;
  createdAt: string;
};

type RappelsResponse = {
  ficheId: number;
  total: number;
  demandes: RappelRequest[];
};

export function RappelsPanel({ ficheId }: { ficheId: number }) {
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
              <span>Total des demandes enregistrées</span>
              <strong>
                {(rappelsQuery.data?.total ?? 0).toLocaleString("fr-FR")}
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
                    <th>Date de la demande</th>
                  </tr>
                </thead>
                <tbody>
                  {rappelsQuery.data.demandes.map(demande => (
                    <tr key={demande.id}>
                      <td>{demande.nom}</td>
                      <td>
                        <a href={`tel:${demande.telephone}`}>
                          {demande.telephone}
                        </a>
                      </td>
                      <td>
                        {new Intl.DateTimeFormat("fr-FR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(demande.createdAt))}
                      </td>
                    </tr>
                  ))}
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
