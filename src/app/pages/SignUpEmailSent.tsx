import { Link, useSearchParams } from "react-router";
import { Mail, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";

export default function SignUpEmailSent() {
  const [params] = useSearchParams();
  const type = params.get("type") === "company" ? "company" : "candidate";
  const email = params.get("email") || "";
  const loginPath = `/login?type=${type}`;
  const backPath = type === "company" ? "/signup-company" : "/signup-candidate";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-lg w-full">
          <div className="flex items-center justify-between mb-8">
            <Link to="/" className="inline-flex items-center hover:opacity-80 transition-opacity">
              <img src={logoImage} alt="ProJob AI" className="h-14 w-auto" />
            </Link>
            <Link to={backPath} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-5 w-5" />
              <span>Retour</span>
            </Link>
          </div>

          <div className="bg-white rounded-3xl p-10 shadow-2xl shadow-slate-200/60 border border-slate-100 text-center">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[#003087] to-[#0047b3] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-[#003087]/30">
              <Mail className="h-12 w-12 text-white" />
            </div>

            <h1 className="text-3xl font-bold text-[#003087] mb-3">Vérifiez votre email</h1>
            <p className="text-slate-600 mb-4">Un email de confirmation a été envoyé à</p>
            {email ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-6 py-3 mb-6 inline-block">
                <span className="font-bold text-[#003087]">{email}</span>
              </div>
            ) : null}
            <p className="text-slate-600 mb-8">
              Cliquez sur le lien dans l&apos;email pour activer votre compte
              {type === "company" ? " entreprise" : ""} et accéder à votre tableau de bord.
            </p>

            <div className="space-y-3 text-left bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-8">
              {[
                "Vérifiez votre boîte de réception",
                "Regardez dans les spams si nécessaire",
                "Cliquez sur le lien d'activation",
              ].map((step) => (
                <div key={step} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#003087] flex-shrink-0" />
                  <span className="text-sm text-slate-700 font-medium">{step}</span>
                </div>
              ))}
            </div>

            <Link
              to={loginPath}
              className="inline-flex items-center gap-2 w-full justify-center bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white px-6 py-4 rounded-xl font-bold hover:shadow-2xl hover:shadow-[#E31E24]/40 transition-all"
            >
              Aller à la connexion
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
