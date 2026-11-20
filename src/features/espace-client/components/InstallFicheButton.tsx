import { useEffect, useState } from "react";

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

  // Le navigateur exige un geste : on lance le prompt au premier toucher.
  useEffect(() => {
    if (!autoStart || !canInstall || installed) return;
    const go = () => install();
    window.addEventListener("pointerdown", go, { once: true });
    return () => window.removeEventListener("pointerdown", go);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, canInstall, installed]);

  if (installed) return null;
  if (!canInstall && !isIOS) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 50,
        padding: 12,
        borderRadius: 14,
        background: "#111",
        color: "#fff",
        boxShadow: "0 8px 24px rgba(0,0,0,.25)",
        textAlign: "center",
      }}
    >
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
  );
}
