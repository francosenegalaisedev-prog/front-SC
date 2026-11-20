import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";

type PassageStats = {
  ficheId: number;
  granularity: "day" | "month";
  filters: { date: string | null; month: string | null };
  totals: { qr: number; nfc: number; direct: number; total: number };
  history: Array<{
    period: string;
    qr: number;
    nfc: number;
    direct: number;
    total: number;
  }>;
};

const HISTORY_PAGE_SIZE = 6;

export function PassageStatsPanel({ ficheId }: { ficheId: number }) {
  const [granularity, setGranularity] = useState<"day" | "month">("month");
  const [date, setDate] = useState("");
  const [month, setMonth] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  useEffect(() => setHistoryPage(1), [granularity, date, month]);

  const statsQuery = useQuery({
    queryKey: ["fiche-passage-stats", ficheId, granularity, date, month],
    enabled: Number.isInteger(ficheId) && ficheId > 0,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ granularity });
      if (granularity === "day" && date) params.set("date", date);
      if (granularity === "month" && month) params.set("month", month);
      const response = await api.get<{ stats: PassageStats }>(
        `fiches/${ficheId}/stats?${params.toString()}`,
        { signal },
      );
      return response.data.stats;
    },
  });

  const stats = statsQuery.data;
  const history = [...(stats?.history ?? [])].reverse();
  const historyPageCount = Math.ceil(history.length / HISTORY_PAGE_SIZE);
  const visibleHistory = history.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE,
  );
  const countCards = [
    {
      label: "Total des passages",
      value: stats?.totals.total ?? 0,
      key: "total",
    },
    { label: "QR code", value: stats?.totals.qr ?? 0, key: "qr" },
    { label: "NFC", value: stats?.totals.nfc ?? 0, key: "nfc" },
    {
      label: "Accès directs / autres",
      value: stats?.totals.direct ?? 0,
      key: "direct",
    },
  ];

  return (
    <aside
      className="fiche-passage-panel"
      aria-labelledby="fiche-passage-title"
    >
      <div className="fiche-passage-heading">
        <div>
          <h2 id="fiche-passage-title">Statistiques des passages</h2>
          <p>Chaque ouverture valide est comptabilisée.</p>
        </div>
        <button
          type="button"
          className="fiche-passage-refresh"
          onClick={() => void statsQuery.refetch()}
          disabled={statsQuery.isFetching}
          aria-label="Actualiser les statistiques"
          title="Actualiser"
        >
          {statsQuery.isFetching ? "…" : "↻"}
        </button>
      </div>

      <div className="fiche-passage-filters">
        <label>
          Regroupement
          <select
            value={granularity}
            onChange={event =>
              setGranularity(event.target.value as "day" | "month")
            }
          >
            <option value="month">Par mois</option>
            <option value="day">Par jour</option>
          </select>
        </label>
        {granularity === "day" ? (
          <label>
            Filtrer par date
            <input
              type="date"
              value={date}
              onChange={event => setDate(event.target.value)}
            />
          </label>
        ) : (
          <label>
            Filtrer par mois
            <input
              type="month"
              value={month}
              onChange={event => setMonth(event.target.value)}
            />
          </label>
        )}
        <p className="fiche-passage-filter-hint">
          Sans filtre, tout l’historique détaillé disponible est affiché.
        </p>
        <p className="fiche-passage-filter-hint">
          Les anciens compteurs sans date ni source ne peuvent pas être répartis
          rétroactivement entre QR, NFC et accès directs.
        </p>
      </div>

      {statsQuery.isPending ? (
        <p className="fiche-passage-state" role="status">
          Chargement des statistiques…
        </p>
      ) : statsQuery.isError ? (
        <div className="fiche-passage-state" role="alert">
          <p>Impossible de charger les statistiques.</p>
          <button type="button" onClick={() => void statsQuery.refetch()}>
            Réessayer
          </button>
        </div>
      ) : (
        <>
          <div className="fiche-passage-cards">
            {countCards.map(card => (
              <div className="fiche-passage-card" key={card.key}>
                <span>{card.label}</span>
                <strong>{card.value.toLocaleString("fr-FR")}</strong>
              </div>
            ))}
          </div>
          <div className="fiche-passage-history">
            <h3>
              Historique {granularity === "day" ? "journalier" : "mensuel"}
            </h3>
            {stats?.history.length ? (
              <div className="fiche-passage-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{granularity === "day" ? "Date" : "Mois"}</th>
                      <th>Total</th>
                      <th>QR</th>
                      <th>NFC</th>
                      <th>Direct</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleHistory.map(row => (
                      <tr key={row.period}>
                        <td>{row.period}</td>
                        <td>{row.total.toLocaleString("fr-FR")}</td>
                        <td>{row.qr.toLocaleString("fr-FR")}</td>
                        <td>{row.nfc.toLocaleString("fr-FR")}</td>
                        <td>{row.direct.toLocaleString("fr-FR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="fiche-passage-empty">
                Aucun passage enregistré pour cette période.
              </p>
            )}
            {historyPageCount > 1 && (
              <nav
                className="fiche-passage-pagination"
                aria-label="Pagination de l’historique"
              >
                <span>
                  {(historyPage - 1) * HISTORY_PAGE_SIZE + 1}–
                  {Math.min(historyPage * HISTORY_PAGE_SIZE, history.length)}{" "}
                  sur {history.length}
                </span>
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setHistoryPage(page => Math.max(1, page - 1))
                    }
                    disabled={historyPage === 1}
                    aria-label="Page précédente de l’historique"
                  >
                    ← Précédent
                  </button>
                  <span aria-live="polite">
                    {historyPage} / {historyPageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setHistoryPage(page =>
                        Math.min(historyPageCount, page + 1),
                      )
                    }
                    disabled={historyPage === historyPageCount}
                    aria-label="Page suivante de l’historique"
                  >
                    Suivant →
                  </button>
                </div>
              </nav>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
