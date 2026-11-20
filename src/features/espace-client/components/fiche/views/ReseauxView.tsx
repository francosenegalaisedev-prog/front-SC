import { planOf } from "../../../../../lib/plans";
import { I, socialIconFor } from "../Icon";
import type { ViewProps } from "../types";

/** Contenu de l'onglet « reseaux » vu par le visiteur. */
export default function ReseauxView({ fiche }: ViewProps) {
  const d = fiche.data,
    plan = planOf(fiche);
  return (
    <div className="f-soc">
      {(d.reseauxSociaux || []).slice(0, plan.maxSocial).map((s, i) => (
        <a key={`${s.label}-${i}`} href={s.url} target="_blank" rel="noreferrer">
          <span>
            <I n={socialIconFor(s.label, s.url)} s={15} />
          </span>
          {s.label}
          <I n="arrow" s={13} />
        </a>
      ))}
    </div>
  );
}
