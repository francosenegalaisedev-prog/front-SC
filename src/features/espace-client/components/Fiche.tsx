import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { cssVars } from "../../../lib/css";
import { ENV } from "../../../lib/env";
import {
  configuredTabs,
  planOf,
  resolveHeader,
  visibleTabs,
} from "../../../lib/plans";
import type { FicheRecord } from "../../../types";
import { downloadVCard } from "../lib/vcard";
import "./Fiche.css";
import { I } from "./fiche/Icon";
import { QR } from "./fiche/QR";
import { Section } from "./fiche/Section";
import { Sheet } from "./fiche/Sheet";
import { initials, wa } from "./fiche/format";
import { usePullQR } from "./fiche/usePullQR";
import RappelView from "./fiche/views/RappelView";

/*
  Fiche (page publique ouverte par la carte NFC / le QR).
  - Onglets pliables, dans l'ordre et selon les droits de la formule (lib/plans.ts).
  - Entête modulable en Signature : portrait, logo, bannière, duo · 3 tailles · 4 thèmes.
  - « Tirer pour le QR » : en haut de page, on tire vers le bas → la photo remonte et le QR code
    de la fiche apparaît (avec le logo) ; on relâche → tout reprend sa place.
    Aussi : molette vers le haut (ordinateur) et bouton « NFC · QR » (accessibilité).
  - Ces outils (QR + bouton « NFC · QR » + geste) sont réservés au PROPRIÉTAIRE : il les utilise pour qu'une
    personne scanne sa fiche. Un visiteur qui l'a ouverte par un scan ne les voit pas (`ownerTools`, faux par défaut).
*/
interface FicheProps {
  fiche: FicheRecord;
  scrollerRef?: RefObject<HTMLDivElement>;
  baseUrl?: string;
  ownerTools?: boolean;
}
interface Action {
  k: string;
  n: string;
  l: string;
  href: string;
}

export default function Fiche({
  fiche,
  scrollerRef,
  baseUrl = `${ENV.VITE_PUBLIC_APP_URL}/f/`,
  ownerTools = false,
}: FicheProps) {
  const publicAppUrl = (
    import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin
  ).replace(/\/+$/, "");
  const root = useRef<HTMLDivElement>(null);
  const [held, setHeld] = usePullQR(root, scrollerRef, ownerTools);
  const e = resolveHeader(fiche);
  const tabs = visibleTabs(fiche);
  const rappelTab = tabs.find(t => t.type === "rappel");
  const callbackLabel =
    rappelTab?.titre && rappelTab.titre !== "Être rappelé"
      ? rappelTab.titre
      : "Échangez contact";
  const hasConfiguredRappel = configuredTabs(fiche).some(
    t => t.type === "rappel",
  );
  const canRequestCallback = Boolean(
    planOf(fiche).hasForm && (rappelTab || !hasConfiguredRappel),
  );
  const sections = tabs.filter(t => t.type !== "rappel");
  const [open, setOpen] = useState(
    () => new Set(sections.slice(0, 1).map(t => t.id)),
  );
  const [rappelOpen, setRappelOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");
  const shareTimerRef = useRef<number | null>(null);

  const shareUrl = `${baseUrl ?? `${publicAppUrl}/f/`}${fiche.slug}`;
  const url = `${shareUrl}?source=qr`;
  const name = `${fiche.prenom} ${fiche.nom}`.trim();

  useEffect(
    () => () => {
      if (shareTimerRef.current !== null) {
        window.clearTimeout(shareTimerRef.current);
      }
    },
    [],
  );

  const flashShare = (label: string) => {
    setShareFeedback(label);
    if (shareTimerRef.current !== null) {
      window.clearTimeout(shareTimerRef.current);
    }
    shareTimerRef.current = window.setTimeout(() => {
      setShareFeedback("");
      shareTimerRef.current = null;
    }, 2200);
  };

  const handleShare = async () => {
    const title = name || fiche.entreprise || "Support Connecté";
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        flashShare("Lien copié");
        return;
      } catch {
        /* fallback ci-dessous */
      }
    }
    flashShare("Copie impossible");
  };
  const siteHref = fiche.site?.trim()
    ? /^https?:\/\//i.test(fiche.site.trim())
      ? fiche.site.trim()
      : `https://${fiche.site.trim()}`
    : "";
  const actions = [
    fiche.whatsapp && {
      k: "whatsapp",
      n: "wa",
      l: "WhatsApp",
      href: wa(fiche.whatsapp, fiche.data.messageWhatsapp),
    },
    fiche.telephone && {
      k: "appel",
      n: "phone",
      l: "Appeler",
      href: `tel:${fiche.telephone.replace(/\s/g, "")}`,
    },
    fiche.email && {
      k: "email",
      n: "mail",
      l: "E-mail",
      href: `mailto:${fiche.email}`,
    },
    siteHref && {
      k: "site",
      n: "globe",
      l: "Mon site",
      href: siteHref,
    },
  ]
    .filter((a): a is Action => !!a)
    .sort(
      (a, b) =>
        Number(b.k === fiche.data.premierBouton) -
        Number(a.k === fiche.data.premierBouton)
    );
  const avatar = (cls = "") => (
    <span className={`f-av ${cls}`}>
      {fiche.photo ? <img src={fiche.photo} alt={name} /> : initials(fiche)}
    </span>
  );
  const logo = (cls = "") =>
    fiche.logo ? (
      <span className={`f-logo ${cls}`}>
        <img src={fiche.logo} alt={fiche.entreprise || name} />
      </span>
    ) : null;

  useEffect(() => {
    root.current!.style.setProperty("--pull", held ? "210" : "0");
    root.current!.style.setProperty("--p01", held ? "1" : "0");
    root.current!.classList.toggle("pulling", held);
    root.current!.classList.add("rel");
  }, [held]);

  return (
    <div
      className={`fiche th-${e.theme} ly-${e.disposition} sz-${e.taille} f-${fiche.formule}`}
      ref={root}
    >
      <header
        className="f-hero"
        style={
          e.couverture
            ? cssVars({ "--cover": `url(${e.couverture})` })
            : undefined
        }
      >
        <div className="f-chips">
          <button
            type="button"
            className="f-share-btn"
            onClick={() => void handleShare()}
            aria-label="Partager la fiche"
          >
            <I n="share" s={12} />
            {shareFeedback || "Partager"}
          </button>
          {ownerTools && (
            <button onClick={() => setHeld(h => !h)} aria-pressed={held}>
              <I n="qr" s={12} />
              NFC · QR
            </button>
          )}
        </div>
        {ownerTools && (
          <div className="f-qrp" aria-hidden={!held}>
            <QR text={url} logo={fiche.logo} size={176} />
            <p>Scannez pour ouvrir la fiche de {fiche.prenom}</p>
          </div>
        )}
        <div className="f-id">
          {e.disposition === "portrait" && (
            <>
              {avatar()}
              <div className="f-names">
                <h1>{name}</h1>
                <p>{fiche.fonction}</p>
                {fiche.entreprise && (
                  <span className="f-org">{fiche.entreprise}</span>
                )}
              </div>
            </>
          )}
          {e.disposition === "duo" && (
            <>
              <span className="f-duo">
                {avatar()}
                {logo("badge")}
              </span>
              <div className="f-names">
                <h1>{name}</h1>
                <p>{fiche.fonction}</p>
                {fiche.entreprise && (
                  <span className="f-org">{fiche.entreprise}</span>
                )}
              </div>
            </>
          )}
          {e.disposition === "logo" && (
            <div className="f-center">
              {logo("big") || avatar()}
              <h1>{name}</h1>
              <p>{fiche.fonction}</p>
            </div>
          )}
          {e.disposition === "banniere" && (
            <div className="f-ban">
              {avatar()}
              <div className="f-names">
                <h1>{name}</h1>
                <p>
                  {fiche.fonction}
                  {fiche.entreprise ? ` · ${fiche.entreprise}` : ""}
                </p>
              </div>
            </div>
          )}
        </div>
        <p className="f-hint">
          <I n="down" s={12} />
          Tirez vers le bas pour afficher le QR code
        </p>
        <nav className="f-acts">
          {actions.map((a, i) => (
            <a
              key={a.k}
              href={a.href}
              className={[
                i === 0 ? "primary" : "",
                a.k === "whatsapp" ? "whatsapp" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              target={
                a.k === "whatsapp" || a.k === "site" ? "_blank" : undefined
              }
              rel="noreferrer"
            >
              <I n={a.n} s={14} />
              {a.l}
            </a>
          ))}
        </nav>
        {canRequestCallback && (
          <button
            type="button"
            className="f-rappel-cta"
            onClick={() => setRappelOpen(true)}
          >
            <I n="chat" s={15} />
            {callbackLabel}
          </button>
        )}
      </header>
      <main className="f-body">
        {sections.map(t => (
          <Section
            key={t.id}
            tab={t}
            fiche={fiche}
            open={open.has(t.id)}
            onToggle={() =>
              setOpen(s => {
                const n = new Set(s);
                n.has(t.id) ? n.delete(t.id) : n.add(t.id);
                return n;
              })
            }
          />
        ))}
        <footer className="f-foot">
          <div>
            <span>Mentions légales · Confidentialité</span>
            <a href={publicAppUrl} target="_blank" rel="noreferrer">
              Support Connecté <I n="arrow" s={11} />
            </a>
          </div>
          <p>
            Les informations envoyées via cette fiche servent uniquement à
            répondre à votre demande. Vous pouvez demander leur suppression en
            contactant l’établissement.
          </p>
          {fiche.enLigneSeule && (
            <a
              className="f-badge"
              href={publicAppUrl}
              target="_blank"
              rel="noreferrer"
            >
              Créée avec <b>Support Connecté</b>
            </a>
          )}
        </footer>
      </main>
      <button className="f-save" onClick={() => downloadVCard(fiche, url)}>
        <I n="down" s={15} />
        Enregistrer le contact
      </button>
      {rappelOpen && (
        <Sheet
          onClose={() => setRappelOpen(false)}
          label={callbackLabel}
        >
          <div className="f-sheet-b f-rappel-sheet">
            <h3>{callbackLabel}</h3>
            <RappelView
              fiche={fiche}
              tab={
                rappelTab ?? {
                  id: "rappel",
                  type: "rappel",
                  titre: "Échangez contact",
                  visible: true,
                }
              }
            />
          </div>
        </Sheet>
      )}
    </div>
  );
}

/* ---------- Feuille modale (plat, bien) ---------- */
