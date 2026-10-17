import { Link, useSearchParams } from "react-router";
import { ArrowLeft, Sparkles, Copy, Download, Edit, Check, FileText, Briefcase, Lightbulb, Target, RotateCcw, Mail, Phone, MapPin, Building, CheckCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import AppNavHeader from "../components/AppNavHeader";
import Footer from "../components/Footer";
import { useCVData } from "../contexts/CVDataContext";
import { aiService, aiErrorMessage } from "../../services/ai.service";
import { generateLetterPdf, splitLetter, type LetterContent } from "../../lib/letterPdf";
import LetterSheet from "../components/LetterSheet";
import CVPhotoField from "../components/CVPhotoField";
import { ColorPicker, MotifPicker } from "../components/DocumentStyle";
import type { LetterTemplate } from "../contexts/CVDataContext";

type Step = "form" | "preview";
type Tone = "formal" | "professional" | "enthusiastic";

interface FormData {
  companyName: string;
  position: string;
  sector: string;
  recruiterName: string;
  experience: string;
  motivation: string;
  skills: string;
  qualities: string;
}


const tones = {
  formal: { name: "Formel", description: "Très professionnel et conventionnel" },
  professional: { name: "Professionnel", description: "Équilibré et courtois" },
  enthusiastic: { name: "Enthousiaste", description: "Positif et motivé" },
};

export default function CoverLetter() {
  const { cvData, updateCVData } = useCVData();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>("form");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    companyName: searchParams.get("company") || "",
    position: searchParams.get("position") || cvData.jobTitle || "",
    sector: searchParams.get("sector") || "",
    recruiterName: "",
    experience: "",
    motivation: "",
    skills: "",
    qualities: "",
  });
  const [selectedTone, setSelectedTone] = useState<Tone>("professional");
  const [generatedLetter, setGeneratedLetter] = useState("");
  const [letter, setLetter] = useState<LetterContent | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const patchLetter = (patch: Partial<LetterContent>) => setLetter((l) => (l ? { ...l, ...patch } : l));
  const [isEditing, setIsEditing] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  /** Lettre hors IA : rédigée à partir du formulaire et du CV, avec une grammaire soignée. */
  const buildTemplateLetter = () => {
    const { companyName, position, sector, recruiterName, experience, motivation, skills, qualities } = formData;
    const company = companyName.trim() || "votre entreprise";
    const que = (w: string) => (/^[aeiouyhàâéèêëîïôöùûü]/i.test(w) ? `qu'${w}` : `que ${w}`);
    // Minuscule sur chaque mot, sauf les sigles (BTS, IT, UGANC…)
    const lower = (t: string) => t.split(" ").map((w) => (/^[A-ZÀ-Ý][a-zà-ÿ'’-]/.test(w) ? w.charAt(0).toLowerCase() + w.slice(1) : w)).join(" ");
    const degreeWith = (d: string) => {
      const x = lower(d.trim());
      if (/^(licence|maîtrise|maitrise|formation|attestation|certification)/i.test(x)) return `d'une ${x}`;
      if (/^(master|bts|dut|bac|baccalauréat|doctorat|diplôme|diplome|cap|mba|brevet)/i.test(x)) return `d'un ${x}`;
      return `du diplôme « ${d.trim()} »`;
    };
    const sentence = (t: string) => { const v = t.trim(); return v ? v.charAt(0).toUpperCase() + v.slice(1) + (/[.!?]$/.test(v) ? "" : ".") : ""; };
    const list = (items: string[]) => items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;

    const skillList = (skills ? skills.split(",") : cvData.skills).map((x) => lower(x.trim())).filter(Boolean).slice(0, 4);
    const qualityList = (qualities || "rigueur, sens de l'organisation, esprit d'équipe").split(",").map((x) => lower(x.trim())).filter(Boolean).slice(0, 3);
    const exp = cvData.experiences.find((e) => e.title.trim());
    const edu = cvData.education.find((e) => e.degree.trim());
    const salutation = recruiterName.trim() ? `${recruiterName.trim()},` : "Madame, Monsieur,";

    const toneOpen = {
      formal: `Je me permets de vous adresser ma candidature au poste de ${position} au sein de ${company}.`,
      enthusiastic: `C'est avec enthousiasme que je vous adresse ma candidature au poste de ${position} au sein de ${company}.`,
      professional: `Je vous adresse ma candidature au poste de ${position} au sein de ${company}.`,
    }[selectedTone];
    const p1 = [
      toneOpen,
      sector ? `Le secteur ${lower(sector)} joue un rôle important dans le développement de la Guinée, et je souhaite y contribuer à vos côtés.` : `Les ambitions de ${company} correspondent pleinement à mon projet professionnel.`,
    ].join(" ");

    const p2 = [
      edu ? `Titulaire ${degreeWith(edu.degree)}${edu.institution ? ` (${edu.institution})` : ""}, ` : "",
      experience.trim()
        ? (edu ? lower(sentence(experience)) : sentence(experience))
        : exp
          ? `${edu ? "j'ai" : "J'ai"} exercé en tant ${que(lower(exp.title))}${exp.company ? ` chez ${exp.company}` : ""}${exp.description[0] ? `, où mes missions comprenaient notamment : ${lower(exp.description.slice(0, 2).map((d) => d.replace(/\.$/, "")).join(" ; "))}` : ""}.`
          : `${edu ? "j'ai" : "J'ai"} développé, au fil de ma formation et de mes stages, des compétences solides et directement utiles à ce poste.`,
      skillList.length ? ` J'ai ainsi acquis des compétences en ${list(skillList)}, que je souhaite mettre au service de vos équipes.` : "",
    ].join("");

    const p3 = [
      motivation.trim() ? sentence(motivation) : `Rejoindre ${company} représente pour moi l'occasion de mettre mon énergie au service d'une structure exigeante.`,
      `${sentence(list(qualityList)).replace(/\.$/, "")} sont mes principaux atouts. Disponible rapidement, je serais heureux de vous exposer ma motivation lors d'un entretien.`,
    ].join(" ");

    const closing = `Je vous prie d'agréer, ${recruiterName.trim() || "Madame, Monsieur"}, l'expression de mes salutations distinguées.`;
    return [`Objet : Candidature au poste de ${position}`, "", salutation, "", p1, "", p2, "", p3, "", closing].join("\n");
  };

  const generateLetter = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setAiNotice(null);
    let letter = "";
    try {
      const toneLabel = tones[selectedTone].name;
      const r = (await aiService.coverLetter(cvData, { ...formData }, toneLabel)) as { letter?: string; objet?: string; body?: string };
      if (typeof r.body === "string" && r.body.trim().length > 200) {
        letter = `Objet : ${r.objet || `Candidature au poste de ${formData.position}`}\n\n${r.body.trim()}`;
      } else if (typeof r.letter === "string" && r.letter.trim().length > 200) {
        letter = r.letter.trim();
      } else throw new Error("short");
    } catch (e) {
      letter = buildTemplateLetter();
      setAiNotice(aiErrorMessage(e));
    } finally {
      setIsGenerating(false);
    }
    setGeneratedLetter(letter);
    const { objet, body } = splitLetter(letter, cvData.fullName);
    setLetter({
      company: formData.companyName,
      attention: formData.recruiterName ? `À l'attention de ${formData.recruiterName}` : "Service des ressources humaines",
      place: (cvData.location || "Conakry").split(",")[0].trim(),
      date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
      objet: objet || `Candidature au poste de ${formData.position}`,
      body,
    });
    setIsEditing(false);
    setStep("preview");
  };

  const letterAsText = () =>
    letter
      ? [
          cvData.fullName, ...[cvData.phone, cvData.email, cvData.location].filter(Boolean), "",
          letter.company, letter.attention, "",
          `${letter.place}, le ${letter.date}`, "",
          `Objet : ${letter.objet}`, "",
          letter.body, "", cvData.fullName,
        ].filter((l) => l !== undefined).join("\n")
      : generatedLetter;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letterAsText());
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (error) {
      console.error("Erreur lors de la copie:", error);
    }
  };

  const handleDownload = async () => {
    if (!letter || isDownloading) return;
    if (!cvData.fullName) {
      setDownloadError("Ajoutez votre nom dans votre CV : il apparaît en en-tête et en signature.");
      return;
    }
    setDownloadError(null);
    setIsDownloading(true);
    try {
      await generateLetterPdf(cvData, letter);
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
      setDownloadError("Le PDF n'a pas pu être créé. Réessayez.");
    } finally {
      setIsDownloading(false);
    }
  };

  const isFormValid = formData.companyName && formData.position;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      <AppNavHeader backTo="/dashboard" backLabel="Retour au tableau de bord" />

      <div className="page-container py-8 sm:py-12 flex-1">
        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-12">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-[#003087] to-[#0047b3] mb-6"
                >
                  <FileText className="h-10 w-10 text-white" />
                </motion.div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-[#003087] to-[#0047b3] bg-clip-text text-transparent">
                  Lettre de Motivation IA
                </h1>
                <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                  Créez une lettre de motivation professionnelle personnalisée en quelques minutes
                </p>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl p-8 shadow-lg border-2 border-slate-100"
                  >
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Informations sur le poste</h2>
                    <div className="space-y-6">
                      <div>
                        <label className="block font-semibold text-slate-900 mb-2 flex items-center gap-2">
                          <Building className="h-4 w-4 text-[#003087]" />
                          Nom de l'entreprise *
                        </label>
                        <input
                          type="text"
                          value={formData.companyName}
                          onChange={(e) => handleInputChange("companyName", e.target.value)}
                          placeholder="Orange Guinée"
                          className="w-full px-5 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] outline-none transition-colors text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-900 mb-2 flex items-center gap-2">
                          <Target className="h-4 w-4 text-[#003087]" />
                          Poste visé *
                        </label>
                        <input
                          type="text"
                          value={formData.position}
                          onChange={(e) => handleInputChange("position", e.target.value)}
                          placeholder="Développeur Full Stack"
                          className="w-full px-5 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] outline-none transition-colors text-slate-900"
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block font-semibold text-slate-900 mb-2">
                            Secteur d'activité
                          </label>
                          <input
                            type="text"
                            value={formData.sector}
                            onChange={(e) => handleInputChange("sector", e.target.value)}
                            placeholder="Télécommunications"
                            className="w-full px-5 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] outline-none transition-colors text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-900 mb-2">
                            Nom du recruteur (optionnel)
                          </label>
                          <input
                            type="text"
                            value={formData.recruiterName}
                            onChange={(e) => handleInputChange("recruiterName", e.target.value)}
                            placeholder="M./Mme Nom"
                            className="w-full px-5 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] outline-none transition-colors text-slate-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-900 mb-2">
                          Votre expérience pertinente
                        </label>
                        <textarea
                          value={formData.experience}
                          onChange={(e) => handleInputChange("experience", e.target.value)}
                          rows={3}
                          placeholder="Ex: 3 ans d'expérience en développement web, spécialisé en React et Node.js..."
                          className="w-full px-5 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] outline-none transition-colors resize-none text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-900 mb-2">
                          Compétences clés à mettre en avant
                        </label>
                        <input
                          type="text"
                          value={formData.skills}
                          onChange={(e) => handleInputChange("skills", e.target.value)}
                          placeholder="Ex: JavaScript, React, Communication, Travail d'équipe..."
                          className="w-full px-5 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] outline-none transition-colors text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-900 mb-2">
                          Qualités personnelles
                        </label>
                        <input
                          type="text"
                          value={formData.qualities}
                          onChange={(e) => handleInputChange("qualities", e.target.value)}
                          placeholder="Ex: Rigoureux, créatif, autonome..."
                          className="w-full px-5 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] outline-none transition-colors text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-900 mb-2">
                          Votre motivation pour ce poste
                        </label>
                        <textarea
                          value={formData.motivation}
                          onChange={(e) => handleInputChange("motivation", e.target.value)}
                          rows={4}
                          placeholder="Expliquez pourquoi vous souhaitez rejoindre cette entreprise et ce poste..."
                          className="w-full px-5 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] outline-none transition-colors resize-none text-slate-900"
                        />
                      </div>
                    </div>
                  </motion.div>
                </div>

                <div className="lg:col-span-1">
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6 sticky top-6"
                  >
                    <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-slate-100">
                      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-[#003087]" />
                        Ton de la lettre
                      </h3>
                      <div className="space-y-3">
                        {Object.entries(tones).map(([key, tone]) => (
                          <button
                            key={key}
                            onClick={() => setSelectedTone(key as Tone)}
                            className={`w-full p-4 rounded-xl text-left transition-all ${
                              selectedTone === key
                                ? "bg-gradient-to-r from-[#003087] to-[#0047b3] text-white shadow-lg"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-900"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold">{tone.name}</span>
                              {selectedTone === key && <Check className="h-5 w-5" />}
                            </div>
                            <p className={`text-sm ${selectedTone === key ? "text-white/80" : "text-slate-600"}`}>
                              {tone.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-[#003087]/10 to-[#0047b3]/10 rounded-2xl p-6 border border-[#003087]/20">
                      <div className="flex items-start gap-3 mb-4">
                        <Lightbulb className="h-6 w-6 text-[#003087] flex-shrink-0 mt-1" />
                        <div>
                          <h3 className="font-bold text-slate-900 mb-2">Conseils IA</h3>
                          <ul className="space-y-2 text-sm text-slate-700">
                            <li>• Soyez précis et concis</li>
                            <li>• Personnalisez pour l'entreprise</li>
                            <li>• Mettez en avant vos résultats</li>
                            <li>• Montrez votre motivation</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={generateLetter}
                      disabled={!isFormValid || isGenerating}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white px-8 py-4 rounded-xl font-bold hover:shadow-xl hover:shadow-[#E31E24]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
                    >
                      {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                      <span>{isGenerating ? "Rédaction en cours…" : "Rédiger ma lettre"}</span>
                    </button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {step === "preview" && letter && (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {aiNotice && (
                <div role="status" className="mb-6 rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {aiNotice} Relisez et personnalisez la lettre avant de l'envoyer.
                </div>
              )}
              {downloadError && (
                <div role="alert" className="mb-6 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{downloadError}</div>
              )}

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Votre lettre de motivation</h2>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3">
                  <button onClick={() => setStep("form")} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-700 hover:border-[#003087] hover:text-[#003087] transition-all font-semibold">
                    <RotateCcw className="h-4 w-4" /> Recommencer
                  </button>
                  <button onClick={() => setIsEditing(!isEditing)} className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-[#003087] transition-all font-semibold ${isEditing ? "bg-[#003087] text-white" : "text-[#003087] hover:bg-[#003087] hover:text-white"}`}>
                    {isEditing ? <Check className="h-4 w-4" /> : <Edit className="h-4 w-4" />} {isEditing ? "Terminer" : "Modifier le texte"}
                  </button>
                  <button onClick={handleCopy} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-700 hover:border-green-500 hover:text-green-600 transition-all font-semibold">
                    {showCopySuccess ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {showCopySuccess ? "Copiée" : "Copier"}
                  </button>
                  <button onClick={handleDownload} disabled={isDownloading} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white hover:shadow-xl hover:shadow-[#E31E24]/40 transition-all font-bold disabled:opacity-70">
                    {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Télécharger en PDF
                  </button>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 min-w-0 order-2 lg:order-1">
                  <LetterSheet content={letter} editing={isEditing} onChange={patchLetter} />
                </div>
                <div className="lg:col-span-1 space-y-6 order-1 lg:order-2 lg:sticky lg:top-24">
                  <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-lg">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Modèle</h3>
                    <p className="text-sm text-slate-500 mb-4">La mise en page de votre lettre.</p>
                    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Modèle de lettre">
                      {([
                        ["moderne", "Moderne", "Bandeau de couleur"],
                        ["classique", "Classique", "Sobre et formel"],
                        ["elegant", "Élégant", "Bande latérale"],
                      ] as [LetterTemplate, string, string][]).map(([id, name, desc]) => {
                        const selected = cvData.letterTemplate === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => updateCVData({ letterTemplate: id })}
                            className={`rounded-xl border-2 p-2 text-left transition-colors ${selected ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-[#003087]"}`}
                          >
                            <span className="block aspect-[210/297] w-full rounded bg-white border border-slate-200 overflow-hidden relative mb-2" aria-hidden="true">
                              {id === "moderne" && <span className="absolute inset-x-0 top-0 h-[16%]" style={{ background: cvData.theme }} />}
                              {id === "classique" && <><span className="absolute inset-x-0 top-0 h-[3%]" style={{ background: cvData.theme }} /><span className="absolute left-[12%] top-[8%] h-[4%] w-[45%] rounded-sm" style={{ background: cvData.theme }} /></>}
                              {id === "elegant" && <span className="absolute inset-y-0 left-0 w-[8%]" style={{ background: cvData.theme }} />}
                              <span className="absolute left-[14%] right-[12%] top-[34%] space-y-[6%] block">
                                {[1, 2, 3, 4, 5].map((k) => <span key={k} className="block h-[3px] rounded bg-slate-200" />)}
                              </span>
                            </span>
                            <span className="block text-sm font-bold text-slate-900">{name}</span>
                            <span className="block text-[11px] text-slate-500 leading-tight">{desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-lg"><CVPhotoField compact /></div>
                  <ColorPicker />
                  <MotifPicker />
                </div>
              </div>

              {showCopySuccess && (
                <div role="status" className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50">
                  <CheckCircle className="h-6 w-6" />
                  <span className="font-bold">Lettre copiée</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </div>
  );
}
