import { Link } from "react-router";
import { ArrowLeft, Sparkles, Copy, Download, Edit, Check, FileText, Briefcase, Lightbulb, Target, RotateCcw, Mail, Phone, MapPin, Building, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState, useRef } from "react";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";
import { useCVData } from "../contexts/CVDataContext";

type Step = "form" | "template" | "preview" | "edit";
type Template = "classic" | "modern" | "creative";
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

const templates = {
  classic: {
    name: "Classique",
    description: "Format traditionnel et formel",
    icon: FileText,
  },
  modern: {
    name: "Moderne",
    description: "Style contemporain et structuré",
    icon: Briefcase,
  },
  creative: {
    name: "Créative",
    description: "Approche originale et dynamique",
    icon: Lightbulb,
  },
};

const tones = {
  formal: { name: "Formel", description: "Très professionnel et conventionnel" },
  professional: { name: "Professionnel", description: "Équilibré et courtois" },
  enthusiastic: { name: "Enthousiaste", description: "Positif et motivé" },
};

export default function CoverLetter() {
  const { cvData } = useCVData();
  const [step, setStep] = useState<Step>("form");
  const [formData, setFormData] = useState<FormData>({
    companyName: "",
    position: "",
    sector: "",
    recruiterName: "",
    experience: "",
    motivation: "",
    skills: "",
    qualities: "",
  });
  const [selectedTemplate, setSelectedTemplate] = useState<Template>("modern");
  const [selectedTone, setSelectedTone] = useState<Tone>("professional");
  const [generatedLetter, setGeneratedLetter] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const letterRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const generateLetter = () => {
    const { companyName, position, sector, recruiterName, experience, motivation, skills, qualities } = formData;
    const name = cvData.fullName || "Votre Nom";
    const phone = cvData.phone || "+224 XXX XXX XXX";
    const email = cvData.email || "votre.email@example.com";
    const location = cvData.location || "Conakry, Guinée";

    let letter = "";

    // En-tête
    letter += `${name}\n${phone}\n${email}\n${location}\n\n`;
    letter += `${companyName}\n`;
    if (recruiterName) {
      letter += `À l'attention de ${recruiterName}\n`;
    } else {
      letter += `Service des Ressources Humaines\n`;
    }
    letter += `${location}\n\n`;
    letter += `Objet : Candidature au poste de ${position}\n\n`;

    // Corps de la lettre selon le ton
    if (selectedTone === "formal") {
      letter += `${recruiterName ? recruiterName : "Madame, Monsieur"},\n\n`;
      letter += `Par la présente, je souhaite vous faire part de ma candidature au poste de ${position} au sein de ${companyName}.\n\n`;
    } else if (selectedTone === "enthusiastic") {
      letter += `${recruiterName ? recruiterName : "Madame, Monsieur"},\n\n`;
      letter += `C'est avec un grand enthousiasme que je vous adresse ma candidature pour le poste de ${position} chez ${companyName}. `;
      letter += `Votre entreprise, reconnue dans le secteur ${sector}, représente pour moi une opportunité exceptionnelle.\n\n`;
    } else {
      letter += `${recruiterName ? recruiterName : "Madame, Monsieur"},\n\n`;
      letter += `C'est avec un vif intérêt que je me permets de postuler au poste de ${position} au sein de ${companyName}. `;
      letter += `Votre entreprise, ${sector ? `leader dans le secteur ${sector}` : "reconnue pour son excellence"}, correspond parfaitement à mes aspirations professionnelles.\n\n`;
    }

    // Expérience
    if (experience) {
      letter += `${experience}\n\n`;
    } else if (cvData.experiences && cvData.experiences.length > 0) {
      const exp = cvData.experiences[0];
      letter += `Fort de mon expérience en tant que ${exp.title} chez ${exp.company}, j'ai développé des compétences solides qui me permettront de contribuer efficacement à votre équipe.\n\n`;
    }

    // Compétences et qualités
    if (skills || cvData.skills.length > 0) {
      const skillsList = skills || cvData.skills.slice(0, 3).join(", ");
      letter += `Ma maîtrise de ${skillsList} ainsi que mes qualités ${qualities || "de rigueur, d'adaptabilité et d'esprit d'équipe"} me permettront de répondre aux exigences de ce poste.\n\n`;
    }

    // Motivation
    if (motivation) {
      letter += `${motivation}\n\n`;
    } else {
      letter += `Motivé et déterminé à contribuer au développement de ${companyName}, je suis convaincu que mon profil correspond aux attentes de ce poste.\n\n`;
    }

    // Conclusion
    if (selectedTone === "formal") {
      letter += `Je me tiens à votre entière disposition pour un entretien qui me permettrait de vous exposer plus en détail mes motivations et mes compétences.\n\n`;
      letter += `Je vous prie d'agréer, ${recruiterName ? recruiterName : "Madame, Monsieur"}, l'expression de mes salutations distinguées.\n\n`;
    } else if (selectedTone === "enthusiastic") {
      letter += `Je serais ravi de vous rencontrer pour discuter de cette opportunité et vous démontrer ma motivation et mon engagement.\n\n`;
      letter += `Dans l'attente de votre retour, je vous adresse mes salutations les plus respectueuses.\n\n`;
    } else {
      letter += `Je reste à votre disposition pour un entretien au cours duquel je pourrai vous exposer plus en détail mes motivations.\n\n`;
      letter += `Je vous prie d'agréer, ${recruiterName ? recruiterName : "Madame, Monsieur"}, l'expression de mes salutations distinguées.\n\n`;
    }

    letter += `${name}`;

    setGeneratedLetter(letter);
    setStep("preview");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedLetter);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (error) {
      console.error("Erreur lors de la copie:", error);
    }
  };

  const handleDownload = () => {
    try {
      if (typeof window.print === 'function') {
        window.print();
      } else {
        alert("La fonction d'impression n'est pas disponible dans cet environnement.");
      }
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
    }
  };

  const isFormValid = formData.companyName && formData.position;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-slate-600 hover:text-[#003087] transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Retour au tableau de bord</span>
          </Link>
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src={logoImage} alt="ProJob AI" className="h-12 w-auto" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12 flex-1">
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
                <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#003087] to-[#0047b3] bg-clip-text text-transparent">
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
                      onClick={() => setStep("template")}
                      disabled={!isFormValid}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white px-8 py-4 rounded-xl font-bold hover:shadow-xl hover:shadow-[#E31E24]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
                    >
                      <Sparkles className="h-5 w-5" />
                      <span>Choisir un modèle</span>
                    </button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {step === "template" && (
            <motion.div
              key="template"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-5xl mx-auto"
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-slate-900 mb-4">Choisissez votre modèle</h2>
                <p className="text-lg text-slate-600">Sélectionnez le style qui correspond le mieux à votre candidature</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {Object.entries(templates).map(([key, template]) => (
                  <motion.button
                    key={key}
                    onClick={() => setSelectedTemplate(key as Template)}
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    className={`group p-8 rounded-2xl text-left transition-all relative overflow-hidden ${
                      selectedTemplate === key
                        ? "bg-gradient-to-br from-[#003087] to-[#0047b3] text-white shadow-2xl border-2 border-[#003087]"
                        : "bg-white hover:shadow-xl border-2 border-slate-200 hover:border-[#003087]"
                    }`}
                  >
                    <div className={`inline-flex items-center justify-center h-16 w-16 rounded-xl mb-4 ${
                      selectedTemplate === key ? "bg-white/20" : "bg-gradient-to-br from-[#003087] to-[#0047b3]"
                    }`}>
                      <template.icon className={`h-8 w-8 ${selectedTemplate === key ? "text-white" : "text-white"}`} />
                    </div>
                    <h3 className={`text-2xl font-bold mb-2 ${selectedTemplate === key ? "text-white" : "text-slate-900"}`}>
                      {template.name}
                    </h3>
                    <p className={`${selectedTemplate === key ? "text-white/80" : "text-slate-600"}`}>
                      {template.description}
                    </p>
                    {selectedTemplate === key && (
                      <div className="absolute top-4 right-4">
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setStep("form")}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-700 hover:border-[#003087] hover:text-[#003087] transition-all font-semibold"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Retour
                </button>
                <button
                  onClick={generateLetter}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#003087] to-[#0047b3] text-white px-8 py-4 rounded-xl font-bold hover:shadow-xl hover:shadow-[#003087]/40 transition-all hover:scale-[1.02]"
                >
                  <Sparkles className="h-5 w-5" />
                  <span>Générer la lettre</span>
                </button>
              </div>
            </motion.div>
          )}

          {step === "preview" && (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-5xl mx-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-slate-900">Votre lettre de motivation</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep("form")}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-slate-200 text-slate-700 hover:border-[#003087] hover:text-[#003087] transition-all font-semibold"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Recommencer
                  </button>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-[#003087] text-[#003087] hover:bg-[#003087] hover:text-white transition-all font-semibold"
                  >
                    <Edit className="h-4 w-4" />
                    {isEditing ? "Aperçu" : "Modifier"}
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-slate-200 text-slate-700 hover:border-green-500 hover:text-green-600 transition-all font-semibold"
                  >
                    {showCopySuccess ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {showCopySuccess ? "Copié !" : "Copier"}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white hover:shadow-xl hover:shadow-[#E31E24]/40 transition-all font-bold"
                  >
                    <Download className="h-4 w-4" />
                    Télécharger PDF
                  </button>
                </div>
              </div>

              <motion.div
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                ref={letterRef}
                className="bg-white rounded-2xl shadow-2xl border-2 border-slate-100 overflow-hidden"
              >
                <div className="p-16">
                  {isEditing ? (
                    <textarea
                      value={generatedLetter}
                      onChange={(e) => setGeneratedLetter(e.target.value)}
                      rows={25}
                      className="w-full px-6 py-4 rounded-xl border-2 border-slate-200 focus:border-[#003087] outline-none transition-colors resize-none font-mono text-sm text-slate-900 leading-relaxed"
                    />
                  ) : (
                    <div className="prose max-w-none">
                      {generatedLetter.split('\n').map((line, index) => (
                        <p key={index} className={`${line === '' ? 'mb-4' : 'mb-2'} text-slate-900 leading-relaxed whitespace-pre-wrap`}>
                          {line || '\u00A0'}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>

              {showCopySuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50"
                >
                  <CheckCircle className="h-6 w-6" />
                  <span className="font-bold">Lettre copiée dans le presse-papier !</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </div>
  );
}
