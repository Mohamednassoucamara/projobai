import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import AppLogo from "./AppLogo";
import { WelcomeIllustration } from "./Illustrations";

const POINTS = {
  candidate: [
    "Un CV professionnel prêt en quelques minutes",
    "Un coach d'entretien qui vous note et vous conseille",
    "Des offres classées selon votre profil",
  ],
  company: [
    "Publiez vos offres en quelques minutes",
    "Des candidatures classées par compatibilité",
    "Une CVthèque de candidats préparés",
  ],
};

/** Mise en page des pages de connexion et d'inscription : panneau de marque + formulaire. */
export default function AuthShell({ children, audience = "candidate" }: { children: ReactNode; audience?: "candidate" | "company" }) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <aside className="hidden lg:flex flex-col justify-between bg-brand-strong text-white px-12 py-10 relative overflow-hidden">
        <div className="absolute -left-24 -bottom-24 h-96 w-96 rounded-full bg-brand/70 blur-2xl" aria-hidden="true" />
        <div className="relative">
          <AppLogo variant="dark" className="brand-logo h-12 w-auto object-contain object-left" />
        </div>
        <div className="relative">
          <WelcomeIllustration className="w-full max-w-md h-auto mx-auto" />
          <h2 className="mt-6 text-3xl font-bold leading-tight">
            {audience === "company" ? "Recrutez les bons profils, plus vite." : "Votre prochain emploi commence ici."}
          </h2>
          <ul className="mt-6 space-y-3">
            {POINTS[audience].map((p) => (
              <li key={p} className="flex items-start gap-3 text-white/90">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#FF8A7A] mt-0.5" /> {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/60">© {new Date().getFullYear()} ProJob AI · Nassouba Technologie, Conakry</p>
      </aside>
      <main className="flex flex-col min-h-screen bg-gradient-to-b from-canvas to-white lg:bg-none">
        {children}
      </main>
    </div>
  );
}
