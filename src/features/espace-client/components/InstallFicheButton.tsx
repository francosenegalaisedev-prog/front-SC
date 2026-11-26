import { useEffect, useState } from "react";

const DISMISS_KEY = "sc.installBanner.dismissedAt";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

const wasDismissed = () => {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY));
    return t > 0 && Date.now() - t < DISMISS_MS;
  } catch {
    return false;
  }
};

interface Props {
  name: string;
  canInstall: boolean;
  installed: boolean;
  isIOS: boolean;
  install: () => void;
  autoStart?: boolean; // vrai quand l'URL contient ?install=1
  label?: string; // texte personnalisé (visiteur)
}

export default function InstallFicheButton({
  name,
  canInstall,
  installed,
  isIOS,
  install,
  autoStart,
  label,
}: Props) {
  const [showIOS, setShowIOS] = useState(Boolean(autoStart && isIOS));
  const [dismissed, setDismissed] = useState(wasDismissed);

  // Le navigateur exige un geste : on lance le prompt au premier toucher.
  useEffect(() => {
    if (!autoStart || !canInstall || installed || dismissed) return;
    const go = () => install();
    window.addEventListener("pointerdown", go, { once: true });
    return () => window.removeEventListener("pointerdown", go);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, canInstall, installed, dismissed]);

  const close = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* stockage indisponible */
    }
    setDismissed(true);
  };

  if (installed || dismissed) return null;
  if (!canInstall && !isIOS) return null;

  return (
    <>
      {/* Espace sous la fiche pour que le bandeau ne cache pas le bas de page */}
      <div aria-hidden style={{ height: 88 }} />
      <div
        style={{
          position: "fixed",
          left: 16,
          right: 16,
          bottom: "max(16px, env(safe-area-inset-bottom))",
          zIndex: 50,
          padding: "12px 40px 12px 12px",
          borderRadius: 14,
          background: "#111",
          color: "#fff",
          boxShadow: "0 8px 24px rgba(0,0,0,.25)",
          textAlign: "center",
        }}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Fermer"
          style={{
            position: "absolute",
            top: 6,
            right: 8,
            width: 28,
            height: 28,
            border: 0,
            background: "transparent",
            color: "#fff",
            fontSize: 20,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ×
        </button>
        {showIOS ? (
          <p style={{ margin: 0, fontSize: 14 }}>
            Touchez <strong>Partager</strong> puis{" "}
            <strong>« Sur l'écran d'accueil »</strong> pour ajouter «{" "}
            {label ? "Mes fiches" : name} ».
          </p>
        ) : (
          <button
            type="button"
            onClick={() => (isIOS ? setShowIOS(true) : install())}
            style={{
              all: "unset",
              cursor: "pointer",
              fontWeight: 600,
              width: "100%",
            }}
          >
            {label ?? <>Installer « {name} » sur mon téléphone</>}
          </button>
        )}
      </div>
    </>
  );
}
