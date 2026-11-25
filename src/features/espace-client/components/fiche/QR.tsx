import { useMemo } from "react";
import { qrMatrix } from "../../../../utils/qr";

/** QR code SVG de la fiche, avec logo optionnel au centre. */
export function QR({
  text,
  logo,
  size = 200,
}: {
  text: string;
  logo?: string;
  size?: number;
}) {
  const m = useMemo(() => qrMatrix(text), [text]);
  if (!m)
    return (
      <div className="qr-fallback" style={{ width: size, height: size }}>
        QR
      </div>
    );
  const q = 4,
    n = m.n + q * 2,
    rects: string[] = [];
  for (let r = 0; r < m.n; r++)
    for (let c = 0; c < m.n; c++)
      if (m.dark(r, c)) rects.push(`M${c + q} ${r + q}h1v1h-1z`);
  const hole = Math.round(m.n * 0.26),
    start = q + Math.floor((m.n - hole) / 2);
  return (
    <svg
      className="qr"
      viewBox={`0 0 ${n} ${n}`}
      width={size}
      height={size}
      role="img"
      aria-label="QR code de la fiche"
      shapeRendering="crispEdges"
    >
      <rect width={n} height={n} fill="#fff" />
      <path d={rects.join("")} fill="#0c0c0c" />
      {logo && (
        <>
          <rect
            x={start - 0.5}
            y={start - 0.5}
            width={hole + 1}
            height={hole + 1}
            rx="1.2"
            fill="#fff"
          />
          <image
            href={logo}
            x={start}
            y={start}
            width={hole}
            height={hole}
            preserveAspectRatio="xMidYMid meet"
          />
        </>
      )}
    </svg>
  );
}

/** Génère un PNG haute résolution (640×640) du QR code pour partage ou téléchargement. */
export async function qrToPngBlob(
  text: string,
  logo?: string,
  px = 640,
): Promise<Blob | null> {
  const m = qrMatrix(text);
  if (!m || typeof document === "undefined") return null;

  const q = 4;
  const total = m.n + q * 2;
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, px, px);

  const cell = px / total;
  ctx.fillStyle = "#0c0c0c";
  for (let r = 0; r < m.n; r++) {
    for (let c = 0; c < m.n; c++) {
      if (m.dark(r, c)) {
        const x = Math.floor((c + q) * cell);
        const y = Math.floor((r + q) * cell);
        const w = Math.ceil((c + q + 1) * cell) - x;
        const h = Math.ceil((r + q + 1) * cell) - y;
        ctx.fillRect(x, y, w, h);
      }
    }
  }

  if (logo) {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.crossOrigin = "anonymous";
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = logo;
      });
      const hole = Math.round(m.n * 0.26);
      const start = q + Math.floor((m.n - hole) / 2);
      const pad = 0.5 * cell;
      const bx = start * cell - pad;
      const by = start * cell - pad;
      const bs = hole * cell + pad * 2;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(bx, by, bs, bs);
      ctx.drawImage(img, start * cell, start * cell, hole * cell, hole * cell);
    } catch {
      /* Si le logo ne peut pas être chargé en CORS, on exporte le QR code sans logo */
    }
  }

  return new Promise<Blob | null>(resolve => {
    try {
      canvas.toBlob(blob => resolve(blob), "image/png");
    } catch {
      resolve(null);
    }
  });
}
