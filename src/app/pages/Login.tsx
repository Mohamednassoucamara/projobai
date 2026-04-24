import { Link, useNavigate, useLocation, Navigate } from "react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { ArrowRight, ArrowLeft, AlertCircle, Loader2, Lock } from "lucide-react";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";
import {
  isRateLimited,
  recordLoginAttempt,
  rateLimitSecondsRemaining,
  safeRedirectUrl,
  isValidEmail,
} from "../../lib/security";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const params = new URLSearchParams(location.search);
  const rawType = params.get("type");
  const userType: "candidate" | "company" =
    rawType === "company" ? "company" : "candidate";
  const defaultPath = userType === "company" ? "/company/dashboard" : "/dashboard";
  const from = safeRedirectUrl(params.get("from"), defaultPath);

  // Countdown timer when locked out
  useEffect(() => {
    if (!isRateLimited()) return;
    setLockoutSeconds(rateLimitSecondsRemaining());
    const id = setInterval(() => {
      const rem = rateLimitSecondsRemaining();
      setLockoutSeconds(rem);
      if (rem <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (isAuthenticated && user) {
    const redirectPath = user.type === "company" ? "/company/dashboard" : "/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isRateLimited()) {
      setLockoutSeconds(rateLimitSecondsRemaining());
      return;
    }

    if (!isValidEmail(email)) {
      setError("Adresse email invalide.");
      return;
    }

    setIsLoading(true);
    try {
      recordLoginAttempt();
      const success = await login(email, password, userType);

      if (success) {
        setTimeout(() => navigate(from, { replace: true }), 300);
      } else {
        if (isRateLimited()) {
          setLockoutSeconds(rateLimitSecondsRemaining());
          setError(`Trop de tentatives. Réessayez dans ${rateLimitSecondsRemaining()} secondes.`);
        } else {
          setError("Identifiants incorrects. Veuillez réessayer.");
        }
      }
    } catch {
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
          className="max-w-lg w-full"
        >
        <div className="flex items-center justify-between mb-12">
          <Link to="/" className="inline-flex items-center hover:opacity-80 transition-opacity">
            <img src={logoImage} alt="ProJob AI" className="h-14 w-auto" />
          </Link>
          <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-5 w-5" />
            <span>Retour</span>
          </Link>
        </div>

        <div className="bg-white rounded-3xl p-10 shadow-2xl shadow-slate-200/60 border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#003087]/5 to-transparent rounded-full blur-3xl" />
          <div className="relative">
            <h1 className="text-4xl font-bold mb-3 text-[#003087]">Bon retour !</h1>
            <p className="text-lg text-slate-600 mb-8">
              {userType === "company" ? "Accédez à votre espace entreprise" : "Accédez à votre espace candidat"}
            </p>

            <AnimatePresence mode="wait">
              {lockoutSeconds > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-orange-50 border border-orange-200 mb-4"
                >
                  <Lock className="h-5 w-5 text-orange-600 flex-shrink-0" />
                  <p className="text-sm text-orange-800 font-medium">
                    Trop de tentatives. Réessayez dans{" "}
                    <span className="font-black">{lockoutSeconds}s</span>.
                  </p>
                </motion.div>
              )}
              {error && !lockoutSeconds && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 mb-4"
                >
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-800 font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">Adresse email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="votre@email.com"
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
              disabled={isLoading || lockoutSeconds > 0}
              className="group w-full bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white px-6 py-4 rounded-xl font-bold hover:shadow-2xl hover:shadow-[#E31E24]/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-600">
            Pas encore de compte ?{" "}
            <Link
              to={userType === "company" ? "/signup-company" : "/signup-candidate"}
              className="text-[#003087] font-semibold hover:text-[#E31E24] hover:underline"
            >
              Créer un compte
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
