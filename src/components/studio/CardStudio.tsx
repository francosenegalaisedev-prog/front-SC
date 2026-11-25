import type {
  CSSProperties,
  DragEvent,
  FormEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useEffect, useRef, useState } from "react";
import { DESIGNER, STUDIO } from "../../data/studio";
import {
  createCardRequest,
  uploadClientCardImage,
  type CardRequest,
} from "../../features/espace-client/espaceClient.service";
import { toApiError } from "../../lib/apiError";
import { cssVars } from "../../lib/css";
import type { PrintFiles, Tier } from "../../lib/print";
import { CARD, dataUrlToBlob, download, renderCard } from "../../lib/print";
import { QR, ficheUrl, slugify } from "../../lib/qr";
import type { LeadBase } from "../../utils/lead";
import sendLead from "../../utils/lead";
import track from "../../utils/track";
import { Icon } from "../Icons";

/*
  Carte qui s'écrit en direct — page Cartes : <CardStudio designer />.
  Toutes les formules (Essentielle, Pro, Signature) bénéficient de la personnalisation complète sans limite :
  • Tous les fonds prédéfinis + photos importées recto/verso + logo personnalisé + couleur d'accent hex + couleur des textes hex + réglages.
  • Mode `clientFiche` : formule associée à la fiche active sélectionnée,
    pré-remplissage des coordonnées, génération & upload des aperçus recto/verso + photos/logo,
    et envoi de la vraie demande `POST /api/fiches/:id/card-request` avec toutes les métadonnées.
*/
interface Fields {
  name: string;
  role: string;
  company: string;
  phone: string;
  email: string;
}
type FieldKey = keyof Fields;
interface Design {
  bg: string;
  upload: string | null;
  uploadName: string;
  uploadData: string;
  uploadFile: File | null;
  logo: string | null;
  logoName: string;
  logoData: string;
  logoFile: File | null;
  logoSize: number;
  accent: string;
  ink: string | null;
  zoom: number;
  posX: number;
  posY: number;
  dim: number;
  back: string;
  backUpload: string | null;
  backUploadName: string;
  backUploadData: string;
  backUploadFile: File | null;
  backDim: number;
}
type Errors = Partial<
  Record<
    FieldKey | "reach" | "file" | "adresseLivraison" | "telephoneLivraison",
    string
  >
>;
type FileKind = "logo" | "back" | "bg";
type State = "edit" | "encoding" | "done" | "fail";

export interface StudioClientFiche {
  id: number;
  slug: string;
  tier: Tier;
  name: string;
  role: string;
  company: string;
  phone: string;
  email: string;
  onSubmitted?: (carte: CardRequest) => void;
}

const EMPTY: Fields = { name: "", role: "", company: "", phone: "", email: "" };
const D0: Design = {
  bg: "noir",
  upload: null,
  uploadName: "",
  uploadData: "",
  uploadFile: null,
  logo: null,
  logoName: "",
  logoData: "",
  logoFile: null,
  logoSize: 62,
  accent: "#c9a25b",
  ink: null,
  zoom: 100,
  posX: 50,
  posY: 50,
  dim: 40,
  back: "noir",
  backUpload: null,
  backUploadName: "",
  backUploadData: "",
  backUploadFile: null,
  backDim: 55,
};
const MAX = 5 * 1024 * 1024;
const INLINE = 1.5 * 1024 * 1024;
const INK = { light: "#ffffff", dark: "#1b1712" };

const DEFAULT_CARD_PRICE_FCFA = 15_000;

function hexToRgbString(hex: string): string | null {
  const clean = hex.trim().replace(/^#/, "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map(c => c + c)
          .join("")
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function CardStudio({
  id = "creer-ma-carte",
  designer = false,
  cardPriceFcfa = DEFAULT_CARD_PRICE_FCFA,
  clientFiche,
}: {
  id?: string;
  designer?: boolean;
  cardPriceFcfa?: number;
  clientFiche?: StudioClientFiche;
}) {
  const isClientMode = Boolean(clientFiche);
  const [tier, setTier] = useState<Tier>(
    clientFiche?.tier ?? (designer ? "signature" : "pro"),
  );
  const [d, setD] = useState<Fields>(
    clientFiche
      ? {
          name: clientFiche.name,
          role: clientFiche.role,
          company: clientFiche.company,
          phone: clientFiche.phone,
          email: clientFiche.email,
        }
      : EMPTY,
  );
  const [adresseLivraison, setAdresseLivraison] = useState("");
  const [telephoneLivraison, setTelephoneLivraison] = useState(
    clientFiche?.phone ?? "",
  );
  const [notesClient, setNotesClient] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [ds, setDs] = useState<Design>(D0);
  const [focus, setFocus] = useState<FieldKey | null>(null);
  const [back, setBack] = useState(false);
  const [optin, setOptin] = useState(false);
  const [err, setErr] = useState<Errors>({});
  const [drag, setDrag] = useState(false);
  const [state, setState] = useState<State>("edit");
  const [print, setPrint] = useState<PrintFiles | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const urls = useRef<string[]>([]);

  // Synchronise la fiche active sélectionnée dans l'espace client
  useEffect(() => {
    if (!clientFiche) return;
    setTier(clientFiche.tier);
    setD({
      name: clientFiche.name,
      role: clientFiche.role,
      company: clientFiche.company,
      phone: clientFiche.phone,
      email: clientFiche.email,
    });
    setTelephoneLivraison(prev => prev || clientFiche.phone);
    setState("edit");
    setErr({});
    setSubmitError("");
  }, [
    clientFiche?.id,
    clientFiche?.tier,
    clientFiche?.name,
    clientFiche?.role,
    clientFiche?.company,
    clientFiche?.phone,
    clientFiche?.email,
  ]);

  const T = STUDIO.tiers.find(t => t.id === tier)!;

  const availablePresets = DESIGNER.presets;
  const effectiveBg = ds.bg;
  const effectiveBack = ds.back;

  const P = DESIGNER.presets.find(p => p.id === effectiveBg);
  const PB = DESIGNER.presets.find(
    p => p.id === (effectiveBack === "same" ? effectiveBg : effectiveBack),
  );
  const files = [ds.logoName, ds.uploadName, ds.backUploadName].filter(
    (x): x is string => Boolean(x),
  );

  useEffect(() => {
    const t = (e: Event) => {
      if (isClientMode) return;
      const x = (e as CustomEvent<string>).detail;
      const found = STUDIO.tiers.find(y => y.id === x);
      if (found) {
        setTier(found.id);
        setState("edit");
      }
    };
    window.addEventListener("studio:tier", t);
    return () => {
      window.removeEventListener("studio:tier", t);
      urls.current.forEach(u => URL.revokeObjectURL(u));
    };
  }, [isClientMode]);

  const set = (k: FieldKey, v: string) => {
    if (!started.current) {
      started.current = true;
      track("studio_start", { tier });
    }
    setD(x => ({ ...x, [k]: v }));
    setErr(e => ({ ...e, [k]: undefined, reach: undefined }));
  };
  const onFieldFocus = (k: FieldKey) => {
    setFocus(k);
    setBack(true);
  };
  const setDesign = <K extends keyof Design>(
    k: K,
    v: Design[K],
    face?: "front" | "back",
  ) => {
    setDs(x => ({ ...x, [k]: v }));
    if (face === "front") setBack(false);
    if (face === "back") setBack(true);
  };
  const pickTier = (x: Tier) => {
    if (isClientMode) return;
    setTier(x);
    track("studio_tier", { tier: x });
  };

  const readFile = (f: File | undefined, kind: FileKind) => {
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      setErr(e => ({ ...e, file: DESIGNER.fileErr.type }));
      return;
    }
    if (f.size > MAX) {
      setErr(e => ({ ...e, file: DESIGNER.fileErr.size }));
      return;
    }
    setErr(e => ({ ...e, file: undefined }));
    const url = URL.createObjectURL(f);
    urls.current.push(url);
    const apply = (data: string) =>
      setDs(
        (x): Design =>
          kind === "logo"
            ? { ...x, logo: url, logoName: f.name, logoData: data, logoFile: f }
            : kind === "back"
              ? {
                  ...x,
                  back: "upload",
                  backUpload: url,
                  backUploadName: f.name,
                  backUploadData: data,
                  backUploadFile: f,
                }
              : {
                  ...x,
                  upload: url,
                  uploadName: f.name,
                  uploadData: data,
                  uploadFile: f,
                  bg: "upload",
                  zoom: 100,
                  posX: 50,
                  posY: 50,
                },
      );
    if (f.size <= INLINE) {
      const r = new FileReader();
      r.onload = () => apply(r.result as string);
      r.readAsDataURL(f);
    } else apply("");
    setBack(kind === "back");
    track("studio_upload", { kind });
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDrag(false);
    readFile(e.dataTransfer.files[0], back ? "back" : "bg");
  };

  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (window.matchMedia("(hover: none)").matches || !card.current) return;
    const r = card.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.current.style.setProperty("--ry", `${x * 18}deg`);
    card.current.style.setProperty("--rx", `${-y * 12}deg`);
    card.current.style.setProperty("--gx", `${(x + 0.5) * 100}%`);
    card.current.style.setProperty("--gy", `${(y + 0.5) * 100}%`);
  };
  const leave = () => {
    if (!card.current) return;
    card.current.style.setProperty("--ry", "0deg");
    card.current.style.setProperty("--rx", "0deg");
  };

  const validate = () => {
    const e: Errors = {};
    if (!d.name.trim()) e.name = STUDIO.errors.name;
    if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim()))
      e.email = STUDIO.errors.email;
    if (d.phone.trim() && d.phone.replace(/\D/g, "").length < 9)
      e.phone = STUDIO.errors.phone;
    if (!d.phone.trim() && !d.email.trim()) e.reach = STUDIO.errors.reach;
    if (isClientMode) {
      if (adresseLivraison.trim().length < 5)
        e.adresseLivraison = "Indiquez une adresse de livraison (5 caractères min.).";
      if (telephoneLivraison.replace(/\D/g, "").length < 6)
        e.telephoneLivraison = "Indiquez un numéro de téléphone de livraison valide.";
    }
    setErr(e);
    return !Object.keys(e).length;
  };

  const photoF = Boolean(ds.upload || P?.img);
  const backImg =
    effectiveBack === "upload"
      ? ds.backUpload
      : effectiveBack === "same"
        ? ds.upload || P?.img
        : PB?.img;

  const inkFront = ds.ink || INK[photoF ? "light" : P?.ink || "light"];
  const inkBack = ds.ink || INK[backImg ? "light" : PB?.ink || "light"];
  const accentHex = ds.accent;

  const slug =
    clientFiche?.slug || slugify(d.name || d.company) || "votre-fiche";
  const backPreset =
    effectiveBack === "same"
      ? ds.upload
        ? "upload"
        : effectiveBg
      : effectiveBack;

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setBack(false);
    setState("encoding");
    setSubmitError("");

    const pf = await renderCard({
      tier,
      ds: {
        ...ds,
        bg: effectiveBg,
        back: effectiveBack,
        bgImg: P?.img,
        backImg: PB?.img,
        upload: ds.upload,
        backUpload: ds.backUpload,
        logo: ds.logo,
        ink: ds.ink,
      },
      fields: {
        name: d.name.trim(),
        role: d.role.trim(),
        company: d.company.trim(),
        phone: d.phone.trim(),
        email: d.email.trim(),
      },
      url: ficheUrl(slug),
      logoFallback: "/images/logo-blanc.webp",
    });
    setPrint(pf);

    // ── Mode espace client : upload des aperçus + photos/logo et création du PrintJob ──
    if (clientFiche) {
      try {
        const [rectoUploaded, versoUploaded] = await Promise.all([
          uploadClientCardImage(
            clientFiche.id,
            dataUrlToBlob(pf.recto),
            "image/png",
          ),
          uploadClientCardImage(
            clientFiche.id,
            dataUrlToBlob(pf.verso),
            "image/png",
          ),
        ]);

        const uploadOptionalAsset = async (
          file: File | null,
        ): Promise<string | null> => {
          if (!file || !/^image\/(jpeg|png|webp)$/i.test(file.type))
            return null;
          try {
            const res = await uploadClientCardImage(
              clientFiche.id,
              file,
              file.type,
            );
            return res.url;
          } catch {
            return null;
          }
        };

        const [logoUrl, photoRectoUrl, photoVersoUrl] = await Promise.all([
          uploadOptionalAsset(ds.logoFile),
          ds.bg === "upload"
            ? uploadOptionalAsset(ds.uploadFile)
            : Promise.resolve(null),
          ds.back === "upload"
            ? uploadOptionalAsset(ds.backUploadFile)
            : Promise.resolve(null),
        ]);

        const fondRectoLabel =
          ds.bg === "upload"
            ? `Photo importée (${ds.uploadName})`
            : (P?.label ?? effectiveBg);
        const fondVersoLabel =
          effectiveBack === "same"
            ? "Comme le recto"
            : effectiveBack === "upload"
              ? `Photo importée (${ds.backUploadName})`
              : (PB?.label ?? effectiveBack);

        const designMetadata: Record<string, unknown> = {
          tier,
          texte: {
            nom: d.name.trim(),
            fonction: d.role.trim() || null,
            entreprise: d.company.trim() || null,
            telephone: d.phone.trim() || null,
            email: d.email.trim() || null,
          },
          fondRecto: effectiveBg,
          fondRectoLabel,
          fondVerso: backPreset,
          fondVersoLabel,
          couleurAccentHex: accentHex,
          couleurAccentRgb: hexToRgbString(accentHex),
          couleurTexteRectoHex: inkFront,
          couleurTexteRectoRgb: hexToRgbString(inkFront),
          couleurTexteVersoHex: inkBack,
          couleurTexteVersoRgb: hexToRgbString(inkBack),
          couleurTexteMode: ds.ink ? "personnalisee" : "auto",
          logoUrl,
          logoNom: ds.logoName || null,
          tailleLogo: ds.logoSize,
          photoRectoUrl: photoRectoUrl ?? (P?.img ?? null),
          photoVersoUrl:
            photoVersoUrl ??
            (backImg && effectiveBack !== "upload" ? backImg : null),
          zoom: photoF ? ds.zoom : null,
          posX: photoF ? ds.posX : null,
          posY: photoF ? ds.posY : null,
          assombrirRecto: photoF ? ds.dim : null,
          assombrirVerso: backImg ? ds.backDim : null,
        };

        const carte = await createCardRequest(clientFiche.id, {
          adresseLivraison: adresseLivraison.trim(),
          telephoneLivraison: telephoneLivraison.trim(),
          ...(notesClient.trim() ? { notesClient: notesClient.trim() } : {}),
          rectoUrl: rectoUploaded.url,
          versoUrl: versoUploaded.url,
          design: designMetadata,
        });

        setState("done");
        clientFiche.onSubmitted?.(carte);
      } catch (cause) {
        setSubmitError(
          toApiError(cause, "Impossible d’enregistrer votre demande de carte.")
            .message,
        );
        setState("fail");
      }
      return;
    }

    // ── Mode vitrine public (lead) ──
    const fondVerso =
      effectiveBack === "same"
        ? "comme le recto"
        : effectiveBack === "upload"
          ? `image importée (${ds.backUploadName})`
          : DESIGNER.presets.find(p => p.id === effectiveBack)?.label;
    const design = designer
      ? {
          recto: "logo",
          logo: ds.logoName || "aucun (nom de l’entreprise)",
          taille_logo: ds.logoSize,
          fond: ds.upload ? `image importée (${ds.uploadName})` : P?.label,
          fond_verso: fondVerso,
          accent: accentHex,
          couleur_textes: ds.ink ? ds.ink : `${inkFront} (auto)`,
          zoom: ds.zoom,
          cadrage: `${ds.posX} % / ${ds.posY} %`,
          assombrir: ds.dim,
          assombrir_verso: ds.backDim,
          fond_fichier: ds.uploadData || undefined,
          fond_verso_fichier: ds.backUploadData || undefined,
          logo_fichier: ds.logoData || undefined,
        }
      : null;
    const now = new Date().toISOString();
    const payload: LeadBase & Record<string, unknown> = {
      intent: "maquette",
      intentLabel: `${designer ? DESIGNER.send[tier] : "Maquette"} — carte ${T.label}`,
      products: [`Carte ${T.label}`],
      sector: "",
      name: d.name.trim(),
      company: d.company.trim(),
      role: d.role.trim(),
      phone: d.phone.trim(),
      email: d.email.trim(),
      city: "",
      prefer: "",
      message: [
        `Fonction : ${d.role.trim() || "—"}`,
        design
          ? `Design : fond ${design.fond} · verso ${design.fond_verso} · accent ${design.accent} · textes ${design.couleur_textes}`
          : null,
        design && files.length
          ? `Fichiers personnalisés : ${files.join(", ")} (à transmettre séparément)`
          : null,
        `Consentement marketing : ${optin ? "OUI" : "NON"} (${now})`,
      ]
        .filter(Boolean)
        .join("\n"),
      design,
      consent_marketing: optin,
      consent_text: optin ? STUDIO.optin : "",
      consent_at: optin ? now : undefined,
      source: designer ? "configurateur" : "card-studio",
      page: window.location.pathname,
    };
    payload.print = {
      slug,
      url_fiche: ficheUrl(slug),
      recto: pf.recto,
      verso: pf.verso,
      fiche: pf.fiche,
    };
    await new Promise(r => setTimeout(r, 600));
    try {
      const r = await sendLead(payload);
      track("studio_submit", {
        tier,
        optin,
        intent: payload.intent,
        mode: r.mode,
      });
      setState("done");
    } catch {
      setState("fail");
    }
  };

  const v = (k: FieldKey) => d[k].trim();
  const Line = ({
    k,
    className,
    icon,
  }: {
    k: FieldKey;
    className: string;
    icon?: string;
  }) => (
    <span
      className={`cs-l ${className}${v(k) ? "" : " ph"}${focus === k ? " typing" : ""}`}
    >
      {icon && <Icon id={icon} />}
      <span className="cs-t">
        {v(k) || STUDIO.fields.find(f => f.k === k)!.ph}
      </span>
    </span>
  );

  const bgFront: CSSProperties | undefined = photoF
    ? {
        backgroundImage: `url(${ds.upload || P?.img})`,
        backgroundSize: `${ds.zoom}% auto`,
        backgroundPosition: `${ds.posX}% ${ds.posY}%`,
      }
    : undefined;
  const bgBack: CSSProperties | undefined = backImg
    ? {
        backgroundImage: `url(${backImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  const sendLabel = isClientMode
    ? `Commander ma carte (${cardPriceFcfa.toLocaleString("fr-FR")} FCFA)`
    : designer
      ? DESIGNER.send[tier]
      : STUDIO.send;
  const done = state === "done";
  const H = designer ? DESIGNER : STUDIO;

  const fileBtn = (kind: FileKind, label: string, has: string | null) => (
    <label className="cs-filebtn">
      <input
        type="file"
        accept="image/*"
        onChange={e => {
          readFile(e.target.files?.[0], kind);
          e.target.value = "";
        }}
      />
      {has ? <img src={has} alt="" /> : <Icon id="i-card" />}
      <span>{has ? DESIGNER.replace : label}</span>
    </label>
  );

  return (
    <section className={`studio${designer ? " designer" : ""}`} id={id}>
      <div className="wrap cs-grid">
        <div className="cs-left">
          <p className="label">{isClientMode ? "Votre carte physique" : H.label}</p>
          <h2 className="h2">
            {H.title} <em className="red">{H.red}</em>
          </h2>
          <p className="cs-p">
            {isClientMode
              ? `Formule active de la fiche : ${T.label} · Carte personnalisée : ${cardPriceFcfa.toLocaleString("fr-FR")} FCFA (paiement à la livraison).`
              : H.text}
          </p>

          {!isClientMode && (
            <div
              className="cs-tiers"
              role="radiogroup"
              aria-label="Niveau de carte"
            >
              {STUDIO.tiers.map(t => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={tier === t.id}
                  className={tier === t.id ? "on" : ""}
                  onClick={() => pickTier(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
          <p className="cs-note">
            Personnalisez librement votre carte : logo, fonds, photos
            recto/verso, couleur d’accent et couleur des textes.
          </p>

          {designer && (
            <div className="cs-design open">
              <div className="cs-dz">
                <p className="cs-dk">
                  <Icon id="i-pen" />
                  {DESIGNER.panel} · {T.label}
                </p>
                <div className="cs-faces">
                  <button
                    type="button"
                    className={!back ? "on" : ""}
                    onClick={() => setBack(false)}
                  >
                    {DESIGNER.faceFront}
                  </button>
                  <button
                    type="button"
                    className={back ? "on" : ""}
                    onClick={() => setBack(true)}
                  >
                    {DESIGNER.faceBack}
                  </button>
                </div>

                {!back ? (
                  <>
                    <p className="cs-sk">{DESIGNER.logoLabel}</p>
                    <div className="cs-logo-ctl">
                      {fileBtn("logo", DESIGNER.uploadLogo, ds.logo)}
                      {ds.logo && (
                        <button
                          type="button"
                          className="cs-mini"
                          onClick={() =>
                            setDs(x => ({
                              ...x,
                              logo: null,
                              logoName: "",
                              logoData: "",
                              logoFile: null,
                            }))
                          }
                        >
                          {DESIGNER.remove}
                        </button>
                      )}
                    </div>
                    <label className="cs-sl">
                      <span>{DESIGNER.logoSize}</span>
                      <input
                        type="range"
                        min="30"
                        max="95"
                        value={ds.logoSize}
                        onChange={e =>
                          setDesign(
                            "logoSize",
                            Number(e.target.value),
                            "front",
                          )
                        }
                        style={cssVars({ "--p": (ds.logoSize - 30) / 65 })}
                      />
                    </label>
                    <p className="cs-hint">{DESIGNER.logoHint}</p>

                    <p className="cs-sk">{DESIGNER.bgLabel}</p>
                    <div
                      className="cs-presets"
                      role="radiogroup"
                      aria-label={DESIGNER.bgLabel}
                    >
                      {availablePresets.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          role="radio"
                          aria-checked={effectiveBg === p.id}
                          className={`pz pz-${p.id}${effectiveBg === p.id ? " on" : ""}`}
                          onClick={() => setDesign("bg", p.id, "front")}
                          style={
                            p.img
                              ? { backgroundImage: `url(${p.img})` }
                              : undefined
                          }
                        >
                          <span>{p.label}</span>
                        </button>
                      ))}
                      <label
                        className={`pz pz-up${effectiveBg === "upload" ? " on" : ""}`}
                        style={
                          ds.upload
                            ? { backgroundImage: `url(${ds.upload})` }
                            : undefined
                        }
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            readFile(e.target.files?.[0], "bg");
                            e.target.value = "";
                          }}
                        />
                        <Icon id="i-scan" />
                        <span>
                          {ds.upload ? DESIGNER.replace : DESIGNER.upload}
                        </span>
                      </label>
                    </div>

                    {photoF && (
                      <div className="cs-tune">
                        <p className="cs-sk">{DESIGNER.tuneLabel}</p>
                        {(
                          [
                            ["zoom", DESIGNER.zoom, 100, 250],
                            ["posX", DESIGNER.posX, 0, 100],
                            ["posY", DESIGNER.posY, 0, 100],
                            ["dim", DESIGNER.dim, 0, 85],
                          ] as const
                        ).map(([k, l, a, b]) => (
                          <label key={k} className="cs-sl">
                            <span>{l}</span>
                            <input
                              type="range"
                              min={a}
                              max={b}
                              value={ds[k]}
                              onChange={e =>
                                setDesign(k, Number(e.target.value), "front")
                              }
                              style={cssVars({
                                "--p": (ds[k] - a) / (b - a),
                              })}
                            />
                          </label>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="cs-sk">{DESIGNER.backLabel}</p>
                    <div
                      className="cs-presets"
                      role="radiogroup"
                      aria-label={DESIGNER.backLabel}
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={effectiveBack === "same"}
                        className={`pz pz-same${effectiveBack === "same" ? " on" : ""}`}
                        onClick={() => setDesign("back", "same", "back")}
                      >
                        <span>{DESIGNER.sameAsFront}</span>
                      </button>
                      {availablePresets.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          role="radio"
                          aria-checked={effectiveBack === p.id}
                          className={`pz pz-${p.id}${effectiveBack === p.id ? " on" : ""}`}
                          onClick={() => setDesign("back", p.id, "back")}
                          style={
                            p.img
                              ? { backgroundImage: `url(${p.img})` }
                              : undefined
                          }
                        >
                          <span>{p.label}</span>
                        </button>
                      ))}
                      <label
                        className={`pz pz-up${effectiveBack === "upload" ? " on" : ""}`}
                        style={
                          ds.backUpload
                            ? { backgroundImage: `url(${ds.backUpload})` }
                            : undefined
                        }
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            readFile(e.target.files?.[0], "back");
                            e.target.value = "";
                          }}
                        />
                        <Icon id="i-scan" />
                        <span>
                          {ds.backUpload ? DESIGNER.replace : DESIGNER.upload}
                        </span>
                      </label>
                    </div>
                    {backImg && (
                      <label className="cs-sl">
                        <span>{DESIGNER.backDim}</span>
                        <input
                          type="range"
                          min="0"
                          max="90"
                          value={ds.backDim}
                          onChange={e =>
                            setDesign(
                              "backDim",
                              Number(e.target.value),
                              "back",
                            )
                          }
                          style={cssVars({ "--p": ds.backDim / 90 })}
                        />
                      </label>
                    )}
                  </>
                )}

                <div className="cs-row2">
                  <div>
                    <p className="cs-sk">{DESIGNER.accentLabel}</p>
                    <div
                      className="cs-swatches"
                      role="radiogroup"
                      aria-label={DESIGNER.accentLabel}
                    >
                      {DESIGNER.accents.map(c => (
                        <button
                          key={c}
                          type="button"
                          role="radio"
                          aria-checked={ds.accent === c}
                          className={ds.accent === c ? "on" : ""}
                          style={cssVars({ "--c": c })}
                          onClick={() => setDesign("accent", c)}
                          aria-label={c}
                        />
                      ))}
                      <label
                        className="cs-color"
                        aria-label="Accent personnalisé"
                      >
                        <input
                          type="color"
                          value={ds.accent}
                          onChange={e => setDesign("accent", e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                  <div>
                    <p className="cs-sk">{DESIGNER.inkLabel}</p>
                    <div
                      className="cs-swatches"
                      role="radiogroup"
                      aria-label={DESIGNER.inkLabel}
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={!ds.ink}
                        className={`auto${!ds.ink ? " on" : ""}`}
                        onClick={() => setDesign("ink", null)}
                      >
                        {DESIGNER.inkAuto}
                      </button>
                      {DESIGNER.inks.map(c => (
                        <button
                          key={c}
                          type="button"
                          role="radio"
                          aria-checked={ds.ink === c}
                          className={ds.ink === c ? "on" : ""}
                          style={cssVars({ "--c": c })}
                          onClick={() => setDesign("ink", c)}
                          aria-label={c}
                        />
                      ))}
                      <label
                        className="cs-color"
                        aria-label="Couleur des textes personnalisée"
                      >
                        <input
                          type="color"
                          value={ds.ink || "#ffffff"}
                          onChange={e => setDesign("ink", e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <p className="cs-hint">
                  {DESIGNER.fileHint} {DESIGNER.drop}.
                </p>
                {err.file && (
                  <p className="ld-err" role="alert">
                    {err.file}
                  </p>
                )}
                <button
                  type="button"
                  className="cs-mini"
                  onClick={() => setDs(D0)}
                >
                  {DESIGNER.reset}
                </button>
              </div>
            </div>
          )}

          {done ? (
            <div className="cs-done" role="status">
              <span className="cs-done-ic">
                <Icon id="i-check" />
              </span>
              <div>
                <b>
                  {isClientMode
                    ? "Demande de carte envoyée !"
                    : STUDIO.done.title}
                </b>
                <span>
                  {isClientMode
                    ? "Votre carte personnalisée et ses visuels ont été transmis à notre atelier de production. Paiement à la livraison."
                    : STUDIO.done.text}
                </span>
                {!isClientMode && <small>{STUDIO.done.promise}</small>}
                {!isClientMode && files.length > 0 && (
                  <small className="cs-attach">
                    Les fichiers de logo ou de fond ne sont pas joints à la
                    demande ; contactez-nous pour nous les transmettre.
                  </small>
                )}
                {print && (
                  <div className="cs-print">
                    <p>
                      <Icon id="i-check" />
                      Aperçu prêt à imprimer · {CARD.format}
                    </p>
                    <div>
                      {(
                        [
                          ["recto", "Recto"],
                          ["verso", "Verso"],
                        ] as const
                      ).map(([k, l]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() =>
                            download(print[k], `carte-${slug}-${k}-300dpi.png`)
                          }
                        >
                          <img src={print[k]} alt={`${l} prêt à imprimer`} />
                          <span>{l} · télécharger</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {!isClientMode && (
                <button
                  className="btn btn-line dark"
                  onClick={() => setState("edit")}
                >
                  {STUDIO.done.edit}
                </button>
              )}
            </div>
          ) : (
            <form className="cs-form" onSubmit={submit} noValidate>
              {STUDIO.fields.map(f => (
                <label
                  key={f.k}
                  className={`fl${err[f.k] ? " bad" : ""}${f.k === "name" || f.k === "email" ? " wide" : ""}`}
                >
                  <input
                    type={f.type || "text"}
                    placeholder=" "
                    autoComplete={f.auto}
                    value={d[f.k]}
                    maxLength={48}
                    onChange={e => set(f.k, e.target.value)}
                    onFocus={() => onFieldFocus(f.k)}
                    onBlur={() => setFocus(null)}
                    aria-invalid={!!err[f.k]}
                    disabled={state === "encoding"}
                  />
                  <span>
                    {f.label}
                    {f.req ? " *" : ""}
                  </span>
                  {err[f.k] && <em role="alert">{err[f.k]}</em>}
                </label>
              ))}

              {isClientMode && (
                <>
                  <label
                    className={`fl wide${err.adresseLivraison ? " bad" : ""}`}
                  >
                    <input
                      type="text"
                      placeholder=" "
                      value={adresseLivraison}
                      maxLength={500}
                      onChange={e => {
                        setAdresseLivraison(e.target.value);
                        setErr(x => ({ ...x, adresseLivraison: undefined }));
                      }}
                      aria-invalid={!!err.adresseLivraison}
                      disabled={state === "encoding"}
                    />
                    <span>Adresse de livraison *</span>
                    {err.adresseLivraison && (
                      <em role="alert">{err.adresseLivraison}</em>
                    )}
                  </label>
                  <label
                    className={`fl${err.telephoneLivraison ? " bad" : ""}`}
                  >
                    <input
                      type="tel"
                      placeholder=" "
                      value={telephoneLivraison}
                      maxLength={30}
                      onChange={e => {
                        setTelephoneLivraison(e.target.value);
                        setErr(x => ({ ...x, telephoneLivraison: undefined }));
                      }}
                      aria-invalid={!!err.telephoneLivraison}
                      disabled={state === "encoding"}
                    />
                    <span>Téléphone livraison *</span>
                    {err.telephoneLivraison && (
                      <em role="alert">{err.telephoneLivraison}</em>
                    )}
                  </label>
                  <label className="fl">
                    <input
                      type="text"
                      placeholder=" "
                      value={notesClient}
                      maxLength={1000}
                      onChange={e => setNotesClient(e.target.value)}
                      disabled={state === "encoding"}
                    />
                    <span>Précisions (facultatif)</span>
                  </label>
                </>
              )}

              {err.reach && (
                <p className="ld-err wide" role="alert">
                  {err.reach}
                </p>
              )}
              {state === "fail" && (
                <p className="ld-err wide" role="alert">
                  {submitError || "L’envoi a échoué. Réessayez ou appelez-nous."}
                </p>
              )}
              {!isClientMode && (
                <>
                  <label className="cs-opt wide">
                    <input
                      type="checkbox"
                      checked={optin}
                      onChange={e => setOptin(e.target.checked)}
                    />
                    <span className="cs-box" aria-hidden="true">
                      <Icon id="i-check" />
                    </span>
                    <span>{STUDIO.optin}</span>
                  </label>
                  <p className="cs-info wide">{STUDIO.info}</p>
                </>
              )}
              <button
                type="submit"
                className="btn btn-red wide"
                disabled={state === "encoding"}
              >
                {state === "encoding" ? "Envoi en cours…" : sendLabel}{" "}
                <Icon id="arr" />
              </button>
            </form>
          )}
        </div>

        <div className="cs-right">
          <div
            className={`cs-card t-${tier} dz-mode${back ? " back" : ""}${state === "encoding" ? " enc" : ""}${done ? " ok" : ""}${drag ? " drag" : ""}`}
            ref={card}
            onPointerMove={move}
            onPointerLeave={leave}
            aria-label="Aperçu de votre carte"
            onDragOver={e => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            style={cssVars({
              "--acc": ds.accent,
              "--inkF": inkFront,
              "--inkB": inkBack,
            })}
          >
            <div className="cs-rot">
              <>
                {/* RECTO : le logo */}
                <div
                  className={`cs-face cs-front face-logo pr-${ds.upload ? "upload" : effectiveBg}`}
                >
                  <span
                    className="cs-bg"
                    style={bgFront}
                    aria-hidden="true"
                  />
                  {photoF && (
                    <span
                      className="cs-dim"
                      style={{ opacity: ds.dim / 100 }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="cs-nfc">
                    <Icon id="nfc" />
                  </span>
                  <div
                    className="cs-logo-zone"
                    style={cssVars({ "--ls": ds.logoSize })}
                  >
                    {ds.logo ? (
                      <img src={ds.logo} alt="" />
                    ) : (
                      <span
                        className={`cs-logo-txt${v("company") || v("name") ? "" : " ph"}`}
                      >
                        {v("company") || v("name") || "Votre logo"}
                      </span>
                    )}
                  </div>
                  <span className="cs-rule front" />
                  <span className="cs-beam" aria-hidden="true" />
                  <span className="cs-glare" aria-hidden="true" />
                  <span className="cs-dropzone" aria-hidden="true">
                    <Icon id="i-scan" />
                    {DESIGNER.drop}
                  </span>
                </div>
                {/* VERSO : coordonnées + QR discret en bas à droite */}
                <div
                  className={`cs-face cs-back face-info pr-${backPreset}`}
                >
                  <span className="cs-bg" style={bgBack} aria-hidden="true" />
                  {backImg && (
                    <span
                      className="cs-dim"
                      style={{ opacity: ds.backDim / 100 }}
                      aria-hidden="true"
                    />
                  )}
                  <div className="cs-fields">
                    <Line k="name" className="cs-nm big" />
                    <Line k="role" className="cs-ro" />
                    <span className="cs-rule" />
                    {v("company") && (
                      <Line k="company" className="cs-ln co" icon="i-card" />
                    )}
                    <Line k="phone" className="cs-ln" icon="i-phone" />
                    <Line k="email" className="cs-ln" icon="i-mail" />
                  </div>
                  <span className="cs-qr sm">
                    <QR text={ficheUrl(slug)} size={120} />
                  </span>
                  <span className="cs-glare" aria-hidden="true" />
                  <span className="cs-dropzone" aria-hidden="true">
                    <Icon id="i-scan" />
                    {DESIGNER.drop}
                  </span>
                </div>
              </>
            </div>
            <span className="cs-waves" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
          <div className="cs-tools">
            <button
              type="button"
              className="cs-flip"
              onClick={() => setBack(b => !b)}
            >
              <Icon id="i-sync" />
              {back ? STUDIO.front : STUDIO.flip}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
