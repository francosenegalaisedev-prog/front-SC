import { useEffect } from "react";
import { IconSprite } from "../../../components/Icons";
import CardStudio from "../../../components/studio/CardStudio";
import useReveal from "../../../hooks/useReveal";
import "../../../styles/contact.css";
import "../../../styles/studio.css";

export default function ClientCartesPage() {
  useReveal();

  useEffect(() => {
    document.title = "Cartes — Support Connecté";
  }, []);

  return (
    <section className="client-cartes-page">
      <IconSprite />
      <CardStudio designer />
    </section>
  );
}
