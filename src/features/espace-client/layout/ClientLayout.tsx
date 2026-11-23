import { useMutation, useQuery } from "@tanstack/react-query";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useSession } from "../../../lib/session";
import "../../../styles/layout.css";
import {
  getCurrentUser,
  resendVerificationEmail,
  logout as signOut,
} from "../../auth/auth.service";

/*
  Cadre de l'espace client : menu latéral (Tableau de bord, Paramètres) + zone de contenu (<Outlet />).
  Mobile : le menu devient un tiroir ouvert par le bouton ☰ (Échap, clic à côté ou changement de page = fermeture).
  Routes enfants : index (tableau de bord), fiches/:slug (éditeur), parametres.
*/
const BASE = "/espace-client";
const P: Record<string, string> = {
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  sliders: "M4 7h9M17 7h3M4 17h3M11 17h9M13 4v6M7 14v6",
  creditCard: "M3 6h18v12H3zM3 10h18M7 15h3",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z",
  out: "M10 4H5v16h5M15 8l4 4-4 4M9 12h10",
  message:
    "M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z",
  drafts: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  menu: "M4 6h16M4 12h16M4 18h16",
  x: "M6 6l12 12M18 6L6 18",
};
const Ico = ({ n }: { n: string }) => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={P[n]} />
  </svg>
);

const NAV: {
  to: string;
  label: string;
  icon: string;
  match: (p: string) => boolean;
}[] = [
  {
    to: BASE,
    label: "Tableau de bord",
    icon: "grid",
    match: p =>
      p === BASE ||
      p === `${BASE}/` ||
      p.startsWith(`${BASE}/fiches`) ||
      p.startsWith(`${BASE}/fiche/preview/`),
  },
  {
    to: `${BASE}/editeur`,
    label: "Éditeur de fiches",
    icon: "edit",
    match: p => p.startsWith(`${BASE}/editeur`),
  },
  {
    to: `${BASE}/brouillons`,
    label: "Brouillons",
    icon: "drafts",
    match: p => p.startsWith(`${BASE}/brouillons`),
  },
  {
    to: `${BASE}/prospects`,
    label: "Prospects",
    icon: "message",
    match: p =>
      p.startsWith(`${BASE}/prospects`) ||
      p.startsWith(`${BASE}/demandes-rappel`),
  },
  {
    to: `${BASE}/cartes`,
    label: "Cartes",
    icon: "creditCard",
    match: p => p.startsWith(`${BASE}/cartes`),
  },
  {
    to: `${BASE}/abonnements`,
    label: "Abonnements & formules",
    icon: "creditCard",
    match: p => p.startsWith(`${BASE}/abonnements`),
  },
  {
    to: `${BASE}/paiements`,
    label: "Paiements",
    icon: "creditCard",
    match: p => p.startsWith(`${BASE}/paiements`),
  },
  {
    to: `${BASE}/parametres`,
    label: "Paramètres",
    icon: "sliders",
    match: p => p.startsWith(`${BASE}/parametres`),
  },
];
export default function ClientLayout({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useSession()?.user;
  const profile = useQuery({
    queryKey: ["auth", "me", user?.id],
    queryFn: getCurrentUser,
    enabled: Boolean(user),
    refetchOnWindowFocus: "always",
  });
  const verificationEmail = useMutation({
    mutationFn: resendVerificationEmail,
  });

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  // Prévient le serveur puis supprime la session ; <RequireAuth> renvoie alors vers /login.
  const logout = () => void signOut();

  // La protection de la route est assurée par <RequireAuth> (App.tsx) ; ceci rassure seulement TypeScript.
  if (!user) return null;

  const emailVerified = profile.data?.emailVerified ?? user.emailVerified;
  const effectiveUser = {
    ...user,
    name: profile.data?.nom ?? user.name,
    email: profile.data?.email ?? user.email,
    emailVerified,
  };
  const activeNav = NAV.find(n => n.match(pathname));

  return (
    <div className="cl">
      <a className="cl-skip" href="#cl-main">
        Aller au contenu
      </a>

      <aside
        className="cl-side"
        id="cl-nav"
        aria-label="Navigation de l’espace client"
      >
        <div className="flex items-center gap-3 px-4 py-4">
          <img
            src="/images/logo-vertical-blanc.webp"
            alt="Logo Support Connecté"
            width={34}
            height={34}
            className="h-8.5 w-8.5 shrink-0 object-contain"
          />

          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight text-white">
              Support Connecté
            </span>
            <small className="mt-1 text-xs leading-tight text-gray-400">
              Espace client
            </small>
          </div>
        </div>
        <nav aria-label="Principal">
          <ul className="cl-nav">
            {NAV.map(n => {
              const on = n.match(pathname);
              return (
                <li key={n.to}>
                  <Link
                    to={n.to}
                    className={on ? "on" : undefined}
                    aria-current={on ? "page" : undefined}
                  >
                    <Ico n={n.icon} />
                    <span>{n.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="cl-user">
          <span className="cl-av" aria-hidden="true">
            {effectiveUser.name.charAt(0)}
          </span>
          <span className="cl-who">
            <b>{effectiveUser.name}</b>
            <small>{effectiveUser.email}</small>
          </span>
          <button
            onClick={logout}
            aria-label="Se déconnecter"
            title="Se déconnecter"
          >
            <Ico n="out" />
          </button>
        </div>
      </aside>

      <main id="cl-main" className="cl-main" tabIndex={-1}>
        {emailVerified === false && (
          <section
            className="mx-auto my-5 flex max-w-5xl flex-col gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-4 text-red-950 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            role="alert"
            aria-labelledby="cl-email-verification-title"
          >
            <div>
              <h2 id="cl-email-verification-title" className="font-semibold">
                Votre adresse e-mail n’est pas vérifiée
              </h2>
              <p className="mt-1 text-sm">
                Vérifiez votre boîte de réception à l’adresse {user.email} et
                confirmez votre compte.
              </p>
              {verificationEmail.isSuccess && (
                <p
                  className="mt-2 text-sm font-medium text-green-800"
                  role="status"
                >
                  Le lien de vérification a été envoyé à {user.email}.
                </p>
              )}
              {verificationEmail.isError && (
                <p className="mt-2 text-sm text-red-800" role="alert">
                  {verificationEmail.error.message}
                </p>
              )}
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-wait disabled:opacity-60"
              onClick={() => verificationEmail.mutate()}
              disabled={verificationEmail.isPending}
            >
              {verificationEmail.isPending
                ? "Envoi en cours…"
                : verificationEmail.isSuccess
                  ? "Renvoyer le lien"
                  : "Vérifier mon e-mail"}
            </button>
          </section>
        )}
        {emailVerified === undefined && profile.isError && (
          <div
            className="mx-auto my-5 flex max-w-5xl items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            role="alert"
          >
            <span>Impossible de vérifier l’état de votre adresse e-mail.</span>
            <button
              type="button"
              className="shrink-0 font-semibold underline"
              onClick={() => void profile.refetch()}
            >
              Réessayer
            </button>
          </div>
        )}
        {children ?? (
          <Suspense
            fallback={<div style={{ minHeight: "60vh" }} aria-busy="true" />}
          >
            <Outlet context={{ user: effectiveUser }} />
          </Suspense>
        )}
      </main>
      {menuOpen && (
        <div
          className="cl-more-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      {menuOpen && (
        <div
          id="cl-mobile-menu"
          className="cl-more-sheet"
          role="dialog"
          aria-label="Menu de navigation mobile"
        >
          <div className="cl-more-head">
            <div className="cl-more-user">
              <b>{effectiveUser.name}</b>
              <small>{effectiveUser.email}</small>
            </div>
            <button
              type="button"
              className="cl-more-close"
              onClick={() => setMenuOpen(false)}
              aria-label="Fermer le menu"
            >
              <Ico n="x" />
            </button>
          </div>
          <nav aria-label="Menu mobile">
            <ul className="cl-more-list">
              {NAV.map(n => {
                const on = n.match(pathname);
                return (
                  <li key={n.to}>
                    <Link
                      to={n.to}
                      className={on ? "on" : undefined}
                      aria-current={on ? "page" : undefined}
                      onClick={() => setMenuOpen(false)}
                    >
                      <Ico n={n.icon} />
                      <span>{n.label}</span>
                    </Link>
                  </li>
                );
              })}
              <li className="cl-more-sep">
                <button
                  type="button"
                  className="cl-more-logout"
                  onClick={logout}
                >
                  <Ico n="out" />
                  <span>Se déconnecter</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
      <nav className="cl-tabbar cl-mobile-bottom" aria-label="Navigation mobile">
        <div className="cl-mobile-current">
          <img
            src="/images/logo-vertical-blanc.webp"
            alt=""
            width={24}
            height={24}
            aria-hidden="true"
          />
          <span>{activeNav?.label ?? "Espace client"}</span>
        </div>
        <button
          type="button"
          className={`cl-burger-btn${menuOpen ? " on" : ""}`}
          onClick={() => setMenuOpen(open => !open)}
          aria-expanded={menuOpen}
          aria-controls="cl-mobile-menu"
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          <Ico n={menuOpen ? "x" : "menu"} />
          <span>{menuOpen ? "Fermer" : "Menu"}</span>
        </button>
      </nav>
    </div>
  );
}
