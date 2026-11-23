import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { ChangeEvent } from "react";
import { errMsg } from "../../../lib/apiError";
import type { UserRow } from "../../../types/admin";
import { adminApi } from "../admin.service";
import {
  Badge,
  Btn,
  Empty,
  ErrorBox,
  Field,
  Icon,
  Loading,
  Modal,
  Pager,
  useToast,
} from "../components/ui";
import { useData, useDebounced } from "../hooks/useData";
import { fdate } from "../lib/format";

export default function Clients() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const [text, setText] = useState("");
  const [role, setRole] = useState("");
  const initialStatut = searchParams.get("statut") ?? "";
  const [statut, setStatut] = useState(
    ["actif", "desactive", "suppression"].includes(initialStatut)
      ? initialStatut
      : "",
  );
  const [page, setPage] = useState(1);
  const search = useDebounced(text.trim(), 300);
  useEffect(() => setPage(1), [search]);

  const [data, reload, err] = useData(
    () =>
      adminApi.listUsers({
        search: search || undefined,
        role: (role || undefined) as "client" | "admin" | undefined,
        statut: (statut || undefined) as
          | "actif"
          | "desactive"
          | "suppression"
          | undefined,
        page,
        limit: 20,
      }),
    [search, role, statut, page],
  );

  // Modale désactivation / réactivation
  const [statusTarget, setStatusTarget] = useState<UserRow | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);

  // Modale suppression définitive stricte
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const confirmToggleStatus = async () => {
    if (!statusTarget || statusBusy) return;
    setStatusBusy(true);
    try {
      const nextActive = !statusTarget.active;
      await adminApi.updateClientStatus(
        statusTarget.id,
        nextActive,
        statusReason,
      );
      toast(
        nextActive
          ? "Compte client réactivé et fiches restaurées."
          : "Compte client désactivé et fiches suspendues.",
      );
      setStatusTarget(null);
      setStatusReason("");
      reload();
    } catch (cause) {
      toast(errMsg(cause), "err");
    } finally {
      setStatusBusy(false);
    }
  };

  const confirmPermanentDelete = async () => {
    if (!deleteTarget || deleteBusy) return;
    setDeleteBusy(true);
    try {
      const res = await adminApi.permanentlyDeleteClient(
        deleteTarget.id,
        deleteConfirmEmail.trim(),
        deleteReason,
      );
      toast(
        `Compte supprimé définitivement (${res.fichesDeleted} fiche${res.fichesDeleted > 1 ? "s" : ""} supprimée${res.fichesDeleted > 1 ? "s" : ""}, ${res.paymentsPreserved} paiement${res.paymentsPreserved > 1 ? "s" : ""} conservé${res.paymentsPreserved > 1 ? "s" : ""}).`,
      );
      setDeleteTarget(null);
      setDeleteConfirmEmail("");
      setDeleteReason("");
      reload();
    } catch (cause) {
      toast(errMsg(cause), "err");
    } finally {
      setDeleteBusy(false);
    }
  };

  const renderStatus = (u: UserRow) => {
    if (u.deletionScheduledAt) {
      return (
        <Badge tone="gold">
          Suppression le {fdate(u.deletionScheduledAt)}
        </Badge>
      );
    }
    return u.active ? (
      <Badge tone="green">Actif</Badge>
    ) : (
      <Badge tone="red">Désactivé</Badge>
    );
  };

  return (
    <>
      <header className="ph row">
        <div>
          <p className="eyebrow">Comptes</p>
          <h1>Clients</h1>
          <p className="lede">
            Les comptes inscrits. Un client voit ses fiches après avoir saisi le
            code de sa carte.
          </p>
        </div>
        <div className="ph-actions">
          <Btn
            kind="red"
            icon="plus"
            onClick={() => navigate("/admin/parametres?section=team")}
          >
            Gérer l’équipe admin
          </Btn>
        </div>
      </header>

      <div className="filters">
        <label className="search">
          <Icon n="search" />
          <input
            placeholder="E-mail ou nom…"
            value={text}
            onChange={e => setText(e.target.value)}
          />
        </label>
        <select
          value={role}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
            setRole(e.target.value);
            setPage(1);
          }}
          aria-label="Rôle"
        >
          <option value="">Tous les rôles</option>
          <option value="client">Clients</option>
          <option value="admin">Administrateurs</option>
        </select>
        <select
          value={statut}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
            const next = e.target.value;
            setStatut(next);
            setPage(1);
            const nextParams = new URLSearchParams(searchParams);
            if (next) nextParams.set("statut", next);
            else nextParams.delete("statut");
            setSearchParams(nextParams, { replace: true });
          }}
          aria-label="Statut"
        >
          <option value="">Tous les statuts</option>
          <option value="actif">Actifs</option>
          <option value="desactive">Désactivés</option>
          <option value="suppression">Suppression en attente</option>
        </select>
      </div>

      {err ? (
        <ErrorBox message={err} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : data.users.length ? (
        <>
          <div className="table-wrap">
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th>Compte</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>E-mail</th>
                  <th>Fiches</th>
                  <th>Inscrit le</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map(u => (
                  <tr
                    key={u.id}
                    onClick={() => navigate(`/admin/fiches?userId=${u.id}`)}
                  >
                    <td data-l="Compte">
                      <b>{u.nom || u.email}</b>
                      {u.nom && <small>{u.email}</small>}
                    </td>
                    <td data-l="Rôle">
                      {u.role === "admin" ? (
                        <Badge tone="dark">Admin</Badge>
                      ) : (
                        <Badge>Client</Badge>
                      )}
                    </td>
                    <td data-l="Statut">{renderStatus(u)}</td>
                    <td data-l="E-mail">
                      {u.emailVerifie ? (
                        <Badge tone="green">Vérifié</Badge>
                      ) : (
                        <Badge tone="gold">Non vérifié</Badge>
                      )}
                    </td>
                    <td data-l="Fiches">
                      {u.nbFiches ? (
                        <Link
                          className="link"
                          to={`/admin/fiches?userId=${u.id}`}
                          onClick={e => e.stopPropagation()}
                        >
                          {u.nbFiches}
                        </Link>
                      ) : (
                        0
                      )}
                    </td>
                    <td data-l="Inscrit le">{fdate(u.createdAt)}</td>
                    <td data-l="Actions" onClick={e => e.stopPropagation()}>
                      {u.role === "client" ? (
                        <div className="row-a">
                          <Btn
                            onClick={() => {
                              setStatusTarget(u);
                              setStatusReason("");
                            }}
                          >
                            {u.active ? "Désactiver" : "Réactiver"}
                          </Btn>
                          <Btn
                            kind="red"
                            icon="trash"
                            onClick={() => {
                              setDeleteTarget(u);
                              setDeleteConfirmEmail("");
                              setDeleteReason("");
                            }}
                          >
                            Supprimer
                          </Btn>
                        </div>
                      ) : (
                        <span className="adm-muted small">Via Équipe</span>
                      )}
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
            noun="compte"
            onPage={setPage}
          />
        </>
      ) : (
        <Empty>Aucun compte trouvé.</Empty>
      )}

      {statusTarget && (
        <Modal
          title={
            statusTarget.active
              ? "Désactiver ce compte client"
              : "Réactiver ce compte client"
          }
          onClose={() => !statusBusy && setStatusTarget(null)}
        >
          <p className="small">
            {statusTarget.active ? (
              <>
                Le compte <b>{statusTarget.email}</b> sera désactivé
                immédiatement et ses fiches actives seront suspendues. Cette
                action est réversible et enregistrée dans le journal.
              </>
            ) : (
              <>
                Le compte <b>{statusTarget.email}</b> sera réactivé (toute
                demande de suppression en cours sera annulée) et ses fiches
                suspendues seront remises en ligne.
              </>
            )}
          </p>
          <div style={{ marginTop: 12 }}>
            <Field label="Motif (facultatif)">
              <input
                type="text"
                value={statusReason}
                onChange={e => setStatusReason(e.target.value)}
                maxLength={500}
                placeholder={
                  statusTarget.active
                    ? "Ex. Impayé, abus, demande du client…"
                    : "Ex. Régularisation effectuée"
                }
              />
            </Field>
          </div>
          <div className="modal-actions" style={{ marginTop: 16 }}>
            <Btn disabled={statusBusy} onClick={() => setStatusTarget(null)}>
              Annuler
            </Btn>
            <Btn
              kind={statusTarget.active ? "red" : "dark"}
              disabled={statusBusy}
              onClick={() => void confirmToggleStatus()}
            >
              {statusBusy
                ? "Traitement…"
                : statusTarget.active
                  ? "Confirmer la désactivation"
                  : "Confirmer la réactivation"}
            </Btn>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Suppression définitive du compte"
          onClose={() => !deleteBusy && setDeleteTarget(null)}
        >
          <p className="small">
            Cette action est <b>irréversible</b>. Le compte{" "}
            <b>{deleteTarget.email}</b> ainsi que ses{" "}
            <b>
              {deleteTarget.nbFiches} fiche
              {deleteTarget.nbFiches > 1 ? "s" : ""}
            </b>
            , médias et prospects seront effacés définitivement. L’historique
            des paiements sera conservé de façon anonymisée (obligation
            comptable) et votre action sera tracée dans le journal.
          </p>
          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            <Field
              label={`Saisissez exactement « ${deleteTarget.email} » pour confirmer`}
            >
              <input
                type="email"
                value={deleteConfirmEmail}
                onChange={e => setDeleteConfirmEmail(e.target.value)}
                placeholder={deleteTarget.email}
              />
            </Field>
            <Field label="Motif (facultatif)">
              <input
                type="text"
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                maxLength={500}
                placeholder="Ex. Demande de suppression RGPD / CDP"
              />
            </Field>
          </div>
          <div className="modal-actions" style={{ marginTop: 16 }}>
            <Btn disabled={deleteBusy} onClick={() => setDeleteTarget(null)}>
              Annuler
            </Btn>
            <Btn
              kind="red"
              icon="trash"
              disabled={
                deleteBusy ||
                deleteConfirmEmail.trim().toLowerCase() !==
                  deleteTarget.email.trim().toLowerCase()
              }
              onClick={() => void confirmPermanentDelete()}
            >
              {deleteBusy ? "Suppression…" : "Supprimer définitivement"}
            </Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
