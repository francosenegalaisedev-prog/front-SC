import { Link } from "react-router-dom";
import type { TabEditorProps } from "../types";

/** Éditeur de contenu de l'option « rappel ». */
export default function RappelEditor(_props: TabEditorProps) {
  return (
    <div className="ed-items">
      <p className="ed-cnt" style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
        Un bouton dédié « Être rappelé » s’affiche directement sous vos boutons
        de contact (WhatsApp, Appeler, E-mail). En cliquant dessus, vos
        visiteurs ouvrent un formulaire (nom, téléphone, e-mail, société) et
        chaque demande est enregistrée dans votre espace client.
      </p>
      <Link
        to="/espace-client/demandes-rappel"
        className="ed-add-b"
        style={{ textDecoration: "underline" }}
      >
        Consulter mes demandes de rappel ↗
      </Link>
    </div>
  );
}
