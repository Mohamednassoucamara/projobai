import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { Loader2, Wand2, CheckCircle2, ArrowRight, Undo2, AlertCircle, Sparkles, Lightbulb } from "lucide-react";
import AppNavHeader from "../components/AppNavHeader";
import Footer from "../components/Footer";
import MatchExplanation from "../components/MatchExplanation";
import { useCVData, type CVData } from "../contexts/CVDataContext";
import { jobService } from "../../services/supabase.service";
import { aiService, aiErrorMessage } from "../../services/ai.service";
import { matchJob, matchTone, estimateYears, norm } from "../../lib/matching";

type Proposal = {
  profile: string;
  skills: string[];
  descriptions: (string[] | null)[];
  keywords: string[];
  advice: string[];
  byAi: boolean;
};

/** Version locale (sans IA) : profil ciblé et compétences utiles en premier. */
function localProposal(cv: CVData, job: Record<string, any>, matched: string[]): Proposal {
  const years = estimateYears(cv.experiences);
  const yearsTxt = years && years >= 1 ? `${Math.round(years)} an${Math.round(years) > 1 ? "s" : ""} d'expérience` : "une première expérience";
  const strong = matched.length ? matched.slice(0, 3) : cv.skills.slice(0, 3);
  const degree = cv.education[0]?.degree;
  const profile = [
    `${cv.jobTitle || "Professionnel(le)"} avec ${yearsTxt}${degree ? ` et titulaire d'un(e) ${degree}` : ""}, je souhaite mettre mes compétences au service du poste de ${job.title}${job.company_profiles?.company_name ? ` chez ${job.company_profiles.company_name}` : ""}.`,
    strong.length ? `Points forts pour ce poste : ${strong.join(", ")}.` : "",
    `Disponible${job.location ? ` à ${String(job.location).split(",")[0]}` : ""}, rigoureux(se) et motivé(e).`,
  ].filter(Boolean).join(" ");
  const useful = new Set(matched.map(norm));
  const skills = [...cv.skills].sort((a, b) => Number(useful.has(norm(b)) || matched.some((m) => norm(b).includes(norm(m)))) - Number(useful.has(norm(a)) || matched.some((m) => norm(a).includes(norm(m)))));
  return {
    profile,
    skills,
    descriptions: cv.experiences.map(() => null),
    keywords: matched,
    advice: [
      "Commencez chaque mission par un verbe d'action et un résultat chiffré quand c'est possible.",
      "Reprenez dans votre lettre les mots-clés de l'offre que votre parcours justifie.",
    ],
    byAi: false,
  };
}

export default function CVAdapt() {
  const { id = "" } = useParams<{ id: string }>();
  const { cvData, updateCVData } = useCVData();
  const [job, setJob] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiNote, setAiNote] = useState("");
  const [undo, setUndo] = useState<Pick<CVData, "profile" | "skills" | "experiences"> | null>(null);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    jobService.getJobById(id).then(
      (j) => (j ? setJob(j) : setNotFound(true)),
      () => setNotFound(true),
    ).finally(() => setLoading(false));
  }, [id]);

  const before = useMemo(() => (job ? matchJob(job, cvData) : null), [job, cvData]);

  // Résultat si la proposition et les compétences cochées sont appliquées.
  const draft = useMemo(() => {
    if (!proposal) return null;
    const skills = [...proposal.skills, ...[...owned].filter((s) => !proposal.skills.some((x) => norm(x) === norm(s)))];
    const experiences = cvData.experiences.map((e, i) => (proposal.descriptions[i]?.length ? { ...e, description: proposal.descriptions[i]! } : e));
    return { profile: proposal.profile, skills, experiences };
  }, [proposal, owned, cvData.experiences]);

  const after = useMemo(() => (job && draft ? matchJob(job, { ...cvData, ...draft }) : null), [job, draft, cvData]);

  const generate = async () => {
    if (!job || !before) return;
    setBusy(true);
    setAiNote("");
    setApplied(false);
    try {
      const r = await aiService.tailorCV(cvData, {
        title: job.title,
        company: job.company_profiles?.company_name,
        location: job.location,
        description: String(job.description || "").slice(0, 3000),
        skills: (job.job_skills || []).map((s: { skill_name: string }) => s.skill_name),
        requirements: job.requirements,
        experience_level: job.experience_level,
        education_level: job.education_level,
      });
      const known = new Set(cvData.skills.map(norm));
      const skills = (r.skills || []).filter((s) => typeof s === "string" && known.has(norm(s)));
      setProposal({
        profile: (r.profile || "").trim() || localProposal(cvData, job, before.matched).profile,
        // L'IA ne peut que réordonner les compétences existantes : on écarte tout ajout.
        skills: [...skills, ...cvData.skills.filter((s) => !skills.some((x) => norm(x) === norm(s)))],
        descriptions: cvData.experiences.map((_, i) => {
          const d = r.experiences?.[i]?.description;
          return Array.isArray(d) && d.length ? d.filter((x) => typeof x === "string").slice(0, 3) : null;
        }),
        keywords: (r.keywords || []).slice(0, 10),
        advice: (r.advice || []).slice(0, 4),
        byAi: true,
      });
    } catch (e) {
      setAiNote(aiErrorMessage(e));
      setProposal(localProposal(cvData, job, before.matched));
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!draft) return;
    setUndo({ profile: cvData.profile, skills: cvData.skills, experiences: cvData.experiences });
    updateCVData(draft);
    setApplied(true);
  };

  const revert = () => {
    if (!undo) return;
    updateCVData(undo);
    setUndo(null);
    setApplied(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-[#050FA0]" /></div>;
  if (notFound || !job || !before) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <AppNavHeader backTo="/jobs" backLabel="Retour aux offres" />
        <div className="flex-1 flex items-center justify-center text-center p-6">
          <div><AlertCircle className="h-12 w-12 text-[#E4220F] mx-auto mb-3" /><p className="font-semibold">Offre introuvable.</p></div>
        </div>
      </div>
    );
  }

  const company = job.company_profiles?.company_name || "l'entreprise";
  const hasCV = cvData.skills.length > 0 || cvData.experiences.length > 0 || cvData.jobTitle;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppNavHeader backTo={`/jobs/${job.id}`} backLabel="Retour à l'offre" maxWidth="5xl" />
      <main className="page-container-narrow py-8 sm:py-12 flex-1">
        <p className="text-sm font-bold uppercase tracking-wide text-[#050FA0]">Adapter mon CV</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{job.title}</h1>
        <p className="text-slate-600 mt-1">{company} · {job.location}</p>

        {!hasCV ? (
          <div className="mt-8 rounded-2xl border-2 border-slate-200 bg-white p-6">
            <p className="font-semibold">Votre CV est vide.</p>
            <p className="text-sm text-slate-600 mt-1">Créez-le ou importez votre CV existant, puis revenez ici pour l&apos;adapter à cette offre.</p>
            <Link to="/cv-assistant" className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#050FA0] text-white font-bold text-sm">Créer mon CV <ArrowRight className="h-4 w-4" /></Link>
          </div>
        ) : (
          <div className="mt-8 grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-6">
              {before.missing.length > 0 && (
                <section className="bg-white rounded-2xl border p-5 sm:p-6">
                  <h2 className="text-lg font-bold">Compétences demandées absentes de votre CV</h2>
                  <p className="text-sm text-slate-600 mt-1 mb-4">Cochez seulement celles que vous maîtrisez vraiment : le recruteur pourra vous interroger dessus.</p>
                  <ul className="grid sm:grid-cols-2 gap-2">
                    {before.missing.map((m) => (
                      <li key={m}>
                        <label className="flex items-center gap-2.5 rounded-xl border-2 border-slate-200 px-3 py-2.5 cursor-pointer has-[:checked]:border-[#050FA0] has-[:checked]:bg-[#050FA0]/5">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[#050FA0]"
                            checked={owned.has(m)}
                            onChange={(e) => setOwned((cur) => { const n = new Set(cur); if (e.target.checked) n.add(m); else n.delete(m); return n; })}
                          />
                          <span className="text-sm font-medium text-slate-800">J&apos;ai : {m}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="bg-white rounded-2xl border p-5 sm:p-6">
                <h2 className="text-lg font-bold">Version ciblée de votre CV</h2>
                <p className="text-sm text-slate-600 mt-1">Profil réécrit pour ce poste, compétences utiles en premier, missions reformulées avec les mots-clés de l&apos;offre. Rien n&apos;est inventé.</p>
                <button type="button" onClick={generate} disabled={busy} className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#050FA0] text-white font-bold text-sm hover:bg-[#060C6E] disabled:opacity-60">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  {proposal ? "Proposer une autre version" : "Proposer une version adaptée"}
                </button>
                {aiNote && <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{aiNote}</p>}

                {proposal && draft && (
                  <div className="mt-6 space-y-5">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 mb-2">Profil</h3>
                      {cvData.profile && <p className="text-sm text-slate-500 line-through decoration-slate-300 mb-2">{cvData.profile}</p>}
                      <textarea
                        value={proposal.profile}
                        onChange={(e) => setProposal({ ...proposal, profile: e.target.value })}
                        rows={5}
                        className="w-full px-3 py-2.5 rounded-lg border-2 border-emerald-200 bg-emerald-50/40 focus:border-[#050FA0] outline-none text-sm"
                        aria-label="Profil proposé"
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 mb-2">Compétences (dans l&apos;ordre proposé)</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {draft.skills.map((s) => {
                          const useful = after?.matched.some((m) => norm(m) === norm(s) || norm(s).includes(norm(m)) || norm(m).includes(norm(s)));
                          return <span key={s} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${useful ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{s}</span>;
                        })}
                      </div>
                    </div>
                    {proposal.descriptions.some(Boolean) && (
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-2">Missions reformulées</h3>
                        <ul className="space-y-3">
                          {cvData.experiences.map((e, i) => proposal.descriptions[i] && (
                            <li key={i} className="text-sm">
                              <p className="font-semibold text-slate-900">{e.title}{e.company ? ` — ${e.company}` : ""}</p>
                              <ul className="list-disc ml-5 text-slate-700">
                                {proposal.descriptions[i]!.map((d, k) => <li key={k}>{d}</li>)}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {proposal.advice.length > 0 && (
                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                        <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5"><Lightbulb className="h-4 w-4 text-amber-600" /> Conseils pour cette candidature</h3>
                        <ul className="list-disc ml-5 space-y-1 text-sm text-slate-700">{proposal.advice.map((a, i) => <li key={i}>{a}</li>)}</ul>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2">
                      {!applied ? (
                        <button type="button" onClick={apply} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#E4220F] to-[#F92813] text-white font-bold text-sm">
                          <CheckCircle2 className="h-4 w-4" /> Appliquer à mon CV
                        </button>
                      ) : (
                        <>
                          <p role="status" className="w-full text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">CV mis à jour pour cette offre.</p>
                          <Link to="/cv-preview" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#050FA0] text-white font-bold text-sm">Télécharger mon CV <ArrowRight className="h-4 w-4" /></Link>
                          <Link to={`/jobs/${job.id}`} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-[#050FA0] text-[#050FA0] font-bold text-sm">Postuler</Link>
                          <button type="button" onClick={revert} className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-bold text-slate-600 hover:text-slate-900"><Undo2 className="h-4 w-4" /> Revenir à mon CV précédent</button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>

            <aside className="lg:col-span-2 space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">Votre CV actuel</p>
                <MatchExplanation match={before} audience="candidate" compact />
              </div>
              {after && after.score !== before.score && (
                <div className={`rounded-2xl border-2 p-4 ${matchTone(after.score).cls}`}>
                  <p className="text-sm font-semibold flex items-center gap-1.5"><Sparkles className="h-4 w-4" /> Après adaptation</p>
                  <p className="text-3xl font-bold tabular-nums mt-1">{after.score}%</p>
                  <p className="text-xs mt-1">contre {before.score}% avec votre CV actuel</p>
                </div>
              )}
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
