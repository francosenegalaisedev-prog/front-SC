import { useState } from "react";
import { usePortefeuille } from "../hooks/usePortefeuille";

const INK = "#111";
const RED = "#e0192d";
const BG = "#e8e5df";
const MUTED = "#777";
const SERIF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif";

const pill = (variant: "dark" | "line" | "red"): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 16px",
  borderRadius: 999,
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  textDecoration: "none",
  border: `1px solid ${variant === "red" ? RED : variant === "dark" ? INK : "#ddd"}`,
  background: variant === "dark" ? INK : "#fff",
  color: variant === "dark" ? "#fff" : variant === "red" ? RED : INK,
});

export default function PortefeuillePage() {
  const { fiches, remove } = usePortefeuille();
  const [q, setQ] = useState("");
  const personOf = (f: (typeof fiches)[number]) =>
    `${f.snapshot?.prenom ?? ""} ${f.snapshot?.nom ?? ""}`.trim();
  const shown = fiches.filter((f) =>
    `${f.name} ${personOf(f)}`
      .toLowerCase()
      .includes(q.trim().toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: BG, color: INK }}>
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 16px 48px" }}>
        <div
          style={{
            color: RED,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          Support Connecté
        </div>
        <h1 style={{ fontFamily: SERIF, fontSize: 44, fontWeight: 500, margin: "4px 0 4px" }}>
          Mes fiches
        </h1>
        <p style={{ color: MUTED, margin: "0 0 24px" }}>
          Les fiches que tu as scannées, gardées sur ton téléphone.
        </p>

        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: 16,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 200, fontSize: 14 }}>
            <strong>Ne perds pas tes fiches</strong>
            <div style={{ color: MUTED }}>
              Crée un compte pour les retrouver si tu changes de téléphone.
            </div>
          </div>
          {/* Phase 2 : lien vers l'inscription */}
          <span style={{ ...pill("dark"), opacity: 0.5 }}>Bientôt</span>
        </div>

        {fiches.length > 0 && (
          <input
            type="search"
            placeholder="Rechercher une fiche"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid #ddd",
              background: "#fff",
              fontSize: 15,
              marginBottom: 16,
            }}
          />
        )}

        {fiches.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 24,
              color: MUTED,
              textAlign: "center",
            }}
          >
            Aucune fiche pour le moment. Scanne un QR code : la fiche s'ajoutera ici.
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
            {shown.map((f) => (
              <li
                key={f.slug}
                style={{
                  background: "#fff",
                  borderRadius: 20,
                  padding: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                {f.logo ? (
                  <img
                    src={f.logo}
                    alt=""
                    width={56}
                    height={56}
                    style={{ borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      background: INK,
                      color: "#e8c35a",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 700,
                      fontSize: 20,
                    }}
                  >
                    {f.name.charAt(0).toLowerCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{f.name}</div>
                  {personOf(f) && personOf(f) !== f.name && (
                    <div style={{ fontSize: 14 }}>{personOf(f)}</div>
                  )}
                  <div style={{ fontSize: 13, color: MUTED }}>
                    Scannée le {new Date(f.scannedAt).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                <a href={`/f/${encodeURIComponent(f.slug)}`} style={pill("dark")}>
                  Ouvrir
                </a>
                <button
                  type="button"
                  onClick={() => remove(f.slug)}
                  aria-label={`Retirer ${f.name}`}
                  style={pill("red")}
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
