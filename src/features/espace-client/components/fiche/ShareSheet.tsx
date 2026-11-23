import { useEffect, useRef, useState } from "react";
import type { FicheRecord } from "../../../../types";
import { I } from "./Icon";
import { QR, qrToPngBlob } from "./QR";
import { Sheet } from "./Sheet";

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function ShareSheet({
  fiche,
  shareUrl,
  qrUrl,
  onClose,
}: {
  fiche: FicheRecord;
  shareUrl: string;
  qrUrl: string;
  onClose: () => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [qrBusy, setQrBusy] = useState(false);
  const timerRef = useRef<number | null>(null);
  const title =
    `${fiche.prenom} ${fiche.nom}`.trim() ||
    fiche.entreprise ||
    "Support Connecté";
  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const flash = (msg: string) => {
    setFeedback(msg);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setFeedback("");
      timerRef.current = null;
    }, 2400);
  };

  const handleCopyLink = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        flash("Lien copié");
        return;
      } catch {
        /* repli ci-dessous */
      }
    }
    flash("Impossible de copier le lien");
  };

  const handleShareLink = async () => {
    if (canNativeShare) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    await handleCopyLink();
  };

  const handleQrAction = async (mode: "share" | "download") => {
    if (qrBusy) return;
    setQrBusy(true);
    try {
      const blob = await qrToPngBlob(qrUrl, fiche.logo);
      if (!blob) {
        flash("Impossible de générer le QR code");
        return;
      }
      const filename = `qr-${fiche.slug}.png`;
      if (mode === "share" && canNativeShare && typeof File !== "undefined") {
        const file = new File([blob], filename, { type: "image/png" });
        const canShareFiles =
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [file] });
        if (canShareFiles) {
          try {
            await navigator.share({
              title,
              text: `Scannez ce QR code pour ouvrir la fiche de ${title}`,
              files: [file],
            });
            return;
          } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError") return;
          }
        }
      }
      downloadBlob(blob, filename);
      flash("QR code téléchargé");
    } finally {
      setQrBusy(false);
    }
  };

  return (
    <Sheet onClose={onClose} label="Partager la fiche">
      <div className="f-sheet-b f-share-sheet">
        <h3>Partager la fiche</h3>
        <div className="f-share-qr-box">
          <QR text={qrUrl} logo={fiche.logo} size={184} />
          <p>{title}</p>
        </div>

        <div className="f-share-actions">
          <button
            type="button"
            className="f-btn gold"
            disabled={qrBusy}
            onClick={() => void handleQrAction("share")}
          >
            <I n="qr" s={15} />
            {qrBusy ? "Préparation…" : "Partager le QR code"}
          </button>
          <button
            type="button"
            className="f-share-sec"
            disabled={qrBusy}
            onClick={() => void handleQrAction("download")}
          >
            <I n="down" s={14} />
            Télécharger le QR
          </button>
        </div>

        <div className="f-share-divider">
          <span>ou via le lien</span>
        </div>

        <div className="f-share-url" title={shareUrl}>
          {shareUrl}
        </div>

        <div className="f-share-actions">
          {canNativeShare && (
            <button
              type="button"
              className="f-share-sec"
              onClick={() => void handleShareLink()}
            >
              <I n="share" s={14} />
              Partager le lien
            </button>
          )}
          <button
            type="button"
            className="f-share-sec"
            onClick={() => void handleCopyLink()}
          >
            <I n="link" s={14} />
            Copier le lien
          </button>
        </div>

        {feedback && (
          <p className="f-share-feedback" role="status">
            {feedback}
          </p>
        )}
      </div>
    </Sheet>
  );
}
