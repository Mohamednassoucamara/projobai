import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";

export default function PostJob() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <Link to="/company/dashboard" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-5 w-5" />
            <span>Retour au tableau de bord</span>
          </Link>
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src={logoImage} alt="ProJob AI" className="h-10 w-auto" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold mb-2">Publier une offre d'emploi</h1>
          <p className="text-lg text-slate-600 mb-12">Trouvez le candidat idéal pour votre entreprise</p>

          <div className="bg-white rounded-3xl p-8 border">
            <form className="space-y-6">
              <div>
                <label className="block font-medium mb-2">Intitulé du poste</label>
                <input
                  type="text"
                  placeholder="Développeur Web Full Stack"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-600 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block font-medium mb-2">Description du poste</label>
                <textarea
                  rows={6}
                  placeholder="Décrivez les responsabilités, missions et objectifs du poste..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-600 outline-none transition-colors resize-none"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-medium mb-2">Localisation</label>
                  <input
                    type="text"
                    placeholder="Conakry, Guinée"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-600 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2">Type de contrat</label>
                  <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-600 outline-none transition-colors">
                    <option>CDI</option>
                    <option>CDD</option>
                    <option>Stage</option>
                    <option>Freelance</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-medium mb-2">Niveau d'étude requis</label>
                  <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-600 outline-none transition-colors">
                    <option>Bac</option>
                    <option>Bac+2</option>
                    <option>Licence</option>
                    <option>Master</option>
                    <option>Doctorat</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-2">Expérience requise</label>
                  <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-600 outline-none transition-colors">
                    <option>Débutant accepté</option>
                    <option>1-2 ans</option>
                    <option>3-5 ans</option>
                    <option>5+ ans</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-2">Compétences requises</label>
                <input
                  type="text"
                  placeholder="React, TypeScript, Node.js..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-600 outline-none transition-colors"
                />
                <p className="text-sm text-slate-500 mt-2">Séparez les compétences par des virgules</p>
              </div>

              <div>
                <label className="block font-medium mb-2">Date limite de candidature</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-600 outline-none transition-colors"
                />
              </div>

              <div className="pt-6 border-t flex gap-3">
                <Link
                  to="/company/dashboard"
                  className="flex-1 text-center px-6 py-3 rounded-full border-2 border-slate-200 font-medium hover:border-blue-600 transition-colors"
                >
                  Annuler
                </Link>
                <Link
                  to="/company/dashboard"
                  className="flex-1 text-center bg-blue-600 text-white px-6 py-3 rounded-full font-medium hover:bg-blue-700 transition-colors"
                >
                  Publier l'offre
                </Link>
              </div>
            </form>

            <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>Bientôt disponible :</strong> Générez automatiquement la description de votre offre avec l'IA
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
