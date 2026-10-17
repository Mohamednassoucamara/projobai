import { Link } from "react-router";
import { Send, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import AppLogo from "../components/AppLogo";
import Footer from "../components/Footer";
import { useCVData } from "../contexts/CVDataContext";

const TOTAL_STEPS = 11;
const SKIP = /^(aucun|aucune|non|pas encore|rien|-)$/i;

/** "Poste, Entreprise, Période" → objet expérience (les virgules séparent les champs). */
function parseTriple(text: string) {
  const parts = text.split(/[,;–—]| - /).map((s) => s.trim()).filter(Boolean);
  return { a: parts[0] || text.trim(), b: parts[1] || "", c: parts.slice(2).join(", ") };
}

export default function CVAssistant() {
  const { cvData, updateCVData } = useCVData();
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: cvData.fullName
        ? `Bonjour ${cvData.fullName.split(" ")[0]} ! On reprend votre CV depuis le début. Quel est votre nom complet ?`
        : "Bonjour ! Je vais vous aider à créer un CV professionnel, question par question. Commençons : quel est votre nom complet ?",
    },
  ]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState(1);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setInput("");

    window.setTimeout(() => {
      let aiResponse = "";
      let next = step + 1;

      switch (step) {
        case 1:
          updateCVData({ fullName: userMessage });
          aiResponse = "Parfait ! Quel poste visez-vous ? (Ex : Technicien en génie civil, Comptable, Chargé de clientèle)";
          break;
        case 2:
          updateCVData({ jobTitle: userMessage });
          aiResponse = "Quel est votre numéro de téléphone ? (Ex : +224 6XX XX XX XX)";
          break;
        case 3:
          updateCVData({ phone: userMessage });
          aiResponse = "Merci ! Et votre adresse e-mail ?";
          break;
        case 4:
          updateCVData({ email: userMessage });
          aiResponse = "Dans quelle ville habitez-vous ? (Ex : Conakry, Kindia, Kankan)";
          break;
        case 5:
          updateCVData({ location: userMessage });
          aiResponse = "Décrivez-vous en 2 ou 3 phrases : votre formation, ce que vous savez faire et ce que vous cherchez.";
          break;
        case 6:
          updateCVData({ profile: userMessage });
          aiResponse = "Parlons de votre expérience la plus récente (emploi, stage ou bénévolat). Écrivez : poste, entreprise, période.\nEx : Stagiaire comptable, Banque X Conakry, Juin – Août 2025.\nSi vous n'en avez pas encore, écrivez « aucune ».";
          break;
        case 7:
          if (SKIP.test(userMessage)) {
            aiResponse = "Pas de souci, beaucoup de jeunes diplômés commencent ainsi. Quel est votre diplôme le plus élevé ? Écrivez : diplôme, établissement, année.\nEx : Licence en gestion, UGANC, 2025.";
            next = 9;
          } else {
            const { a, b, c } = parseTriple(userMessage);
            updateCVData({ experiences: [{ title: a, company: b, period: c, description: [] }, ...cvData.experiences] });
            aiResponse = "Très bien. Qu'avez-vous fait concrètement dans ce poste ? Citez 2 ou 3 missions, séparées par des points-virgules.";
          }
          break;
        case 8: {
          const missions = userMessage.split(/[;\n]/).map((s) => s.trim()).filter(Boolean);
          const [first, ...rest] = cvData.experiences;
          if (first) updateCVData({ experiences: [{ ...first, description: missions }, ...rest] });
          aiResponse = "Merci ! Quel est votre diplôme le plus élevé ? Écrivez : diplôme, établissement, année.\nEx : Licence en gestion, UGANC, 2025.";
          break;
        }
        case 9: {
          const { a, b, c } = parseTriple(userMessage);
          updateCVData({ education: [{ degree: a, institution: b, period: c }, ...cvData.education] });
          aiResponse = "Quelles sont vos principales compétences ? Séparez-les par des virgules.\nEx : Excel, Comptabilité, Travail en équipe";
          break;
        }
        case 10:
          updateCVData({ skills: userMessage.split(",").map((s) => s.trim()).filter(Boolean) });
          aiResponse = "Dernière question : quelles langues parlez-vous ? Séparez-les par des virgules.\nEx : Français, Pular, Anglais";
          break;
        case 11: {
          const langs = userMessage.split(",").map((s) => s.trim()).filter(Boolean);
          updateCVData({
            languages: langs.map((name, i) => ({ name, level: i === 0 ? "Courant" : "Intermédiaire", percentage: i === 0 ? 85 : 60 })),
          });
          aiResponse = "Votre CV est prêt ! Ouvrez l'aperçu pour le télécharger en PDF, ou passez par « Modifier » puis « Optimiser avec l'IA » pour reformuler votre profil et vos missions.";
          break;
        }
        default:
          aiResponse = "Votre CV est complet. Utilisez les boutons ci-dessous pour le voir, le modifier ou l'optimiser avec l'IA.";
          next = step;
      }

      setStep(next);
      setMessages((prev) => [...prev, { role: "ai", text: aiResponse }]);
    }, 500);
  };

  const shownStep = Math.min(step, TOTAL_STEPS);
  const done = step > TOTAL_STEPS;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col">
        <div className="border-b bg-white shadow-sm sticky top-0 z-20">
          <div className="mx-auto max-w-4xl w-full px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between gap-3 min-w-0">
            <Link to="/dashboard" className="flex items-center gap-2 text-slate-600 hover:text-[#003087] transition-colors shrink-0">
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium text-sm sm:text-base">Retour</span>
            </Link>
            <div className="sm:hidden shrink-0">
              <AppLogo to="/" />
            </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1 sm:justify-center">
              <div className="text-xs sm:text-sm font-medium text-[#003087] shrink-0">{done ? "Terminé" : `Étape ${shownStep}/${TOTAL_STEPS}`}</div>
              <div className="h-2 flex-1 sm:w-32 sm:flex-none bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${(done ? 1 : (shownStep - 1) / TOTAL_STEPS) * 100}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-gradient-to-r from-[#003087] to-[#0047b3] rounded-full"
                />
              </div>
            </div>
            <div className="hidden sm:block shrink-0">
              <AppLogo to="/" />
            </div>
            </div>
          </div>
        </div>

        <div className="flex-1 mx-auto max-w-4xl w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 space-y-4 overflow-y-auto mb-6"
          >
            {messages.map((message, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-md px-6 py-4 rounded-3xl whitespace-pre-line ${
                  message.role === "ai"
                    ? "bg-slate-100 text-slate-900"
                    : "bg-gradient-to-r from-[#003087] to-[#0047b3] text-white"
                }`}>
                  {message.text}
                </div>
              </motion.div>
            ))}
          </motion.div>

          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Tapez votre réponse..."
              className="flex-1 px-6 py-4 rounded-full border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all"
            />
            <button
              onClick={handleSend}
              className="h-14 w-14 rounded-full bg-gradient-to-r from-[#003087] to-[#0047b3] text-white flex items-center justify-center hover:shadow-xl hover:shadow-[#003087]/30 transition-all"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>

<div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm font-medium">
            <Link to="/cv-preview" className={done ? "px-5 py-3 rounded-xl bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white font-bold" : "text-[#003087] hover:text-[#E31E24] transition-colors"}>
              {done ? "Voir et télécharger mon CV" : "Passer à l'aperçu du CV"}
            </Link>
            <Link to="/cv-edit" className="text-[#003087] hover:text-[#E31E24] transition-colors">
              Modifier ou optimiser avec l'IA
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
