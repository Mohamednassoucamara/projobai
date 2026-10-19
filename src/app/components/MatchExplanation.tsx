import { CheckCircle2, CircleAlert, Info } from "lucide-react";
import { MATCH_DISCLAIMER, matchTone, type MatchResult } from "../../lib/matching";

/** Score de compatibilité détaillé : chaque critère, ses points et sa raison. */
export default function MatchExplanation({
  match,
  audience,
  compact = false,
}: {
  match: MatchResult;
  audience: "candidate" | "company";
  compact?: boolean;
}) {
  const tone = matchTone(match.score);
  return (
    <div className={`rounded-2xl border-2 p-4 sm:p-5 ${tone.cls}`}>
      <p className="font-bold">
        {audience === "candidate" ? "Compatibilité avec votre CV" : "Compatibilité avec l'offre"} :{" "}
        <span className="tabular-nums">{match.score}%</span> · {tone.label}
      </p>

      <ul className="mt-3 space-y-2.5">
        {match.criteria.map((c) => {
          const pct = c.max ? Math.round((c.points / c.max) * 100) : 0;
          return (
            <li key={c.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-800">{c.label}</span>
                <span className="tabular-nums text-slate-600 shrink-0">{c.points} / {c.max}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-white/80 overflow-hidden" aria-hidden="true">
                <div className="h-full rounded-full bg-current opacity-70" style={{ width: `${pct}%` }} />
              </div>
              {!compact && <p className="mt-1 text-xs text-slate-600">{c.detail}</p>}
            </li>
          );
        })}
      </ul>

      {match.matched.length > 0 && (
        <p className="text-sm mt-3 flex gap-1.5 text-slate-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
          <span><span className="font-semibold">{audience === "candidate" ? "Vous avez" : "Compétences présentes"} :</span> {match.matched.join(", ")}</span>
        </p>
      )}
      {match.missing.length > 0 && (
        <p className="text-sm mt-1.5 flex gap-1.5 text-slate-800">
          <CircleAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          <span>
            <span className="font-semibold">{audience === "candidate" ? "Compétences à mettre en avant ou à acquérir" : "Compétences non trouvées dans le CV"} :</span>{" "}
            {match.missing.slice(0, 8).join(", ")}
          </span>
        </p>
      )}

      <p className="mt-3 text-xs text-slate-600 flex gap-1.5">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        {audience === "company"
          ? MATCH_DISCLAIMER
          : "Score calculé à partir de votre CV : compétences, poste, expérience, diplôme et ville. Il vous aide à cibler vos candidatures, il ne décide pas à la place du recruteur."}
      </p>
    </div>
  );
}
