import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  Compass, Sparkles, Loader2, RotateCcw, Briefcase, GraduationCap, Target, MessageCircle,
  Send, CheckCircle2, ArrowRight, Lightbulb, MapPin, ListChecks, BookOpen,
} from "lucide-react";
import { motion } from "motion/react";
import AppNavHeader from "../components/AppNavHeader";
import Footer from "../components/Footer";
import { useCVData } from "../contexts/CVDataContext";
import { aiService, aiErrorMessage } from "../../services/ai.service";
import {
  NIVEAUX, SITUATIONS, INTERETS, localOrientation, normalizeOrientation,
  type OrientationProfile, type InteretId, type OrientationResult,
} from "../../lib/orientationData";

const inputCls =
  "w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all bg-white";

const QUESTIONS = [
  "Comment trouver un stage à Conakry ?",
  "Quelles compétences sont recherchées dans les mines ?",
  "Comment me reconvertir sans reprendre de longues études ?",
  "Comment me présenter lors d'un premier entretien ?",
];

/** Conseils hors IA pour les questions les plus fréquentes. */
const FAQ: { q: string; a: string[] }[] = [
  { q: "Comment trouver un stage ?", a: ["Listez 15 structures de votre domaine (entreprises, ONG, administrations).", "Déposez un CV imprimé et une lettre courte, en demandant le responsable RH ou le chef de service.", "Relancez une semaine plus tard, par téléphone ou en personne.", "Demandez à vos enseignants et anciens camarades s'ils connaissent des structures qui accueillent des stagiaires."] },
  { q: "Comment me reconvertir ?", a: ["Choisissez un métier proche de vos compétences actuelles pour limiter la formation nécessaire.", "Privilégiez les formations courtes et certifiantes (quelques semaines à quelques mois).", "Faites une mission bénévole ou un stage court dans le nouveau domaine pour le tester.", "Réécrivez votre CV en mettant en avant les compétences transférables."] },
  { q: "Comment me démarquer des autres candidats ?", a: ["Adaptez votre CV et votre lettre à chaque offre.", "Chiffrez vos résultats : nombre de personnes formées, délais tenus, quantités traitées.", "Préparez des exemples concrets pour l'entretien (méthode STAR).", "Soignez votre présentation et arrivez en avance."] },
];

type Msg = { role: "user" | "assistant"; content: string };

function niveauFromCV(degree: string): OrientationProfile["niveau"] {
  const d = degree.toLowerCase();
  if (/doctorat/.test(d)) return "Doctorat";
  if (/master|maîtrise|mba|ingénieur/.test(d)) return "Master (Bac+5)";
  if (/licence/.test(d)) return "Licence (Bac+3)";
  if (/bts|dut|bac\s*\+\s*2/.test(d)) return "BTS / DUT (Bac+2)";
  if (/bac/.test(d)) return "Baccalauréat";
  if (/bepc/.test(d)) return "BEPC";
  return "";
}

export default function CareerOrientation() {
  const { cvData, updateCVData } = useCVData();
  const firstDegree = cvData.education.find((e) => e.degree.trim())?.degree || "";
  const [profile, setProfile] = useState<OrientationProfile>({
    niveau: niveauFromCV(firstDegree),
    domaine: firstDegree.replace(/^(licence|master|bts|dut|baccalauréat|bac|maîtrise)\s*(professionnelle\s*)?(en|de|d'|,)?\s*/i, "").trim(),
    situation: SITUATIONS[0],
    interets: [],
    competences: cvData.skills.join(", "),
    ville: (cvData.location || "").split(",")[0].trim(),
    mobilite: true,
    precisions: "",
  });
  const [result, setResult] = useState<OrientationResult | null>(cvData.orientation);
  const [editingProfile, setEditingProfile] = useState(!cvData.orientation);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [appliedTitle, setAppliedTitle] = useState<string | null>(null);

  // Le résultat enregistré peut arriver après le chargement du compte.
  useEffect(() => {
    if (cvData.orientation && !result) {
      setResult(cvData.orientation);
      setEditingProfile(false);
    }
  }, [cvData.orientation, result]);

  const set = <K extends keyof OrientationProfile>(k: K, v: OrientationProfile[K]) => {
    setFormError(null);
    setProfile((p) => ({ ...p, [k]: v }));
  };
  const toggleInterest = (id: InteretId) => {
    setFormError(null);
    setProfile((p) => ({
      ...p,
      interets: p.interets.includes(id) ? p.interets.filter((x) => x !== id) : p.interets.length >= 4 ? p.interets : [...p.interets, id],
    }));
  };

  const analyse = async () => {
    if (!profile.niveau || profile.interets.length === 0) {
      setFormError("Indiquez votre niveau d'études et au moins un centre d'intérêt.");
      return;
    }
    setFormError(null);
    setLoading(true);
    setNotice(null);
    let res: OrientationResult;
    try {
      const raw = await aiService.careerOrientation(
        { ...profile, interets: profile.interets.map((i) => INTERETS.find((x) => x.id === i)?.label) },
        cvData,
      );
      const n = normalizeOrientation({ ...(raw as object), source: "ai", createdAt: new Date().toISOString() });
      if (!n) throw new Error("invalid");
      res = n;
    } catch (e) {
      res = localOrientation(profile);
      setNotice(aiErrorMessage(e).replace("La version standard a été utilisée.", "Les pistes ci-dessous viennent de notre base de métiers."));
    } finally {
      setLoading(false);
    }
    setResult(res);
    updateCVData({ orientation: res });
    setEditingProfile(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const applyTitle = (title: string) => {
    updateCVData({ jobTitle: title });
    setAppliedTitle(title);
    window.setTimeout(() => setAppliedTitle(null), 3500);
  };

  // ---------- Conseiller carrière ----------
  const [messages, setMessages] = useState<Msg[]>([]);
  const [question, setQuestion] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatUnavailable, setChatUnavailable] = useState<string | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, chatBusy]);

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || chatBusy) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setQuestion("");
    setChatBusy(true);
    try {
      const r = await aiService.careerChat(next, {
        poste: cvData.jobTitle,
        ville: profile.ville || cvData.location,
        niveau: profile.niveau,
        domaine: profile.domaine,
        competences: cvData.skills.slice(0, 10),
        pistes: result?.careers.map((c) => c.title),
      });
      if (!r.reply) throw new Error("empty");
      setMessages((m) => [...m, { role: "assistant", content: r.reply! }]);
    } catch (e) {
      setMessages((m) => m.slice(0, -1));
      setQuestion(q);
      setChatUnavailable(aiErrorMessage(e).replace(" La version standard a été utilisée.", ""));
    } finally {
      setChatBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      <AppNavHeader backTo="/dashboard" backLabel="Retour au tableau de bord" maxWidth="6xl" />

      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 sm:py-12 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#003087] to-[#0047b3] flex items-center justify-center shrink-0 shadow-lg">
              <Compass className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#003087]">Orientation professionnelle</h1>
              <p className="text-slate-600 mt-1 max-w-2xl">Découvrez les métiers qui vous correspondent sur le marché guinéen, avec un plan d&apos;action concret et un conseiller pour répondre à vos questions.</p>
            </div>
          </div>
          {result && !editingProfile && (
            <button type="button" onClick={() => setEditingProfile(true)} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-[#003087] text-[#003087] font-bold hover:bg-[#003087] hover:text-white transition-colors shrink-0">
              <RotateCcw className="h-4 w-4" /> Refaire le questionnaire
            </button>
          )}
        </div>

        {/* ---------- Questionnaire ---------- */}
        {editingProfile && (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border-2 border-slate-100 shadow-xl p-5 sm:p-8 mb-10" aria-labelledby="q-title">
            <h2 id="q-title" className="text-xl font-bold text-slate-900 mb-1">Parlez-nous de vous</h2>
            <p className="text-sm text-slate-500 mb-6">2 minutes suffisent. Les réponses déjà présentes viennent de votre CV.</p>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="o-situation" className="block text-sm font-bold text-slate-700 mb-2">Votre situation</label>
                <select id="o-situation" value={profile.situation} onChange={(e) => set("situation", e.target.value)} className={inputCls}>
                  {SITUATIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="o-niveau" className="block text-sm font-bold text-slate-700 mb-2">Niveau d&apos;études *</label>
                <select id="o-niveau" value={profile.niveau} onChange={(e) => set("niveau", e.target.value as OrientationProfile["niveau"])} className={inputCls}>
                  <option value="">Choisir…</option>
                  {NIVEAUX.map((n) => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="o-domaine" className="block text-sm font-bold text-slate-700 mb-2">Domaine d&apos;études ou métier actuel</label>
                <input id="o-domaine" value={profile.domaine} onChange={(e) => set("domaine", e.target.value)} className={inputCls} placeholder="Ex : comptabilité, génie civil, sociologie" />
              </div>
              <div>
                <label htmlFor="o-ville" className="block text-sm font-bold text-slate-700 mb-2">Ville</label>
                <input id="o-ville" value={profile.ville} onChange={(e) => set("ville", e.target.value)} className={inputCls} placeholder="Ex : Conakry, Kankan, Labé" />
              </div>
            </div>

            <fieldset className="mt-6">
              <legend className="block text-sm font-bold text-slate-700 mb-1">Ce qui vous attire *</legend>
              <p className="text-xs text-slate-500 mb-3">Choisissez jusqu&apos;à 4 centres d&apos;intérêt ({profile.interets.length}/4).</p>
              <div className="flex flex-wrap gap-2">
                {INTERETS.map((i) => {
                  const on = profile.interets.includes(i.id);
                  const full = !on && profile.interets.length >= 4;
                  return (
                    <button
                      key={i.id}
                      type="button"
                      aria-pressed={on}
                      disabled={full}
                      onClick={() => toggleInterest(i.id)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-colors disabled:opacity-40 ${on ? "bg-[#003087] border-[#003087] text-white" : "bg-white border-slate-200 text-slate-700 hover:border-[#003087]"}`}
                    >
                      {on && <CheckCircle2 className="inline h-4 w-4 mr-1 -mt-0.5" />}{i.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid md:grid-cols-2 gap-5 mt-6">
              <div>
                <label htmlFor="o-comp" className="block text-sm font-bold text-slate-700 mb-2">Vos compétences</label>
                <textarea id="o-comp" rows={3} value={profile.competences} onChange={(e) => set("competences", e.target.value)} className={`${inputCls} resize-y`} placeholder="Ex : Excel, relation client, conduite, langues nationales" />
              </div>
              <div>
                <label htmlFor="o-prec" className="block text-sm font-bold text-slate-700 mb-2">Autre chose à savoir ? (facultatif)</label>
                <textarea id="o-prec" rows={3} value={profile.precisions} onChange={(e) => set("precisions", e.target.value)} className={`${inputCls} resize-y`} placeholder="Ex : je veux travailler dans une ONG, je ne peux pas reprendre d'études longues" />
              </div>
            </div>

            <label className="mt-5 flex items-center gap-3 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={profile.mobilite} onChange={(e) => set("mobilite", e.target.checked)} className="h-5 w-5 accent-[#003087]" />
              Je suis prêt(e) à travailler hors de ma ville ou sur des sites (mines, chantiers, projets en région).
            </label>

            {formError && <p role="alert" className="mt-5 text-sm font-medium text-[#E31E24]">{formError}</p>}

            <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              {result && (
                <button type="button" onClick={() => setEditingProfile(false)} className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-50">
                  Revoir mes résultats
                </button>
              )}
              <button type="button" onClick={analyse} disabled={loading} className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white font-bold hover:shadow-xl hover:shadow-[#E31E24]/30 transition-all disabled:opacity-70">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                {loading ? "Analyse de votre profil…" : "Découvrir mes pistes"}
              </button>
            </div>
          </motion.section>
        )}

        {/* ---------- Résultats ---------- */}
        {result && !editingProfile && (
          <section aria-labelledby="r-title" className="mb-12">
            {notice && <div role="status" className="mb-6 rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</div>}
            {appliedTitle && <div role="status" className="mb-6 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">« {appliedTitle} » est maintenant le poste visé de votre CV.</div>}

            <div className="rounded-3xl bg-gradient-to-br from-[#003087] to-[#0047b3] text-white p-6 sm:p-8 mb-6 shadow-xl">
              <h2 id="r-title" className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Target className="h-6 w-6" /> Vos pistes professionnelles</h2>
              {result.summary && <p className="mt-2 text-white/90 max-w-3xl">{result.summary}</p>}
              <p className="mt-3 text-xs text-white/70">
                {result.source === "ai" ? "Analyse personnalisée par l'IA" : "Pistes issues de la base de métiers ProJob AI"} · {new Date(result.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-5">
              {result.careers.map((c, i) => (
                <motion.article
                  key={c.title + i}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`bg-white rounded-3xl border-2 p-5 sm:p-6 flex flex-col gap-4 ${i === 0 ? "border-[#003087] shadow-xl" : "border-slate-100 shadow-lg"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Piste {i + 1}{i === 0 ? " · la plus adaptée" : ""}</span>
                      <h3 className="text-xl font-bold text-slate-900 mt-1">{c.title}</h3>
                    </div>
                    <div className={`shrink-0 rounded-xl border px-3 py-1.5 text-center ${c.match >= 70 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : c.match >= 50 ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                      <div className="text-lg font-bold tabular-nums">{c.match}%</div>
                      <div className="text-[10px] font-semibold">adéquation</div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{c.why}</p>

                  {c.sectors.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Qui recrute</h4>
                      <div className="flex flex-wrap gap-1.5">{c.sectors.map((s) => <span key={s} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">{s}</span>)}</div>
                    </div>
                  )}
                  {c.skillsToDevelop.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5" /> Compétences clés</h4>
                      <div className="flex flex-wrap gap-1.5">{c.skillsToDevelop.map((s) => <span key={s} className="px-2.5 py-1 rounded-full bg-[#003087]/10 text-[#003087] text-xs font-semibold">{s}</span>)}</div>
                    </div>
                  )}
                  {c.trainings.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Formations utiles</h4>
                      <ul className="text-sm text-slate-700 space-y-1 list-disc pl-5">{c.trainings.map((t) => <li key={t}>{t}</li>)}</ul>
                    </div>
                  )}
                  {c.firstSteps.length > 0 && (
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5"><ListChecks className="h-3.5 w-3.5" /> Plan d&apos;action</h4>
                      <ol className="space-y-2">
                        {c.firstSteps.map((s, k) => (
                          <li key={k} className="flex gap-2.5 text-sm text-slate-800">
                            <span className="h-5 w-5 shrink-0 rounded-full bg-[#003087] text-white text-[11px] font-bold grid place-items-center mt-0.5">{k + 1}</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="mt-auto pt-2 grid gap-2">
                    <Link to={`/jobs?q=${encodeURIComponent(c.title.split(/[(/]/)[0].trim())}`} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#003087] text-white text-sm font-bold hover:bg-[#002366]">
                      <Briefcase className="h-4 w-4" /> Voir les offres
                    </Link>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => applyTitle(c.title)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 text-xs font-bold hover:border-[#003087] hover:text-[#003087]">
                        <GraduationCap className="h-4 w-4" /> Viser ce poste
                      </button>
                      <Link to={`/interview-prep?position=${encodeURIComponent(c.title)}`} className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 text-xs font-bold hover:border-[#003087] hover:text-[#003087]">
                        <Target className="h-4 w-4" /> S&apos;entraîner
                      </Link>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>

            {result.advice.length > 0 && (
              <div className="mt-6 bg-white rounded-3xl border-2 border-slate-100 shadow-lg p-5 sm:p-7">
                <h3 className="text-lg font-bold text-slate-900 mb-3">Conseils pour votre recherche</h3>
                <ul className="grid md:grid-cols-2 gap-3">
                  {result.advice.map((a, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-700"><CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" /><span>{a}</span></li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* ---------- Conseiller carrière ---------- */}
        <section aria-labelledby="c-title" className="bg-white rounded-3xl border-2 border-slate-100 shadow-xl overflow-hidden">
          <div className="p-5 sm:p-7 border-b border-slate-100 flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-[#E31E24]/10 text-[#E31E24] grid place-items-center shrink-0"><MessageCircle className="h-5 w-5" /></div>
            <div>
              <h2 id="c-title" className="text-xl font-bold text-slate-900">Conseiller carrière</h2>
              <p className="text-sm text-slate-500">Posez vos questions sur votre orientation, votre recherche d&apos;emploi ou votre évolution.</p>
            </div>
          </div>

          {chatUnavailable ? (
            <div className="p-5 sm:p-7">
              <p className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-5">{chatUnavailable} En attendant, voici les réponses aux questions les plus fréquentes.</p>
              <div className="space-y-3">
                {FAQ.map((f) => (
                  <details key={f.q} className="group rounded-2xl border-2 border-slate-100 p-4 open:border-[#003087]/30">
                    <summary className="cursor-pointer font-bold text-slate-800 list-none flex items-center justify-between gap-3">
                      {f.q}<ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-90" />
                    </summary>
                    <ol className="mt-3 space-y-1.5 list-decimal pl-5 text-sm text-slate-700">{f.a.map((x) => <li key={x}>{x}</li>)}</ol>
                  </details>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-5 sm:p-7">
              <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-1" aria-live="polite">
                {messages.length === 0 && (
                  <div>
                    <p className="text-sm text-slate-600 mb-3">Exemples de questions :</p>
                    <div className="flex flex-wrap gap-2">
                      {QUESTIONS.map((q) => (
                        <button key={q} type="button" onClick={() => ask(q)} className="px-3.5 py-2 rounded-full border-2 border-slate-200 text-sm text-slate-700 hover:border-[#003087] hover:text-[#003087] text-left">{q}</button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${m.role === "user" ? "bg-[#003087] text-white rounded-br-md" : "bg-slate-100 text-slate-800 rounded-bl-md"}`}>{m.content}</div>
                  </div>
                ))}
                {chatBusy && (
                  <div className="flex justify-start"><div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500 inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Le conseiller rédige sa réponse…</div></div>
                )}
                <div ref={chatEnd} />
              </div>
              <form
                className="mt-5 flex gap-2"
                onSubmit={(e) => { e.preventDefault(); void ask(question); }}
              >
                <label htmlFor="c-question" className="sr-only">Votre question</label>
                <input id="c-question" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={600} placeholder="Écrivez votre question…" className={`${inputCls} rounded-full`} />
                <button type="submit" disabled={chatBusy || !question.trim()} aria-label="Envoyer" className="h-12 w-12 shrink-0 rounded-full bg-[#003087] text-white grid place-items-center disabled:opacity-50">
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
