import { Link } from "react-router";
import { Send, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";
import { useCVData } from "../contexts/CVDataContext";

export default function CVAssistant() {
  const { updateCVData } = useCVData();
  const [messages, setMessages] = useState([
    { role: "ai", text: "Bonjour ! Je vais t'aider à créer un CV professionnel. Commençons par ton nom complet." }
  ]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState(1);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = input;
    setMessages([...messages, { role: "user", text: userMessage }]);
    setInput("");

    // Logique de conversation basée sur l'étape
    setTimeout(() => {
      let aiResponse = "";

      switch(step) {
        case 1:
          updateCVData({ fullName: userMessage });
          aiResponse = "Parfait ! Maintenant, quel est ton titre professionnel ? (Ex: Développeur Web, Designer, etc.)";
          setStep(2);
          break;
        case 2:
          updateCVData({ jobTitle: userMessage });
          aiResponse = "Super ! Quel est ton numéro de téléphone ?";
          setStep(3);
          break;
        case 3:
          updateCVData({ phone: userMessage });
          aiResponse = "Merci ! Et ton adresse email ?";
          setStep(4);
          break;
        case 4:
          updateCVData({ email: userMessage });
          aiResponse = "Où es-tu basé(e) ? (Ville, Pays)";
          setStep(5);
          break;
        case 5:
          updateCVData({ location: userMessage });
          aiResponse = "Excellent ! Maintenant, décris-toi brièvement en 2-3 phrases (ton profil professionnel).";
          setStep(6);
          break;
        case 6:
          updateCVData({ profile: userMessage });
          aiResponse = "Très bien ! Quelles sont tes principales compétences ? (Sépare-les par des virgules)";
          setStep(7);
          break;
        case 7:
          updateCVData({ skills: userMessage.split(",").map(s => s.trim()) });
          aiResponse = "Parfait ! Ton CV de base est prêt. Tu peux maintenant passer à l'aperçu ou continuer à ajouter plus d'informations.";
          setStep(8);
          break;
        default:
          aiResponse = "Je peux t'aider à ajouter plus d'informations. Que veux-tu faire ?";
      }

      setMessages(prev => [...prev, { role: "ai", text: aiResponse }]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col">
        <div className="border-b bg-white shadow-sm">
          <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2 text-slate-600 hover:text-[#003087] transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Retour</span>
            </Link>
            <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
              <img src={logoImage} alt="ProJob AI" className="h-12 w-auto" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium text-[#003087]">Étape {Math.min(step, 6)}/6</div>
              <div className="h-2 w-32 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${(Math.min(step, 6) / 6) * 100}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-gradient-to-r from-[#003087] to-[#0047b3] rounded-full"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 mx-auto max-w-4xl w-full px-6 py-8 flex flex-col">
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
                <div className={`max-w-md px-6 py-4 rounded-3xl ${
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

          <Link
            to="/cv-preview"
            className="mt-6 text-center text-sm font-medium text-[#003087] hover:text-[#E31E24] transition-colors"
          >
            Passer à l'aperçu du CV
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
