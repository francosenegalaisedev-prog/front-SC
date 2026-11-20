import type {
  FicheCreationStatus,
  FichePurchaseInput,
  FichePurchaseQuote,
  PricingGrid,
} from "../../espaceClient.service";
import { formatPrice } from "../../lib/formatPrice";
import { durationLabel } from "./createFicheForm.utils";
import { PlanBar } from "./PlanBar";

type Props = {
  uid: string;
  purchasePlan: FichePurchaseInput["plan"];
  quantity: number;
  selectedDuration?: number;
  pricing?: PricingGrid;
  isPricingPending: boolean;
  isPricingError: boolean;
  quote?: FichePurchaseQuote;
  isQuotePending: boolean;
  isQuoteError: boolean;
  isSubmitting: boolean;
  formError: string;
  creationStatus?: FicheCreationStatus;
  onChangePlan: (plan: FichePurchaseInput["plan"]) => void;
  onChangeQuantity: (quantity: number) => void;
  onChangeDuration: (duration: number) => void;
  onConfirm: () => void;
  onBackToFree: () => void;
};

export function PurchaseFichesSection({
  uid,
  purchasePlan,
  quantity,
  selectedDuration,
  pricing,
  isPricingPending,
  isPricingError,
  quote,
  isQuotePending,
  isQuoteError,
  isSubmitting,
  formError,
  creationStatus,
  onChangePlan,
  onChangeQuantity,
  onChangeDuration,
  onConfirm,
  onBackToFree,
}: Props) {
  const selectedFormula = pricing?.formules.find(
    formula => formula.formule === purchasePlan,
  );
  const durations = selectedFormula?.durees ?? [];
  const quantityDiscounts = selectedFormula?.remises ?? [];

  return (
    <>
      <PlanBar plan={purchasePlan} />
      <div className="cf-box">
        <h2>Choisir une formule et le nombre de fiches</h2>
        <p className="cf-sub">
          Vos fiches seront créées après confirmation. Vous pourrez les
          compléter ensuite dans l’éditeur.
        </p>
        {formError && (
          <p className="cf-alert" role="alert">
            {formError}
          </p>
        )}

        <div className="cf-field">
          <label htmlFor={`${uid}-plan`}>Formule</label>
          <select
            className="cf-input"
            id={`${uid}-plan`}
            value={purchasePlan}
            onChange={event =>
              onChangePlan(event.target.value as FichePurchaseInput["plan"])
            }
          >
            <option value="essentielle">Essentielle</option>
            {(pricing?.formules ?? [])
              .filter(formula => formula.formule !== "essentielle")
              .map(formula => (
                <option key={formula.formule} value={formula.formule}>
                  {formula.nom}
                  {formula.prixMensuelFcfa !== null
                    ? ` — ${formatPrice(formula.prixMensuelFcfa)}/mois`
                    : " — tarif à configurer"}
                </option>
              ))}
          </select>
          {purchasePlan !== "essentielle" &&
            selectedFormula?.prixMensuelFcfa !== null &&
            selectedFormula?.prixMensuelFcfa !== undefined && (
              <p className="cf-note">
                Tarif de base par fiche :{" "}
                {formatPrice(selectedFormula.prixMensuelFcfa)} par mois, avant
                remises.
              </p>
            )}
        </div>

        <div className="cf-field">
          <label htmlFor={`${uid}-quantity`}>Nombre de fiches</label>
          <input
            className="cf-input"
            id={`${uid}-quantity`}
            type="number"
            min={1}
            max={1000}
            step={1}
            value={quantity}
            onChange={event => onChangeQuantity(Number(event.target.value))}
          />
          {purchasePlan !== "essentielle" && quantityDiscounts.length > 0 && (
            <p className="cf-note">
              Remises selon le nombre de fiches :{" "}
              {quantityDiscounts
                .map(
                  remise =>
                    `dès ${remise.quantiteMin} : −${remise.remisePct}%`,
                )
                .join(" · ")}
            </p>
          )}
        </div>

        {purchasePlan !== "essentielle" && (
          <div className="cf-field">
            <label htmlFor={`${uid}-duration`}>Durée d’abonnement</label>
            <select
              className="cf-input"
              id={`${uid}-duration`}
              value={selectedDuration ?? ""}
              onChange={event => onChangeDuration(Number(event.target.value))}
              disabled={durations.length === 0}
            >
              {durations.map(item => (
                <option key={item.dureeMois} value={item.dureeMois}>
                  {durationLabel(item.dureeMois)}
                  {item.remisePct > 0
                    ? ` — −${item.remisePct}%`
                    : " — sans remise"}
                </option>
              ))}
            </select>
            {durations.length === 0 && (
              <p className="cf-alert" role="alert">
                Aucune durée n’est configurée pour cette formule.
              </p>
            )}
          </div>
        )}

        {isPricingPending ? (
          <p className="cf-note" role="status">
            Chargement des formules et tarifs…
          </p>
        ) : isPricingError ? (
          <p className="cf-alert" role="alert">
            Impossible de charger les tarifs. Réessaie.
          </p>
        ) : isQuotePending ? (
          <p className="cf-note" role="status">
            Calcul du tarif…
          </p>
        ) : isQuoteError ? (
          <p className="cf-alert" role="alert">
            Le tarif ne peut pas être calculé. Vérifie que les paramètres de la
            formule sont configurés.
          </p>
        ) : quote ? (
          <div className="cf-note" aria-live="polite">
            <p>
              {quote.freeQuantity} fiche(s) gratuite(s) · {quote.paidQuantity}{" "}
              fiche(s) payante(s)
            </p>
            {quote.tarif && (
              <>
                <p>
                  Prix sans remise :{" "}
                  {formatPrice(quote.tarif.totalSansRemiseFcfa)}
                </p>
                <p>
                  Remise durée ({quote.tarif.remiseDureePct}%) : −
                  {formatPrice(
                    quote.tarif.totalSansRemiseFcfa -
                      quote.tarif.prixApresDureeFcfa * quote.quantity,
                  )}
                </p>
                <p>
                  Remise quantité ({quote.tarif.remiseQuantitePct}%) : −
                  {formatPrice(
                    (quote.tarif.prixApresDureeFcfa -
                      quote.tarif.prixUnitaireFcfa) *
                      quote.quantity,
                  )}
                </p>
                <p>
                  Prix après remises par fiche :{" "}
                  {formatPrice(quote.tarif.prixUnitaireFcfa)}
                </p>
                <p>
                  Économie totale : {formatPrice(quote.tarif.economieFcfa)}
                </p>
              </>
            )}
            {quote.emplacements?.economieFcfa ? (
              <p>
                Économie sur les packs :{" "}
                {formatPrice(quote.emplacements.economieFcfa)}
              </p>
            ) : null}
            <p className="cf-total">Total : {formatPrice(quote.totalFcfa)}</p>
          </div>
        ) : null}

        <button
          className="cf-btn"
          type="button"
          disabled={
            !quote ||
            isQuotePending ||
            isSubmitting ||
            quantity < 1 ||
            quantity > 1000 ||
            (purchasePlan !== "essentielle" && selectedDuration === undefined)
          }
          onClick={onConfirm}
        >
          {isSubmitting
            ? "Création en cours…"
            : quote?.totalFcfa
              ? `Confirmer la commande · ${formatPrice(quote.totalFcfa)}`
              : "Créer les fiches"}
        </button>
        <p className="cf-note">
          Mode simulation : aucun paiement réel n’est effectué. Les fiches
          Essentielle utilisent d’abord les places gratuites restantes; Pro et
          Signature n’ajoutent pas de frais d’emplacement.
        </p>
        {creationStatus && creationStatus.freeSlots > 0 && (
          <button
            className="cf-btn cf-secondary"
            type="button"
            onClick={onBackToFree}
          >
            Créer une fiche Essentielle gratuite
          </button>
        )}
      </div>
    </>
  );
}
