import { useMutation } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import AuthField from "../../../components/auth/AuthField";
import AuthShell from "../../../components/auth/AuthShell";
import GoogleSignInButton from "../../../components/auth/GoogleSignInButton";
import { Icon } from "../../../components/Icons";
import {
  AFTER_ADMIN_LOGIN,
  AFTER_LOGIN,
  A_LOGIN as T,
} from "../../../data/auth";
import { ApiError } from "../../../lib/apiError";
import { useSession } from "../../../lib/session";
import { EMAIL_RE, safePath } from "../../../utils/auth";
import {
  cancelAccountDeletion,
  completeTwoFaLogin,
  isTwoFaChallenge,
  login,
  loginWithGoogle,
} from "../auth.service";

// Page Connexion — /login (e-mail + mot de passe). ?from=/chemin ou state.from : retour à la page demandée.
type Errors = { email?: string; password?: string };
type PendingRecovery =
  | { kind: "password"; email: string; password: string; message: string }
  | { kind: "google"; credential: string; message: string };

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<Errors>({});
  const [recovery, setRecovery] = useState<PendingRecovery | null>(null);
  const [pending2fa, setPending2fa] = useState<string | null>(null);
  const [twoFaCode, setTwoFaCode] = useState("");

  const params = new URLSearchParams(location.search);
  const deletedScheduled = params.get("deleted") === "scheduled";
  const deletedUntilRaw = params.get("until");
  const deletedUntilFormatted =
    deletedUntilRaw && !Number.isNaN(Date.parse(deletedUntilRaw))
      ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
          new Date(deletedUntilRaw),
        )
      : null;

  const target = safePath(
    (location.state as { from?: string } | null)?.from ?? params.get("from"),
    AFTER_LOGIN,
  );

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: login,
    onSuccess: (res) => {
      setRecovery(null);
      if (isTwoFaChallenge(res)) {
        setPending2fa(res.tempToken);
        setTwoFaCode("");
        return;
      }
      // Un administrateur sans page demandée arrive dans le back-office plutôt que dans l'espace client.
      const toAdmin = res.user.role === "ADMIN" && target === AFTER_LOGIN;
      navigate(toAdmin ? AFTER_ADMIN_LOGIN : target, { replace: true });
    },
    onError: (cause) => {
      if (
        cause instanceof ApiError &&
        cause.code === "COMPTE_EN_COURS_DE_SUPPRESSION"
      ) {
        setRecovery({
          kind: "password",
          email,
          password,
          message: cause.message,
        });
      } else {
        setRecovery(null);
      }
    },
  });

  const googleMutation = useMutation({
    mutationFn: loginWithGoogle,
    onSuccess: (res) => {
      setRecovery(null);
      if (isTwoFaChallenge(res)) {
        setPending2fa(res.tempToken);
        setTwoFaCode("");
        return;
      }
      navigate(target, { replace: true });
    },
    onError: (cause, credential) => {
      if (
        cause instanceof ApiError &&
        cause.code === "COMPTE_EN_COURS_DE_SUPPRESSION"
      ) {
        setRecovery({
          kind: "google",
          credential,
          message: cause.message,
        });
      } else {
        setRecovery(null);
      }
    },
  });

  const twoFaMutation = useMutation({
    mutationFn: completeTwoFaLogin,
    onSuccess: (res) => {
      const toAdmin = res.user.role === "ADMIN" && target === AFTER_LOGIN;
      navigate(toAdmin ? AFTER_ADMIN_LOGIN : target, { replace: true });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelAccountDeletion,
    onSuccess: () => {
      setRecovery(null);
      navigate(target, { replace: true });
    },
  });

  const sending = isPending || cancelMutation.isPending;

  // Déjà connecté : inutile de ressaisir ses identifiants.
  if (session)
    return (
      <Navigate
        to={
          session.user.role === "ADMIN" && target === AFTER_LOGIN
            ? AFTER_ADMIN_LOGIN
            : target
        }
        replace
      />
    );

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const e: Errors = {};
    if (!EMAIL_RE.test(email.trim())) e.email = T.errors.email;
    if (!password) e.password = T.errors.password;
    setErr(e);
    if (Object.keys(e).length) return;

    mutate({ email, password });
  };

  const triggerCancelDeletion = () => {
    if (!recovery || cancelMutation.isPending) return;
    if (recovery.kind === "google") {
      cancelMutation.mutate({ credential: recovery.credential });
    } else {
      cancelMutation.mutate({
        email: recovery.email,
        password: recovery.password,
      });
    }
  };

  const submitTwoFa = (ev: FormEvent) => {
    ev.preventDefault();
    if (!pending2fa || !twoFaCode.trim()) return;
    twoFaMutation.mutate({ tempToken: pending2fa, code: twoFaCode.trim() });
  };

  const genericError =
    !recovery && (isError || googleMutation.isError)
      ? (error ?? googleMutation.error)?.message
      : null;

  return (
    <AuthShell
      title={T.title}
      description={T.meta}
      label={T.label}
      h1={T.h1}
      lead={T.lead}
    >
      {pending2fa ? (
        <form onSubmit={submitTwoFa} noValidate className="au-form">
          <header>
            <h2>Vérification en deux étapes</h2>
            <p>
              Saisissez le code à 6 chiffres généré par votre application
              d’authentification ou l’un de vos codes de secours.
            </p>
          </header>

          <AuthField
            id="twofa-code"
            type="text"
            label="Code de vérification (6 chiffres ou code de secours)"
            value={twoFaCode}
            autoComplete="one-time-code"
            disabled={twoFaMutation.isPending}
            maxLength={20}
            onChange={(v) => setTwoFaCode(v)}
          />

          {twoFaMutation.isError && (
            <p className="au-err" role="alert">
              {twoFaMutation.error.message}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-red"
            disabled={twoFaMutation.isPending || !twoFaCode.trim()}
          >
            {twoFaMutation.isPending
              ? "Vérification…"
              : "Vérifier et se connecter"}{" "}
            <Icon id="arr" />
          </button>

          <p className="au-alt">
            <button
              type="button"
              className="au-link"
              onClick={() => {
                setPending2fa(null);
                setTwoFaCode("");
                twoFaMutation.reset();
              }}
            >
              Retour à la connexion
            </button>
          </p>
        </form>
      ) : (
        <form onSubmit={submit} noValidate className="au-form">
        <header>
          <h2>{T.heading}</h2>
          <p>{T.sub}</p>
        </header>

        {deletedScheduled && (
          <div
            role="status"
            className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
          >
            <p className="font-semibold">
              Suppression de votre compte programmée
            </p>
            <p className="mt-1">
              Votre compte est désactivé et sera supprimé définitivement
              {deletedUntilFormatted
                ? ` le ${deletedUntilFormatted}`
                : " dans 30 jours"}
              . Reconnectez-vous avant cette date si vous souhaitez annuler la
              suppression.
            </p>
          </div>
        )}

        <AuthField
          id="email"
          type="email"
          label={T.fields.email}
          value={email}
          autoComplete="email"
          error={err.email}
          disabled={sending}
          onChange={(v) => {
            setEmail(v);
            setErr((x) => ({ ...x, email: undefined }));
          }}
        />
        <AuthField
          id="password"
          type="password"
          label={T.fields.password}
          value={password}
          autoComplete="current-password"
          error={err.password}
          disabled={sending}
          maxLength={128}
          onChange={(v) => {
            setPassword(v);
            setErr((x) => ({ ...x, password: undefined }));
          }}
        />
        <div className="au-row">
          <Link to="/forgot-password" className="au-link">
            {T.forgot}
          </Link>
        </div>

        {recovery && (
          <div
            role="alert"
            className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
          >
            <p>{recovery.message}</p>
            <button
              type="button"
              onClick={triggerCancelDeletion}
              disabled={cancelMutation.isPending}
              className="mt-2 w-full rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {cancelMutation.isPending
                ? "Réactivation en cours…"
                : "Annuler la suppression et réactiver mon compte"}
            </button>
            {cancelMutation.isError && (
              <p className="mt-2 text-xs text-red-700">
                {cancelMutation.error.message}
              </p>
            )}
          </div>
        )}

        {genericError && (
          <p className="au-err" role="alert">
            {genericError}
          </p>
        )}

        <button type="submit" className="btn btn-red" disabled={sending}>
          {sending ? T.sending : T.submit} <Icon id="arr" />
        </button>
        <GoogleSignInButton
          onCredential={(cred) => googleMutation.mutate(cred)}
        />
        <p className="au-alt">
          {T.noAccount}{" "}
          <Link to="/register" className="au-link">
            {T.create}
          </Link>
        </p>
        </form>
      )}
    </AuthShell>
  );
}
