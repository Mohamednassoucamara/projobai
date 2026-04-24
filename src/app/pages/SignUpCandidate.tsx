import { Link, Navigate } from "react-router";
import { Shield, ArrowRight, ArrowLeft, Loader2, AlertCircle, Mail, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { useState } from "react";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";
import { isValidEmail, validatePassword } from "../../lib/security";

export default function SignUpCandidate() {
  const { signUp, isAuthenticated, user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  if (isAuthenticated && user) {
    const redirectPath = user.type === "company" ? "/company/dashboard" : "/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidEmail(email)) {
      setError("Adresse email invalide.");
      return;
    }
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      setError(pwCheck.error);
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUp(email, password, fullName, "candidate");
      if (result.success) {
        setEmailSent(true);
      } else {
        setError(result.error || "Erreur lors de la création du compte. Veuillez réessayer.");
      }
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-lg w-full"
          >
            <div className="bg-white rounded-3xl p-10 shadow-2xl shadow-slate-200/60 border border-slate-100 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="h-24 w-24 rounded-full bg-gradient-to-br from-[#003087] to-[#0047b3] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-[#003087]/30"
              >
                <Mail className="h-12 w-12 text-white" />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h1 className="text-3xl font-bold text-[#003087] mb-3">Vérifiez votre email !</h1>
                <p className="text-slate-600 mb-6">
                  Un email de confirmation a été envoyé à
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-6 py-3 mb-6 inline-block">
                  <span className="font-bold text-[#003087]">{email}</span>
                </div>
                <p className="text-slate-600 mb-8">
                  Cliquez sur le lien dans l'email pour activer votre compte et accéder à votre tableau de bord.
                </p>

                <div className="space-y-3 text-left bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-8">
                  {[
                    "Vérifiez votre boîte de réception",
                    "Regardez dans les spams si nécessaire",
                    "Cliquez sur le lien d'activation",
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-[#003087] flex-shrink-0" />
                      <span className="text-sm text-slate-700 font-medium">{step}</span>
                    </div>
                  ))}
                </div>

                <Link
                  to="/login?type=candidate"
                  className="inline-flex items-center gap-2 w-full justify-center bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white px-6 py-4 rounded-xl font-bold hover:shadow-2xl hover:shadow-[#E31E24]/40 hover:scale-[1.02] transition-all"
                >
                  Aller à la connexion
                  <ArrowRight className="h-5 w-5" />
                </Link>

                <p className="mt-6 text-sm text-slate-500">
                  Vous n'avez pas reçu l'email ?{" "}
                  <button
                    onClick={() => setEmailSent(false)}
                    className="text-[#003087] font-semibold hover:underline"
                  >
                    Réessayer
                  </button>
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

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
            <Link to="/profile-choice" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-5 w-5" />
              <span>Retour</span>
            </Link>
          </div>

          <div className="bg-white rounded-3xl p-10 shadow-2xl shadow-slate-200/60 border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#003087]/5 to-transparent rounded-full blur-3xl" />
            <div className="relative">
              <h1 className="text-4xl font-bold mb-3 text-[#003087]">Créez votre compte</h1>
              <p className="text-lg text-slate-600 mb-8">Commencez votre parcours professionnel</p>

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
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">Nom complet</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setError(""); }}
                    placeholder="Mohamed Diallo"
                    required
                    disabled={isLoading}
                    className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">Téléphone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+224 XXX XXX XXX"
                    disabled={isLoading}
                    className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">Adresse email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    placeholder="mohamed@example.com"
                    required
                    disabled={isLoading}
                    className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">Mot de passe</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="••••••••  (min. 8 car., 1 maj., 1 chiffre)"
                    required
                    disabled={isLoading}
                    className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group w-full bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white px-6 py-4 rounded-xl font-bold hover:shadow-2xl hover:shadow-[#E31E24]/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isLoading ? (
                    <><Loader2 className="h-5 w-5 animate-spin" />Création du compte...</>
                  ) : (
                    <>Créer mon compte<ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" /></>
                  )}
                </button>
              </form>

              <div className="mt-6 flex items-center gap-2 justify-center text-sm text-slate-600 bg-slate-50 py-3 px-4 rounded-xl">
                <Shield className="h-4 w-4 text-[#003087]" />
                <span>Vos données sont sécurisées et confidentielles</span>
              </div>

              <p className="mt-6 text-center text-slate-600">
                Déjà un compte ?{" "}
                <Link to="/login?type=candidate" className="text-[#003087] font-semibold hover:text-[#E31E24] hover:underline">
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
