import { useState } from "react";
import { usePortefeuille } from "../hooks/usePortefeuille";

export default function PortefeuillePage() {
  const { fiches, remove } = usePortefeuille();
  const [q, setQ] = useState("");
  const shown = fiches.filter((f) =>
    f.name.toLowerCase().includes(q.trim().toLowerCase())
  );

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22 }}>Mes fiches</h1>

      <div
        style={{
          padding: 12,
          borderRadius: 12,
          background: "#f4f4f5",
          fontSize: 14,
          margin: "12px 0",
        }}
      >
        Crée un compte pour ne pas perdre tes fiches si tu changes de téléphone.
        {/* Phase 2 : lien vers l'inscription */}
      </div>

      {fiches.length > 0 && (
        <input
          type="search"
          placeholder="Rechercher une fiche"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 10,
            border: "1px solid #ddd",
            marginBottom: 12,
          }}
        />
      )}

      {fiches.length === 0 ? (
        <p style={{ color: "#666" }}>
          Aucune fiche pour le moment. Scanne un QR code : la fiche s'ajoutera
          ici.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gap: 8,
          }}
        >
          {shown.map((f) => (
            <li
              key={f.slug}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 10,
                border: "1px solid #eee",
                borderRadius: 12,
              }}
            >
              {f.logo ? (
                <img
                  src={f.logo}
                  alt=""
                  width={44}
                  height={44}
                  style={{ borderRadius: 10, objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: "#e4e4e7",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                  }}
                >
                  {f.name.charAt(0).toUpperCase()}
                </div>
              )}
              <a
                href={`/f/${encodeURIComponent(f.slug)}`}
                style={{ flex: 1, color: "inherit", textDecoration: "none" }}
              >
                <strong>{f.name}</strong>
                <div style={{ fontSize: 12, color: "#777" }}>
                  {new Date(f.scannedAt).toLocaleDateString("fr-FR")}
                </div>
              </a>
              <button
                type="button"
                onClick={() => remove(f.slug)}
                aria-label={`Retirer ${f.name}`}
                style={{
                  border: 0,
                  background: "none",
                  cursor: "pointer",
                  fontSize: 18,
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
