import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Check, Crown, Minus, Smartphone, ShieldCheck, CalendarClock, Users, Briefcase } from "lucide-react";
import { motion } from "motion/react";
import Footer from "../components/Footer";
import AppNavHeader from "../components/AppNavHeader";
import { useAuth } from "../contexts/AuthContext";
import { DEFAULT_PLANS, fetchPlans, gnf, type Audience, type Period, type Plan } from "../../lib/billing";

const COMPARE: Record<Audience, { label: string; free: boolean }[]> = {
  candidate: [
    { label: "CV professionnel (PDF, photo, couleurs, modèles par métier)", free: true },
    { label: "Import de votre CV existant (PDF ou Word)", free: true },
    { label: "Lettre de motivation", free: true },
    { label: "Offres d'emploi, candidatures et score de compatibilité", free: true },
    { label: "Suivi des candidatures et convocations aux entretiens", free: true },
    { label: "CV optimisé par l'IA", free: false },
    { label: "CV adapté à chaque offre", free: false },
    { label: "Coaching carrière (orientation professionnelle)", free: false },
    { label: "Coach d'entretien IA", free: false },
  ],
  company: [
    { label: "Publication d'offres d'emploi", free: true },
    { label: "Réception et suivi des candidatures par étape", free: true },
    { label: "Notifications automatiques aux candidats", free: true },
    { label: "CVthèque", free: true },
    { label: "IA : extraction des CV et classement des meilleurs profils", free: false },
    { label: "Entretiens : planification, visio, agenda, évaluation", free: false },
    { label: "Statistiques RH", free: false },
    { label: "Partage des offres avec suivi des sources", free: false },
    { label: "Historique et commentaires internes", free: false },
  ],
};

export default function Pricing() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [period, setPeriod] = useState<Period>("month");
  const audience: Audience = params.get("pour") === "entreprises" || (!params.get("pour") && user?.type === "company") ? "company" : "candidate";

  useEffect(() => { fetchPlans().then(setPlans, () => undefined); }, []);

  const shown = useMemo(() => plans.filter((p) => p.audience === audience).sort((a, b) => a.rank - b.rank), [plans, audience]);
  const premium = shown.find((p) => p.price_month_gnf > 0);
  const saving = premium ? premium.price_month_gnf * 12 - premium.price_year_gnf : 0;

  const signup = audience === "company" ? "/signup-company" : "/signup-candidate";
  const sameType = user && user.type === audience;
  const dashboard = audience === "company" ? "/company/dashboard" : "/dashboard";

  const ctaFor = (p: Plan) => {
    const paid = p.price_month_gnf > 0;
    if (!user) return { to: signup, label: paid ? "Essayer 7 jours gratuitement" : "Créer mon compte gratuit" };
    if (!sameType) return null;
    return paid ? { to: `/abonnement?periode=${period}`, label: "Passer au Premium" } : { to: dashboard, label: "Mon tableau de bord" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      <AppNavHeader backTo={user ? dashboard : "/"} backLabel={user ? "Retour au tableau de bord" : "Retour à l'accueil"} />

      <main className="flex-1 page-container py-10 sm:py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">
            <span className="text-[#050FA0]">Des tarifs</span>{" "}
            <span className="text-[#E4220F]">simples</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
            Commencez gratuitement. Passez au Premium quand vous en avez besoin, sans engagement.
          </p>
        </motion.div>

        {/* Choix du public et de la période */}
        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="inline-flex rounded-2xl border-2 border-slate-200 bg-white p-1" role="tablist" aria-label="Formules pour">
            {([["candidate", "Candidats", Users], ["company", "Entreprises", Briefcase]] as const).map(([a, label, Icon]) => (
              <button
                key={a}
                role="tab"
                aria-selected={audience === a}
                onClick={() => setParams(a === "company" ? { pour: "entreprises" } : { pour: "candidats" }, { replace: true })}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm sm:text-base font-bold ${audience === a ? "bg-[#050FA0] text-white" : "text-slate-600 hover:text-slate-900"}`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 p-1" role="group" aria-label="Période de paiement">
            {(["month", "year"] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold ${period === p ? "bg-white shadow text-slate-900" : "text-slate-600"}`}
              >
                {p === "month" ? "Mensuel" : "Annuel"}
                {p === "year" && saving > 0 && <span className="ml-1.5 text-xs font-bold text-emerald-700">−{gnf(saving)}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto mb-14">
          {shown.map((p, i) => {
            const paid = p.price_month_gnf > 0;
            const price = period === "year" ? p.price_year_gnf : p.price_month_gnf;
            const cta = ctaFor(p);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                className={`relative rounded-3xl bg-white p-7 sm:p-9 flex flex-col ${paid ? "border-2 border-[#E4220F] shadow-2xl shadow-[#E4220F]/15" : "border-2 border-slate-200 shadow-lg"}`}
              >
                {paid && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#E4220F] to-[#F92813] px-5 py-1.5 text-sm font-bold text-white shadow-lg">
                    <Crown className="h-4 w-4" /> 7 jours d&apos;essai gratuit
                  </span>
                )}
                <h2 className="text-2xl font-bold text-[#050FA0]">{p.name}</h2>
                {p.tagline && <p className="text-slate-600 mt-1">{p.tagline}</p>}
                <div className="mt-6 mb-1 flex items-end gap-2">
                  {paid ? (
                    <>
                      <span className="text-4xl sm:text-5xl font-bold text-slate-900 tabular-nums">{Math.round(price).toLocaleString("fr-FR")}</span>
                      <span className="text-lg text-slate-600 mb-1.5 font-medium">GNF / {period === "year" ? "an" : "mois"}</span>
                    </>
                  ) : (
                    <span className="text-4xl sm:text-5xl font-bold text-slate-900">0 GNF</span>
                  )}
                </div>
                <p className="text-sm text-slate-500 h-5">
                  {paid && period === "year" ? `Soit ${gnf(Math.round(p.price_year_gnf / 12))} par mois` : paid ? "Sans engagement" : "Pour toujours"}
                </p>

                <ul className="mt-6 space-y-3 flex-1">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-3">
                      <span className={`mt-0.5 h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${paid ? "bg-[#E4220F]" : "bg-[#050FA0]"}`}>
                        <Check className="h-4 w-4 text-white stroke-[3]" />
                      </span>
                      <span className={`text-slate-700 ${perk.startsWith("Tout le") ? "font-semibold" : ""}`}>{perk}</span>
                    </li>
                  ))}
                </ul>

                {cta ? (
                  <Link
                    to={cta.to}
                    className={`mt-8 block text-center px-6 py-4 rounded-2xl font-bold transition-all ${paid ? "bg-gradient-to-r from-[#E4220F] to-[#F92813] text-white shadow-xl shadow-[#E4220F]/30 hover:scale-[1.02]" : "border-2 border-[#050FA0] text-[#050FA0] hover:bg-[#050FA0] hover:text-white"}`}
                  >
                    {cta.label}
                  </Link>
                ) : (
                  <p className="mt-8 text-center text-sm text-slate-500">Formule réservée aux comptes {audience === "company" ? "entreprise" : "candidat"}.</p>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Comparatif */}
        <section className="max-w-4xl mx-auto mb-14 bg-white rounded-3xl border-2 border-slate-100 p-5 sm:p-8 overflow-x-auto" aria-labelledby="comparatif">
          <h2 id="comparatif" className="text-2xl font-bold text-slate-900 mb-5">Comparer les formules</h2>
          <table className="w-full text-sm sm:text-base min-w-[420px]">
            <thead>
              <tr className="border-b text-left">
                <th className="py-3 pr-3 font-semibold text-slate-500">Fonctionnalité</th>
                <th className="py-3 px-3 font-bold text-[#050FA0] text-center w-24">Gratuit</th>
                <th className="py-3 pl-3 font-bold text-[#E4220F] text-center w-24">Premium</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE[audience].map((row) => (
                <tr key={row.label} className="border-b last:border-0">
                  <td className="py-3 pr-3 text-slate-700">{row.label}</td>
                  <td className="py-3 px-3 text-center">
                    {row.free ? <Check className="h-5 w-5 text-emerald-600 inline" aria-label="Inclus" /> : <Minus className="h-5 w-5 text-slate-300 inline" aria-label="Non inclus" />}
                  </td>
                  <td className="py-3 pl-3 text-center"><Check className="h-5 w-5 text-emerald-600 inline" aria-label="Inclus" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Questions fréquentes */}
        <section className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-4 mb-14">
          {[
            { icon: Smartphone, title: "Paiement mobile", text: "Orange Money, MTN MoMo ou carte bancaire, via la plateforme sécurisée Djomy." },
            { icon: CalendarClock, title: "Sans engagement", text: "Pas de renouvellement automatique : vous payez un mois ou un an, puis vous choisissez de renouveler." },
            { icon: ShieldCheck, title: "7 jours d'essai", text: "Chaque nouveau compte profite gratuitement du Premium pendant 7 jours, sans moyen de paiement." },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-2xl border-2 border-slate-100 p-5">
              <f.icon className="h-6 w-6 text-[#050FA0] mb-3" />
              <h3 className="font-bold text-slate-900">{f.title}</h3>
              <p className="text-sm text-slate-600 mt-1">{f.text}</p>
            </div>
          ))}
        </section>

        <p className="text-center text-slate-600">
          Une question ? Écrivez-nous à{" "}
          <a href="mailto:contact@pjob.nassouba.com" className="font-semibold text-[#050FA0] hover:underline">contact@pjob.nassouba.com</a>
        </p>
      </main>

      <Footer />
    </div>
  );
}
