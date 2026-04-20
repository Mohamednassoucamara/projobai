import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, MapPin, Briefcase, GraduationCap, Calendar, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";
import ApplicationModal from "../components/ApplicationModal";
import { useAuth } from "../contexts/AuthContext";

export default function JobDetail() {
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleApplyClick = () => {
    if (!isAuthenticated) {
      navigate("/login");
    } else {
      setIsApplicationModalOpen(true);
    }
  };
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <Link to="/jobs" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-5 w-5" />
            <span>Retour aux offres</span>
          </Link>
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src={logoImage} alt="ProJob AI" className="h-10 w-auto" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-white rounded-3xl p-8 border mb-6">
            <h1 className="text-4xl font-bold mb-3">Développeur Web Full Stack</h1>
            <p className="text-2xl text-slate-700 mb-6">Tech Solutions GN</p>

            <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-8">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <span>Conakry, Guinée</span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                <span>Licence minimum</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                <span>CDI</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>Publié il y a 2 jours</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleApplyClick}
                className="flex-1 bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white px-6 py-4 rounded-xl font-bold hover:shadow-xl hover:shadow-[#E31E24]/40 hover:scale-[1.02] transition-all"
              >
                Postuler maintenant
              </button>
              <Link
                to="/cv-assistant"
                className="flex-1 flex items-center justify-center gap-2 border-2 border-[#003087] text-[#003087] px-6 py-4 rounded-xl font-bold hover:bg-[#003087] hover:text-white transition-all"
              >
                <Sparkles className="h-5 w-5" />
                Adapter mon CV avec l'IA
              </Link>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-8 border">
                <h2 className="text-2xl font-bold mb-4">Description du poste</h2>
                <div className="space-y-4 text-slate-700">
                  <p>
                    Nous recherchons un Développeur Web Full Stack talentueux pour rejoindre notre
                    équipe technique en pleine expansion. Vous travaillerez sur des projets innovants
                    et contribuerez à la création d'applications web modernes.
                  </p>
                  <p>
                    En tant que membre clé de notre équipe, vous serez responsable du développement
                    front-end et back-end de nos solutions digitales, en collaboration étroite avec
                    les designers et les chefs de projet.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 border">
                <h2 className="text-2xl font-bold mb-4">Responsabilités</h2>
                <ul className="space-y-3 text-slate-700">
                  <li className="flex gap-3">
                    <span className="text-[#E31E24]">•</span>
                    <span>Développer et maintenir des applications web performantes</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#E31E24]">•</span>
                    <span>Collaborer avec l'équipe pour définir les spécifications techniques</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#E31E24]">•</span>
                    <span>Assurer la qualité du code et respecter les bonnes pratiques</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#E31E24]">•</span>
                    <span>Participer aux revues de code et aux tests</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-3xl p-8 border">
                <h2 className="text-2xl font-bold mb-4">Compétences requises</h2>
                <div className="flex flex-wrap gap-2">
                  {[
                    "React",
                    "Node.js",
                    "TypeScript",
                    "MongoDB",
                    "Express",
                    "Git",
                    "REST API",
                    "Tailwind CSS",
                  ].map((skill) => (
                    <span
                      key={skill}
                      className="px-4 py-2 bg-[#003087]/10 text-[#003087] rounded-full font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 border">
                <h2 className="text-2xl font-bold mb-4">Profil recherché</h2>
                <ul className="space-y-3 text-slate-700">
                  <li className="flex gap-3">
                    <span className="text-[#E31E24]">•</span>
                    <span>Licence en Informatique ou équivalent</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#E31E24]">•</span>
                    <span>2 ans minimum d'expérience en développement web</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#E31E24]">•</span>
                    <span>Maîtrise du français et bonne connaissance de l'anglais technique</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#E31E24]">•</span>
                    <span>Esprit d'équipe et excellentes capacités de communication</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl p-6 border sticky top-6">
                <h3 className="font-bold mb-4">À propos de l'entreprise</h3>
                <p className="text-sm text-slate-700 mb-4">
                  Tech Solutions GN est une entreprise innovante spécialisée dans le développement
                  de solutions digitales pour les entreprises guinéennes.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Secteur</span>
                    <span className="font-medium">IT / Tech</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Taille</span>
                    <span className="font-medium">20-50 employés</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Date limite</span>
                    <span className="font-medium text-[#E31E24]">30 avril 2026</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <Footer />

      <ApplicationModal
        isOpen={isApplicationModalOpen}
        onClose={() => setIsApplicationModalOpen(false)}
        jobTitle="Développeur Web Full Stack"
        companyName="Tech Solutions GN"
      />
    </div>
  );
}
