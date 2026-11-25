import { useState } from "react";
import { Link } from "react-router-dom";
import { toApiError } from "../../../lib/apiError";
import { publicAppOrigin } from "../../../lib/env";
import type { SectionStickerAdmin } from "../../../types/admin";
import Fiche from "../../espace-client/components/Fiche";
import PhonePreview from "../../espace-client/components/PhonePreview";
import StickerSectionView from "../../espace-client/components/sticker/StickerSectionView";
import { fetchFiche } from "../../espace-client/lib/ficheApi";
import { stickerPath } from "../../espace-client/lib/stickerSections";
import { adminApi } from "../admin.service";
import { useData } from "../hooks/useData";
import { fdate } from "../lib/format";
import {
  ADMIN_STICKER_SECTIONS,
  DECISIONS,
  DECISION_DONE,
  SS_STATUT,
  displayName,
  sectionLabel,
  type SectionDecision,
} from "../lib/sectionStickers";
import {
  Badge,
  Btn,
  Empty,
  ErrorBox,
  Loading,
  Modal,
  useAction,
  useToast,
} from "./ui";

/*
  Stickers par section, côté administration :
  • Seul l'administrateur génère / active / désactive les stickers par section (dans « Aperçu et stickers par section » sur /admin/fiches/:id).
  • L'état de la fiche conditionne l'état public du sticker (fiche ACTIVE + abonnement Pro/Signature).
  • 7 sections autorisées : Réseaux sociaux, Produits & prestations, Galerie, Échangez contact, Avis Google, Menu interactif, Biens immobiliers.
*/

function useDecision(onChanged: () => void) {
  const run = useAction();
  return async (d: SectionStickerAdmin, to: SectionDecision) => {
    if (
      await run(
        () => adminApi.setSectionStickerStatus(d.id, to),
        DECISION_DONE[to],
      )
    )
      onChanged();
  };
}

function CopyStickerUrl({ slug, section }: { slug: string; section: string }) {
  const toast = useToast();
  const url = `${publicAppOrigin()}${stickerPath(slug, section)}`;
  return (
    <button
      type="button"
      className="link small"
      onClick={() =>
        navigator.clipboard
          .writeText(url)
          .then(() => toast("Lien copié"), () => toast("Copie impossible", "err"))
      }
    >
      Copier le lien
    </button>
  );
}

/** Mini téléphone : la fiche entière, ou UNE section telle que la verra la personne qui scanne. */
export function FichePhone({
  ficheId,
  section,
  whatsapp,
}: {
  ficheId: number;
  section: string | null;
  whatsapp?: string;
}) {
  const [fiche, reload, err] = useData(
    () =>
      fetchFiche(`fiches/${ficheId}`).catch(e => {
        throw toApiError(e, "Fiche indisponible. Réessayez.");
      }),
    [ficheId],
  );
  if (err) return <ErrorBox message={err} onRetry={reload} />;
  if (!fiche) return <Loading />;
  const previewFiche =
    whatsapp && !fiche.whatsapp ? { ...fiche, whatsapp } : fiche;
  return (
    <PhonePreview>
      {scroller =>
        section ? (
          <StickerSectionView
            key={`${previewFiche.id}-${section}`}
            fiche={previewFiche}
            section={section}
            scrollerRef={scroller}
            preview
          />
        ) : (
          <Fiche
            key={previewFiche.id}
            fiche={previewFiche}
            scrollerRef={scroller}
          />
        )
      }
    </PhonePreview>
  );
}

function PreviewModal({
  demande,
  onClose,
}: {
  demande: SectionStickerAdmin;
  onClose: () => void;
}) {
  return (
    <Modal
      title={`Aperçu · ${sectionLabel(demande.section)} · ${displayName(demande.fiche)}`}
      onClose={onClose}
      wide
    >
      <p className="adm-muted">
        Ce que verra la personne qui scanne le sticker ({stickerPath(demande.fiche.slug, demande.section)}).
      </p>
      <FichePhone ficheId={demande.fiche.id} section={demande.section} />
    </Modal>
  );
}

const FILTERS = [
  ["all", "Tous les statuts"],
  ["active", SS_STATUT.active.label],
  ["desactivee", SS_STATUT.desactivee.label],
] as const;
type Filter = "all" | "active" | "desactivee";

/** Onglet « Stickers par section » de la page Production : suivi global des stickers générés. */
export function SectionStickersTab({
  data,
  error,
  onChanged,
}: {
  data: SectionStickerAdmin[] | null;
  error: string | null;
  onChanged: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [preview, setPreview] = useState<SectionStickerAdmin | null>(null);
  const decide = useDecision(onChanged);
  if (error) return <ErrorBox message={error} onRetry={onChanged} />;
  if (!data) return <Loading />;
  const list = data.filter(d => filter === "all" || d.statut === filter);
  return (
    <section aria-label="Stickers par section">
      <p className="adm-muted">
        Stickers par section générés depuis les fiches clients. Pour générer un
        nouveau sticker, ouvrez la fiche concernée → « Aperçu et stickers par
        section ».
      </p>
      <label className="prod-status-filter">
        Filtrer par statut
        <select
          aria-label="Filtrer par statut"
          value={filter}
          onChange={event => setFilter(event.target.value as Filter)}
        >
          {FILTERS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {list.length === 0 ? (
        <Empty>Aucun sticker par section généré.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="adm-tbl">
            <thead>
              <tr>
                <th>Fiche</th>
                <th>Section</th>
                <th>Lien direct</th>
                <th>Client</th>
                <th>Créé le</th>
                <th>État</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {list.map(d => (
                <tr key={d.id}>
                  <td>
                    <Link to={`/admin/fiches/${d.fiche.id}`}>
                      <b>{displayName(d.fiche)}</b>
                    </Link>
                    <br />
                    <span className="adm-muted">/{d.fiche.slug}</span>
                  </td>
                  <td>{sectionLabel(d.section)}</td>
                  <td>
                    <code>{stickerPath(d.fiche.slug, d.section)}</code>
                    <br />
                    <CopyStickerUrl slug={d.fiche.slug} section={d.section} />
                  </td>
                  <td>
                    {d.client?.nom || "—"}
                    {d.client?.email && (
                      <>
                        <br />
                        <span className="adm-muted">{d.client.email}</span>
                      </>
                    )}
                  </td>
                  <td>{fdate(d.createdAt)}</td>
                  <td>
                    <Badge tone={SS_STATUT[d.statut].tone}>
                      {SS_STATUT[d.statut].label}
                    </Badge>
                  </td>
                  <td className="ss-actions">
                    <Btn onClick={() => setPreview(d)}>Aperçu</Btn>
                    {DECISIONS[d.statut].map(a => (
                      <Btn
                        key={a.to}
                        kind={a.primary ? "red" : undefined}
                        onClick={() => void decide(d, a.to)}
                      >
                        {a.label}
                      </Btn>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {preview && (
        <PreviewModal demande={preview} onClose={() => setPreview(null)} />
      )}
    </section>
  );
}

/** Panneau de la fiche détail (/admin/fiches/:id) : aperçu téléphone + génération des stickers par section. */
export function FichePreviewPanel({
  ficheId,
  whatsapp,
}: {
  ficheId: number;
  whatsapp?: string;
}) {
  const [data, reload, err] = useData(
    () => adminApi.listSectionStickers({ ficheId }),
    [ficheId],
  );
  const [section, setSection] = useState<string | null>(null);
  const [busySection, setBusySection] = useState<string | null>(null);
  const run = useAction();
  const decide = useDecision(reload);

  const bySection = new Map<string, SectionStickerAdmin>();
  for (const d of data?.demandes ?? []) {
    if (!bySection.has(d.section)) bySection.set(d.section, d);
  }

  const generate = async (sectionKey: string) => {
    setBusySection(sectionKey);
    const ok = await run(
      () => adminApi.createSectionSticker({ ficheId, section: sectionKey }),
      `Sticker « ${sectionLabel(sectionKey)} » généré et activé`,
    );
    setBusySection(null);
    if (ok) reload();
  };

  return (
    <section className="panel" aria-label="Aperçu et stickers par section">
      <div className="panel-h">
        <h2>Aperçu et stickers par section</h2>
      </div>
      <p className="adm-muted small" style={{ marginBottom: 12 }}>
        Générez un sticker pour rediriger directement vers une section de cette
        fiche (formules Pro et Signature, fiche active). L’état de la fiche
        conditionne automatiquement celui de ses stickers.
      </p>
      <div className="fd-prev">
        <div className="fd-prev-list">
          {err ? (
            <ErrorBox message={err} onRetry={reload} />
          ) : !data ? (
            <Loading />
          ) : (
            <ul className="fd-ss">
              {ADMIN_STICKER_SECTIONS.map(({ key, label }) => {
                const existing = bySection.get(key);
                const isPreview = section === key;
                return (
                  <li key={key}>
                    <div>
                      <b>{label}</b>{" "}
                      {existing ? (
                        <Badge tone={SS_STATUT[existing.statut].tone}>
                          {SS_STATUT[existing.statut].label}
                        </Badge>
                      ) : (
                        <Badge tone="grey">Non généré</Badge>
                      )}
                      {existing?.statut === "active" && (
                        <>
                          <br />
                          <code className="small">
                            {stickerPath(existing.fiche.slug, key)}
                          </code>{" "}
                          <CopyStickerUrl
                            slug={existing.fiche.slug}
                            section={key}
                          />
                        </>
                      )}
                    </div>
                    <span className="ss-actions">
                      <Btn onClick={() => setSection(isPreview ? null : key)}>
                        {isPreview ? "Voir la fiche" : "Aperçu"}
                      </Btn>
                      {!existing ? (
                        <Btn
                          kind="red"
                          disabled={busySection === key}
                          onClick={() => void generate(key)}
                        >
                          {busySection === key ? "Génération…" : "Générer"}
                        </Btn>
                      ) : (
                        DECISIONS[existing.statut].map(a => (
                          <Btn
                            key={a.to}
                            kind={a.primary ? "red" : undefined}
                            onClick={() => void decide(existing, a.to)}
                          >
                            {a.label}
                          </Btn>
                        ))
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {section && (
            <p className="adm-muted">
              Aperçu de la section « {sectionLabel(section)} ».{" "}
              <button className="adm-link" onClick={() => setSection(null)}>
                Revenir à la fiche
              </button>
            </p>
          )}
        </div>
        <FichePhone ficheId={ficheId} section={section} whatsapp={whatsapp} />
      </div>
    </section>
  );
}
