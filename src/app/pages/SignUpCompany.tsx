import { Link, useNavigate, Navigate } from "react-router";
import { Shield, ArrowRight, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { useState } from "react";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";

export default function SignUpCompany() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Rediriger si déjà connecté
  if (isAuthenticated && user) {
    const redirectPath = user.type === "company" ? "/company/dashboard" : "/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const success = await login(email, password, "company");

      if (success) {
        setTimeout(() => {
          navigate("/company/dashboard", { replace: true });
        }, 300);
      } else {
        setError("Erreur lors de la création du compte. Veuillez réessayer.");
      }
    } catch (err) {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl w-full"
        >
        <div className="flex items-center justify-between mb-12">
          <Link to="/" className="inline-flex items-center hover:opacity-80 transition-opacity">
            <img src={logoImage} alt="ProJob AI" className="h-14 w-auto" />
          </Link>
          <Link to="/profile-choice" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-5 w-5" />
            <span>Retour</span>
          </Link>
        </div>

        <div className="bg-white rounded-3xl p-10 shadow-2xl shadow-slate-200/60 border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#E31E24]/5 to-transparent rounded-full blur-3xl" />
          <div className="relative">
            <h1 className="text-4xl font-bold mb-3 text-[#003087]">Créez votre compte entreprise</h1>
            <p className="text-lg text-slate-600 mb-8">Trouvez les meilleurs talents pour votre équipe</p>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 mb-6"
                >
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-800 font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">Nom de l'entreprise</label>
                <input
                  type="text"
                  placeholder="Tech Solutions GN"
                  required
                  disabled={isLoading}
                  className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">Secteur d'activité</label>
                <select required disabled={isLoading} className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  <option value="">Sélectionnez</option>
                  <option>IT / Technologie</option>
                  <option>Télécommunications</option>
                  <option>Banque / Finance</option>
                  <option>Commerce</option>
                  <option>Industrie</option>
                  <option>Services</option>
                  <option>Autre</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">Taille de l'entreprise</label>
              <select required disabled={isLoading} className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="">Sélectionnez une taille</option>
                <option>1-10 employés</option>
                <option>11-50 employés</option>
                <option>51-200 employés</option>
                <option>200+ employés</option>
              </select>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">Nom du responsable</label>
                <input
                  type="text"
                  placeholder="Mamadou Camara"
                  required
                  disabled={isLoading}
                  className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">Téléphone professionnel</label>
                <input
                  type="tel"
                  placeholder="+224 XXX XXX XXX"
                  required
                  disabled={isLoading}
                  className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">Email professionnel</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="contact@techsolutions.gn"
                required
                disabled={isLoading}
                className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="••••••••"
                required
                disabled={isLoading}
                className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group w-full bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white px-6 py-4 rounded-xl font-bold hover:shadow-2xl hover:shadow-[#E31E24]/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Création du compte...
                </>
              ) : (
                <>
                  Créer mon compte entreprise
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-2 justify-center text-sm text-slate-600 bg-slate-50 py-3 px-4 rounded-xl">
            <Shield className="h-4 w-4 text-[#003087]" />
            <span>Vos données sont sécurisées et confidentielles</span>
          </div>

          <p className="mt-6 text-center text-slate-600">
            Déjà un compte ?{" "}
            <Link to="/login?type=company" className="text-[#003087] font-semibold hover:text-[#E31E24] hover:underline">
              Se connecter
            </Link>
          </p>
          </div>
        </div>
      </motion.div>
      </div>

      <Footer />
    </div>
  );
}
