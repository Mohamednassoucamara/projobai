import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Crown, Check, Loader2, Smartphone, AlertCircle, Receipt, CalendarClock } from "lucide-react";
import DashboardHeader from "../components/DashboardHeader";
import Footer from "../components/Footer";
import { useAuth } from "../contexts/AuthContext";
import { usePlan } from "../contexts/PlanContext";
import {
  DEFAULT_PLANS, daysLeft, fetchPayments, fetchPlans, gnf, startCheckout, PaymentError,
  type PaymentRow, type Period, type Plan,
} from "../../lib/billing";
import { atsService } from "../../services/ats.service";

const STATUS: Record<string, { label: string; cls: string }> = {
  success: { label: "Payé", cls: "bg-emerald-100 text-emerald-800" },
  pending: { label: "En attente", cls: "bg-amber-100 text-amber-800" },
  created: { label: "Non finalisé", cls: "bg-slate-100 text-slate-600" },
  failed: { label: "Échoué", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "Annulé", cls: "bg-slate-100 text-slate-600" },
  timeout: { label: "Expiré", cls: "bg-slate-100 text-slate-600" },
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/** Mon abonnement : formule actuelle, paiement Djomy, historique. */
export default function Subscription() {
  const { user } = useAuth();
  const { entitlements, ready, refresh } = usePlan();
  const [params] = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [period, setPeriod] = useState<Period>(params.get("periode") === "year" ? "year" : "month");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPlans().then(setPlans, () => undefined);
    fetchPayments().then(setPayments, () => undefined);
    atsService.getNotifyPrefs().then((p) => p?.phone && setPhone(p.phone), () => undefined);
    void refresh();
  }, [refresh]);

  const audience = user?.type === "company" ? "company" : "candidate";
  const premium = useMemo(() => plans.find((p) => p.audience === audience && p.price_month_gnf > 0), [plans, audience]);
  const cancelled = params.get("annule");

  if (!premium) return null;
  const price = period === "year" ? premium.price_year_gnf : premium.price_month_gnf;
  const saving = premium.price_month_gnf * 12 - premium.price_year_gnf;
  const left = daysLeft(entitlements?.ends_at ?? null);
  const source = entitlements?.source;

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (phone.replace(/\D/g, "").length < 9) {
      setError("Indiquez le numéro Orange Money ou MTN qui va payer (ex. : 622 00 00 00).");
      return;
    }
    setBusy(true);
    try {
      const { url } = await startCheckout(premium.id, period, phone);
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof PaymentError ? err.message : "Le paiement n'a pas pu démarrer.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardHeader />
      <main className="page-container py-8 sm:py-12 flex-1">
        <h1 className="page-title mb-2 flex items-center gap-3"><Crown className="h-8 w-8 text-amber-500" /> Mon abonnement</h1>
        <p className="page-subtitle mb-8">Formule {audience === "company" ? "entreprise" : "candidat"} · paiement par Orange Money, MTN MoMo ou carte via Djomy.</p>

        {cancelled && (
          <p className="mb-6 rounded-xl px-4 py-3 text-sm border-2 bg-slate-50 border-slate-200 text-slate-700">Paiement annulé : aucun montant n&apos;a été débité.</p>
        )}

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Formule actuelle */}
          <section className="lg:col-span-2 bg-white rounded-3xl border-2 border-slate-100 p-6 sm:p-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Formule actuelle</h2>
            {!ready ? (
              <Loader2 className="mt-4 h-6 w-6 animate-spin text-[#050FA0]" />
            ) : !entitlements ? (
              <p className="mt-3 text-slate-700">Les abonnements ne sont pas encore activés sur la plateforme : toutes les fonctionnalités sont accessibles.</p>
            ) : (
              <>
                <p className="mt-2 text-3xl font-bold text-slate-900 flex items-center gap-2">
                  {source !== "gratuit" && <Crown className="h-7 w-7 text-amber-500" />}
                  {source === "essai" ? "Essai Premium" : entitlements.plan_name}
                </p>
                {source === "essai" && left !== null && (
                  <p className="mt-2 text-slate-700">Il vous reste <span className="font-bold">{left} jour{left > 1 ? "s" : ""}</span> d&apos;essai gratuit (jusqu&apos;au {fmtDate(entitlements.ends_at!)}).</p>
                )}
                {source === "abonnement" && entitlements.ends_at && (
                  <p className="mt-2 text-slate-700">Actif jusqu&apos;au <span className="font-bold">{fmtDate(entitlements.ends_at)}</span>{left !== null ? ` (${left} jour${left > 1 ? "s" : ""})` : ""}. Pas de renouvellement automatique.</p>
                )}
                {source === "gratuit" && (
                  <p className="mt-2 text-slate-700">Les fonctionnalités Premium sont verrouillées. Passez au Premium pour les débloquer.</p>
                )}
              </>
            )}
            <ul className="mt-6 space-y-2.5 border-t pt-5">
              {premium.perks.map((p) => (
                <li key={p} className="flex gap-2 text-sm text-slate-700"><Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> {p}</li>
              ))}
            </ul>
            <Link to={`/pricing?pour=${audience === "company" ? "entreprises" : "candidats"}`} className="mt-5 inline-block text-sm font-bold text-[#050FA0] hover:underline">Comparer les formules</Link>
          </section>

          {/* Paiement */}
          <section className="lg:col-span-3 bg-white rounded-3xl border-2 border-[#E4220F]/30 p-6 sm:p-8 shadow-xl shadow-[#E4220F]/5">
            <h2 className="text-xl font-bold text-slate-900">
              {source === "abonnement" ? "Prolonger mon Premium" : "Passer au Premium"}
            </h2>
            {source === "abonnement" && <p className="text-sm text-slate-600 mt-1">La durée payée s&apos;ajoute à la date de fin actuelle.</p>}

            <form onSubmit={pay} className="mt-6 space-y-5">
              <fieldset>
                <legend className="text-sm font-semibold text-slate-700 mb-2">Durée</legend>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(["month", "year"] as const).map((p) => {
                    const on = period === p;
                    const amount = p === "year" ? premium.price_year_gnf : premium.price_month_gnf;
                    return (
                      <label key={p} className={`cursor-pointer rounded-2xl border-2 p-4 ${on ? "border-[#E4220F] bg-[#E4220F]/5" : "border-slate-200 hover:border-slate-300"}`}>
                        <input type="radio" name="period" value={p} checked={on} onChange={() => setPeriod(p)} className="sr-only" />
                        <span className="block font-bold text-slate-900">{p === "year" ? "1 an" : "1 mois"}</span>
                        <span className="block text-2xl font-bold text-slate-900 mt-1 tabular-nums">{gnf(amount)}</span>
                        {p === "year" && saving > 0 && <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">Vous économisez {gnf(saving)}</span>}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><Smartphone className="h-4 w-4" /> Numéro qui va payer</span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="622 00 00 00"
                  className="mt-1.5 w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#050FA0] outline-none text-lg"
                />
                <span className="block text-xs text-slate-500 mt-1">Orange Money ou MTN MoMo. Vous pourrez aussi choisir la carte bancaire sur la page de paiement.</span>
              </label>

              {error && <p role="alert" className="flex gap-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl px-4 py-3"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {error}</p>}

              <button type="submit" disabled={busy} className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-[#E4220F] to-[#F92813] text-white text-lg font-bold shadow-xl shadow-[#E4220F]/30 disabled:opacity-60">
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Crown className="h-5 w-5" />}
                Payer {gnf(price)}
              </button>
              <p className="text-xs text-center text-slate-500">Vous serez redirigé vers la page sécurisée de Djomy, puis ramené sur ProJob AI. Le Premium est activé dès la confirmation du paiement.</p>
            </form>
          </section>
        </div>

        {/* Historique */}
        <section className="mt-8 bg-white rounded-3xl border-2 border-slate-100 p-6 sm:p-8 overflow-x-auto">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4"><Receipt className="h-5 w-5 text-[#050FA0]" /> Mes paiements</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun paiement pour le moment.</p>
          ) : (
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2 pr-3 font-semibold">Date</th>
                  <th className="py-2 px-3 font-semibold">Durée</th>
                  <th className="py-2 px-3 font-semibold text-right">Montant</th>
                  <th className="py-2 px-3 font-semibold">Moyen</th>
                  <th className="py-2 pl-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-3">{fmtDate(p.paid_at || p.created_at)}<span className="block text-xs text-slate-400">{p.order_id}</span></td>
                    <td className="py-2.5 px-3">{p.period === "year" ? "1 an" : "1 mois"}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{gnf(p.amount_gnf)}</td>
                    <td className="py-2.5 px-3">{({ OM: "Orange Money", MOMO: "MTN MoMo", CARD: "Carte" } as Record<string, string>)[p.payment_method || ""] || p.payment_method || "—"}</td>
                    <td className="py-2.5 pl-3"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS[p.status]?.cls || ""}`}>{STATUS[p.status]?.label || p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-4 text-xs text-slate-500 flex gap-1.5"><CalendarClock className="h-3.5 w-3.5 shrink-0 mt-0.5" /> Un rappel vous est envoyé 3 jours avant la fin de votre abonnement.</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
