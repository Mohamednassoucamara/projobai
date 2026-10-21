import type { ReactNode } from "react";
import { Link } from "react-router";
import { Crown, Lock, Loader2, Check } from "lucide-react";
import AppNavHeader from "./AppNavHeader";
import Footer from "./Footer";
import { useAuth } from "../contexts/AuthContext";
import { usePlan } from "../contexts/PlanContext";
import { FEATURE_LABELS, DEFAULT_PLANS, gnf, type Feature } from "../../lib/billing";

export function PremiumBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[11px] font-bold ${className}`}>
      <Crown className="h-3 w-3" /> Premium
    </span>
  );
}

/** Encart d'invitation à passer au Premium. */
export function PremiumUpsell({ feature, compact = false, description }: { feature: Feature; compact?: boolean; description?: string }) {
  const { entitlements } = usePlan();
  const audience = entitlements?.audience || (["ai_cv", "career_coach", "interview_coach"].includes(feature) ? "candidate" : "company");
  const plan = DEFAULT_PLANS.find((p) => p.audience === audience && p.price_month_gnf > 0)!;
  const trialOver = entitlements?.source === "gratuit";

  if (compact) {
    return (
      <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <Lock className="h-5 w-5 text-amber-700 shrink-0" />
        <p className="flex-1 text-sm text-slate-800">
          <span className="font-bold">{FEATURE_LABELS[feature]}</span> est inclus dans la formule Premium{description ? ` : ${description}` : "."}
        </p>
        <Link to="/abonnement" className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#E4220F] to-[#F92813] text-white text-sm font-bold">
          <Crown className="h-4 w-4" /> Passer au Premium
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border-2 border-amber-200 bg-white p-6 sm:p-10 shadow-xl text-center">
      <span className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-lg">
        <Crown className="h-8 w-8" />
      </span>
      <h2 className="mt-5 text-2xl sm:text-3xl font-bold text-slate-900">{FEATURE_LABELS[feature]}</h2>
      <p className="mt-2 text-slate-600">
        {description || "Cette fonctionnalité est incluse dans la formule Premium."}
        {trialOver ? " Votre essai gratuit est terminé." : ""}
      </p>
      <ul className="mt-6 text-left inline-block space-y-2">
        {plan.perks.filter((p) => p !== "Tout le Gratuit").map((p) => (
          <li key={p} className="flex gap-2 text-sm text-slate-700"><Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> {p}</li>
        ))}
      </ul>
      <p className="mt-6 text-lg font-bold text-slate-900">
        {gnf(plan.price_month_gnf)} <span className="text-sm font-medium text-slate-500">/ mois</span>
        <span className="text-sm font-medium text-slate-500"> · ou {gnf(plan.price_year_gnf)} / an</span>
      </p>
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/abonnement" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#E4220F] to-[#F92813] text-white font-bold shadow-lg">
          <Crown className="h-5 w-5" /> Passer au Premium
        </Link>
        <Link to="/pricing" className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl border-2 border-slate-200 font-bold text-slate-700 hover:border-[#050FA0]">
          Comparer les formules
        </Link>
      </div>
      <p className="mt-4 text-xs text-slate-500">Paiement par Orange Money, MTN MoMo ou carte bancaire, via Djomy.</p>
    </div>
  );
}

/** Affiche le contenu si la fonctionnalité est incluse, sinon l'invitation au Premium. */
export default function PremiumGate({
  feature,
  children,
  compact = false,
  description,
}: {
  feature: Feature;
  children: ReactNode;
  compact?: boolean;
  description?: string;
}) {
  const { can, ready } = usePlan();
  if (!ready) return <div className="py-10 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#050FA0]" /></div>;
  if (can(feature)) return <>{children}</>;
  return <PremiumUpsell feature={feature} compact={compact} description={description} />;
}

/** Page entière réservée au Premium (utilisée dans les routes). */
export function PremiumPage({ feature, children, description }: { feature: Feature; children: ReactNode; description?: string }) {
  const { can, ready } = usePlan();
  const { user } = useAuth();
  if (!ready) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-[#050FA0]" /></div>;
  if (can(feature)) return <>{children}</>;
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppNavHeader backTo={user?.type === "company" ? "/company/dashboard" : "/dashboard"} backLabel="Retour au tableau de bord" />
      <main className="flex-1 page-container py-10 sm:py-16">
        <PremiumUpsell feature={feature} description={description} />
      </main>
      <Footer />
    </div>
  );
}
