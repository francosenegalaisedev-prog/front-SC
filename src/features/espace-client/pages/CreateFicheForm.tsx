import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { getToken as getSessionToken } from "../../../lib/session";
import "../../../styles/create-fiche-form.css";
import { CreatedFicheSuccess } from "../components/create-fiche/CreatedFicheSuccess";
import {
  EMPTY_VALUES,
  extractRequestError,
  FIELD_ORDER,
  MAX,
  SECTEURS,
  validateCreateFiche,
  type CreatedFiche,
  type CreateFicheFormProps,
  type Errors,
  type FieldKey,
  type TextKey,
  type Values,
} from "../components/create-fiche/createFicheForm.utils";
import { PlanBar } from "../components/create-fiche/PlanBar";
import { PurchaseFichesSection } from "../components/create-fiche/PurchaseFichesSection";
import {
  createFiche,
  getFicheCreationStatus,
  getPricingGrid,
  purchaseFiches,
  quoteFichePurchase,
  type FichePurchaseInput,
  type FichePurchaseQuote,
  type PricingGrid,
} from "../espaceClient.service";

export type { CreatedFiche, CreateFicheFormProps };

export default function CreateFicheForm({
  getToken = getSessionToken,
  onCreated,
  onUnauthorized,
  publicBaseUrl = "https://support-connecte.com",
}: CreateFicheFormProps) {
  const uid = useId();
  const refs = useRef<
    Partial<Record<FieldKey, HTMLInputElement | HTMLSelectElement | null>>
  >({});
  const [values, setValues] = useState<Values>(EMPTY_VALUES);
  const [sameWhatsapp, setSameWhatsapp] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedFiche | null>(null);
  const [createdQuantity, setCreatedQuantity] = useState(1);
  const [purchaseMode, setPurchaseMode] = useState(false);
  const [purchasePlan, setPurchasePlan] =
    useState<FichePurchaseInput["plan"]>("essentielle");
  const [quantity, setQuantity] = useState(1);
  const [duration, setDuration] = useState(12);
  const queryClient = useQueryClient();

  const set =
    (key: FieldKey) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { value } = e.target;
      setValues(v => ({ ...v, [key]: value }));
      if (errors[key]) setErrors(er => ({ ...er, [key]: undefined }));
    };

  const focusFirst = (errs: Errors) => {
    const first = FIELD_ORDER.find(k => errs[k]);
    if (first) refs.current[first]?.focus();
  };

  const {
    data: creationStatus,
    isPending: isStatusPending,
    isError: isStatusError,
  } = useQuery({
    queryKey: ["ficheCreationStatus"],
    queryFn: getFicheCreationStatus,
  });

  useEffect(() => {
    if (creationStatus?.freeSlots === 0) setPurchaseMode(true);
  }, [creationStatus?.freeSlots]);

  const {
    data: pricing,
    isPending: isPricingPending,
    isError: isPricingError,
  } = useQuery<PricingGrid>({
    queryKey: ["clientPricing"],
    queryFn: getPricingGrid,
    enabled: purchaseMode,
  });

  const durations =
    pricing?.formules.find(formula => formula.formule === purchasePlan)
      ?.durees ?? [];
  const selectedDuration = durations.some(item => item.dureeMois === duration)
    ? duration
    : durations[0]?.dureeMois;
  const purchaseInput: FichePurchaseInput = {
    plan: purchasePlan,
    quantity,
    ...(purchasePlan === "essentielle" || selectedDuration === undefined
      ? {}
      : { dureeMois: selectedDuration }),
  };

  const {
    data: quote,
    isPending: isQuotePending,
    isError: isQuoteError,
  } = useQuery<FichePurchaseQuote>({
    queryKey: ["fichePurchaseQuote", purchasePlan, quantity, selectedDuration],
    queryFn: () => quoteFichePurchase(purchaseInput),
    enabled:
      purchaseMode &&
      quantity > 0 &&
      (purchasePlan === "essentielle" || selectedDuration !== undefined),
  });

  const { mutate } = useMutation({
    mutationFn: createFiche,
    onSuccess: response => {
      setLoading(false);
      void queryClient.invalidateQueries({
        queryKey: ["ficheCreationStatus"],
      });
      const fiche = (response?.fiche ??
        response?.data ??
        response) as CreatedFiche;
      if (fiche?.slug) {
        setCreatedQuantity(1);
        setCreated(fiche);
        onCreated?.(fiche);
      } else {
        setFormError(
          "La fiche a été créée, mais sa réponse est incomplète. Actualise le tableau de bord pour la retrouver.",
        );
      }
    },
    onError: error => {
      setLoading(false);
      const { message, status } = extractRequestError(
        error,
        "La création de la fiche a échoué. Réessaie.",
      );
      setFormError(message);
      if (status === 401 || /401|non autoris|session|connect/i.test(message))
        onUnauthorized?.();
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: () => purchaseFiches(purchaseInput),
    onSuccess: result => {
      void queryClient.invalidateQueries({
        queryKey: ["ficheCreationStatus"],
      });
      const fiche = result.fiches[0];
      if (!fiche) {
        setFormError(
          "La commande est confirmée, mais aucune fiche n'a été renvoyée. Actualise le tableau de bord.",
        );
        return;
      }
      setCreatedQuantity(result.fiches.length);
      setCreated(fiche);
      onCreated?.(fiche);
    },
    onError: error => {
      const { message, status } = extractRequestError(
        error,
        "La commande a échoué. Réessaie.",
      );
      setFormError(message);
      if (status === 401) onUnauthorized?.();
    },
  });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setFormError("");

    const errs = validateCreateFiche(values, sameWhatsapp);
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return focusFirst(errs);

    const token = getToken();
    if (!token) {
      setFormError("Connecte-toi pour créer une fiche.");
      onUnauthorized?.();
      return;
    }

    const body: Partial<Values> = { prenom: values.prenom.trim() };
    for (const k of [
      "nom",
      "fonction",
      "entreprise",
      "telephone",
      "secteur",
    ] as const) {
      if (values[k].trim()) body[k] = values[k].trim();
    }
    const wa = sameWhatsapp ? values.telephone.trim() : values.whatsapp.trim();
    if (wa) body.whatsapp = wa;

    setLoading(true);
    mutate(body);
  }

  if (created) {
    return (
      <CreatedFicheSuccess
        created={created}
        createdQuantity={createdQuantity}
        publicBaseUrl={publicBaseUrl}
      />
    );
  }

  const id = (k: FieldKey) => `${uid}-${k}`;
  const field = (k: TextKey) => ({
    id: id(k),
    ref: (el: HTMLInputElement | null) => {
      refs.current[k] = el;
    },
    value: values[k],
    onChange: set(k),
    "aria-invalid": errors[k] ? ("true" as const) : undefined,
    "aria-describedby": errors[k] ? `${id(k)}-err` : undefined,
    maxLength: MAX[k] + 20,
  });
  const err = (k: FieldKey): ReactNode =>
    errors[k] ? (
      <p className="cf-err" id={`${id(k)}-err`}>
        {errors[k]}
      </p>
    ) : null;

  return (
    <form className="cf" onSubmit={handleSubmit} noValidate>
      {isStatusPending ? (
        <div className="cf-box" role="status">
          Vérification de vos fiches gratuites…
        </div>
      ) : isStatusError ? (
        <div className="cf-box" role="alert">
          <p>Impossible de vérifier votre nombre de fiches.</p>
          <button
            className="cf-btn"
            type="button"
            onClick={() =>
              void queryClient.invalidateQueries({
                queryKey: ["ficheCreationStatus"],
              })
            }
          >
            Réessayer
          </button>
        </div>
      ) : purchaseMode ? (
        <PurchaseFichesSection
          uid={uid}
          purchasePlan={purchasePlan}
          quantity={quantity}
          selectedDuration={selectedDuration}
          pricing={pricing}
          isPricingPending={isPricingPending}
          isPricingError={isPricingError}
          quote={quote}
          isQuotePending={isQuotePending}
          isQuoteError={isQuoteError}
          isSubmitting={purchaseMutation.isPending}
          formError={formError}
          creationStatus={creationStatus}
          onChangePlan={plan => {
            setPurchasePlan(plan);
            setDuration(
              pricing?.formules.find(item => item.formule === plan)?.durees[0]
                ?.dureeMois ?? 12,
            );
            setFormError("");
          }}
          onChangeQuantity={setQuantity}
          onChangeDuration={setDuration}
          onConfirm={() => {
            if (!getToken()) {
              setFormError("Connecte-toi pour créer une fiche.");
              onUnauthorized?.();
              return;
            }
            setFormError("");
            purchaseMutation.mutate();
          }}
          onBackToFree={() => {
            setPurchaseMode(false);
            setFormError("");
          }}
        />
      ) : (
        <>
          <PlanBar plan="essentielle" freeSlots={creationStatus?.freeSlots} />
          <div className="cf-box">
            <h2>Créer ma fiche Essentielle</h2>
            <p className="cf-sub">
              Quelques informations suffisent. Tu complèteras le reste ensuite.
            </p>

            {formError && (
              <p className="cf-alert" role="alert">
                {formError}
              </p>
            )}

            <div className="cf-grid cf-form-grid">
              <div className="cf-field">
                <label htmlFor={id("prenom")}>
                  Prénom ou nom de l'activité
                </label>
                <input
                  className="cf-input"
                  type="text"
                  autoComplete="given-name"
                  required
                  {...field("prenom")}
                />
                {err("prenom")}
              </div>

              <div className="cf-field">
                <label htmlFor={id("nom")}>
                  Nom <span className="cf-opt">(facultatif)</span>
                </label>
                <input
                  className="cf-input"
                  type="text"
                  autoComplete="family-name"
                  {...field("nom")}
                />
                {err("nom")}
              </div>

              <div className="cf-field">
                <label htmlFor={id("fonction")}>
                  Fonction <span className="cf-opt">(facultatif)</span>
                </label>
                <input
                  className="cf-input"
                  type="text"
                  placeholder="Coiffeuse, gérant, architecte…"
                  {...field("fonction")}
                />
                {err("fonction")}
              </div>

              <div className="cf-field">
                <label htmlFor={id("entreprise")}>
                  Entreprise <span className="cf-opt">(facultatif)</span>
                </label>
                <input
                  className="cf-input"
                  type="text"
                  autoComplete="organization"
                  {...field("entreprise")}
                />
                {err("entreprise")}
              </div>

              <div className="cf-field">
                <label htmlFor={id("secteur")}>
                  Secteur <span className="cf-opt">(facultatif)</span>
                </label>
                <select
                  className="cf-input"
                  id={id("secteur")}
                  ref={el => {
                    refs.current.secteur = el;
                  }}
                  value={values.secteur}
                  onChange={set("secteur")}
                >
                  <option value="">Je ne sais pas encore</option>
                  {SECTEURS.map(s => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cf-field">
                <label htmlFor={id("telephone")}>
                  Téléphone <span className="cf-opt">(facultatif)</span>
                </label>
                <input
                  className="cf-input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+221 77 000 00 00"
                  {...field("telephone")}
                />
                {err("telephone")}
              </div>

              <div className="cf-field cf-field-full">
                <label htmlFor={id("whatsapp")}>
                  WhatsApp <span className="cf-opt">(facultatif)</span>
                </label>
                <input
                  className="cf-input"
                  type="tel"
                  inputMode="tel"
                  placeholder="+221 77 000 00 00"
                  {...field("whatsapp")}
                  value={sameWhatsapp ? values.telephone : values.whatsapp}
                  disabled={sameWhatsapp}
                />
                <label className="cf-check">
                  <input
                    type="checkbox"
                    checked={sameWhatsapp}
                    onChange={e => setSameWhatsapp(e.target.checked)}
                  />
                  Même numéro que le téléphone
                </label>
                {err("whatsapp")}
              </div>
            </div>

            <button className="cf-btn" type="submit" disabled={loading}>
              {loading ? "Création en cours…" : "Créer ma fiche gratuite"}
            </button>

            <p className="cf-note">
              {creationStatus?.freeSlots} place(s) Essentielle gratuite(s)
              restante(s). Pro ou Signature sont disponibles à tout moment.
            </p>
            <button
              className="cf-btn cf-secondary"
              type="button"
              onClick={() => {
                setPurchaseMode(true);
                setFormError("");
              }}
            >
              Choisir une formule ou plusieurs fiches
            </button>
          </div>
        </>
      )}
    </form>
  );
}
