import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Users, CalendarCheck, Inbox, UserCheck, FileWarning, Hourglass, Loader2, UserPlus, Smartphone, ArrowRight } from "lucide-react";
import HrShell, { useWorkspace, card, btnPrimary, btnGhost, btnAccent, Pill } from "./HrShell";
import { hr, hrErrorMessage, fmtDate, type HrDashboard as Dash } from "../../../lib/hr";

function Kpi({ icon: Icon, label, value, to, tone = "blue" }: { icon: typeof Users; label: string; value: number | string; to?: string; tone?: "blue" | "red" | "green" | "amber" }) {
  const tones = { blue: "bg-[#050FA0]/10 text-[#050FA0]", red: "bg-[#E4220F]/10 text-[#E4220F]", green: "bg-emerald-100 text-emerald-700", amber: "bg-amber-100 text-amber-700" };
  const body = (
    <div className={`${card} p-5 h-full flex items-center gap-4 ${to ? "hover:border-[#050FA0]/40 transition-colors" : ""}`}>
      <span className={`h-12 w-12 rounded-xl grid place-items-center shrink-0 ${tones[tone]}`}><Icon className="h-6 w-6" /></span>
      <div className="min-w-0">
        <p className="text-3xl font-bold text-slate-900 tabular-nums leading-none">{value}</p>
        <p className="text-sm text-slate-600 mt-1">{label}</p>
      </div>
    </div>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

function DashboardBody() {
  const ws = useWorkspace();
  const [d, setD] = useState<Dash | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    hr.dashboard(ws.company_id).then(setD, (e) => setError(hrErrorMessage(e)));
  }, [ws.company_id]);
  useEffect(load, [load]);

  if (error) return <p role="alert" className="text-red-700">{error}</p>;
  if (!d) return <div className="py-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#050FA0]" /></div>;

  if (d.headcount === 0) {
    return (
      <div className={`${card} p-8 sm:p-10 text-center max-w-2xl mx-auto`}>
        <span className="mx-auto h-14 w-14 rounded-2xl bg-[#050FA0]/10 text-[#050FA0] grid place-items-center"><UserPlus className="h-7 w-7" /></span>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">Ajoutez votre premier employé</h2>
        <p className="mt-2 text-slate-600">Créez les fiches de votre équipe, ou embauchez directement un candidat retenu depuis son dossier de candidature.</p>
        <ol className="mt-6 text-left text-sm text-slate-700 space-y-2 max-w-md mx-auto list-decimal list-inside">
          <li>Créez vos services dans <Link to="/rh/parametres" className="text-[#050FA0] font-semibold underline">Paramètres</Link>.</li>
          <li>Ajoutez les employés avec leur responsable direct.</li>
          <li>Les employés qui ont un compte ProJob demandent leurs congés en ligne ou sur WhatsApp.</li>
        </ol>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/rh/employes?nouveau=1" className={btnPrimary}><UserPlus className="h-4 w-4" /> Ajouter un employé</Link>
          <Link to="/company/dashboard" className={btnGhost}>Mes candidatures</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Users} label="Employés en poste" value={d.headcount} to="/rh/employes" />
        <Kpi icon={CalendarCheck} label="Absents aujourd'hui" value={d.on_leave_today} to="/rh/conges" tone="amber" />
        <Kpi icon={Inbox} label="Demandes de congé en cours" value={d.pending_requests} to="/rh/conges" tone="red" />
        <Kpi icon={UserCheck} label="Employés avec un compte ProJob" value={`${d.with_account} / ${d.headcount}`} tone="green" />
      </div>

      {d.to_approve > 0 && (
        <Link to="/rh/conges" className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[#E4220F]/30 bg-[#E4220F]/5 px-5 py-4 text-slate-800 hover:bg-[#E4220F]/10">
          <span><span className="font-bold">{d.to_approve} demande{d.to_approve > 1 ? "s" : ""} de congé</span> attend{d.to_approve > 1 ? "ent" : ""} votre approbation.</span>
          <ArrowRight className="h-5 w-5 text-[#E4220F] shrink-0" />
        </Link>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <section className={`${card} p-5`} aria-labelledby="absents">
          <h2 id="absents" className="font-bold text-slate-900 flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-amber-600" /> Absents aujourd&apos;hui</h2>
          {d.absent_today.length === 0 ? <p className="mt-3 text-sm text-slate-500">Toute l&apos;équipe est présente.</p> : (
            <ul className="mt-3 divide-y">
              {d.absent_today.map((a) => (
                <li key={a.employee_id + a.end_date} className="py-2.5 text-sm">
                  <Link to={`/rh/employes/${a.employee_id}`} className="font-semibold text-slate-900 hover:text-[#050FA0]">{a.name}</Link>
                  <span className="block text-slate-500">{a.type} · retour après le {fmtDate(a.end_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${card} p-5`} aria-labelledby="contrats">
          <h2 id="contrats" className="font-bold text-slate-900 flex items-center gap-2"><FileWarning className="h-5 w-5 text-[#E4220F]" /> Contrats qui finissent (30 jours)</h2>
          {d.contracts_ending.length === 0 ? <p className="mt-3 text-sm text-slate-500">Aucun contrat n&apos;arrive à échéance.</p> : (
            <ul className="mt-3 divide-y">
              {d.contracts_ending.map((c) => (
                <li key={c.employee_id + c.end_date} className="py-2.5 text-sm flex items-center justify-between gap-2">
                  <Link to={`/rh/employes/${c.employee_id}`} className="font-semibold text-slate-900 hover:text-[#050FA0]">{c.name}</Link>
                  <Pill cls="bg-red-100 text-red-700">{c.contract_type} · {fmtDate(c.end_date)}</Pill>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${card} p-5`} aria-labelledby="essais">
          <h2 id="essais" className="font-bold text-slate-900 flex items-center gap-2"><Hourglass className="h-5 w-5 text-sky-600" /> Fins de période d&apos;essai (30 jours)</h2>
          {d.trials_ending.length === 0 ? <p className="mt-3 text-sm text-slate-500">Aucune période d&apos;essai ne se termine.</p> : (
            <ul className="mt-3 divide-y">
              {d.trials_ending.map((t) => (
                <li key={t.employee_id} className="py-2.5 text-sm flex items-center justify-between gap-2">
                  <Link to={`/rh/employes/${t.employee_id}`} className="font-semibold text-slate-900 hover:text-[#050FA0]">{t.name}</Link>
                  <Pill cls="bg-sky-100 text-sky-800">{fmtDate(t.trial_end_date)}</Pill>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {d.with_account < d.headcount && (
        <p className="flex gap-3 rounded-2xl bg-white border-2 border-slate-100 p-4 text-sm text-slate-700">
          <Smartphone className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>
            {d.headcount - d.with_account} employé{d.headcount - d.with_account > 1 ? "s n'ont" : " n'a"} pas encore de compte ProJob. Invitez-les à en créer un gratuitement sur projobai.com avec l&apos;e-mail de leur fiche :
            ils pourront alors demander leurs congés en ligne ou en écrivant au bot WhatsApp ProJob AI.
          </span>
        </p>
      )}
    </div>
  );
}

export default function HrDashboardPage() {
  return (
    <HrShell title="Tableau de bord RH" actions={<Link to="/rh/employes?nouveau=1" className={btnAccent}><UserPlus className="h-4 w-4" /> Ajouter un employé</Link>}>
      <DashboardBody />
    </HrShell>
  );
}

