import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CheckCircle2, Loader2, XCircle, Clock } from "lucide-react";
import AppNavHeader from "../components/AppNavHeader";
import { useAuth } from "../contexts/AuthContext";
import { usePlan } from "../contexts/PlanContext";
import { checkPayment, gnf } from "../../lib/billing";

type State = "checking" | "success" | "failed" | "pending";

/** Retour du portail Djomy : on vérifie le paiement auprès du serveur (jamais d'après l'URL seule). */
export default function PaymentReturn() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { refresh } = usePlan();
  const order = params.get("order") || "";
  const [state, setState] = useState<State>("checking");
  const [amount, setAmount] = useState<number | null>(null);
  const tries = useRef(0);

  useEffect(() => {
    if (!order) { setState("failed"); return; }
    let stop = false;
    const tick = async () => {
      tries.current++;
      try {
        const r = await checkPayment(order);
        if (stop) return;
        setAmount(r.amount_gnf);
        if (r.status === "success") { setState("success"); void refresh(); return; }
        if (["failed", "cancelled", "timeout"].includes(r.status)) { setState("failed"); return; }
      } catch { /* on réessaie */ }
      if (stop) return;
      if (tries.current >= 40) { setState("pending"); return; }
      window.setTimeout(tick, 3000);
    };
    void tick();
    return () => { stop = true; };
  }, [order, refresh]);

  const home = user?.type === "company" ? "/company/dashboard" : "/dashboard";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppNavHeader backTo="/abonnement" backLabel="Mon abonnement" />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border-2 border-slate-100 shadow-xl p-8 text-center" role="status" aria-live="polite">
          {state === "checking" && (
            <>
              <Loader2 className="h-14 w-14 animate-spin text-[#050FA0] mx-auto" />
              <h1 className="mt-5 text-2xl font-bold">Vérification du paiement…</h1>
              <p className="mt-2 text-slate-600">Si vous payez par Orange Money ou MTN, validez la demande sur votre téléphone. Cette page se met à jour toute seule.</p>
            </>
          )}
          {state === "success" && (
            <>
              <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto" />
              <h1 className="mt-5 text-2xl font-bold">Premium activé !</h1>
              <p className="mt-2 text-slate-600">{amount ? `Paiement de ${gnf(amount)} confirmé. ` : ""}Toutes les fonctionnalités Premium sont débloquées.</p>
              <Link to={home} className="mt-6 inline-block px-6 py-3 rounded-xl bg-[#050FA0] text-white font-bold">Aller au tableau de bord</Link>
            </>
          )}
          {state === "failed" && (
            <>
              <XCircle className="h-16 w-16 text-red-600 mx-auto" />
              <h1 className="mt-5 text-2xl font-bold">Paiement non abouti</h1>
              <p className="mt-2 text-slate-600">Le paiement a été annulé, a échoué ou a expiré. Aucun abonnement n&apos;a été activé.</p>
              <Link to="/abonnement" className="mt-6 inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-[#E4220F] to-[#F92813] text-white font-bold">Réessayer</Link>
            </>
          )}
          {state === "pending" && (
            <>
              <Clock className="h-16 w-16 text-amber-500 mx-auto" />
              <h1 className="mt-5 text-2xl font-bold">Paiement en attente</h1>
              <p className="mt-2 text-slate-600">Djomy n&apos;a pas encore confirmé le paiement. Dès la confirmation, votre Premium sera activé et vous recevrez une notification.</p>
              <Link to="/abonnement" className="mt-6 inline-block px-6 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-700">Mon abonnement</Link>
            </>
          )}
          {order && <p className="mt-6 text-xs text-slate-400">Référence : {order}</p>}
        </div>
      </main>
    </div>
  );
}
