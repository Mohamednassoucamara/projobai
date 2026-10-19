import { useEffect, useState } from "react";
import { Loader2, ClipboardCheck, FileText, Check } from "lucide-react";
import { EVALUATION_CRITERIA, RECOMMENDATIONS, formatWhen, MODE_LABELS, type Interview } from "../../lib/ats";
import { atsService, atsErrorMessage, type Evaluation } from "../../services/ats.service";

const SCALE = [
  { v: 1, label: "Insuffisant" },
  { v: 2, label: "Faible" },
  { v: 3, label: "Correct" },
  { v: 4, label: "Bon" },
  { v: 5, label: "Excellent" },
];

/** Grille d'évaluation structurée et compte rendu d'un entretien (visibles par l'entreprise seulement). */
export default function InterviewEvaluationForm({
  interview,
  candidateName,
  jobTitle,
  onSaved,
}: {
  interview: Interview;
  candidateName: string;
  jobTitle: string;
  onSaved?: (ev: Pick<Evaluation, "recommendation" | "scores">) => void;
}) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [recommendation, setRecommendation] = useState<Evaluation["recommendation"]>(null);
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    atsService.getEvaluation(interview.id).then(
      (ev) => {
        if (cancelled || !ev) return;
        setScores(ev.scores || {});
        setRecommendation(ev.recommendation);
        setReport(ev.report || "");
      },
      () => undefined,
    ).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [interview.id]);

  const rated = EVALUATION_CRITERIA.filter((c) => scores[c.key]);
  const average = rated.length ? rated.reduce((s, c) => s + scores[c.key], 0) / rated.length : null;

  // Compte rendu prérempli à partir de la grille : le recruteur le complète avec ses observations.
  const draftReport = () => {
    const lines = [
      `Compte rendu d'entretien — ${candidateName}`,
      `Poste : ${jobTitle}`,
      `Date : ${formatWhen(interview.scheduled_at)} (${MODE_LABELS[interview.mode]})`,
      interview.interviewer ? `Recruteur(s) : ${interview.interviewer}` : "",
      "",
      "Évaluation :",
      ...EVALUATION_CRITERIA.map((c) => `- ${c.label} : ${scores[c.key] ? `${scores[c.key]}/5 (${SCALE[scores[c.key] - 1].label})` : "non évalué"}`),
      average !== null ? `Moyenne : ${average.toFixed(1)}/5` : "",
      "",
      "Points forts :",
      "- ",
      "",
      "Points à vérifier :",
      "- ",
      "",
      `Avis : ${RECOMMENDATIONS.find((r) => r.value === recommendation)?.label || "à préciser"}`,
    ];
    setReport(lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n"));
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await atsService.saveEvaluation({ interview_id: interview.id, scores, recommendation, report: report.trim() || null });
      if (interview.status === "planned" && new Date(interview.scheduled_at).getTime() < Date.now()) {
        await atsService.updateInterview(interview.id, { status: "done" }).catch(() => undefined);
      }
      setMsg({ ok: true, text: "Évaluation enregistrée." });
      onSaved?.({ recommendation, scores });
    } catch (err) {
      setMsg({ ok: false, text: atsErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="py-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#050FA0]" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-[#050FA0]" />
        <h4 className="font-bold text-slate-900">Grille d&apos;évaluation</h4>
        {average !== null && <span className="ml-auto text-sm font-bold text-[#050FA0] tabular-nums">Moyenne {average.toFixed(1)} / 5</span>}
      </div>

      <div className="space-y-3">
        {EVALUATION_CRITERIA.map((c) => (
          <fieldset key={c.key} className="rounded-xl border border-slate-200 bg-white p-3">
            <legend className="sr-only">{c.label}</legend>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className="text-sm font-semibold text-slate-800 sm:w-64 shrink-0" aria-hidden="true">{c.label}</span>
              <div className="flex gap-1.5 flex-wrap" role="radiogroup" aria-label={c.label}>
                {SCALE.map((s) => {
                  const on = scores[c.key] === s.v;
                  return (
                    <button
                      key={s.v}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      title={s.label}
                      onClick={() => setScores((cur) => ({ ...cur, [c.key]: on ? 0 : s.v }))}
                      className={`h-9 min-w-9 px-2 rounded-lg border-2 text-sm font-bold tabular-nums ${on ? "border-[#050FA0] bg-[#050FA0] text-white" : "border-slate-200 text-slate-600 hover:border-[#050FA0]"}`}
                    >
                      {s.v}
                    </button>
                  );
                })}
              </div>
              {scores[c.key] ? <span className="text-xs text-slate-500">{SCALE[scores[c.key] - 1].label}</span> : null}
            </div>
          </fieldset>
        ))}
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-slate-700 mb-2">Avis du recruteur</legend>
        <div className="flex flex-wrap gap-2">
          {RECOMMENDATIONS.map((r) => {
            const on = recommendation === r.value;
            return (
              <button
                key={r.value}
                type="button"
                aria-pressed={on}
                onClick={() => setRecommendation(on ? null : r.value)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 text-sm font-bold ${on ? r.cls : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
              >
                {on && <Check className="h-4 w-4" />} {r.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">L&apos;avis est interne : le candidat n&apos;est prévenu que lorsque vous changez l&apos;étape de sa candidature.</p>
      </fieldset>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <label htmlFor={`report-${interview.id}`} className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <FileText className="h-4 w-4" /> Compte rendu
          </label>
          <button type="button" onClick={draftReport} className="text-xs font-bold text-[#050FA0] hover:underline">
            Préremplir à partir de la grille
          </button>
        </div>
        <textarea
          id={`report-${interview.id}`}
          value={report}
          onChange={(e) => setReport(e.target.value)}
          rows={8}
          maxLength={10000}
          placeholder="Observations, points forts, réserves, prochaines étapes…"
          className="w-full px-3 py-2.5 rounded-lg border-2 border-slate-200 focus:border-[#050FA0] outline-none bg-white text-sm font-mono leading-relaxed"
        />
      </div>

      {msg && (
        <p role="status" className={`text-sm rounded-lg px-3 py-2 border ${msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-red-50 border-red-200 text-red-800"}`}>{msg.text}</p>
      )}
      <button type="button" onClick={save} disabled={busy} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#050FA0] text-white font-bold text-sm hover:bg-[#060C6E] disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer l&apos;évaluation
      </button>
    </div>
  );
}
