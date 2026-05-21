import { Link } from "react-router";
import { Shield, ArrowRight, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";
import { isValidEmail, validatePassword } from "../../lib/security";
import { redirectAfterSignup } from "../../lib/authRedirect";

export default function SignUpCandidate() {
  const { signUp, isAuthenticated, user, isLoading: authLoading, isSigningUp } = useAuth();
  const didRedirectRef = useRef(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (authLoading || isSigningUp || didRedirectRef.current) return;
    if (isAuthenticated && user) {
      didRedirectRef.current = true;
      window.location.replace(
        user.type === "company" ? "/company/dashboard" : "/dashboard",
      );
    }
  }, [authLoading, isSigningUp, isAuthenticated, user]);

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
        didRedirectRef.current = true;
        redirectAfterSignup(
          "candidate",
          email,
          result.needsEmailConfirmation !== false,
        );
        return;
      }
      setError(result.error || "Erreur lors de la création du compte. Veuillez réessayer.");
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-lg w-full">
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
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#003087]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <h1 className="text-4xl font-bold mb-3 text-[#003087]">Créez votre compte</h1>
              <p className="text-lg text-slate-600 mb-8">Commencez votre parcours professionnel</p>

              {error ? (
                <div
                  role="alert"
                  className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 mb-6"
                >
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-800 font-medium">{error}</p>
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">Nom complet</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setError("");
                    }}
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
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
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
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="••••••••  (min. 8 car., 1 maj., 1 chiffre)"
                    required
                    disabled={isLoading}
                    className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group w-full bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white px-6 py-4 rounded-xl font-bold hover:shadow-2xl hover:shadow-[#E31E24]/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Création du compte...
                    </>
                  ) : (
                    <>
                      Créer mon compte
                      <ArrowRight className="h-5 w-5" />
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
                <Link
                  to="/login?type=candidate"
                  className="text-[#003087] font-semibold hover:text-[#E31E24] hover:underline"
                >
                  Se connecter
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
