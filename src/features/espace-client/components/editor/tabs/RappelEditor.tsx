import { Link } from "react-router-dom";
import type { TabEditorProps } from "../types";

/** Éditeur de contenu de l'option « Échangez contact ». */
export default function RappelEditor(_props: TabEditorProps) {
  return (
    <div className="ed-items">
      <p className="ed-cnt" style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
        Un bouton dédié « Échangez contact » s’affiche directement sous vos
        boutons de contact (WhatsApp, Appeler, E-mail). En cliquant dessus, vos
        visiteurs ouvrent un formulaire (nom, téléphone, e-mail, société) et
        chaque contact est enregistré dans votre espace Prospects.
      </p>
      <Link
        to="/espace-client/prospects"
        className="ed-add-b"
        style={{ textDecoration: "underline" }}
      >
        Consulter mes prospects ↗
      </Link>
    </div>
  );
}
