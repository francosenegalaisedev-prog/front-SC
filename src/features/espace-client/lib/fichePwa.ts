import type { FicheRecord } from "../../../types";

export function ficheDisplayName(
  f: Pick<FicheRecord, "entreprise" | "prenom" | "nom">
): string {
  return (
    f.entreprise?.trim() || `${f.prenom} ${f.nom}`.trim() || "Ma fiche"
  );
}

export function buildFicheManifest(
  f: Pick<FicheRecord, "slug" | "entreprise" | "prenom" | "nom">
) {
  const origin = window.location.origin;
  const name = ficheDisplayName(f);
  const path = `/f/${encodeURIComponent(f.slug)}`;
  return {
    id: path,
    name,
    short_name: name.length > 12 ? name.slice(0, 12) : name,
    description: `Fiche connectée de ${name}`,
    start_url: `${origin}${path}`,
    scope: `${origin}${path}`,
    display: "standalone",
    theme_color: "#ffffff",
    background_color: "#ffffff",
    icons: [
      {
        src: `${origin}/favicon_io/android-chrome-192x192.png`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: `${origin}/favicon_io/android-chrome-512x512.png`,
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: `${origin}/favicon_io/android-chrome-512x512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

function metaTag(name: string): HTMLMetaElement {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[name="${name}"]`
  );
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  return el;
}

/** Remplace le manifest global par celui de la fiche. Retourne une fonction de nettoyage. */
export function applyFicheManifest(
  f: Pick<FicheRecord, "slug" | "entreprise" | "prenom" | "nom">
): () => void {
  const manifest = buildFicheManifest(f);
  const blob = new Blob([JSON.stringify(manifest)], {
    type: "application/manifest+json",
  });
  const url = URL.createObjectURL(blob);

  let link = document.head.querySelector<HTMLLinkElement>(
    'link[rel="manifest"]'
  );
  const created = !link;
  if (!link) {
    link = document.createElement("link");
    link.rel = "manifest";
    document.head.appendChild(link);
  }
  const prevHref = link.getAttribute("href");

  const prevTitle = document.title;
  const appleMeta = metaTag("apple-mobile-web-app-title");
  const prevApple = appleMeta.content;

  link.setAttribute("href", url);
  document.title = manifest.name;
  appleMeta.content = manifest.name;
  metaTag("apple-mobile-web-app-capable").content = "yes";

  return () => {
    if (created) link!.remove();
    else if (prevHref) link!.setAttribute("href", prevHref);
    document.title = prevTitle;
    appleMeta.content = prevApple;
    URL.revokeObjectURL(url);
  };
}