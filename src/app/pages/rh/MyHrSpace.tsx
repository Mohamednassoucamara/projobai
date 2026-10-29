import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Loader2, CalendarPlus, Briefcase, Building2, Users, MessageCircle, ArrowRight, Inbox, FileText, Download } from "lucide-react";
import DashboardHeader from "../../components/DashboardHeader";
import Footer from "../../components/Footer";
import { card, btnPrimary, btnAccent, Modal, Pill } from "./HrShell";
import { LeaveForm, DecisionButtons } from "./HrForms";
import { botWhatsAppUrl } from "../../../lib/whatsapp";
import {
  hr, hrErrorMessage, fmtDate, fmtDays, fmtPeriod, fullName, LEAVE_STATUS, ROLE_LABELS, today,
  type Contract, type Employee, type LeaveBalance, type LeaveRequest, type LeaveType, type Workspace,
} from "../../../lib/hr";
import { payroll, payslipsPdf, monthLabel, money, type Payslip } from "../../../lib/payroll";

/** Bulletins de paie clôturés de l'employé (masqué tant qu'aucun bulletin n'existe). */
function MyPayslips({ ws }: { ws: Workspace }) {
  const [rows, setRows] = useState<Payslip[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    if (ws.employee_id) payroll.myPayslips(ws.employee_id).then(setRows, () => setRows([]));
  }, [ws.employee_id]);
  if (rows.length === 0) return null;
  const pdf = async (p: Payslip) => {
    setBusy(p.id);
    try {
      const period = p.payroll_runs?.period || "";
      await payslipsPdf({ name: ws.company_name }, period, [p], p.payroll_runs?.settings, `bulletin-${period.slice(0, 7)}.pdf`);
    } finally { setBusy(null); }
  };
  return (
    <div className={`${card} p-5`}>
      <h3 className="font-bold text-slate-900 flex items-center gap-2"><FileText className="h-5 w-5 text-[#050FA0]" /> Mes bulletins de paie</h3>
      <ul className="mt-3 divide-y">
        {rows.map((p) => (
          <li key={p.id} className="py-3 flex items-center justify-between gap-3 text-sm">
            <span><span className="font-semibold text-slate-900 capitalize">{monthLabel(p.payroll_runs?.period || "")}</span>
              <span className="block text-slate-600">Net payé : <span className="font-semibold tabular-nums">{money(p.net)}</span></span></span>
            <button type="button" onClick={() => void pdf(p)} disabled={busy === p.id} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-slate-200 font-bold text-slate-700 hover:border-[#050FA0] hover:text-[#050FA0] disabled:opacity-60">
              {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Espace d'un employé dans une entreprise : ses congés, son contrat, et l'équipe s'il est responsable. */
function CompanySpace({ ws }: { ws: Workspace }) {
  const [me, setMe] = useState<Employee | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [mine, setMine] = useState<LeaveRequest[]>([]);
  const [team, setTeam] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState("");

  const load = useCallback(async () => {
    if (!ws.employee_id) return;
    try {
      const [e, c, t, b, reqs] = await Promise.all([
        hr.employee(ws.employee_id), hr.contracts(ws.employee_id), hr.leaveTypes(ws.company_id),
        hr.balances(ws.employee_id), hr.leaveRequests(ws.company_id, {}),
      ]);
      setMe(e); setContract(c.find((x) => x.is_current) || null); setTypes(t); setBalances(b);
      setMine(reqs.filter((r) => r.employee_id === ws.employee_id));
      setTeam(reqs.filter((r) => r.employee_id !== ws.employee_id));
    } catch (err) { setError(hrErrorMessage(err)); }
    setLoading(false);
  }, [ws.employee_id, ws.company_id]);
  useEffect(() => { void load(); }, [load]);

  if (!ws.enabled) {
    return (
      <section className={`${card} p-6`}>
        <h2 className="text-xl font-bold text-slate-900">{ws.company_name}</h2>
        <p className="mt-2 text-slate-600">L&apos;espace RH de votre entreprise est momentanément indisponible (abonnement ProJob+ inactif). Contactez votre service RH.</p>
      </section>
    );
  }
  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#050FA0]" /></div>;
  if (error) return <p role="alert" className="text-red-700">{error}</p>;
  if (!me) return null;

  const annual = balances.find((b) => b.deducts_balance);
  const toDecide = team.filter((r) => r.status === "en_attente");
  const upcomingTeam = team.filter((r) => r.status === "approuvee" && r.end_date >= today()).slice(0, 8);

  const cancel = async (r: LeaveRequest) => {
    if (!window.confirm(`Annuler votre demande ${fmtPeriod(r.start_date, r.end_date)} ?`)) return;
    try { await hr.cancelLeave(r.id); void load(); } catch (err) { setError(hrErrorMessage(err)); }
  };

  return (
    <section className="space-y-5" aria-label={ws.company_name}>
      <div className={`${card} p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-4 min-w-0">
          <span className="h-14 w-14 rounded-2xl bg-[#050FA0]/10 text-[#050FA0] grid place-items-center shrink-0"><Building2 className="h-7 w-7" /></span>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900 truncate">{ws.company_name}</h2>
            <p className="text-slate-600">{me.job_title || "—"} · depuis le {fmtDate(me.hire_date, true)}</p>
            {ws.role && <Pill cls="mt-1 bg-slate-100 text-slate-700">{ROLE_LABELS[ws.role]}</Pill>}
          </div>
        </div>
        <button type="button" onClick={() => setOpen(true)} className={btnAccent}><CalendarPlus className="h-4 w-4" /> Demander un congé</button>
      </div>

      {flash && <p role="status" className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{flash}</p>}

      <div className="grid md:grid-cols-3 gap-4">
        <div className={`${card} p-5`}>
          <p className="text-sm text-slate-600">{annual?.name || "Congé annuel"} disponible</p>
          <p className="mt-1 text-3xl font-bold text-[#050FA0] tabular-nums">{annual ? fmtDays(annual.available) : "—"}</p>
          {annual && <p className="mt-1 text-xs text-slate-500">Acquis {fmtDays(annual.acquired)} · pris {fmtDays(annual.taken)}{Number(annual.pending) ? ` · en attente ${fmtDays(annual.pending)}` : ""}</p>}
        </div>
        <div className={`${card} p-5`}>
          <p className="text-sm text-slate-600 flex items-center gap-1.5"><Briefcase className="h-4 w-4" /> Contrat</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{contract?.contract_type || "—"}</p>
          {contract && <p className="mt-1 text-xs text-slate-500">Depuis le {fmtDate(contract.start_date)}{contract.end_date ? ` · jusqu'au ${fmtDate(contract.end_date)}` : ""}{contract.trial_end_date && contract.trial_end_date >= today() ? ` · essai jusqu'au ${fmtDate(contract.trial_end_date)}` : ""}</p>}
        </div>
        <a href={botWhatsAppUrl("Je veux demander un congé")} target="_blank" rel="noopener noreferrer" className={`${card} p-5 hover:border-emerald-300 block`}>
          <p className="text-sm text-slate-600 flex items-center gap-1.5"><MessageCircle className="h-4 w-4 text-emerald-600" /> Aussi sur WhatsApp</p>
          <p className="mt-1 font-bold text-slate-900">Écrivez au bot ProJob AI</p>
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">Solde, demandes de congé et suivi <ArrowRight className="h-3 w-3" /></p>
        </a>
      </div>

      {(toDecide.length > 0 || ws.role === "manager") && (
        <div className={`${card} p-5`}>
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><Inbox className="h-5 w-5 text-[#E4220F]" /> Demandes de mon équipe à valider ({toDecide.length})</h3>
          {toDecide.length === 0 ? <p className="mt-2 text-sm text-slate-500">Rien à valider pour l&apos;instant.</p> : (
            <ul className="mt-3 divide-y">
              {toDecide.map((r) => (
                <li key={r.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{r.hr_employees ? fullName(r.hr_employees) : "—"} <span className="font-normal text-slate-500">· {r.hr_leave_types?.name}</span></p>
                    <p className="text-sm text-slate-700">{fmtPeriod(r.start_date, r.end_date)} · {fmtDays(r.days)}{r.reason ? ` · « ${r.reason} »` : ""}</p>
                  </div>
                  <div className="md:w-72 shrink-0"><DecisionButtons requestId={r.id} onDone={() => void load()} /></div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-500">Après votre accord, les RH donnent la validation finale.</p>
          {upcomingTeam.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Users className="h-4 w-4" /> Absences à venir dans l&apos;équipe</h4>
              <ul className="mt-2 text-sm text-slate-700 space-y-1">
                {upcomingTeam.map((r) => <li key={r.id}>{r.hr_employees ? fullName(r.hr_employees) : "—"} · {fmtPeriod(r.start_date, r.end_date)}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className={`${card} p-5`}>
        <h3 className="font-bold text-slate-900">Mes demandes</h3>
        {mine.length === 0 ? <p className="mt-2 text-sm text-slate-500">Vous n&apos;avez encore fait aucune demande.</p> : (
          <ul className="mt-3 divide-y">
            {mine.map((r) => (
              <li key={r.id} className="py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <span className="font-semibold text-slate-900">{r.hr_leave_types?.name}</span>
                  <span className="block text-slate-600">{fmtPeriod(r.start_date, r.end_date)} · {fmtDays(r.days)}</span>
                  {r.decision_note && <span className="block text-xs text-slate-500">Note : {r.decision_note}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Pill cls={LEAVE_STATUS[r.status].cls}>{LEAVE_STATUS[r.status].label}</Pill>
                  {(r.status === "en_attente" || r.status === "validee_responsable" || (r.status === "approuvee" && r.start_date > today())) && (
                    <button type="button" onClick={() => cancel(r)} className="text-xs font-semibold text-slate-500 hover:text-red-700 underline">Annuler</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MyPayslips ws={ws} />

      {open && (
        <Modal title="Demander un congé" onClose={() => setOpen(false)}>
          <LeaveForm
            companyId={ws.company_id} types={types} employeeId={ws.employee_id || undefined} balances={balances}
            onCancel={() => setOpen(false)}
            onSaved={(r) => {
              setOpen(false);
              setFlash(r.status === "en_attente" ? "Demande envoyée à votre responsable." : "Demande envoyée aux RH.");
              void load();
            }}
          />
        </Modal>
      )}
    </section>
  );
}

export default function MyHrSpace() {
  const [list, setList] = useState<Workspace[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { hr.workspaces().then(setList, (e) => { setError(hrErrorMessage(e)); setList([]); }); }, []);

  const asEmployee = (list || []).filter((w) => w.employee_id);
  const asStaff = (list || []).filter((w) => w.role === "admin" || w.role === "rh");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardHeader />
      <main className="page-container py-6 sm:py-10 flex-1 w-full space-y-6">
        <div>
          <p className="text-sm font-bold text-[#E4220F]">ProJob+</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Mon espace employé</h1>
        </div>
        {list === null ? <div className="py-16 flex justify-center"><Loader2 className="h-9 w-9 animate-spin text-[#050FA0]" /></div>
          : error ? <p role="alert" className="text-red-700">{error}</p>
          : (
            <>
              {asStaff.length > 0 && (
                <Link to="/rh" className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[#050FA0]/20 bg-white px-5 py-4 hover:border-[#050FA0]">
                  <span><span className="font-bold text-slate-900">Gestion RH</span> <span className="text-slate-600">· {asStaff.map((w) => w.company_name).join(", ")}</span></span>
                  <ArrowRight className="h-5 w-5 text-[#050FA0]" />
                </Link>
              )}
              {asEmployee.length === 0 && asStaff.length === 0 && (
                <div className={`${card} p-8 text-center max-w-xl mx-auto`}>
                  <Building2 className="h-10 w-10 text-slate-400 mx-auto" />
                  <h2 className="mt-3 text-xl font-bold text-slate-900">Aucune entreprise reliée</h2>
                  <p className="mt-2 text-slate-600">Votre espace employé s&apos;ouvre dès que votre entreprise vous ajoute dans ProJob+ avec l&apos;adresse e-mail de ce compte.</p>
                  <Link to="/dashboard" className={`${btnPrimary} mt-5`}>Mon tableau de bord</Link>
                </div>
              )}
              {asEmployee.map((w) => <CompanySpace key={w.company_id} ws={w} />)}
            </>
          )}
      </main>
      <Footer />
    </div>
  );
}
