import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Plus, X, Save, Sparkles, Loader2, Undo2, Eye, CheckCircle2, CloudOff, Cloud } from "lucide-react";
import { motion } from "motion/react";
import Footer from "../components/Footer";
import CVPhotoField from "../components/CVPhotoField";
import { useCVData, type CVData } from "../contexts/CVDataContext";
import { aiService, aiErrorMessage } from "../../services/ai.service";

const inputCls =
  "w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#050FA0] focus:ring-4 focus:ring-[#050FA0]/10 outline-none transition-all";
const LEVELS = [
  { label: "Notions", percentage: 30 },
  { label: "Intermédiaire", percentage: 60 },
  { label: "Courant", percentage: 85 },
  { label: "Langue maternelle", percentage: 100 },
];

function SaveBadge() {
  const { saveStatus } = useCVData();
  const map = {
    local: { icon: CloudOff, text: "Brouillon sur cet appareil", cls: "text-slate-500" },
    loading: { icon: Loader2, text: "Chargement…", cls: "text-slate-500" },
    saving: { icon: Loader2, text: "Enregistrement…", cls: "text-slate-500" },
    saved: { icon: Cloud, text: "Enregistré dans votre compte", cls: "text-emerald-600" },
    error: { icon: CloudOff, text: "Non enregistré : vérifiez la connexion", cls: "text-[#E4220F]" },
  }[saveStatus];
  const Icon = map.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium ${map.cls}`}>
      <Icon className={`h-4 w-4 ${saveStatus === "saving" || saveStatus === "loading" ? "animate-spin" : ""}`} />
      {map.text}
    </span>
  );
}

export default function CVEdit() {
  const { cvData, updateCVData, isSearchable, setSearchable, saveStatus } = useCVData();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CVData>(cvData);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<{ text: string; tips?: string[]; ok: boolean } | null>(null);
  const [undo, setUndo] = useState<CVData | null>(null);
  const [skillsText, setSkillsText] = useState(cvData.skills.join(", "));

  // Chaque modification est reportée dans le contexte, qui l'enregistre dans le compte.
  const commit = (next: CVData) => {
    setFormData(next);
    // La photo et la couleur sont gérées par leurs propres réglages : ne pas les écraser.
    const { photo: _photo, theme: _theme, motif: _motif, letterTemplate: _lt, orientation: _or, ...rest } = next;
    updateCVData(rest);
  };
  const set = <K extends keyof CVData>(key: K, value: CVData[K]) => commit({ ...formData, [key]: value });

  const updateExperience = (index: number, field: string, value: unknown) => {
    const list = [...formData.experiences];
    list[index] = { ...list[index], [field]: value };
    set("experiences", list);
  };
  const updateEducation = (index: number, field: string, value: string) => {
    const list = [...formData.education];
    list[index] = { ...list[index], [field]: value };
    set("education", list);
  };
  const updateLanguage = (index: number, field: "name" | "level", value: string) => {
    const list = [...formData.languages];
    if (field === "level") {
      const lvl = LEVELS.find((l) => l.label === value);
      list[index] = { ...list[index], level: value, percentage: lvl ? lvl.percentage : list[index].percentage };
    } else {
      list[index] = { ...list[index], name: value };
    }
    set("languages", list);
  };

  const handleSkills = (text: string) => {
    setSkillsText(text);
    set("skills", text.split(",").map((s) => s.trim()).filter(Boolean));
  };

  const handleSave = () => {
    updateCVData(formData);
    navigate("/cv-preview");
  };

  const handleOptimize = async () => {
    setAiBusy(true);
    setAiNote(null);
    try {
      const r = await aiService.improveCV(formData);
      const before = formData;
      const next: CVData = { ...formData };
      if (typeof r.profile === "string" && r.profile.trim()) next.profile = r.profile.trim();
      if (Array.isArray(r.experiences)) {
        next.experiences = formData.experiences.map((exp, i) => {
          const d = r.experiences?.[i]?.description;
          return Array.isArray(d) && d.length ? { ...exp, description: d.map(String).filter(Boolean) } : exp;
        });
      }
      if (Array.isArray(r.skills) && r.skills.length) {
        next.skills = r.skills.map(String).filter(Boolean).slice(0, 10);
        setSkillsText(next.skills.join(", "));
      }
      setUndo(before);
      commit(next);
      setAiNote({
        ok: true,
        text: "Profil, missions et compétences réécrits pour le poste visé. Relisez avant d'envoyer.",
        tips: Array.isArray(r.tips) ? r.tips.map(String).slice(0, 3) : undefined,
      });
    } catch (e) {
      setAiNote({ ok: false, text: aiErrorMessage(e).replace(" La version standard a été utilisée.", "") });
    } finally {
      setAiBusy(false);
    }
  };

  const handleUndo = () => {
    if (!undo) return;
    commit(undo);
    setSkillsText(undo.skills.join(", "));
    setUndo(null);
    setAiNote(null);
  };

  const canOptimize = Boolean(formData.jobTitle && (formData.profile || formData.experiences.length));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      <header className="border-b bg-white shadow-sm sticky top-0 z-20">
        <div className="page-container-narrow py-3 sm:py-4 max-w-5xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1 min-w-0">
              <Link to="/cv-preview" className="flex items-center gap-2 text-slate-600 hover:text-[#050FA0] transition-colors min-w-0">
                <ArrowLeft className="h-5 w-5 shrink-0" />
                <span className="font-medium text-sm sm:text-base truncate">Retour à l&apos;aperçu</span>
              </Link>
              <SaveBadge />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleOptimize}
                disabled={aiBusy || !canOptimize}
                title={canOptimize ? "" : "Renseignez au moins le titre et le profil ou une expérience"}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-[#050FA0] text-[#050FA0] hover:bg-[#050FA0] hover:text-white transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#050FA0]"
              >
                {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span>{aiBusy ? "Optimisation…" : "Optimiser avec l'IA"}</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#E4220F] to-[#F92813] text-white hover:shadow-xl hover:shadow-[#E4220F]/40 sm:hover:scale-[1.02] transition-all font-bold"
              >
                <Eye className="h-4 w-4" />
                <span>Voir l&apos;aperçu</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
        {aiNote && (
          <div
            className={`mb-6 rounded-2xl p-4 sm:p-5 border-2 ${aiNote.ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
            role="status"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex gap-3">
                {aiNote.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" /> : <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />}
                <div>
                  <p className="font-medium text-slate-800">{aiNote.text}</p>
                  {aiNote.tips && aiNote.tips.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                      {aiNote.tips.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  )}
                </div>
              </div>
              {undo && (
                <button type="button" onClick={handleUndo} className="inline-flex items-center gap-2 text-sm font-bold text-[#050FA0] hover:underline shrink-0">
                  <Undo2 className="h-4 w-4" /> Annuler les modifications IA
                </button>
              )}
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl border-2 border-slate-100 p-5 sm:p-10"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-[#050FA0] mb-8">Modifier votre CV</h1>

          {/* Informations personnelles */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-[#050FA0] mb-4">Informations personnelles</h2>
            <div className="mb-5"><CVPhotoField /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cv-fullName" className="block text-sm font-medium text-slate-700 mb-2">Nom complet *</label>
                <input id="cv-fullName" type="text" value={formData.fullName} onChange={(e) => set("fullName", e.target.value)} className={inputCls} placeholder="Ex : Mamadou Diallo" />
              </div>
              <div>
                <label htmlFor="cv-jobTitle" className="block text-sm font-medium text-slate-700 mb-2">Poste visé *</label>
                <input id="cv-jobTitle" type="text" value={formData.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} className={inputCls} placeholder="Ex : Technicien en génie civil" />
              </div>
              <div>
                <label htmlFor="cv-phone" className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
                <input id="cv-phone" type="tel" value={formData.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} placeholder="+224 6XX XX XX XX" />
              </div>
              <div>
                <label htmlFor="cv-email" className="block text-sm font-medium text-slate-700 mb-2">E-mail *</label>
                <input id="cv-email" type="email" value={formData.email} onChange={(e) => set("email", e.target.value)} className={inputCls} placeholder="votre.email@exemple.com" />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="cv-location" className="block text-sm font-medium text-slate-700 mb-2">Ville</label>
                <input id="cv-location" type="text" value={formData.location} onChange={(e) => set("location", e.target.value)} className={inputCls} placeholder="Conakry, Guinée" />
              </div>
            </div>
          </section>

          {/* Profil */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-[#050FA0] mb-4">Profil professionnel</h2>
            <label htmlFor="cv-profile" className="sr-only">Profil professionnel</label>
            <textarea
              id="cv-profile"
              value={formData.profile}
              onChange={(e) => set("profile", e.target.value)}
              rows={4}
              className={`${inputCls} resize-y`}
              placeholder="3 à 4 phrases : votre formation, ce que vous savez faire, le poste que vous cherchez."
            />
          </section>

          {/* Expériences */}
          <section className="mb-10">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-bold text-[#050FA0]">Expériences professionnelles</h2>
              <button
                type="button"
                onClick={() => set("experiences", [...formData.experiences, { title: "", company: "", period: "", description: [] }])}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#050FA0]/10 text-[#050FA0] font-bold text-sm hover:bg-[#050FA0]/20"
              >
                <Plus className="h-4 w-4" /> Ajouter
              </button>
            </div>
            {formData.experiences.length === 0 && (
              <p className="text-sm text-slate-500 border-2 border-dashed border-slate-200 rounded-xl p-5">
                Ajoutez vos emplois, stages, bénévolat ou projets. Un stage compte aussi comme expérience.
              </p>
            )}
            <div className="space-y-4">
              {formData.experiences.map((exp, i) => (
                <div key={i} className="rounded-2xl border-2 border-slate-100 p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-slate-500">Expérience {i + 1}</span>
                    <button type="button" onClick={() => set("experiences", formData.experiences.filter((_, k) => k !== i))} className="inline-flex items-center gap-1 text-sm text-[#E4220F] hover:underline" aria-label={`Retirer l'expérience ${i + 1}`}>
                      <X className="h-4 w-4" /> Retirer
                    </button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={`exp-${i}-title`} className="block text-sm font-medium text-slate-700 mb-1">Poste</label>
                      <input id={`exp-${i}-title`} type="text" value={exp.title} onChange={(e) => updateExperience(i, "title", e.target.value)} className={inputCls} placeholder="Ex : Stagiaire conducteur de travaux" />
                    </div>
                    <div>
                      <label htmlFor={`exp-${i}-company`} className="block text-sm font-medium text-slate-700 mb-1">Entreprise et ville</label>
                      <input id={`exp-${i}-company`} type="text" value={exp.company} onChange={(e) => updateExperience(i, "company", e.target.value)} className={inputCls} placeholder="Ex : Entreprise BTP, Conakry" />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor={`exp-${i}-period`} className="block text-sm font-medium text-slate-700 mb-1">Période</label>
                      <input id={`exp-${i}-period`} type="text" value={exp.period} onChange={(e) => updateExperience(i, "period", e.target.value)} className={inputCls} placeholder="Ex : Juin 2025 – Nov. 2025" />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor={`exp-${i}-desc`} className="block text-sm font-medium text-slate-700 mb-1">Missions et résultats (une par ligne)</label>
                      <textarea
                        id={`exp-${i}-desc`}
                        rows={3}
                        value={exp.description.join("\n")}
                        onChange={(e) => updateExperience(i, "description", e.target.value.split("\n"))}
                        onBlur={(e) => updateExperience(i, "description", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
                        className={`${inputCls} resize-y`}
                        placeholder={"Suivi quotidien d'un chantier R+3\nContrôle des quantités de béton"}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Formation */}
          <section className="mb-10">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-bold text-[#050FA0]">Formation</h2>
              <button
                type="button"
                onClick={() => set("education", [...formData.education, { degree: "", institution: "", period: "" }])}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#050FA0]/10 text-[#050FA0] font-bold text-sm hover:bg-[#050FA0]/20"
              >
                <Plus className="h-4 w-4" /> Ajouter
              </button>
            </div>
            {formData.education.length === 0 && (
              <p className="text-sm text-slate-500 border-2 border-dashed border-slate-200 rounded-xl p-5">
                Ajoutez vos diplômes, du plus récent au plus ancien (licence, BTS, baccalauréat, certifications).
              </p>
            )}
            <div className="space-y-4">
              {formData.education.map((ed, i) => (
                <div key={i} className="rounded-2xl border-2 border-slate-100 p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-slate-500">Formation {i + 1}</span>
                    <button type="button" onClick={() => set("education", formData.education.filter((_, k) => k !== i))} className="inline-flex items-center gap-1 text-sm text-[#E4220F] hover:underline" aria-label={`Retirer la formation ${i + 1}`}>
                      <X className="h-4 w-4" /> Retirer
                    </button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label htmlFor={`edu-${i}-degree`} className="block text-sm font-medium text-slate-700 mb-1">Diplôme</label>
                      <input id={`edu-${i}-degree`} type="text" value={ed.degree} onChange={(e) => updateEducation(i, "degree", e.target.value)} className={inputCls} placeholder="Ex : Licence en génie civil" />
                    </div>
                    <div>
                      <label htmlFor={`edu-${i}-period`} className="block text-sm font-medium text-slate-700 mb-1">Année ou période</label>
                      <input id={`edu-${i}-period`} type="text" value={ed.period} onChange={(e) => updateEducation(i, "period", e.target.value)} className={inputCls} placeholder="2022 – 2025" />
                    </div>
                    <div className="md:col-span-3">
                      <label htmlFor={`edu-${i}-inst`} className="block text-sm font-medium text-slate-700 mb-1">Établissement</label>
                      <input id={`edu-${i}-inst`} type="text" value={ed.institution} onChange={(e) => updateEducation(i, "institution", e.target.value)} className={inputCls} placeholder="Ex : Université Gamal Abdel Nasser de Conakry" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Compétences */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-[#050FA0] mb-4">Compétences</h2>
            <label htmlFor="cv-skills" className="sr-only">Compétences</label>
            <input id="cv-skills" type="text" value={skillsText} onChange={(e) => handleSkills(e.target.value)} className={inputCls} placeholder="AutoCAD, Suivi de chantier, Excel (séparées par des virgules)" />
            {formData.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.skills.map((s, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-[#050FA0]/10 text-[#050FA0] text-sm font-medium">{s}</span>
                ))}
              </div>
            )}
          </section>

          {/* Langues */}
          <section className="mb-10">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-bold text-[#050FA0]">Langues</h2>
              <button
                type="button"
                onClick={() => set("languages", [...formData.languages, { name: "", level: "Courant", percentage: 85 }])}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#050FA0]/10 text-[#050FA0] font-bold text-sm hover:bg-[#050FA0]/20"
              >
                <Plus className="h-4 w-4" /> Ajouter
              </button>
            </div>
            {formData.languages.length === 0 && (
              <p className="text-sm text-slate-500 border-2 border-dashed border-slate-200 rounded-xl p-5">
                Indiquez aussi vos langues nationales (pular, soussou, malinké…) : beaucoup de postes de terrain les demandent.
              </p>
            )}
            <div className="space-y-3">
              {formData.languages.map((lang, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_220px_auto] gap-3 items-end">
                  <div>
                    <label htmlFor={`lang-${i}-name`} className="block text-sm font-medium text-slate-700 mb-1">Langue</label>
                    <input id={`lang-${i}-name`} type="text" value={lang.name} onChange={(e) => updateLanguage(i, "name", e.target.value)} className={inputCls} placeholder="Ex : Français" />
                  </div>
                  <div className="col-span-2 sm:col-span-1 row-start-2 sm:row-start-auto">
                    <label htmlFor={`lang-${i}-level`} className="block text-sm font-medium text-slate-700 mb-1">Niveau</label>
                    <select id={`lang-${i}-level`} value={LEVELS.some((l) => l.label === lang.level) ? lang.level : "Courant"} onChange={(e) => updateLanguage(i, "level", e.target.value)} className={inputCls}>
                      {LEVELS.map((l) => <option key={l.label}>{l.label}</option>)}
                    </select>
                  </div>
                  <button type="button" onClick={() => set("languages", formData.languages.filter((_, k) => k !== i))} className="h-12 w-12 inline-flex items-center justify-center rounded-xl text-[#E4220F] hover:bg-red-50" aria-label={`Retirer la langue ${i + 1}`}>
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Visibilité CVthèque */}
          {saveStatus !== "local" && (
            <section className="mb-10 rounded-2xl bg-slate-50 border-2 border-slate-100 p-4 sm:p-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSearchable}
                  onChange={(e) => { void setSearchable(e.target.checked); }}
                  className="mt-1 h-5 w-5 accent-[#050FA0]"
                />
                <span>
                  <span className="block font-bold text-slate-800">Rendre mon profil visible par les recruteurs</span>
                  <span className="block text-sm text-slate-600">
                    Les entreprises inscrites pourront trouver votre nom, votre poste, votre ville et vos compétences dans la CVthèque. Votre téléphone et votre e-mail restent masqués.
                  </span>
                </span>
              </label>
            </section>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-8 border-t">
            <Link to="/cv-preview" className="px-6 py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors text-center">
              Fermer
            </Link>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#E4220F] to-[#F92813] text-white hover:shadow-xl hover:shadow-[#E4220F]/40 hover:scale-[1.02] transition-all font-bold"
            >
              <Save className="h-4 w-4" /> Enregistrer et voir l&apos;aperçu
            </button>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
