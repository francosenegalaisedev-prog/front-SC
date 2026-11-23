import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  adminApi,
  type AccountDeletionLog,
  type AdminActionLog,
} from "../admin.service";
import { Badge, Empty, ErrorBox, Loading, Pager, Tabs } from "../components/ui";
import { useData } from "../hooks/useData";

const ACTION_NAMES: Record<string, string> = {
  "/admin/settings": "Paramètres de l’application",
  "/admin/formules": "Réglages des formules",
  "/admin/formules/emplacements": "Réglages des emplacements",
  "/auth/me": "Profil administrateur",
  "/auth/me/password": "Mot de passe administrateur",
};

const METHOD_NAMES: Record<string, string> = {
  POST: "Création / action",
  PUT: "Remplacement",
  PATCH: "Modification",
  DELETE: "Suppression",
};

const DELETION_ACTION_LABELS: Record<
  AccountDeletionLog["action"],
  { label: string; tone: string }
> = {
  REQUESTED: { label: "Demande (J+30)", tone: "gold" },
  CANCELED: { label: "Annulée par le client", tone: "green" },
  DEACTIVATED: { label: "Désactivé", tone: "red" },
  REACTIVATED: { label: "Réactivé", tone: "green" },
  PURGED: { label: "Supprimé définitivement", tone: "dark" },
};

function actionLabel(log: AdminActionLog) {
  const known = ACTION_NAMES[log.path];
  if (known) return known;

  const fiche = /^\/admin\/fiches\/(\d+)(?:\/(.*))?$/.exec(log.path);
  if (fiche) {
    if (fiche[2]?.startsWith("subscription")) return "Abonnement de fiche";
    return `Fiche #${fiche[1]}`;
  }

  const user = /^\/admin\/users\/(\d+)(?:\/(.*))?$/.exec(log.path);
  if (user) {
    if (user[2] === "status") return `Statut de l’administrateur #${user[1]}`;
    if (user[2] === "client-status") return `Statut du client #${user[1]}`;
    if (user[2] === "permanent")
      return `Suppression définitive du client #${user[1]}`;
    if (user[2] === "invitation")
      return `Invitation de l’administrateur #${user[1]}`;
    return `Utilisateur #${user[1]}`;
  }

  if (log.path === "/admin/users/admin") return "Invitation d’un administrateur";
  return log.path.replace(/^\/admin\//, "").replace(/\//g, " · ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function actorDescription(log: AccountDeletionLog) {
  const initLabel =
    log.initiatedBy === "ADMIN" ? "Administrateur" : "Utilisateur";
  if (log.executedBy === "SYSTEM_CRON") {
    return {
      primary: "Purge automatique (J+30)",
      secondary: `Initié par : ${initLabel}`,
    };
  }
  if (log.executedBy === "ADMIN") {
    return {
      primary: log.actorAdminEmail || `Admin #${log.actorAdminId ?? "?"}`,
      secondary: "Action administrateur",
    };
  }
  return {
    primary: "Utilisateur lui-même",
    secondary: "Auto-service espace client",
  };
}

export default function AdminActionLogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<"admin" | "deletions">(
    searchParams.get("tab") === "deletions" ? "deletions" : "admin",
  );
  const [page, setPage] = useState(1);
  const [delPage, setDelPage] = useState(1);

  const changeTab = (next: "admin" | "deletions") => {
    setTab(next);
    const nextParams = new URLSearchParams(searchParams);
    if (next === "deletions") nextParams.set("tab", "deletions");
    else nextParams.delete("tab");
    setSearchParams(nextParams, { replace: true });
  };

  const [data, reload, error] = useData(
    () => adminApi.listActionLogs({ page, limit: 25 }),
    [page],
  );
  const [delData, reloadDel, delError] = useData(
    () => adminApi.listAccountDeletionLogs({ page: delPage, limit: 25 }),
    [delPage],
  );

  return (
    <>
      <header className="ph">
        <p className="eyebrow">Traçabilité</p>
        <h1>Journal d’activité</h1>
        <p className="lede">
          Historique des modifications administrateurs et des suppressions /
          désactivations de comptes. Les mots de passe ne sont jamais
          enregistrés.
        </p>
      </header>

      <Tabs
        value={tab}
        onChange={changeTab}
        tabs={[
          ["admin", "Actions administrateurs", data?.pagination.total],
          [
            "deletions",
            "Suppressions & désactivations de comptes",
            delData?.pagination.total,
          ],
        ]}
      />

      {tab === "admin" ? (
        error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !data ? (
          <Loading />
        ) : data.items.length ? (
          <>
            <div className="table-wrap">
              <table className="adm-tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Administrateur</th>
                    <th>Action</th>
                    <th>Résultat</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map(log => (
                    <tr key={log.id}>
                      <td data-l="Date">{formatDate(log.createdAt)}</td>
                      <td data-l="Administrateur">
                        <b>{log.adminName || log.adminEmail}</b>
                        {log.adminName && <small>{log.adminEmail}</small>}
                      </td>
                      <td data-l="Action">
                        <b>{actionLabel(log)}</b>
                        <small>
                          {METHOD_NAMES[log.method] ?? log.method} · {log.path}
                        </small>
                      </td>
                      <td data-l="Résultat">
                        <span className="badge b-green">{log.statusCode}</span>
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
              noun="action"
              onPage={setPage}
            />
          </>
        ) : (
          <Empty>Aucune action enregistrée pour le moment.</Empty>
        )
      ) : delError ? (
        <ErrorBox message={delError} onRetry={reloadDel} />
      ) : !delData ? (
        <Loading />
      ) : delData.items.length ? (
        <>
          <div className="table-wrap">
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Compte</th>
                  <th>Action</th>
                  <th>Par qui</th>
                  <th>Données</th>
                  <th>Motif</th>
                </tr>
              </thead>
              <tbody>
                {delData.items.map(log => {
                  const badge = DELETION_ACTION_LABELS[log.action] ?? {
                    label: log.action,
                    tone: "grey",
                  };
                  const actor = actorDescription(log);
                  return (
                    <tr key={log.id}>
                      <td data-l="Date">{formatDate(log.createdAt)}</td>
                      <td data-l="Compte">
                        <b>Utilisateur #{log.targetUserId}</b>
                        <small title={log.targetEmailHash}>
                          SHA-256 : {log.targetEmailHash.slice(0, 12)}…
                        </small>
                      </td>
                      <td data-l="Action">
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                        {log.scheduledFor && (
                          <small>Prévue le {formatDate(log.scheduledFor)}</small>
                        )}
                      </td>
                      <td data-l="Par qui">
                        <b>{actor.primary}</b>
                        <small>{actor.secondary}</small>
                      </td>
                      <td data-l="Données">
                        {log.action === "PURGED" ? (
                          <>
                            <b>
                              {log.fichesDeletedCount} fiche
                              {log.fichesDeletedCount > 1 ? "s" : ""} supprimée
                              {log.fichesDeletedCount > 1 ? "s" : ""}
                            </b>
                            <small>
                              {log.paymentsPreservedCount} paiement
                              {log.paymentsPreservedCount > 1 ? "s" : ""}{" "}
                              conservé
                              {log.paymentsPreservedCount > 1 ? "s" : ""}
                            </small>
                          </>
                        ) : (
                          <span className="adm-muted small">—</span>
                        )}
                      </td>
                      <td data-l="Motif">
                        {log.reason || (
                          <span className="adm-muted small">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager
            page={delData.pagination.page}
            totalPages={delData.pagination.totalPages}
            total={delData.pagination.total}
            noun="événement"
            onPage={setDelPage}
          />
        </>
      ) : (
        <Empty>Aucune suppression ou désactivation enregistrée.</Empty>
      )}
    </>
  );
}
