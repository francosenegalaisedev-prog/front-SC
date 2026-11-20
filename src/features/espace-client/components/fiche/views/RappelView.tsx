import { useState } from "react";
import { api } from "../../../../../lib/api";
import { errMsg } from "../../../../../lib/apiError";
import { I } from "../Icon";
import type { ViewProps } from "../types";

const isPreviewContext = () =>
  typeof window !== "undefined" &&
  window.location.pathname.startsWith("/espace-client");

/** Contenu de l'onglet « rappel » vu par le visiteur. */
export default function RappelView({ fiche }: ViewProps) {
  const [sent, setSent] = useState(false);
  const [previewNotice, setPreviewNotice] = useState(false);
  const [rappelSubmitting, setRappelSubmitting] = useState(false);
  const [rappelError, setRappelError] = useState("");

  if (sent) {
    return (
      <p className="f-ok" role="status">
        Merci ! Votre demande a bien été envoyée à l’établissement.
      </p>
    );
  }

  return (
    <form
      className="f-form"
      onSubmit={async e => {
        e.preventDefault();
        if (rappelSubmitting) return;
        if (isPreviewContext()) {
          setPreviewNotice(true);
          return;
        }
        const form = e.currentTarget;
        const formData = new FormData(form);
        setRappelSubmitting(true);
        setRappelError("");
        try {
          await api.post(
            `fiches/public/${encodeURIComponent(fiche.slug)}/rappels`,
            {
              nom: String(formData.get("nom") || "").trim(),
              telephone: String(formData.get("telephone") || "").trim(),
              email: String(formData.get("email") || "").trim(),
              societe: String(formData.get("societe") || "").trim(),
              website: String(formData.get("website") || "").trim(),
            },
          );
          setSent(true);
        } catch (error) {
          setRappelError(
            errMsg(error) ||
              "Impossible d’envoyer la demande. Vérifiez vos coordonnées puis réessayez.",
          );
        } finally {
          setRappelSubmitting(false);
        }
      }}
    >
      <p className="f-txt">
        Laissez vos coordonnées, l’établissement vous rappelle rapidement.
      </p>
      <input
        name="nom"
        required
        minLength={2}
        maxLength={100}
        autoComplete="name"
        placeholder="Votre nom"
      />
      <input
        name="telephone"
        required
        type="tel"
        minLength={7}
        maxLength={25}
        autoComplete="tel"
        placeholder="Votre téléphone"
      />
      <input
        name="email"
        type="email"
        maxLength={160}
        autoComplete="email"
        placeholder="Votre e-mail (optionnel)"
      />
      <input
        name="societe"
        type="text"
        maxLength={120}
        autoComplete="organization"
        placeholder="Votre société (optionnel)"
      />
      <input
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      {previewNotice && (
        <p className="f-txt" role="status">
          Mode aperçu : l’envoi est désactivé ici. Vos visiteurs soumettront
          leurs demandes depuis la fiche publique.
        </p>
      )}
      {rappelError && (
        <p className="f-error" role="alert">
          {rappelError}
        </p>
      )}
      <button className="f-btn gold" type="submit" disabled={rappelSubmitting}>
        {rappelSubmitting ? "Envoi en cours…" : "Demander un rappel"}{" "}
        <I n="arrow" s={14} />
      </button>
    </form>
  );
}
