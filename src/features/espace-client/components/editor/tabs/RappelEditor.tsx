import { Link } from "react-router-dom";
import type { TabEditorProps } from "../types";

/** Éditeur de contenu de l'onglet « rappel ». */
export default function RappelEditor(_props: TabEditorProps) {
  return (
    <div className="ed-items">
      <p className="ed-cnt" style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
        Ce bloc affiche un formulaire permettant à vos visiteurs de laisser leur
        nom et leur numéro de téléphone pour être rappelés. Chaque demande vous
        est notifiée par e-mail et enregistrée dans votre espace client.
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
