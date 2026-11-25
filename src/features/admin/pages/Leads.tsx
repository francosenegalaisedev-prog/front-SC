import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminApi } from "../admin.service";
import {
  Badge,
  Btn,
  Empty,
  ErrorBox,
  Icon,
  Loading,
  Pager,
  useAction,
} from "../components/ui";
import { useData, useDebounced } from "../hooks/useData";
import { FORMULE_TONE, fdate } from "../lib/format";
import { PS } from "../lib/production";
import type { LeadRequest, LeadStatus } from "../../../types/admin";

const STATUS: Record<LeadStatus, { label: string; tone: string }> = {
  NEW: { label: "Nouvelle", tone: "gold" },
  CONTACTED: { label: "Contactée", tone: "green" },
  CLOSED: { label: "Clôturée", tone: "grey" },
};

const ACTIVE_CARD_STATUSES = new Set([
  "envoyee",
  "traitee",
]);

export default function Leads() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<LeadStatus | "">("");
  const [page, setPage] = useState(1);
  const search = useDebounced(text.trim(), 300);
  const run = useAction();
  useEffect(() => setPage(1), [search, status]);
  const [data, reload, err] = useData(
    () =>
      adminApi.listLeads({
        search: search || undefined,
        status: status || undefined,
        page,
        limit: 20,
      }),
    [search, status, page],
  );
  const [cartesData] = useData(() => adminApi.listCartes(), []);
  const pendingCartes = (cartesData?.cartes ?? []).filter(c =>
    ACTIVE_CARD_STATUSES.has(c.statut),
  );

  const changeStatus = (lead: LeadRequest, next: LeadStatus) => {
    if (next === lead.status) return;
    void run(
      () => adminApi.updateLeadStatus(lead.id, next),
      "Statut de la demande mis à jour",
    ).then(result => result && reload());
  };

  return (
    <>
      <header className="ph row">
        <div>
          <p className="eyebrow">Suivi commercial</p>
          <h1>Demandes</h1>
          <p className="lede">
            Demandes de cartes clients (redirigées vers l’atelier Production),
            devis et messages envoyés depuis le site.
          </p>
        </div>
        <div className="ph-actions">
          <Btn
            kind="red"
            icon="gear"
            onClick={() => navigate("/admin/production?tab=cartes")}
          >
            Ouvrir Production ({pendingCartes.length})
          </Btn>
        </div>
      </header>

      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-h">
          <h2>
            Demandes de cartes clients{" "}
            {pendingCartes.length > 0 && (
              <Badge tone="gold">{pendingCartes.length} en cours</Badge>
            )}
          </h2>
          <Link className="link small" to="/admin/production?tab=cartes">
            Voir tout dans Production →
          </Link>
        </div>
        {pendingCartes.length ? (
          <div className="table-wrap">
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th>Reçue</th>
                  <th>Client / Fiche</th>
                  <th>Formule</th>
                  <th>Statut</th>
                  <th>Atelier</th>
                </tr>
              </thead>
              <tbody>
                {pendingCartes.slice(0, 8).map(c => (
                  <tr
                    key={c.id}
                    onClick={() =>
                      navigate(`/admin/production?tab=cartes&carteId=${c.id}`)
                    }
                  >
                    <td data-l="Reçue">{fdate(c.createdAt)}</td>
                    <td data-l="Client / Fiche">
                      <b>{c.fiche?.entreprise || c.fiche?.nom || `Carte #${c.id}`}</b>
                      <small>/{c.fiche?.slug || "—"}</small>
                    </td>
                    <td data-l="Formule">
                      <Badge tone={FORMULE_TONE[c.tier]}>{c.tier}</Badge>
                    </td>
                    <td data-l="Statut">
                      <Badge tone="gold">{PS[c.statut] ?? c.statut}</Badge>
                    </td>
                    <td data-l="Atelier" onClick={e => e.stopPropagation()}>
                      <Btn
                        icon="eye"
                        onClick={() =>
                          navigate(
                            `/admin/production?tab=cartes&carteId=${c.id}`,
                          )
                        }
                      >
                        Voir dans Production
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="adm-muted small" style={{ padding: "8px 0" }}>
            Aucune demande de carte client en attente.
          </p>
        )}
      </section>

      <div className="filters">
        <label className="search">
          <Icon n="search" />
          <input
            placeholder="Nom, entreprise, e-mail ou téléphone…"
            value={text}
            onChange={event => setText(event.target.value)}
          />
        </label>
        <select
          value={status}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            setStatus(event.target.value as LeadStatus | "")
          }
          aria-label="Statut de la demande"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS).map(([value, item]) => (
            <option key={value} value={value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      {err ? (
        <ErrorBox message={err} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : data.items.length ? (
        <>
          <div className="table-wrap">
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th>Reçue</th>
                  <th>Demande</th>
                  <th>Contact</th>
                  <th>Prestations</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(lead => (
                  <tr key={lead.id}>
                    <td data-l="Reçue">{fdate(lead.createdAt)}</td>
                    <td data-l="Demande">
                      <b>{lead.name}</b>
                      {lead.company && <small>{lead.company}</small>}
                      <small>{lead.intentLabel}</small>
                      {lead.message && (
                        <details className="lead-message">
                          <summary>Voir le message</summary>
                          <p>{lead.message}</p>
                        </details>
                      )}
                      {lead.design && (
                        <details className="lead-message">
                          <summary>Détails de la maquette</summary>
                          <dl>
                            {Object.entries(lead.design).map(([key, value]) => (
                              <div key={key}>
                                <dt>{key.replace(/_/g, " ")}</dt>
                                <dd>{String(value)}</dd>
                              </div>
                            ))}
                          </dl>
                        </details>
                      )}
                    </td>
                    <td data-l="Contact">
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`}>{lead.phone}</a>
                      )}
                      {lead.email && (
                        <a href={`mailto:${lead.email}`}>{lead.email}</a>
                      )}
                      {lead.city && <small>{lead.city}</small>}
                      {lead.prefer && <small>Préférence : {lead.prefer}</small>}
                    </td>
                    <td data-l="Prestations">
                      {lead.products.length ? lead.products.join(", ") : "—"}
                      {lead.sector && <small>{lead.sector}</small>}
                    </td>
                    <td data-l="Statut">
                      <Badge tone={STATUS[lead.status].tone}>
                        {STATUS[lead.status].label}
                      </Badge>
                      <select
                        value={lead.status}
                        aria-label={`Statut de la demande ${lead.id}`}
                        onChange={event =>
                          changeStatus(
                            lead,
                            event.target.value as LeadStatus,
                          )
                        }
                      >
                        {Object.entries(STATUS).map(([value, item]) => (
                          <option key={value} value={value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            noun="demande"
            onPage={setPage}
          />
        </>
      ) : (
        <Empty>Aucune demande pour ces critères.</Empty>
      )}
    </>
  );
}
