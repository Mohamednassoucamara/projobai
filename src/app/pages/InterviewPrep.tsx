import { Link } from "react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles, Clock, Target, Lightbulb, Trophy, RotateCcw, Mic, Play, Pause, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";

interface Question {
  id: number;
  question: string;
  tips: string;
  category: string;
  difficulty: "facile" | "moyen" | "difficile";
}

const questions: Record<string, Question[]> = {
  "Débutant": [
    { id: 1, question: "Présentez-vous en quelques minutes", tips: "Concentrez-vous sur votre parcours, vos compétences et ce qui vous motive.", category: "Débutant", difficulty: "facile" },
    { id: 2, question: "Pourquoi voulez-vous travailler dans notre entreprise ?", tips: "Montrez que vous connaissez l'entreprise et expliquez ce qui vous attire.", category: "Débutant", difficulty: "facile" },
    { id: 3, question: "Quelles sont vos principales qualités ?", tips: "Citez 3-4 qualités avec des exemples concrets qui les illustrent.", category: "Débutant", difficulty: "facile" },
    { id: 4, question: "Quels sont vos défauts ?", tips: "Choisissez un défaut réel mais travaillé, et montrez comment vous l'améliorez.", category: "Débutant", difficulty: "moyen" },
    { id: 5, question: "Où vous voyez-vous dans 5 ans ?", tips: "Montrez votre ambition tout en restant réaliste et aligné avec le poste.", category: "Débutant", difficulty: "moyen" },
  ],
  "Technique": [
    { id: 1, question: "Décrivez votre expérience avec les technologies que vous maîtrisez", tips: "Soyez précis sur les projets, technologies et résultats obtenus.", category: "Technique", difficulty: "moyen" },
    { id: 2, question: "Comment résolvez-vous un problème technique complexe ?", tips: "Décrivez votre méthodologie et donnez un exemple concret.", category: "Technique", difficulty: "difficile" },
    { id: 3, question: "Parlez-nous d'un projet dont vous êtes particulièrement fier", tips: "Détaillez le contexte, les défis, votre rôle et les résultats.", category: "Technique", difficulty: "moyen" },
    { id: 4, question: "Comment vous tenez-vous à jour technologiquement ?", tips: "Mentionnez vos sources d'apprentissage et vos pratiques régulières.", category: "Technique", difficulty: "facile" },
    { id: 5, question: "Comment travaillez-vous en équipe sur des projets techniques ?", tips: "Parlez de collaboration, communication et outils de travail en équipe.", category: "Technique", difficulty: "moyen" },
  ],
  "Commercial": [
    { id: 1, question: "Comment gérez-vous un client difficile ?", tips: "Montrez votre empathie, votre patience et votre capacité à trouver des solutions.", category: "Commercial", difficulty: "moyen" },
    { id: 2, question: "Décrivez une vente réussie dont vous êtes fier", tips: "Utilisez la méthode STAR : Situation, Tâche, Action, Résultat.", category: "Commercial", difficulty: "moyen" },
    { id: 3, question: "Comment atteignez-vous vos objectifs de vente ?", tips: "Parlez de votre organisation, votre prospection et votre suivi.", category: "Commercial", difficulty: "facile" },
    { id: 4, question: "Comment vous adaptez-vous à différents types de clients ?", tips: "Montrez votre flexibilité et votre intelligence relationnelle.", category: "Commercial", difficulty: "moyen" },
    { id: 5, question: "Que faites-vous face à un refus ou un échec commercial ?", tips: "Démontrez votre résilience et votre capacité d'apprentissage.", category: "Commercial", difficulty: "difficile" },
  ],
  "Administratif": [
    { id: 1, question: "Comment organisez-vous vos tâches quotidiennes ?", tips: "Parlez de vos méthodes de priorisation et d'organisation.", category: "Administratif", difficulty: "facile" },
    { id: 2, question: "Comment gérez-vous les urgences et les délais serrés ?", tips: "Montrez votre capacité à gérer le stress et à prioriser.", category: "Administratif", difficulty: "moyen" },
    { id: 3, question: "Décrivez votre expérience avec les outils bureautiques", tips: "Soyez précis sur les logiciels maîtrisés et leur utilisation.", category: "Administratif", difficulty: "facile" },
    { id: 4, question: "Comment assurez-vous la confidentialité des informations ?", tips: "Parlez de rigueur, de procédures et de votre sens des responsabilités.", category: "Administratif", difficulty: "moyen" },
    { id: 5, question: "Comment travaillez-vous avec différents services ?", tips: "Montrez vos compétences en communication et coordination.", category: "Administratif", difficulty: "moyen" },
  ],
};

export default function InterviewPrep() {
  const [step, setStep] = useState<"choice" | "question" | "feedback" | "results">("choice");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [scores, setScores] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes par question
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (step === "question" && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setStep("question");
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setScores([]);
    setTimeLeft(180);
  };

  const handleSubmitAnswer = () => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    // Simuler un score IA basé sur la longueur et la qualité
    const score = Math.min(10, Math.max(5, Math.floor((answer.length / 50) + Math.random() * 3)));
    const newScores = [...scores, score];
    setScores(newScores);

    setStep("feedback");
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions[selectedCategory].length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setAnswer("");
      setTimeLeft(180);
      setStep("question");
    } else {
      setStep("results");
    }
  };

  const handleRestart = () => {
    setStep("choice");
    setSelectedCategory("");
    setCurrentQuestionIndex(0);
    setAnswer("");
    setAnswers([]);
    setScores([]);
    setTimeLeft(180);
  };

  const currentQuestion = selectedCategory ? questions[selectedCategory][currentQuestionIndex] : null;
  const progress = selectedCategory ? ((currentQuestionIndex + 1) / questions[selectedCategory].length) * 100 : 0;
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-slate-600 hover:text-[#003087] transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Retour au tableau de bord</span>
          </Link>
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src={logoImage} alt="ProJob AI" className="h-12 w-auto" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-12 flex-1">
        <AnimatePresence mode="wait">
          {step === "choice" && (
            <motion.div
              key="choice"
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
                  <Target className="h-10 w-10 text-white" />
                </motion.div>
                <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#003087] to-[#0047b3] bg-clip-text text-transparent">
                  Préparation d'Entretien
                </h1>
                <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                  Entraînez-vous avec notre IA pour réussir vos entretiens d'embauche
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {[
                  { type: "Débutant", desc: "Premier emploi, stage ou alternance", icon: Sparkles, color: "from-blue-500 to-blue-600" },
                  { type: "Technique", desc: "IT, ingénierie, développement", icon: Target, color: "from-purple-500 to-purple-600" },
                  { type: "Commercial", desc: "Vente, relation client, marketing", icon: Trophy, color: "from-green-500 to-green-600" },
                  { type: "Administratif", desc: "Administration et gestion", icon: Lightbulb, color: "from-orange-500 to-orange-600" },
                ].map((item) => (
                  <motion.button
                    key={item.type}
                    onClick={() => handleCategorySelect(item.type)}
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    className="group p-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-[#003087] hover:shadow-xl transition-all text-left relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity rounded-full blur-3xl" style={{ background: `linear-gradient(to bottom right, ${item.color})` }} />
                    <div className={`inline-flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br ${item.color} mb-4 group-hover:scale-110 transition-transform`}>
                      <item.icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-slate-900">{item.type}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
                    <div className="mt-4 text-[#003087] text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                      Commencer <ArrowRight className="h-4 w-4" />
                    </div>
                  </motion.button>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="grid md:grid-cols-3 gap-6"
              >
                {[
                  { icon: Sparkles, title: "IA Avancée", desc: "Feedback personnalisé par notre intelligence artificielle" },
                  { icon: Clock, title: "Entraînement Réel", desc: "Minuteur pour simuler les conditions réelles" },
                  { icon: Trophy, title: "Suivi de Progrès", desc: "Évaluez vos performances et progressez" },
                ].map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="bg-gradient-to-br from-[#003087]/5 to-transparent p-6 rounded-xl border border-[#003087]/10"
                  >
                    <feature.icon className="h-8 w-8 text-[#003087] mb-3" />
                    <h3 className="font-bold text-slate-900 mb-2">{feature.title}</h3>
                    <p className="text-sm text-slate-600">{feature.desc}</p>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {step === "question" && currentQuestion && (
            <motion.div
              key="question"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="text-sm font-medium text-slate-600">Question {currentQuestionIndex + 1}/{questions[selectedCategory].length}</span>
                    <h2 className="text-2xl font-bold text-slate-900 mt-1">{selectedCategory}</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${timeLeft < 60 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                      <Clock className="h-5 w-5" />
                      <span className="font-bold">{formatTime(timeLeft)}</span>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${currentQuestion.difficulty === 'facile' ? 'bg-green-100 text-green-700' : currentQuestion.difficulty === 'moyen' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {currentQuestion.difficulty}
                    </div>
                  </div>
                </div>

                <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-8">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-[#003087] to-[#0047b3] rounded-full"
                  />
                </div>

                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="bg-white rounded-2xl p-8 shadow-lg border-2 border-slate-100"
                >
                  <div className="flex items-start gap-4 mb-6">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#003087] to-[#0047b3] flex items-center justify-center flex-shrink-0">
                      <Lightbulb className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-slate-900 mb-3">{currentQuestion.question}</h2>
                      <p className="text-slate-600 leading-relaxed">{currentQuestion.tips}</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-[#003087]/5 to-transparent p-4 rounded-xl border border-[#003087]/10">
                    <div className="flex items-center gap-2 text-sm text-[#003087] font-medium">
                      <Sparkles className="h-4 w-4" />
                      <span>Conseil IA : Soyez concret et illustrez vos propos avec des exemples</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl p-8 shadow-lg border-2 border-slate-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <label className="block font-bold text-lg text-slate-900">Votre réponse</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsRecording(!isRecording)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isRecording ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                      {isRecording ? <Pause className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      <span className="text-sm font-medium">{isRecording ? 'Arrêter' : 'Vocal'}</span>
                    </button>
                  </div>
                </div>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={10}
                  placeholder="Tapez votre réponse ici ou utilisez l'enregistrement vocal..."
                  className="w-full px-6 py-4 rounded-xl border-2 border-slate-200 focus:border-[#003087] outline-none transition-colors resize-none mb-6 text-slate-900"
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">{answer.length} caractères</span>
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={answer.length < 20}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white px-8 py-4 rounded-xl font-bold hover:shadow-xl hover:shadow-[#E31E24]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
                  >
                    <span>Soumettre ma réponse</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {step === "feedback" && currentQuestion && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="bg-white rounded-2xl p-8 shadow-xl border-2 border-slate-100"
              >
                <div className="flex items-center gap-4 mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className={`h-20 w-20 rounded-2xl ${scores[currentQuestionIndex] >= 7 ? 'bg-green-100' : 'bg-orange-100'} flex items-center justify-center`}
                  >
                    {scores[currentQuestionIndex] >= 7 ? (
                      <CheckCircle2 className="h-10 w-10 text-green-600" />
                    ) : (
                      <Lightbulb className="h-10 w-10 text-orange-600" />
                    )}
                  </motion.div>
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900">
                      {scores[currentQuestionIndex] >= 7 ? 'Excellente réponse !' : 'Bonne tentative !'}
                    </h2>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-2xl font-bold ${scores[currentQuestionIndex] >= 7 ? 'text-green-600' : 'text-orange-600'}`}>
                        {scores[currentQuestionIndex]}/10
                      </span>
                      <div className="flex gap-1">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-2 w-2 rounded-full ${i < scores[currentQuestionIndex] ? (scores[currentQuestionIndex] >= 7 ? 'bg-green-500' : 'bg-orange-500') : 'bg-slate-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-6 rounded-xl bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <h3 className="font-bold text-green-900">Points forts</h3>
                    </div>
                    <ul className="space-y-2 text-green-800">
                      <li className="flex gap-3">
                        <span className="text-green-600 font-bold">✓</span>
                        <span>Structure claire et organisation de la réponse</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="text-green-600 font-bold">✓</span>
                        <span>Réponse bien développée avec des détails pertinents</span>
                      </li>
                      {answer.length > 200 && (
                        <li className="flex gap-3">
                          <span className="text-green-600 font-bold">✓</span>
                          <span>Réponse complète et approfondie</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="p-6 rounded-xl bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="h-5 w-5 text-blue-600" />
                      <h3 className="font-bold text-blue-900">Suggestions d'amélioration</h3>
                    </div>
                    <ul className="space-y-2 text-blue-800">
                      <li className="flex gap-3">
                        <span className="text-blue-600 font-bold">→</span>
                        <span>Ajoutez des exemples chiffrés pour renforcer vos arguments</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="text-blue-600 font-bold">→</span>
                        <span>Terminez par une phrase qui montre votre motivation</span>
                      </li>
                      {answer.length < 150 && (
                        <li className="flex gap-3">
                          <span className="text-blue-600 font-bold">→</span>
                          <span>Développez davantage votre réponse pour plus d'impact</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="p-6 rounded-xl bg-gradient-to-r from-[#003087]/5 to-[#0047b3]/5 border-2 border-[#003087]/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-5 w-5 text-[#003087]" />
                      <h3 className="font-bold text-[#003087]">Exemple de réponse optimale selon l'IA</h3>
                    </div>
                    <p className="text-slate-700 leading-relaxed">
                      {currentQuestion.id === 1 && selectedCategory === "Débutant" ? (
                        "Je m'appelle [Nom], jeune diplômé en [domaine] avec une forte passion pour [secteur]. Durant mes études, j'ai réalisé plusieurs projets pratiques, notamment [exemple concret] qui m'a permis de développer mes compétences en [compétences]. Je suis particulièrement attiré par votre entreprise car [raison spécifique liée à l'entreprise]. Mon objectif est de contribuer à [mission/projet] tout en continuant à apprendre et progresser dans ce domaine."
                      ) : currentQuestion.id === 1 && selectedCategory === "Technique" ? (
                        "Développeur [spécialité] avec [X] ans d'expérience, j'ai travaillé sur des projets variés allant de [type projet 1] à [type projet 2]. Ma dernière réalisation a permis de [résultat chiffré, ex: réduire le temps de chargement de 40%]. Je maîtrise [technologies clés] et je reste constamment à jour via [sources d'apprentissage]. Je recherche un poste où je pourrai mettre à profit mon expertise en [domaine] tout en relevant de nouveaux défis techniques."
                      ) : currentQuestion.id === 1 && selectedCategory === "Commercial" ? (
                        "Commercial avec [X] années d'expérience dans le secteur [domaine], j'ai développé une expertise en [spécialité]. Mon approche centrée sur l'écoute client m'a permis d'atteindre [résultat chiffré, ex: 120% de mes objectifs]. Je m'appuie sur une méthode structurée de prospection et un suivi rigoureux. Votre entreprise m'attire particulièrement pour [raison], et je suis convaincu que mon expérience en [domaine] sera un atout pour votre équipe."
                      ) : (
                        "Professionnel(le) en [domaine] avec [expérience], je me distingue par ma rigueur et mon sens de l'organisation. J'ai notamment [réalisation concrète avec résultat]. Ma maîtrise de [outils/compétences] combinée à mon aptitude à [soft skill] me permettent de gérer efficacement [type de tâches]. Je suis motivé(e) à rejoindre votre entreprise pour [objectif aligné avec le poste]."
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-8 pt-6 border-t-2 border-slate-100">
                  <button
                    onClick={() => setStep("question")}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-700 hover:border-[#003087] hover:text-[#003087] transition-all font-semibold"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    Revoir la question
                  </button>
                  <button
                    onClick={handleNextQuestion}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#003087] to-[#0047b3] text-white px-8 py-4 rounded-xl font-bold hover:shadow-xl hover:shadow-[#003087]/40 transition-all hover:scale-[1.02]"
                  >
                    {currentQuestionIndex < questions[selectedCategory].length - 1 ? (
                      <>
                        <span>Question suivante</span>
                        <ArrowRight className="h-5 w-5" />
                      </>
                    ) : (
                      <>
                        <span>Voir mes résultats</span>
                        <Trophy className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {step === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto"
            >
              <motion.div
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="bg-gradient-to-br from-[#003087] to-[#0047b3] rounded-3xl p-12 text-white text-center mb-8 shadow-2xl"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 150, delay: 0.2 }}
                  className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-white/20 mb-6"
                >
                  <Trophy className="h-12 w-12 text-white" />
                </motion.div>
                <h1 className="text-4xl font-bold mb-3">Félicitations !</h1>
                <p className="text-xl text-white/90 mb-6">Vous avez terminé votre session d'entraînement</p>
                <div className="flex items-center justify-center gap-8">
                  <div>
                    <div className="text-5xl font-bold mb-2">{averageScore.toFixed(1)}/10</div>
                    <div className="text-white/80">Score moyen</div>
                  </div>
                  <div className="h-16 w-px bg-white/30" />
                  <div>
                    <div className="text-5xl font-bold mb-2">{questions[selectedCategory].length}</div>
                    <div className="text-white/80">Questions traitées</div>
                  </div>
                </div>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {questions[selectedCategory].map((q, index) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-2xl p-6 border-2 border-slate-100 hover:border-[#003087] transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm font-semibold text-slate-500">Question {index + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-bold ${scores[index] >= 7 ? 'text-green-600' : 'text-orange-600'}`}>
                          {scores[index]}/10
                        </span>
                        {scores[index] >= 7 && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">{q.question}</h3>
                    <p className="text-sm text-slate-600 line-clamp-2">{answers[index]}</p>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-2xl p-8 border-2 border-slate-100"
              >
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Recommandations personnalisées</h2>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-bold text-green-900">Points d'excellence</span>
                    </div>
                    <ul className="space-y-1 text-sm text-green-800">
                      <li>• Bonne structuration des réponses</li>
                      <li>• Clarté dans l'expression</li>
                      {averageScore >= 7 && <li>• Excellente préparation générale</li>}
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-5 w-5 text-blue-600" />
                      <span className="font-bold text-blue-900">À améliorer</span>
                    </div>
                    <ul className="space-y-1 text-sm text-blue-800">
                      <li>• Ajouter plus d'exemples concrets</li>
                      <li>• Utiliser davantage de chiffres</li>
                      {averageScore < 7 && <li>• Approfondir certaines réponses</li>}
                    </ul>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={handleRestart}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-700 hover:border-[#003087] hover:text-[#003087] transition-all font-semibold"
                  >
                    <RotateCcw className="h-5 w-5" />
                    Recommencer
                  </button>
                  <Link
                    to="/dashboard"
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white px-8 py-4 rounded-xl font-bold hover:shadow-xl hover:shadow-[#E31E24]/40 transition-all hover:scale-[1.02]"
                  >
                    <span>Retour au tableau de bord</span>
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </div>
  );
}
