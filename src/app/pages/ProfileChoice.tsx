import { Link } from "react-router";
import { User, Building2, ArrowLeft, FileText, MessageSquare, Briefcase, Users, Search, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";

export default function ProfileChoice() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003087]/5 via-white to-[#E31E24]/5 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl w-full"
        >
        <div className="flex items-center justify-between mb-12">
          <Link to="/" className="inline-flex items-center hover:opacity-80 transition-opacity">
            <img src={logoImage} alt="ProJob AI" className="h-14 w-auto" />
          </Link>
          <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-[#003087] font-medium transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span>Retour à l'accueil</span>
          </Link>
        </div>

        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              <span className="text-[#003087]">Choisissez votre</span>{" "}
              <span className="bg-gradient-to-r from-[#E31E24] to-[#ff3333] bg-clip-text text-transparent">profil</span>
            </h1>
            <p className="text-xl text-slate-600">Sélectionnez le type de compte qui vous correspond</p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link
              to="/signup-candidate"
              className="group relative block p-10 rounded-3xl bg-white border-2 border-slate-200 hover:border-[#003087] hover:shadow-2xl hover:shadow-[#003087]/20 transition-all duration-300 overflow-hidden h-full"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#003087]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="text-center mb-8">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-[#003087] to-[#0047b3] shadow-xl shadow-[#003087]/40 mb-6"
                  >
                    <User className="h-10 w-10 text-white" />
                  </motion.div>
                  <h2 className="text-3xl font-bold mb-3 text-[#003087]">Je suis candidat</h2>
                  <p className="text-lg text-slate-600 mb-8">Propulsez votre carrière avec l'IA</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#003087]/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-[#003087]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">CV intelligent</h3>
                      <p className="text-sm text-slate-600">Créez un CV professionnel en minutes</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#003087]/10 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-5 w-5 text-[#003087]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Préparation entretien</h3>
                      <p className="text-sm text-slate-600">Simulateur avec feedback IA</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#003087]/10 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="h-5 w-5 text-[#003087]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Offres d'emploi</h3>
                      <p className="text-sm text-slate-600">Accédez à toutes les opportunités</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200">
                  <div className="flex items-center justify-center gap-2 text-[#003087] font-bold group-hover:gap-3 transition-all">
                    <span>Commencer gratuitement</span>
                    <ArrowLeft className="h-5 w-5 rotate-180" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link
              to="/signup-company"
              className="group relative block p-10 rounded-3xl bg-white border-2 border-slate-200 hover:border-[#E31E24] hover:shadow-2xl hover:shadow-[#E31E24]/20 transition-all duration-300 overflow-hidden h-full"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#E31E24]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="text-center mb-8">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-[#E31E24] to-[#ff3333] shadow-xl shadow-[#E31E24]/40 mb-6"
                  >
                    <Building2 className="h-10 w-10 text-white" />
                  </motion.div>
                  <h2 className="text-3xl font-bold mb-3 text-[#E31E24]">Je suis une entreprise</h2>
                  <p className="text-lg text-slate-600 mb-8">Recrutez les meilleurs talents</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#E31E24]/10 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="h-5 w-5 text-[#E31E24]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Publier des offres</h3>
                      <p className="text-sm text-slate-600">Créez vos annonces facilement</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#E31E24]/10 flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-[#E31E24]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Gérer les candidatures</h3>
                      <p className="text-sm text-slate-600">Dashboard complet et intuitif</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#E31E24]/10 flex items-center justify-center flex-shrink-0">
                      <Search className="h-5 w-5 text-[#E31E24]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Recherche de profils</h3>
                      <p className="text-sm text-slate-600">Trouvez le candidat idéal</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200">
                  <div className="flex items-center justify-center gap-2 text-[#E31E24] font-bold group-hover:gap-3 transition-all">
                    <span>Créer mon compte entreprise</span>
                    <ArrowLeft className="h-5 w-5 rotate-180" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </motion.div>
      </div>

      <Footer />
    </div>
  );
}
