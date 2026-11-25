import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { publicAppOrigin } from "../../../../../lib/env";
import { TAB_TYPES } from "../../../../../lib/plans";
import type { FicheRecord } from "../../../../../types";
import { getSectionStickers } from "../../../espaceClient.service";
import {
  hasStickers,
  latestBySection,
  sectionTitle,
  stickerPath,
  stickerSections,
  type StickerSectionInfo,
} from "../../../lib/stickerSections";
import { I } from "../../fiche/Icon";
import { QR } from "../../fiche/QR";
import { Lock, downloadSvg } from "../shared";

const origin = () => publicAppOrigin();

interface Preview {
  /** Section actuellement affichée dans l'aperçu téléphone (null = fiche complète). */
  previewSection: string | null;
  onPreviewSection?: (key: string | null) => void;
}

/** Outils d'une section ACTIVÉE par l'administration : lien, QR, aperçu et ouverture. */
function ActiveTools({
  fiche,
  info,
  previewSection,
  onPreviewSection,
}: {
  fiche: FicheRecord;
  info: StickerSectionInfo;
} & Preview) {
  const previewing = previewSection === info.key;
  const qr = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const url = `${origin()}${stickerPath(fiche.slug, info.key)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copiez ce lien :", url);
    }
  };
  return (
    <div className="ed-stk-active">
      <div className="ed-stk-qr" ref={qr}>
        <QR text={url} logo={fiche.logo} size={84} />
      </div>
      <div className="ed-stk-t">
        <code>{stickerPath(fiche.slug, info.key)}</code>
        <span className="ed-stk-a">
          <button type="button" className="ed-add-b" onClick={copy}>
            {copied ? "Lien copié" : "Copier le lien"}
          </button>
          <button
            type="button"
            className="ed-add-b"
            onClick={() =>
              downloadSvg(qr.current, `sticker-${fiche.slug}-${info.key}.svg`)
            }
          >
            QR (SVG)
          </button>
          {onPreviewSection && (
            <button
              type="button"
              className={`ed-add-b${previewing ? " on" : ""}`}
              aria-pressed={previewing}
              onClick={() => onPreviewSection(previewing ? null : info.key)}
            >
              {previewing ? "Fermer l’aperçu" : "Aperçu"}
            </button>
          )}
          <a className="ed-up" href={url} target="_blank" rel="noreferrer">
            Ouvrir <I n="arrow" s={13} />
          </a>
        </span>
      </div>
    </div>
  );
}

/**
 * Stickers par section (Pro et Signature) — lecture seule côté client.
 * Seule l'administration génère et active les stickers par section ; dès qu'un sticker est actif,
 * le client retrouve ici son lien /s/:slug/:section, son QR code et son aperçu.
 */
export default function StickerBox({
  fiche,
  previewSection = null,
  onPreviewSection,
}: { fiche: FicheRecord } & Partial<Preview>) {
  const eligible = hasStickers(fiche);
  const sections = stickerSections(fiche);
  const demandes = useQuery({
    queryKey: ["section-stickers", fiche.id],
    queryFn: () => getSectionStickers(fiche.id),
    enabled: eligible,
  });
  const latest = latestBySection(demandes.data ?? []);
  const activeSections = sections.filter(
    info => latest.get(info.key)?.statut === "active",
  );

  return (
    <details className="ed-box">
      <summary>
        Stickers par section <small>Pro et Signature</small>
      </summary>
      {!eligible ? (
        <Lock to="Pro">
          Les stickers par section (un QR qui ouvre directement votre menu, vos
          biens, votre galerie ou vos avis) sont disponibles à partir de la
          formule Pro.
        </Lock>
      ) : demandes.isPending ? (
        <p className="ed-hint" role="status">
          Chargement des stickers par section…
        </p>
      ) : demandes.isError ? (
        <p className="ed-hint" role="alert">
          Impossible de charger vos stickers par section.{" "}
          <button
            type="button"
            className="ed-add-b"
            onClick={() => void demandes.refetch()}
          >
            Réessayer
          </button>
        </p>
      ) : activeSections.length === 0 ? (
        <p className="ed-hint">
          Aucun sticker par section n’a encore été généré pour cette fiche.
          Seule notre équipe génère et active les stickers de section (Réseaux
          sociaux, Produits &amp; prestations, Galerie, Échangez contact, Avis
          Google, Menu interactif, Biens immobiliers).
        </p>
      ) : (
        <>
          <p className="ed-hint">
            Stickers générés pour cette fiche. Chaque QR ouvre directement la
            section correspondante (actifs tant que votre fiche est en ligne).
          </p>
          <ul className="ed-stks">
            {activeSections.map(info => (
              <li key={info.key} className="ed-stk" data-statut="active">
                <div className="ed-stk-body">
                  <b>
                    <I n={TAB_TYPES[info.tab.type].icon} s={13} />{" "}
                    {sectionTitle(info.tab)}
                  </b>
                  <ActiveTools
                    fiche={fiche}
                    info={info}
                    previewSection={previewSection}
                    onPreviewSection={onPreviewSection}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </details>
  );
}
