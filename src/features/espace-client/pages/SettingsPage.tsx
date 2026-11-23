import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { errMsg } from "../../../lib/apiError";
import { getSession, saveSession } from "../../../lib/session";
import { EMAIL_RE, passwordOk } from "../../../utils/auth";
import {
  changeCurrentPassword,
  forgotPassword,
  requestAccountDeletion,
  updateCurrentProfile,
} from "../../auth/auth.service";
import "../../../styles/dashboard.css";
import { useClientUser } from "../layout/useClientUser";

type ActionState = "idle" | "saving" | "saved" | "error";
type ResetState = "idle" | "sending" | "sent" | "error";

export default function SettingsPage() {
  const navigate = useNavigate();
  const user = useClientUser();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [profileState, setProfileState] = useState<ActionState>("idle");
  const [profileError, setProfileError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordState, setPasswordState] = useState<ActionState>("idle");
  const [passwordError, setPasswordError] = useState("");

  const [resetState, setResetState] = useState<ResetState>("idle");
  const [error, setError] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteState, setDeleteState] = useState<ActionState>("idle");
  const [deleteError, setDeleteError] = useState("");
  const requiresPasswordForDelete = user.hasPassword !== false;

  useEffect(() => {
    document.title = "Paramètres — Support Connecté";
  }, []);

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
  }, [user.name, user.email]);

  const profileDirty =
    name.trim() !== user.name.trim() ||
    email.trim().toLowerCase() !== user.email.trim().toLowerCase();

  const submitProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (profileState === "saving") return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      setProfileError("Le nom doit contenir au moins 2 caractères.");
      setProfileState("error");
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setProfileError("Veuillez saisir une adresse e-mail valide.");
      setProfileState("error");
      return;
    }

    setProfileState("saving");
    setProfileError("");
    try {
      const updated = await updateCurrentProfile({
        nom: trimmedName,
        email: trimmedEmail,
      });
      const currentSession = getSession();
      if (currentSession) {
        saveSession({
          token: currentSession.token,
          user: {
            ...currentSession.user,
            id: updated.id,
            name: updated.nom,
            email: updated.email,
            role: updated.role,
            emailVerified: updated.emailVerified,
          },
        });
      }
      setProfileState("saved");
    } catch (cause) {
      setProfileError(errMsg(cause));
      setProfileState("error");
    }
  };

  const submitPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (passwordState === "saving") return;

    if (!currentPassword) {
      setPasswordError("Veuillez saisir votre mot de passe actuel.");
      setPasswordState("error");
      return;
    }
    if (!passwordOk(newPassword)) {
      setPasswordError(
        "Le nouveau mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre.",
      );
      setPasswordState("error");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Les deux mots de passe ne correspondent pas.");
      setPasswordState("error");
      return;
    }

    setPasswordState("saving");
    setPasswordError("");
    try {
      await changeCurrentPassword({
        currentPassword,
        password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordState("saved");
    } catch (cause) {
      setPasswordError(errMsg(cause));
      setPasswordState("error");
    }
  };

  const sendResetLink = async () => {
    if (resetState === "sending") return;
    setResetState("sending");
    setError("");
    try {
      await forgotPassword(user.email);
      setResetState("sent");
    } catch (cause) {
      setError(errMsg(cause));
      setResetState("error");
    }
  };

  const submitAccountDeletion = async (e: FormEvent) => {
    e.preventDefault();
    if (deleteState === "saving") return;

    if (requiresPasswordForDelete && !deletePassword) {
      setDeleteError("Veuillez saisir votre mot de passe pour confirmer.");
      setDeleteState("error");
      return;
    }
    if (
      !requiresPasswordForDelete &&
      deleteEmail.trim().toLowerCase() !== user.email.trim().toLowerCase()
    ) {
      setDeleteError(
        "Veuillez saisir votre adresse e-mail exacte pour confirmer.",
      );
      setDeleteState("error");
      return;
    }

    setDeleteState("saving");
    setDeleteError("");
    try {
      const res = await requestAccountDeletion({
        ...(requiresPasswordForDelete
          ? { password: deletePassword }
          : { confirmEmail: deleteEmail.trim().toLowerCase() }),
        ...(deleteReason.trim() ? { reason: deleteReason.trim() } : {}),
      });
      navigate(
        `/login?deleted=scheduled&until=${encodeURIComponent(res.deletionScheduledAt)}`,
        { replace: true },
      );
    } catch (cause) {
      setDeleteError(errMsg(cause));
      setDeleteState("error");
    }
  };

  return (
    <div className="db st-page">
      <header className="db-head">
        <p className="db-k">Espace client</p>
        <h1>Paramètres</h1>
        <p className="db-sub">
          Modifiez les informations de votre compte et protégez son accès.
        </p>
      </header>

      <section className="db-card st-account" aria-labelledby="st-compte">
        <div className="st-section-heading">
          <span className="st-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
            </svg>
          </span>
          <div>
            <p className="db-k">Profil</p>
            <h2 id="st-compte">Mon compte</h2>
          </div>
        </div>

        <form className="mt-4 grid gap-4" onSubmit={e => void submitProfile(e)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-neutral-700">Nom</span>
              <input
                type="text"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  if (profileState !== "idle") setProfileState("idle");
                }}
                maxLength={100}
                autoComplete="name"
                required
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-neutral-700">
                Adresse e-mail du compte
              </span>
              <input
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (profileState !== "idle") setProfileState("idle");
                }}
                maxLength={254}
                autoComplete="email"
                required
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="submit"
              disabled={!profileDirty || profileState === "saving"}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {profileState === "saving"
                ? "Enregistrement…"
                : "Enregistrer le profil"}
            </button>
          </div>
        </form>

        {profileState === "saved" && (
          <p className="st-feedback success" role="status">
            Vos informations de profil ont été mises à jour.
          </p>
        )}
        {profileState === "error" && (
          <p className="st-feedback error" role="alert">
            {profileError}
          </p>
        )}
      </section>

      <section className="db-card st-security" aria-labelledby="st-password">
        <div className="st-section-heading">
          <span className="st-icon security" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 1 1 8 0v3M12 14v3" />
            </svg>
          </span>
          <div>
            <p className="db-k">Sécurité</p>
            <h2 id="st-password">Changer mon mot de passe</h2>
          </div>
        </div>

        <form className="mt-4 grid gap-4" onSubmit={e => void submitPassword(e)}>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-neutral-700">
                Mot de passe actuel
              </span>
              <input
                type="password"
                value={currentPassword}
                onChange={e => {
                  setCurrentPassword(e.target.value);
                  if (passwordState !== "idle") setPasswordState("idle");
                }}
                autoComplete="current-password"
                required
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-neutral-700">
                Nouveau mot de passe
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={e => {
                  setNewPassword(e.target.value);
                  if (passwordState !== "idle") setPasswordState("idle");
                }}
                autoComplete="new-password"
                minLength={8}
                required
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-neutral-700">Confirmation</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value);
                  if (passwordState !== "idle") setPasswordState("idle");
                }}
                autoComplete="new-password"
                minLength={8}
                required
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-neutral-500">
              Au moins 8 caractères, dont une lettre et un chiffre.
            </p>
            <button
              type="submit"
              disabled={
                !currentPassword ||
                !newPassword ||
                !confirmPassword ||
                passwordState === "saving"
              }
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {passwordState === "saving"
                ? "Mise à jour…"
                : "Mettre à jour le mot de passe"}
            </button>
          </div>
        </form>

        {passwordState === "saved" && (
          <p className="st-feedback success" role="status">
            Votre mot de passe a été modifié.
          </p>
        )}
        {passwordState === "error" && (
          <p className="st-feedback error" role="alert">
            {passwordError}
          </p>
        )}
      </section>

      <section className="db-card st-security" aria-labelledby="st-security">
        <div className="st-security-top">
          <span className="st-icon security" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 1 1 8 0v3M12 14v3" />
            </svg>
          </span>
          <div>
            <p className="db-k">Récupération</p>
            <h2 id="st-security">Mot de passe oublié ?</h2>
            <p className="st-description">
              Recevez un lien sécurisé pour choisir un nouveau mot de passe.
              Il sera envoyé à <strong>{user.email}</strong>.
            </p>
          </div>
        </div>

        <div className="st-security-footer">
          <p className="st-expiry">
            Le lien est valable 30 minutes et ne peut être utilisé qu’une fois.
          </p>
          <button
            type="button"
            className="st-reset-action"
            onClick={() => void sendResetLink()}
            disabled={resetState === "sending"}
          >
            {resetState === "sending" ? (
              <>
                <span className="st-spinner" aria-hidden="true" />
                Envoi en cours…
              </>
            ) : (
              <>
                Envoyer le lien de réinitialisation
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M7 17 17 7M7 7h10v10" />
                </svg>
              </>
            )}
          </button>
        </div>

        {resetState === "sent" && (
          <p className="st-feedback success" role="status">
            La demande a été prise en compte. Si cette adresse peut recevoir un
            lien, vous le recevrez dans quelques instants.
          </p>
        )}
        {resetState === "error" && (
          <p className="st-feedback error" role="alert">
            Impossible d’envoyer le lien : {error}
          </p>
        )}
      </section>

      <section
        className="db-card border border-red-200 bg-red-50/30"
        aria-labelledby="st-delete-account"
      >
        <div className="st-section-heading">
          <span
            className="st-icon"
            style={{ background: "#fee2e2", color: "#b91c1c" }}
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />
            </svg>
          </span>
          <div>
            <p className="db-k" style={{ color: "#b91c1c" }}>
              Zone de danger
            </p>
            <h2 id="st-delete-account">Supprimer mon compte</h2>
          </div>
        </div>

        <p className="mt-3 text-sm text-neutral-700">
          La suppression de votre compte suit un{" "}
          <strong>délai de grâce de 30 jours</strong> :
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-600">
          <li>
            Votre compte est <strong>désactivé immédiatement</strong> et vos
            fiches sont suspendues (vos cartes NFC et QR codes physiques ne
            s’ouvrent plus).
          </li>
          <li>
            Pendant <strong>30 jours</strong>, vous pouvez annuler la
            suppression à tout moment en vous reconnectant.
          </li>
          <li>
            Passé ce délai, votre compte, vos fiches, médias et prospects sont{" "}
            <strong>définitivement supprimés</strong>. L’historique de
            facturation est conservé de manière anonymisée (obligation
            comptable).
          </li>
        </ul>

        {!deleteOpen ? (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setDeleteOpen(true);
                setDeleteError("");
                setDeleteState("idle");
              }}
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
            >
              Demander la suppression de mon compte
            </button>
          </div>
        ) : (
          <form
            className="mt-4 grid gap-4 rounded-lg border border-red-200 bg-white p-4"
            onSubmit={e => void submitAccountDeletion(e)}
          >
            {requiresPasswordForDelete ? (
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-neutral-800">
                  Confirmez avec votre mot de passe actuel
                </span>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={e => {
                    setDeletePassword(e.target.value);
                    if (deleteState !== "idle") setDeleteState("idle");
                  }}
                  autoComplete="current-password"
                  required
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-red-600 focus:outline-none"
                />
              </label>
            ) : (
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-neutral-800">
                  Saisissez votre adresse e-mail exacte (
                  <strong>{user.email}</strong>) pour confirmer
                </span>
                <input
                  type="email"
                  value={deleteEmail}
                  onChange={e => {
                    setDeleteEmail(e.target.value);
                    if (deleteState !== "idle") setDeleteState("idle");
                  }}
                  placeholder={user.email}
                  required
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-red-600 focus:outline-none"
                />
              </label>
            )}

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-neutral-700">
                Motif (facultatif)
              </span>
              <input
                type="text"
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                maxLength={500}
                placeholder="Ex. Je n’utilise plus le service"
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
              />
            </label>

            {deleteState === "error" && (
              <p className="st-feedback error" role="alert">
                {deleteError}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteOpen(false);
                  setDeletePassword("");
                  setDeleteEmail("");
                  setDeleteReason("");
                  setDeleteError("");
                  setDeleteState("idle");
                }}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={deleteState === "saving"}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteState === "saving"
                  ? "Suppression en cours…"
                  : "Confirmer la suppression (délai 30 jours)"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
