import { useMutation } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AFTER_ADMIN_LOGIN } from "../../../data/auth";
import { useSession } from "../../../lib/session";
import "../../../styles/admin.css";
import { safePath } from "../../../utils/auth";
import {
  adminLogin,
  completeAdminTwoFaLogin,
  isTwoFaChallenge,
} from "../../auth/auth.service";

// Page Connexion du back-office — /admin/login. Accès réservé aux administrateurs (POST /auth/admin/login).
export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending2fa, setPending2fa] = useState<string | null>(null);
  const [twoFaCode, setTwoFaCode] = useState("");

  const state = location.state as { from?: string; notice?: string } | null;
  const target = safePath(state?.from, AFTER_ADMIN_LOGIN);
  // Une page de l'espace client ou du site public mémorisée n'a pas de sens après une connexion admin.
  const dest = target.startsWith("/admin") ? target : AFTER_ADMIN_LOGIN;

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: adminLogin,
    onSuccess: (res) => {
      if (isTwoFaChallenge(res)) {
        setPending2fa(res.tempToken);
        setTwoFaCode("");
        return;
      }
      navigate(dest, { replace: true });
    },
  });

  const twoFaMutation = useMutation({
    mutationFn: completeAdminTwoFaLogin,
    onSuccess: () => navigate(dest, { replace: true }),
  });

  // Déjà connecté en administrateur : inutile de ressaisir ses identifiants.
  if (session?.user.role === "ADMIN") return <Navigate to={dest} replace />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    mutate({ email: email.trim(), password });
  };

  const submitTwoFa = (e: FormEvent) => {
    e.preventDefault();
    if (!pending2fa || !twoFaCode.trim()) return;
    twoFaMutation.mutate({ tempToken: pending2fa, code: twoFaCode.trim() });
  };

  const message = pending2fa
    ? twoFaMutation.isError
      ? twoFaMutation.error.message
      : ""
    : isError
      ? error.message
      : (state?.notice ?? "");

  return (
    <div className="adm">
      <div className="login">
        {pending2fa ? (
          <form onSubmit={submitTwoFa}>
            <div className="flex items-center justify-center py-4">
              <img
                src="/images/Logo.png"
                alt="Logo LogCard"
                width={54}
                height={54}
                className="h-[54px] w-[54px] object-contain"
              />
            </div>

            <h1>Vérification 2FA</h1>
            <p className="mb-3 text-center text-xs text-neutral-600">
              Saisissez le code à 6 chiffres de votre application ou un code de
              secours.
            </p>

            <input
              type="text"
              required
              autoFocus
              autoComplete="one-time-code"
              inputMode="text"
              placeholder="Code 2FA (ex. 123456 ou XXXX-XXXX)"
              value={twoFaCode}
              onChange={(e) => setTwoFaCode(e.target.value)}
            />

            <button
              className="adm-btn adm-btn-red"
              type="submit"
              disabled={twoFaMutation.isPending || !twoFaCode.trim()}
            >
              {twoFaMutation.isPending ? "Vérification…" : "Vérifier"}
            </button>

            <button
              type="button"
              className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              onClick={() => {
                setPending2fa(null);
                setTwoFaCode("");
                twoFaMutation.reset();
              }}
            >
              Retour à la connexion
            </button>

            {message && (
              <small className="err" role="alert">
                {message}
              </small>
            )}
          </form>
        ) : (
          <form onSubmit={submit}>
            {/* Logo */}
            <div className="flex items-center justify-center py-4">
              <img
                src="/images/Logo.png"
                alt="Logo LogCard"
                width={54}
                height={54}
                className="h-[54px] w-[54px] object-contain"
              />
            </div>

            <h1>Back-office</h1>

            <input
              type="email"
              required
              autoComplete="username"
              placeholder="E-mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />

            <input
              type="password"
              required
              autoComplete="current-password"
              placeholder="Mot de passe"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            <button
              className="adm-btn adm-btn-red"
              type="submit"
              disabled={isPending}
            >
              {isPending ? "Connexion…" : "Se connecter"}
            </button>

            {message && (
              <small className="err" role="alert">
                {message}
              </small>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
