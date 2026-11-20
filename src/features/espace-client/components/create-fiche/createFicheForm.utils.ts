export interface CreatedFiche {
  id: number;
  slug: string;
  formule: string;
  statut: string;
  prenom: string;
  nom: string;
  [key: string]: unknown;
}

export interface CreateFicheFormProps {
  /** Retourne le jeton du client connecté. */
  getToken?: () => string | null | undefined;
  /** Appelée avec la fiche créée (ex. rediriger vers l'éditeur). Sans elle, le formulaire affiche l'adresse publique. */
  onCreated?: (fiche: CreatedFiche) => void;
  /** Appelée quand il n'y a pas de token ou que le serveur répond 401 (ex. rediriger vers la connexion). */
  onUnauthorized?: () => void;
  /** Base de l'adresse publique des fiches. */
  publicBaseUrl?: string;
}

export type FieldKey =
  | "prenom"
  | "nom"
  | "fonction"
  | "entreprise"
  | "telephone"
  | "whatsapp"
  | "secteur";

export type TextKey = Exclude<FieldKey, "secteur">;
export type Values = Record<FieldKey, string>;
export type Errors = Partial<Record<FieldKey, string>>;

export const SECTEURS = [
  { value: "restaurant", label: "Restaurant" },
  { value: "immobilier", label: "Immobilier" },
  { value: "commerce", label: "Commerce" },
  { value: "hotel", label: "Hôtel" },
  { value: "independant", label: "Indépendant" },
  { value: "beaute", label: "Beauté" },
] as const;

// Mêmes plafonds que le serveur (createFicheSchema)
export const MAX: Record<TextKey, number> = {
  prenom: 100,
  nom: 100,
  fonction: 150,
  entreprise: 150,
  telephone: 30,
  whatsapp: 30,
};

export const FIELD_ORDER: FieldKey[] = [
  "prenom",
  "nom",
  "fonction",
  "entreprise",
  "secteur",
  "telephone",
  "whatsapp",
];

export const EMPTY_VALUES: Values = {
  prenom: "",
  nom: "",
  fonction: "",
  entreprise: "",
  telephone: "",
  whatsapp: "",
  secteur: "",
};

const digits = (s: string) => s.replace(/\D/g, "").length;

export function validateCreateFiche(v: Values, sameWhatsapp: boolean): Errors {
  const e: Errors = {};
  if (!v.prenom.trim())
    e.prenom = "Indique ton prénom ou le nom de ton activité.";
  (Object.keys(MAX) as TextKey[]).forEach(k => {
    if (k === "whatsapp" && sameWhatsapp) return;
    if (!e[k] && v[k].trim().length > MAX[k])
      e[k] = `${MAX[k]} caractères maximum.`;
  });
  if (v.telephone.trim() && digits(v.telephone) < 6)
    e.telephone = "Numéro trop court. Exemple : +221 77 000 00 00";
  if (!sameWhatsapp && v.whatsapp.trim() && digits(v.whatsapp) < 6)
    e.whatsapp = "Numéro trop court. Exemple : +221 77 000 00 00";
  return e;
}

export function durationLabel(months: number) {
  if (months === 1) return "Mensuelle (1 mois)";
  if (months === 3) return "Trimestrielle (3 mois)";
  if (months === 12) return "Annuelle (12 mois)";
  return `${months} mois`;
}

export function extractRequestError(
  error: unknown,
  fallback: string,
): { message: string; status?: number } {
  const details =
    typeof error === "object" && error !== null
      ? (
          error as {
            response?: {
              status?: number;
              data?: { error?: { message?: string }; message?: string };
            };
          }
        ).response
      : undefined;
  const message =
    typeof error === "string"
      ? error
      : (details?.data?.error?.message ??
        details?.data?.message ??
        (error instanceof Error ? error.message : fallback));
  return { message, status: details?.status };
}
