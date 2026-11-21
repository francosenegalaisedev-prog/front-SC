import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../../../../lib/api";
import { errMsg } from "../../../../lib/apiError";
import type { ApiFicheSummary } from "../../../../types";
import { optimizeImageFile } from "../../services/mediaOptimizer";

const MAX_NOTE_CHARS = 300;
const MAX_AUDIO_SECONDS = 60;

export type ProspectItem = {
  id: number;
  source?: "PUBLIC" | "MANUEL" | "SCAN";
  nom: string | null;
  telephone: string | null;
  email: string | null;
  societe: string | null;
  photoUrl?: string | null;
  noteTexte?: string | null;
  noteAudioUrl?: string | null;
  statut: "NOUVELLE" | "TRAITEE";
  traiteeAt: string | null;
  createdAt: string;
  fiche: {
    id: number;
    slug: string;
    prenom: string;
    nom: string;
  };
};

function ficheLabel(fiche: { slug: string; prenom?: string; nom?: string }) {
  return [fiche.prenom, fiche.nom].filter(Boolean).join(" ") || fiche.slug;
}

function formatTimer(sec: number) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

async function uploadProspectMedia(blob: Blob, contentType: string): Promise<string> {
  const response = await api.post<{ media: { url: string; ref: string } }>(
    "fiches/rappels/media",
    blob,
    { headers: { "Content-Type": contentType } },
  );
  return response.data.media.url;
}

function VoiceRecorder({
  audioBlob,
  onChange,
  disabled,
}: {
  audioBlob: { blob: Blob; mime: string; previewUrl: string } | null;
  onChange: (
    next: { blob: Blob; mime: string; previewUrl: string } | null,
  ) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recError, setRecError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => stopTracks(), []);

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
    stopTracks();
  };

  const startRecording = async () => {
    setRecError(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setRecError(
        "L'enregistrement vocal n'est pas pris en charge sur ce navigateur.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const preferred = ["audio/webm", "audio/mp4", "audio/ogg"].find(m =>
        MediaRecorder.isTypeSupported(m),
      );
      const recorder = preferred
        ? new MediaRecorder(stream, { mimeType: preferred })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = ev => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const mime = (recorder.mimeType || preferred || "audio/webm")
          .split(";")[0]
          .trim();
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size > 0) {
          if (audioBlob?.previewUrl) URL.revokeObjectURL(audioBlob.previewUrl);
          onChange({ blob, mime, previewUrl: URL.createObjectURL(blob) });
        }
        stopTracks();
      };
      recorderRef.current = recorder;
      setSeconds(0);
      setRecording(true);
      recorder.start();
      timerRef.current = window.setInterval(() => {
        setSeconds(prev => {
          if (prev + 1 >= MAX_AUDIO_SECONDS) {
            stopRecording();
            return MAX_AUDIO_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      stopTracks();
      setRecError(
        "Accès au micro refusé. Autorisez le microphone pour enregistrer une note vocale.",
      );
    }
  };

  const clearAudio = () => {
    if (audioBlob?.previewUrl) URL.revokeObjectURL(audioBlob.previewUrl);
    onChange(null);
    setSeconds(0);
  };

  return (
    <div className="prospect-voice-box">
      {!audioBlob ? (
        <div className="prospect-voice-controls">
          {recording ? (
            <button
              type="button"
              className="callback-action-btn is-danger"
              onClick={stopRecording}
            >
              ■ Arrêter ({formatTimer(seconds)} / 01:00)
            </button>
          ) : (
            <button
              type="button"
              className="callback-action-btn is-primary"
              disabled={disabled}
              onClick={() => void startRecording()}
            >
              ● Enregistrer une note vocale (max 60 s)
            </button>
          )}
        </div>
      ) : (
        <div className="prospect-voice-preview">
          <audio controls src={audioBlob.previewUrl} />
          <button
            type="button"
            className="callback-action-btn is-danger-outline"
            disabled={disabled}
            onClick={clearAudio}
          >
            Supprimer l'audio
          </button>
        </div>
      )}
      {recError && (
        <p className="prospect-field-error" role="alert">
          {recError}
        </p>
      )}
    </div>
  );
}

export function ScanProspectModal({
  fiches,
  onClose,
  onSaved,
}: {
  fiches: ApiFicheSummary[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [ficheId, setFicheId] = useState(
    fiches[0] ? String(fiches[0].id) : "",
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [noteMode, setNoteMode] = useState<"none" | "text" | "audio">("none");
  const [noteTexte, setNoteTexte] = useState("");
  const [audioData, setAudioData] = useState<{
    blob: Blob;
    mime: string;
    previewUrl: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      if (audioData?.previewUrl) URL.revokeObjectURL(audioData.previewUrl);
    },
    [photoPreview, audioData],
  );

  const handlePhotoChange = (file: File | null) => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!ficheId) {
      setError("Veuillez sélectionner une fiche.");
      return;
    }
    if (!photoFile) {
      setError("Veuillez prendre ou importer une photo de la carte de visite.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const optimized = await optimizeImageFile(photoFile);
      const photoUrl = await uploadProspectMedia(
        optimized,
        optimized.type || "image/jpeg",
      );

      let noteAudioUrl: string | undefined;
      if (noteMode === "audio" && audioData) {
        noteAudioUrl = await uploadProspectMedia(audioData.blob, audioData.mime);
      }

      await api.post("fiches/rappels", {
        ficheId: Number(ficheId),
        source: "SCAN",
        photoUrl,
        ...(noteMode === "text" && noteTexte.trim()
          ? { noteTexte: noteTexte.trim() }
          : {}),
        ...(noteAudioUrl ? { noteAudioUrl } : {}),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="prospect-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Scanner une carte de visite"
      onClick={onClose}
    >
      <div className="prospect-modal" onClick={e => e.stopPropagation()}>
        <header className="prospect-modal-header">
          <div>
            <h2>Scanner une carte de visite</h2>
            <p>
              Prenez une photo de la carte et ajoutez une note écrite ou vocale.
            </p>
          </div>
          <button
            type="button"
            className="prospect-modal-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </header>

        <form className="prospect-modal-form" onSubmit={e => void handleSubmit(e)}>
          {fiches.length > 1 && (
            <label>
              <span>Fiche associée</span>
              <select
                value={ficheId}
                onChange={e => setFicheId(e.target.value)}
                required
              >
                {fiches.map(f => (
                  <option key={f.id} value={String(f.id)}>
                    {ficheLabel(f)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="prospect-photo-picker">
            <label className="prospect-photo-drop">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                disabled={submitting}
                onChange={e => handlePhotoChange(e.target.files?.[0] ?? null)}
              />
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Aperçu de la carte de visite"
                  className="prospect-photo-preview"
                />
              ) : (
                <span className="prospect-photo-drop-label">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                  <span>Prendre en photo ou choisir une image</span>
                </span>
              )}
            </label>
            {photoPreview && (
              <button
                type="button"
                className="callback-action-btn is-ghost"
                disabled={submitting}
                onClick={() => handlePhotoChange(null)}
              >
                Changer de photo
              </button>
            )}
          </div>

          <div className="prospect-note-tabs" role="tablist">
            <button
              type="button"
              className={noteMode === "none" ? "active" : ""}
              onClick={() => setNoteMode("none")}
            >
              Sans note
            </button>
            <button
              type="button"
              className={noteMode === "text" ? "active" : ""}
              onClick={() => setNoteMode("text")}
            >
              Note écrite
            </button>
            <button
              type="button"
              className={noteMode === "audio" ? "active" : ""}
              onClick={() => setNoteMode("audio")}
            >
              Note vocale
            </button>
          </div>

          {noteMode === "text" && (
            <label>
              <span>
                Note écrite ({noteTexte.length}/{MAX_NOTE_CHARS})
              </span>
              <textarea
                rows={3}
                maxLength={MAX_NOTE_CHARS}
                value={noteTexte}
                onChange={e => setNoteTexte(e.target.value)}
                placeholder="Ex. Rencontré au salon, intéressé par 20 cartes…"
              />
            </label>
          )}

          {noteMode === "audio" && (
            <VoiceRecorder
              audioBlob={audioData}
              onChange={setAudioData}
              disabled={submitting}
            />
          )}

          {error && (
            <div className="callback-action-error" role="alert">
              {error}
            </div>
          )}

          <div className="prospect-modal-footer">
            <button
              type="button"
              className="callback-action-btn is-ghost"
              disabled={submitting}
              onClick={onClose}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="callback-export-btn"
              disabled={submitting || !photoFile}
            >
              {submitting ? "Enregistrement…" : "Enregistrer le scan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ManualProspectModal({
  fiches,
  convertTarget,
  onClose,
  onSaved,
}: {
  fiches: ApiFicheSummary[];
  convertTarget?: ProspectItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isConvert = Boolean(convertTarget);
  const [ficheId, setFicheId] = useState(
    convertTarget
      ? String(convertTarget.fiche.id)
      : fiches[0]
        ? String(fiches[0].id)
        : "",
  );
  const [nom, setNom] = useState(convertTarget?.nom ?? "");
  const [telephone, setTelephone] = useState(convertTarget?.telephone ?? "");
  const [email, setEmail] = useState(convertTarget?.email ?? "");
  const [societe, setSociete] = useState(convertTarget?.societe ?? "");
  const [noteMode, setNoteMode] = useState<"none" | "text" | "audio">(
    convertTarget?.noteTexte ? "text" : "none",
  );
  const [noteTexte, setNoteTexte] = useState(convertTarget?.noteTexte ?? "");
  const [audioData, setAudioData] = useState<{
    blob: Blob;
    mime: string;
    previewUrl: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [photoPrompt, setPhotoPrompt] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (convertTarget) {
        await api.put(`fiches/rappels/${convertTarget.id}`, {
          nom: nom.trim(),
          telephone: telephone.trim(),
          email: email.trim(),
          societe: societe.trim(),
          noteTexte: noteTexte.trim(),
          deletePhoto: false,
        });
        onSaved();
        if (convertTarget.photoUrl) {
          setPhotoPrompt(true);
        } else {
          onClose();
        }
        return;
      }

      if (!ficheId) {
        setError("Veuillez sélectionner une fiche.");
        return;
      }
      let noteAudioUrl: string | undefined;
      if (noteMode === "audio" && audioData) {
        noteAudioUrl = await uploadProspectMedia(audioData.blob, audioData.mime);
      }
      await api.post("fiches/rappels", {
        ficheId: Number(ficheId),
        source: "MANUEL",
        nom: nom.trim(),
        telephone: telephone.trim(),
        email: email.trim(),
        societe: societe.trim(),
        ...(noteMode === "text" && noteTexte.trim()
          ? { noteTexte: noteTexte.trim() }
          : {}),
        ...(noteAudioUrl ? { noteAudioUrl } : {}),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePhotoNow = async () => {
    if (!convertTarget || deletingPhoto) return;
    setDeletingPhoto(true);
    setError(null);
    try {
      await api.delete(`fiches/rappels/${convertTarget.id}/photo`);
      onSaved();
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setDeletingPhoto(false);
    }
  };

  return (
    <div
      className="prospect-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={
        isConvert ? "Saisir le prospect manuellement" : "Ajouter un prospect"
      }
      onClick={onClose}
    >
      <div className="prospect-modal" onClick={e => e.stopPropagation()}>
        <header className="prospect-modal-header">
          <div>
            <h2>
              {photoPrompt
                ? "Prospect enregistré"
                : isConvert
                  ? "Saisir le prospect manuellement"
                  : "Ajouter un prospect"}
            </h2>
            <p>
              {photoPrompt
                ? "Que souhaitez-vous faire de la photo de la carte ?"
                : isConvert
                  ? "Reportez les informations de la carte pour gérer ce prospect comme les autres."
                  : "Enregistrez directement les coordonnées d'un prospect."}
            </p>
          </div>
          <button
            type="button"
            className="prospect-modal-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </header>

        {photoPrompt ? (
          <div className="prospect-modal-form">
            {convertTarget?.photoUrl && (
              <img
                src={convertTarget.photoUrl}
                alt="Carte de visite scannée"
                className="prospect-photo-preview"
              />
            )}
            {error && (
              <div className="callback-action-error" role="alert">
                {error}
              </div>
            )}
            <div className="prospect-photo-choice">
              <button
                type="button"
                className="callback-action-btn is-danger"
                disabled={deletingPhoto}
                onClick={() => void handleDeletePhotoNow()}
              >
                {deletingPhoto
                  ? "Suppression…"
                  : "Supprimer la photo maintenant"}
              </button>
              <button
                type="button"
                className="callback-action-btn is-primary"
                disabled={deletingPhoto}
                onClick={onClose}
              >
                Conserver la photo (supprimable plus tard)
              </button>
            </div>
          </div>
        ) : (
          <form
            className="prospect-modal-form"
            onSubmit={e => void handleSubmit(e)}
          >
            {convertTarget?.photoUrl && (
              <img
                src={convertTarget.photoUrl}
                alt="Carte de visite à recopier"
                className="prospect-photo-preview"
              />
            )}

            {!isConvert && fiches.length > 1 && (
              <label>
                <span>Fiche associée</span>
                <select
                  value={ficheId}
                  onChange={e => setFicheId(e.target.value)}
                  required
                >
                  {fiches.map(f => (
                    <option key={f.id} value={String(f.id)}>
                      {ficheLabel(f)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              <span>Nom *</span>
              <input
                name="nom"
                required
                minLength={2}
                maxLength={100}
                value={nom}
                onChange={e => setNom(e.target.value)}
                placeholder="Ex. Aminata Fall"
              />
            </label>

            <label>
              <span>Téléphone *</span>
              <input
                name="telephone"
                type="tel"
                required
                maxLength={30}
                value={telephone}
                onChange={e => setTelephone(e.target.value)}
                placeholder="Ex. 77 123 45 67 ou +33 6 12 34 56 78"
              />
            </label>

            <div className="prospect-form-row">
              <label>
                <span>E-mail (optionnel)</span>
                <input
                  name="email"
                  type="email"
                  maxLength={160}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="contact@entreprise.sn"
                />
              </label>
              <label>
                <span>Société (optionnel)</span>
                <input
                  name="societe"
                  type="text"
                  maxLength={120}
                  value={societe}
                  onChange={e => setSociete(e.target.value)}
                  placeholder="Nom de l'entreprise"
                />
              </label>
            </div>

            {!isConvert ? (
              <>
                <div className="prospect-note-tabs" role="tablist">
                  <button
                    type="button"
                    className={noteMode === "none" ? "active" : ""}
                    onClick={() => setNoteMode("none")}
                  >
                    Sans note
                  </button>
                  <button
                    type="button"
                    className={noteMode === "text" ? "active" : ""}
                    onClick={() => setNoteMode("text")}
                  >
                    Note écrite
                  </button>
                  <button
                    type="button"
                    className={noteMode === "audio" ? "active" : ""}
                    onClick={() => setNoteMode("audio")}
                  >
                    Note vocale
                  </button>
                </div>
                {noteMode === "text" && (
                  <label>
                    <span>
                      Note écrite ({noteTexte.length}/{MAX_NOTE_CHARS})
                    </span>
                    <textarea
                      rows={2}
                      maxLength={MAX_NOTE_CHARS}
                      value={noteTexte}
                      onChange={e => setNoteTexte(e.target.value)}
                      placeholder="Contexte de la rencontre…"
                    />
                  </label>
                )}
                {noteMode === "audio" && (
                  <VoiceRecorder
                    audioBlob={audioData}
                    onChange={setAudioData}
                    disabled={submitting}
                  />
                )}
              </>
            ) : (
              <label>
                <span>
                  Note écrite ({noteTexte.length}/{MAX_NOTE_CHARS})
                </span>
                <textarea
                  rows={2}
                  maxLength={MAX_NOTE_CHARS}
                  value={noteTexte}
                  onChange={e => setNoteTexte(e.target.value)}
                  placeholder="Note éventuelle…"
                />
              </label>
            )}

            {error && (
              <div className="callback-action-error" role="alert">
                {error}
              </div>
            )}

            <div className="prospect-modal-footer">
              <button
                type="button"
                className="callback-action-btn is-ghost"
                disabled={submitting}
                onClick={onClose}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="callback-export-btn"
                disabled={submitting}
              >
                {submitting ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function PhotoLightboxModal({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  return (
    <div
      className="prospect-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Aperçu de la carte de visite"
      onClick={onClose}
    >
      <div
        className="prospect-lightbox"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          className="prospect-modal-close"
          onClick={onClose}
          aria-label="Fermer"
        >
          ×
        </button>
        <img src={url} alt="Carte de visite scannée" />
      </div>
    </div>
  );
}
