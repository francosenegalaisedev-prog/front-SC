import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Dashboard from "../components/Dashboard";
import { useClientUser } from "../layout/useClientUser";

export default function DashboardPage() {
  const user = useClientUser();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Tableau de bord — LogCard";
  }, []);

  return (
    <Dashboard
      user={user}
      onEdit={ficheId => {
        navigate(`/espace-client/editeur/${ficheId}`);
      }}
    />
  );
}
