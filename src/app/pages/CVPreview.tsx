import { useState, useRef } from "react";
import { Link } from "react-router";
import { Download, Edit, ArrowLeft, Sparkles, CheckCircle, Mail, Phone, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";
import { useCVData } from "../contexts/CVDataContext";

export default function CVPreview() {
  const [showSuccess, setShowSuccess] = useState(false);
  const { cvData } = useCVData();
  const cvRef = useRef<HTMLDivElement | null>(null);

  // Données par défaut si aucune donnée n'est saisie
  const displayData = {
    fullName: cvData.fullName || "Votre Nom",
    jobTitle: cvData.jobTitle || "Votre Titre Professionnel",
    phone: cvData.phone || "+224 XXX XXX XXX",
    email: cvData.email || "votre.email@example.com",
    location: cvData.location || "Conakry, Guinée",
    profile: cvData.profile || "Profil professionnel à compléter via l'assistant CV...",
    experiences: cvData.experiences.length > 0 ? cvData.experiences : [
      {
        title: "Poste à ajouter",
        company: "Entreprise",
        period: "Date - Date",
        description: ["Ajoutez vos expériences via l'assistant CV"],
      },
    ],
    education: cvData.education.length > 0 ? cvData.education : [
      {
        degree: "Diplôme",
        institution: "Établissement",
        period: "Date - Date",
      },
    ],
    skills: cvData.skills.length > 0 ? cvData.skills : ["Compétence 1", "Compétence 2", "Compétence 3"],
    languages: cvData.languages.length > 0 ? cvData.languages : [
      { name: "Français", level: "Courant", percentage: 90 },
      { name: "Anglais", level: "Intermédiaire", percentage: 65 },
    ],
  };

  const handleDownload = () => {
    try {
      // Vérifier si window.print est disponible
      if (typeof window.print === 'function') {
        window.print();

        // Afficher la notification de succès
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        console.warn('La fonction d\'impression n\'est pas disponible dans cet environnement');
        alert("La fonction d'impression n'est pas disponible dans cet environnement. Veuillez essayer dans un navigateur.");
      }
    } catch (error) {
      console.error('Erreur lors de l\'impression:', error);
      alert("Une erreur est survenue lors de l'impression. Veuillez réessayer.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
              <img src={logoImage} alt="ProJob AI" className="h-12 w-auto" />
            </Link>
            <Link to="/cv-assistant" className="flex items-center gap-2 text-slate-600 hover:text-[#003087] transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Retour à l'assistant</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/cv-edit"
              className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-[#003087] text-[#003087] hover:bg-[#003087] hover:text-white transition-all font-bold"
            >
              <Edit className="h-4 w-4" />
              <span>Modifier</span>
            </Link>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white hover:shadow-xl hover:shadow-[#E31E24]/40 hover:scale-[1.02] transition-all font-bold"
            >
              <Download className="h-4 w-4" />
              <span>Télécharger PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12 flex-1">
        {!cvData.fullName && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-gradient-to-r from-[#003087] to-[#0047b3] rounded-2xl p-6 text-white flex items-center justify-between"
          >
            <div>
              <h3 className="font-bold text-lg mb-1">Complétez votre CV</h3>
              <p className="text-white/80">Utilisez l'assistant IA ou modifiez manuellement vos informations</p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/cv-assistant"
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
              >
                Assistant IA
              </Link>
              <Link
                to="/cv-edit"
                className="px-4 py-2 bg-white text-[#003087] rounded-lg font-medium hover:bg-white/90 transition-colors"
              >
                Modifier
              </Link>
            </div>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div
                ref={cvRef}
                data-cv-content
                className="bg-white rounded-3xl shadow-2xl border-2 border-slate-100 overflow-hidden"
              >
              {/* Header avec couleur ProJob AI */}
              <div className="bg-gradient-to-r from-[#003087] to-[#0047b3] p-10 text-white">
                <h1 className="text-4xl font-bold mb-2">{displayData.fullName}</h1>
                <p className="text-2xl text-white/90 mb-4">{displayData.jobTitle}</p>
                <div className="flex flex-wrap gap-4 text-sm text-white/80">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{displayData.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{displayData.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{displayData.location}</span>
                  </div>
                </div>
              </div>

              {/* Contenu du CV */}
              <div className="p-10">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-[#003087] mb-4 pb-2 border-b-2 border-[#E31E24]">
                    Profil Professionnel
                  </h2>
                  <p className="text-slate-700 leading-relaxed">
                    {displayData.profile}
                  </p>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-[#003087] mb-4 pb-2 border-b-2 border-[#E31E24]">
                    Expérience Professionnelle
                  </h2>
                  <div className="space-y-6">
                    {displayData.experiences.map((exp, index) => (
                      <div key={index} className="relative pl-6 border-l-2 border-[#003087]">
                        <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-[#E31E24]" />
                        <h3 className="text-xl font-bold text-slate-900">{exp.title}</h3>
                        <p className="text-sm text-slate-600 font-medium mb-2">
                          {exp.company} · {exp.period}
                        </p>
                        <ul className="text-slate-700 space-y-2">
                          {exp.description.map((desc, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-[#E31E24]">•</span>
                              <span>{desc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-[#003087] mb-4 pb-2 border-b-2 border-[#E31E24]">
                    Formation
                  </h2>
                  {displayData.education.map((edu, index) => (
                    <div key={index} className="relative pl-6 border-l-2 border-[#003087] mb-4 last:mb-0">
                      <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-[#E31E24]" />
                      <h3 className="text-xl font-bold text-slate-900">{edu.degree}</h3>
                      <p className="text-sm text-slate-600 font-medium">
                        {edu.institution} · {edu.period}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h2 className="text-2xl font-bold text-[#003087] mb-4 pb-2 border-b-2 border-[#E31E24]">
                      Compétences Techniques
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {displayData.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-[#003087]/10 text-[#003087] rounded-lg text-sm font-medium border border-[#003087]/20"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-[#003087] mb-4 pb-2 border-b-2 border-[#E31E24]">
                      Langues
                    </h2>
                    <div className="space-y-3">
                      {displayData.languages.map((lang, index) => (
                        <div key={index}>
                          <div className="flex justify-between mb-1">
                            <span className="font-medium text-slate-900">{lang.name}</span>
                            <span className="text-slate-600 text-sm">{lang.level}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#003087] to-[#0047b3] rounded-full"
                              style={{ width: `${lang.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-[#003087] to-[#0047b3] rounded-3xl p-8 text-white shadow-2xl sticky top-6"
            >
              <div className="flex items-start gap-3 mb-6">
                <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Conseils de l'IA</h3>
                  <p className="text-sm text-white/80">Pour optimiser votre CV</p>
                </div>
              </div>
              <ul className="space-y-4">
                <li className="flex gap-3 items-start">
                  <div className="h-6 w-6 rounded-full bg-[#E31E24] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-white/90">Ajoutez des chiffres concrets à vos réalisations (ex: réduction de 40%)</span>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="h-6 w-6 rounded-full bg-[#E31E24] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-white/90">Personnalisez votre profil selon le poste visé</span>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="h-6 w-6 rounded-full bg-[#E31E24] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-white/90">Incluez des liens vers vos projets GitHub ou portfolio</span>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="h-6 w-6 rounded-full bg-[#E31E24] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-white/90">Utilisez des verbes d'action (développer, optimiser, créer)</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Notification de succès */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50"
          >
            <CheckCircle className="h-6 w-6" />
            <span className="font-bold">CV téléchargé avec succès !</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
