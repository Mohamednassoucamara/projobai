import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Loader2, ChevronLeft, ChevronRight, Wallet, Lock, Unlock, FileDown, FileSpreadsheet, Settings2, Plus, Trash2, RefreshCw, Pencil, CheckCircle2,
} from "lucide-react";
import HrShell, { useWorkspace, card, btnPrimary, btnAccent, btnGhost, field, Modal, ErrorNote, Pill, Label } from "./HrShell";
import {
  payroll, payrollErrorMessage, monthLabel, monthStart, money, payslipsPdf, exportPayrollBook, exportCnss, exportRts,
  type Bonus, type Deduction, type PayrollRun, type PayrollSettings, type Payslip,
} from "../../../lib/payroll";

const shiftMonth = (period: string, delta: number) => {
  const [y, m] = period.split("-").map(Number);
  return monthStart(new Date(y, m - 1 + delta, 1));
};
const toNum = (v: string) => Number(String(v).replace(/[\s  ]/g, "").replace(",", ".")) || 0;

// ---------------------------------------------------------------------------
// Fiche de saisie d'un bulletin

function PayslipEditor({ slip, closed, onSaved, onRemove, onClose }: {
  slip: Payslip; closed: boolean; onSaved: (p: Payslip) => void; onRemove: () => void; onClose: () => void;
}) {
  const [f, setF] = useState({
    base_salary: String(slip.base_salary || ""),
    unpaid_days: String(Number(slip.unpaid_days) || ""),
    ot_weekday_hours: String(Number(slip.ot_weekday_hours) || ""),
    ot_sunday_hours: String(Number(slip.ot_sunday_hours) || ""),
    ot_night_hours: String(Number(slip.ot_night_hours) || ""),
    ot_holiday_hours: String(Number(slip.ot_holiday_hours) || ""),
    note: slip.note || "",
  });
  const [bonuses, setBonuses] = useState<Bonus[]>(slip.bonuses || []);
  const [deductions, setDeductions] = useState<Deduction[]>(slip.deductions || []);
  const [current, setCurrent] = useState(slip);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); setSaved(false); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const p = await payroll.updatePayslip(slip.id, {
        base_salary: toNum(f.base_salary), unpaid_days: toNum(f.unpaid_days),
        ot_weekday_hours: toNum(f.ot_weekday_hours), ot_sunday_hours: toNum(f.ot_sunday_hours),
        ot_night_hours: toNum(f.ot_night_hours), ot_holiday_hours: toNum(f.ot_holiday_hours),
        bonuses: bonuses.filter((b) => b.label.trim() && Number(b.amount)).map((b) => ({ ...b, label: b.label.trim(), amount: Number(b.amount) })),
        deductions: deductions.filter((d) => d.label.trim() && Number(d.amount)).map((d) => ({ label: d.label.trim(), amount: Number(d.amount) })),
        note: f.note.trim() || null,
      });
      setCurrent(p); setSaved(true); onSaved(p);
    } catch (err) { setError(payrollErrorMessage(err)); }
    setBusy(false);
  };

  const s = current.snapshot;
  const dis = closed;
  return (
    <form onSubmit={save} className="space-y-5">
      <p className="text-sm text-slate-600">{s?.job_title || "—"}{s?.matricule ? ` · matricule ${s.matricule}` : ""}{s?.department ? ` · ${s.department}` : ""}</p>

      <fieldset disabled={dis} className="grid sm:grid-cols-2 gap-4">
        <legend className="sr-only">Salaire et absences</legend>
        <Label text="Salaire de base (GNF)" hint="Repris du contrat en cours ; modifiable pour ce mois.">
          <input inputMode="numeric" value={f.base_salary} onChange={set("base_salary")} className={field} />
        </Label>
        <Label text="Jours d'absence non payés" hint={`Sur ${Number(current.month_working_days)} jours ouvrés ce mois. Les congés sans solde approuvés sont repris automatiquement.`}>
          <input inputMode="decimal" value={f.unpaid_days} onChange={set("unpaid_days")} className={field} />
        </Label>
      </fieldset>

      <fieldset disabled={dis} className="border-t pt-4">
        <legend className="text-sm font-bold text-slate-800 pt-4">Heures supplémentaires (nombre d&apos;heures)</legend>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Label text="Semaine"><input inputMode="decimal" value={f.ot_weekday_hours} onChange={set("ot_weekday_hours")} className={field} /></Label>
          <Label text="Dimanche"><input inputMode="decimal" value={f.ot_sunday_hours} onChange={set("ot_sunday_hours")} className={field} /></Label>
          <Label text="Nuit"><input inputMode="decimal" value={f.ot_night_hours} onChange={set("ot_night_hours")} className={field} /></Label>
          <Label text="Jour férié"><input inputMode="decimal" value={f.ot_holiday_hours} onChange={set("ot_holiday_hours")} className={field} /></Label>
        </div>
      </fieldset>

      <fieldset disabled={dis} className="border-t pt-4">
        <legend className="text-sm font-bold text-slate-800 pt-4">Primes et indemnités</legend>
        <div className="mt-2 space-y-2">
          {bonuses.map((b, i) => (
            <div key={i} className="grid grid-cols-[1fr_120px_auto] sm:grid-cols-[1fr_140px_auto_auto_auto] gap-2 items-center">
              <input aria-label="Libellé de la prime" value={b.label} placeholder="Ex. : Prime de transport" onChange={(e) => { const n = [...bonuses]; n[i] = { ...b, label: e.target.value }; setBonuses(n); setSaved(false); }} className={field} />
              <input aria-label="Montant" inputMode="numeric" value={b.amount || ""} onChange={(e) => { const n = [...bonuses]; n[i] = { ...b, amount: toNum(e.target.value) }; setBonuses(n); setSaved(false); }} className={field} />
              <label className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap"><input type="checkbox" checked={b.taxable !== false} onChange={(e) => { const n = [...bonuses]; n[i] = { ...b, taxable: e.target.checked }; setBonuses(n); setSaved(false); }} className="h-4 w-4 accent-[#050FA0]" /> Imposable</label>
              <label className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap"><input type="checkbox" checked={b.cnss !== false} onChange={(e) => { const n = [...bonuses]; n[i] = { ...b, cnss: e.target.checked }; setBonuses(n); setSaved(false); }} className="h-4 w-4 accent-[#050FA0]" /> CNSS</label>
              <button type="button" onClick={() => { setBonuses(bonuses.filter((_, k) => k !== i)); setSaved(false); }} className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700" aria-label="Retirer la prime"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {!dis && <button type="button" onClick={() => setBonuses([...bonuses, { label: "", amount: 0, taxable: true, cnss: true }])} className="text-sm font-bold text-[#050FA0] inline-flex items-center gap-1"><Plus className="h-4 w-4" /> Ajouter une prime</button>}
        </div>
      </fieldset>

      <fieldset disabled={dis} className="border-t pt-4">
        <legend className="text-sm font-bold text-slate-800 pt-4">Retenues (avances, prêts…)</legend>
        <div className="mt-2 space-y-2">
          {deductions.map((d, i) => (
            <div key={i} className="grid grid-cols-[1fr_120px_auto] sm:grid-cols-[1fr_140px_auto] gap-2 items-center">
              <input aria-label="Libellé de la retenue" value={d.label} placeholder="Ex. : Avance sur salaire" onChange={(e) => { const n = [...deductions]; n[i] = { ...d, label: e.target.value }; setDeductions(n); setSaved(false); }} className={field} />
              <input aria-label="Montant" inputMode="numeric" value={d.amount || ""} onChange={(e) => { const n = [...deductions]; n[i] = { ...d, amount: toNum(e.target.value) }; setDeductions(n); setSaved(false); }} className={field} />
              <button type="button" onClick={() => { setDeductions(deductions.filter((_, k) => k !== i)); setSaved(false); }} className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700" aria-label="Retirer la retenue"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {!dis && <button type="button" onClick={() => setDeductions([...deductions, { label: "", amount: 0 }])} className="text-sm font-bold text-[#050FA0] inline-flex items-center gap-1"><Plus className="h-4 w-4" /> Ajouter une retenue</button>}
        </div>
      </fieldset>

      <fieldset disabled={dis} className="border-t pt-4">
        <Label text="Note sur le bulletin"><textarea rows={2} value={f.note} onChange={set("note")} className={field} /></Label>
      </fieldset>

      <div className="rounded-2xl bg-slate-50 border-2 border-slate-100 p-4 text-sm grid grid-cols-2 gap-x-6 gap-y-1.5 tabular-nums" aria-live="polite">
        <span className="text-slate-600">Brut</span><span className="text-right font-semibold">{money(current.gross)}</span>
        <span className="text-slate-600">CNSS salarié</span><span className="text-right">− {money(current.cnss_employee)}</span>
        <span className="text-slate-600">RTS</span><span className="text-right">− {money(current.rts)}</span>
        {Number(current.deductions_total) > 0 && <><span className="text-slate-600">Retenues</span><span className="text-right">− {money(current.deductions_total)}</span></>}
        <span className="font-bold text-slate-900 border-t pt-1.5">Net à payer</span><span className={`text-right font-bold border-t pt-1.5 ${current.net < 0 ? "text-red-700" : "text-[#050FA0]"}`}>{money(current.net)}</span>
        <span className="text-xs text-slate-500">Coût employeur</span><span className="text-right text-xs text-slate-500">{money(current.employer_cost)}</span>
      </div>
      {!dis && <p className="text-xs text-slate-500">Les montants se recalculent à l&apos;enregistrement.</p>}

      <ErrorNote>{error}</ErrorNote>
      {saved && <p role="status" className="text-sm text-emerald-700 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Bulletin enregistré.</p>}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
        {!dis ? (
          <button type="button" onClick={onRemove} className="text-sm font-semibold text-slate-500 hover:text-red-700 underline self-start sm:self-center">Retirer de cette paie</button>
        ) : <span />}
        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <button type="button" onClick={onClose} className={btnGhost}>Fermer</button>
          {!dis && <button type="submit" disabled={busy} className={btnPrimary}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer et recalculer</button>}
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Paramètres de paie

function SettingsForm({ companyId, initial, onSaved, onClose }: { companyId: string; initial: PayrollSettings; onSaved: (s: PayrollSettings) => void; onClose: () => void }) {
  const [s, setS] = useState(initial);
  const [brackets, setBrackets] = useState(initial.rts_brackets.map((b) => ({ upto: b.upto === null ? "" : String(b.upto), rate: String(b.rate) })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const num = (k: keyof PayrollSettings) => ({
    value: String(s[k] ?? ""), inputMode: "decimal" as const, className: field,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: e.target.value as unknown as number }),
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const rb = brackets.map((b, i) => ({ upto: i === brackets.length - 1 || !b.upto ? null : toNum(b.upto), rate: toNum(b.rate) }));
    for (let i = 1; i < rb.length - 1; i++) if ((rb[i].upto ?? 0) <= (rb[i - 1].upto ?? 0)) { setError("Les tranches du barème doivent être croissantes."); return; }
    setBusy(true);
    const patch: Partial<PayrollSettings> = {
      cnss_employee_rate: toNum(String(s.cnss_employee_rate)), cnss_employer_rate: toNum(String(s.cnss_employer_rate)),
      cnss_ceiling: toNum(String(s.cnss_ceiling)), cnss_floor: toNum(String(s.cnss_floor)),
      rts_brackets: rb, rts_deduct_cnss: s.rts_deduct_cnss,
      apprenticeship_rate: toNum(String(s.apprenticeship_rate)), other_employer_rate: toNum(String(s.other_employer_rate)),
      overtime_weekday_rate: toNum(String(s.overtime_weekday_rate)), overtime_sunday_rate: toNum(String(s.overtime_sunday_rate)),
      overtime_night_rate: toNum(String(s.overtime_night_rate)), overtime_holiday_rate: toNum(String(s.overtime_holiday_rate)),
      monthly_hours: toNum(String(s.monthly_hours)) || 173.33, cnss_number: (s.cnss_number || "").trim() || null,
    };
    try { await payroll.saveSettings(companyId, patch); onSaved({ ...initial, ...patch }); }
    catch (err) { setError(payrollErrorMessage(err)); setBusy(false); }
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <p className="text-sm text-slate-600">Valeurs par défaut selon la réglementation guinéenne en vigueur à notre connaissance. Faites-les vérifier par votre comptable ; elles s&apos;appliquent aux paies non clôturées.</p>
      <Label text="N° d'immatriculation CNSS de l'entreprise"><input value={s.cnss_number || ""} onChange={(e) => setS({ ...s, cnss_number: e.target.value })} className={field} /></Label>
      <fieldset className="grid grid-cols-2 gap-3 border-t pt-4">
        <legend className="text-sm font-bold text-slate-800 pt-4">CNSS</legend>
        <Label text="Part salariale (%)"><input {...num("cnss_employee_rate")} /></Label>
        <Label text="Part patronale (%)"><input {...num("cnss_employer_rate")} /></Label>
        <Label text="Plafond mensuel (GNF)"><input {...num("cnss_ceiling")} /></Label>
        <Label text="Plancher (SMIG, GNF)"><input {...num("cnss_floor")} /></Label>
      </fieldset>
      <fieldset className="border-t pt-4">
        <legend className="text-sm font-bold text-slate-800 pt-4">Retenue sur traitements et salaires (RTS) : barème mensuel progressif</legend>
        <div className="mt-2 space-y-2">
          {brackets.map((b, i) => (
            <div key={i} className="grid grid-cols-[1fr_90px_auto] gap-2 items-center text-sm">
              {i === brackets.length - 1
                ? <span className="text-slate-600">Au-delà de {brackets[i - 1]?.upto ? Number(toNum(brackets[i - 1].upto)).toLocaleString("fr-FR") : "0"} GNF</span>
                : <label className="flex items-center gap-2"><span className="text-slate-600 whitespace-nowrap">Jusqu&apos;à</span><input aria-label={`Limite de la tranche ${i + 1}`} inputMode="numeric" value={b.upto} onChange={(e) => { const n = [...brackets]; n[i] = { ...b, upto: e.target.value }; setBrackets(n); }} className={field} /></label>}
              <label className="flex items-center gap-1"><input aria-label={`Taux de la tranche ${i + 1}`} inputMode="decimal" value={b.rate} onChange={(e) => { const n = [...brackets]; n[i] = { ...b, rate: e.target.value }; setBrackets(n); }} className={field} /><span>%</span></label>
              {brackets.length > 2 && i < brackets.length - 1
                ? <button type="button" onClick={() => setBrackets(brackets.filter((_, k) => k !== i))} className="p-2 rounded-lg text-slate-500 hover:bg-red-50" aria-label={`Supprimer la tranche ${i + 1}`}><Trash2 className="h-4 w-4" /></button>
                : <span className="w-8" />}
            </div>
          ))}
          <button type="button" onClick={() => setBrackets([...brackets.slice(0, -1), { upto: "", rate: "" }, brackets[brackets.length - 1]])} className="text-sm font-bold text-[#050FA0] inline-flex items-center gap-1"><Plus className="h-4 w-4" /> Ajouter une tranche</button>
          <label className="flex items-center gap-2 text-sm text-slate-700 pt-1"><input type="checkbox" checked={s.rts_deduct_cnss} onChange={(e) => setS({ ...s, rts_deduct_cnss: e.target.checked })} className="h-4 w-4 accent-[#050FA0]" /> Déduire la part salariale CNSS de la base imposable</label>
        </div>
      </fieldset>
      <fieldset className="grid grid-cols-2 gap-3 border-t pt-4">
        <legend className="text-sm font-bold text-slate-800 pt-4">Charges patronales</legend>
        <Label text="Taxe d'apprentissage (%)"><input {...num("apprenticeship_rate")} /></Label>
        <Label text="Autre taxe patronale (%)" hint="Laisser à 0 si non applicable."><input {...num("other_employer_rate")} /></Label>
      </fieldset>
      <fieldset className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t pt-4">
        <legend className="text-sm font-bold text-slate-800 pt-4">Majorations des heures supplémentaires (%)</legend>
        <Label text="Semaine"><input {...num("overtime_weekday_rate")} /></Label>
        <Label text="Dimanche"><input {...num("overtime_sunday_rate")} /></Label>
        <Label text="Nuit"><input {...num("overtime_night_rate")} /></Label>
        <Label text="Jour férié"><input {...num("overtime_holiday_rate")} /></Label>
        <div className="col-span-2"><Label text="Heures mensuelles de référence" hint="40 h × 52 ÷ 12 = 173,33 h"><input {...num("monthly_hours")} /></Label></div>
      </fieldset>
      <ErrorNote>{error}</ErrorNote>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button type="button" onClick={onClose} className={btnGhost}>Annuler</button>
        <button type="submit" disabled={busy} className={btnPrimary}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

function Stat({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`${card} p-4`}>
      <p className="text-xs text-slate-600">{label}</p>
      <p className={`mt-1 font-bold tabular-nums ${strong ? "text-xl text-[#050FA0]" : "text-lg text-slate-900"}`}>{money(value)}</p>
    </div>
  );
}

function Payroll() {
  const ws = useWorkspace();
  const [period, setPeriod] = useState(() => monthStart(new Date()));
  const [run, setRun] = useState<PayrollRun | null | undefined>(undefined);
  const [slips, setSlips] = useState<Payslip[]>([]);
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<Payslip | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await payroll.run(ws.company_id, period);
      setRun(r);
      setSlips(r ? await payroll.payslips(r.id) : []);
    } catch (e) { setError(payrollErrorMessage(e)); setRun(null); setSlips([]); }
  }, [ws.company_id, period]);
  useEffect(() => { setRun(undefined); void load(); }, [load]);
  useEffect(() => { payroll.settings(ws.company_id).then(setSettings, () => undefined); }, [ws.company_id]);

  const closed = run?.status === "cloturee";
  const effSettings = (closed && run?.settings) || settings;
  const totals = useMemo(() => {
    const t = (k: keyof Payslip) => slips.reduce((s, p) => s + Number(p[k] || 0), 0);
    return { gross: t("gross"), net: t("net"), cnss: t("cnss_employee") + t("cnss_employer"), rts: t("rts"), cost: t("employer_cost") };
  }, [slips]);
  const missing = slips.filter((p) => !Number(p.base_salary));

  const act = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key); setError(""); setFlash("");
    try { await fn(); if (ok) setFlash(ok); await load(); }
    catch (e) { setError(payrollErrorMessage(e)); }
    setBusy(null);
  };

  const prepare = () => act("prepare", async () => {
    const r = await payroll.prepare(ws.company_id, period);
    setFlash(r.added ? `${r.added} bulletin${r.added > 1 ? "s" : ""} ajouté${r.added > 1 ? "s" : ""} (${r.working_days} jours ouvrés ce mois).` : "Tous les employés actifs ont déjà leur bulletin.");
  });
  const close = () => {
    if (!run) return;
    if (!window.confirm(`Clôturer la paie de ${monthLabel(period)} ? Les bulletins ne seront plus modifiables et les employés pourront les consulter dans leur espace.`)) return;
    void act("close", () => payroll.close(run.id), "Paie clôturée. Les employés reliés à leur compte ont été prévenus.");
  };
  const reopen = () => {
    if (!run || !window.confirm("Rouvrir cette paie ? Les bulletins redeviennent modifiables et disparaissent de l'espace des employés jusqu'à la nouvelle clôture.")) return;
    void act("reopen", () => payroll.reopen(run.id), "Paie rouverte.");
  };
  const discard = () => {
    if (!run || !window.confirm(`Supprimer le brouillon de paie de ${monthLabel(period)} et tous ses bulletins ?`)) return;
    void act("discard", () => payroll.deleteDraft(run.id), "Brouillon supprimé.");
  };
  const pdfAll = () => act("pdf", () => payslipsPdf({ name: ws.company_name }, period, slips, effSettings));

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPeriod(shiftMonth(period, -1))} className="p-2.5 rounded-xl border-2 border-slate-200 hover:border-[#050FA0]" aria-label="Mois précédent"><ChevronLeft className="h-4 w-4" /></button>
          <h2 className="text-xl font-bold text-slate-900 capitalize min-w-[11rem] text-center">{monthLabel(period)}</h2>
          <button type="button" onClick={() => setPeriod(shiftMonth(period, 1))} className="p-2.5 rounded-xl border-2 border-slate-200 hover:border-[#050FA0]" aria-label="Mois suivant"><ChevronRight className="h-4 w-4" /></button>
          {run && <Pill cls={closed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{closed ? "Clôturée" : "Brouillon"}</Pill>}
        </div>
        <button type="button" onClick={() => setShowSettings(true)} disabled={!settings} className={btnGhost}><Settings2 className="h-4 w-4" /> Paramètres de paie</button>
      </div>

      {flash && <p role="status" className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{flash}</p>}
      <ErrorNote>{error}</ErrorNote>

      {run === undefined ? <div className="py-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#050FA0]" /></div>
        : !run ? (
          <div className={`${card} p-8 text-center`}>
            <Wallet className="h-10 w-10 text-slate-400 mx-auto" />
            <h3 className="mt-3 text-lg font-bold text-slate-900">Pas encore de paie pour {monthLabel(period)}</h3>
            <p className="mt-2 text-slate-600 max-w-lg mx-auto">ProJob+ crée un bulletin pour chaque employé actif, avec le salaire de son contrat en cours et les congés sans solde du mois. Vous ajoutez ensuite primes, heures supplémentaires et avances.</p>
            <button type="button" onClick={() => void prepare()} disabled={busy === "prepare"} className={`${btnAccent} mt-5`}>
              {busy === "prepare" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />} Préparer la paie
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <Stat label="Masse salariale brute" value={totals.gross} />
              <Stat label="Net à payer" value={totals.net} strong />
              <Stat label="CNSS (salarié + employeur)" value={totals.cnss} />
              <Stat label="RTS à reverser" value={totals.rts} />
              <Stat label="Coût employeur" value={totals.cost} />
            </div>

            {!closed && missing.length > 0 && (
              <p className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Salaire de base manquant pour {missing.map((p) => p.snapshot?.name).join(", ")}. Saisissez-le dans le bulletin ou dans le contrat de l&apos;employé.
              </p>
            )}

            <div className={`${card} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[760px]">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr className="text-left">
                      <th className="py-3 px-4 font-semibold">Employé</th>
                      <th className="py-3 px-3 font-semibold text-right">Base</th>
                      <th className="py-3 px-3 font-semibold text-right">Brut</th>
                      <th className="py-3 px-3 font-semibold text-right">CNSS</th>
                      <th className="py-3 px-3 font-semibold text-right">RTS</th>
                      <th className="py-3 px-3 font-semibold text-right">Retenues</th>
                      <th className="py-3 px-3 font-semibold text-right">Net</th>
                      <th className="py-3 px-4"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {slips.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-slate-500">Aucun bulletin. Ajoutez des employés actifs puis cliquez sur « Actualiser la liste ».</td></tr>}
                    {slips.map((p) => (
                      <tr key={p.id} className="border-t hover:bg-slate-50 cursor-pointer" onClick={() => setEditing(p)}>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900">{p.snapshot?.name}</span>
                          <span className="block text-xs text-slate-500">{p.snapshot?.job_title || "—"}</span>
                        </td>
                        <td className={`py-3 px-3 text-right ${!Number(p.base_salary) ? "text-amber-700 font-semibold" : ""}`}>{Number(p.base_salary) ? Math.round(p.base_salary).toLocaleString("fr-FR") : "à saisir"}</td>
                        <td className="py-3 px-3 text-right">{Math.round(p.gross).toLocaleString("fr-FR")}</td>
                        <td className="py-3 px-3 text-right">{Math.round(p.cnss_employee).toLocaleString("fr-FR")}</td>
                        <td className="py-3 px-3 text-right">{Math.round(p.rts).toLocaleString("fr-FR")}</td>
                        <td className="py-3 px-3 text-right">{Math.round(p.deductions_total).toLocaleString("fr-FR")}</td>
                        <td className={`py-3 px-3 text-right font-bold ${p.net < 0 ? "text-red-700" : "text-[#050FA0]"}`}>{Math.round(p.net).toLocaleString("fr-FR")}</td>
                        <td className="py-3 px-4 text-right">
                          <button type="button" onClick={(e) => { e.stopPropagation(); setEditing(p); }} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" aria-label={`${closed ? "Voir" : "Modifier"} le bulletin de ${p.snapshot?.name}`}><Pencil className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-4 py-2.5 text-xs text-slate-500 border-t">Montants en GNF.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {!closed && (
                <>
                  <button type="button" onClick={close} disabled={busy !== null || slips.length === 0} className={btnAccent}>{busy === "close" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Clôturer la paie</button>
                  <button type="button" onClick={() => void prepare()} disabled={busy !== null} className={btnGhost}>{busy === "prepare" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Actualiser la liste</button>
                </>
              )}
              <button type="button" onClick={() => void pdfAll()} disabled={busy !== null || slips.length === 0} className={btnPrimary}>{busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Bulletins PDF</button>
              <button type="button" onClick={() => exportPayrollBook(ws.company_name, run, slips)} disabled={slips.length === 0} className={btnGhost}><FileSpreadsheet className="h-4 w-4" /> Livre de paie</button>
              <button type="button" onClick={() => exportCnss(ws.company_name, run, slips, effSettings)} disabled={slips.length === 0} className={btnGhost}><FileSpreadsheet className="h-4 w-4" /> État CNSS</button>
              <button type="button" onClick={() => exportRts(ws.company_name, run, slips)} disabled={slips.length === 0} className={btnGhost}><FileSpreadsheet className="h-4 w-4" /> État RTS</button>
              {closed && ws.role === "admin" && (
                <button type="button" onClick={reopen} disabled={busy !== null} className={btnGhost}><Unlock className="h-4 w-4" /> Rouvrir</button>
              )}
              {!closed && (
                <button type="button" onClick={discard} disabled={busy !== null} className="text-sm font-semibold text-slate-500 hover:text-red-700 underline px-2">Supprimer le brouillon</button>
              )}
            </div>
            {closed && run.closed_at && <p className="text-xs text-slate-500">Clôturée le {new Date(run.closed_at).toLocaleDateString("fr-FR")}. Les employés reliés à leur compte retrouvent leur bulletin dans <Link to="/mon-espace-rh" className="underline">leur espace employé</Link>.</p>}
          </>
        )}

      <p className="text-xs text-slate-500">Calculs indicatifs selon les paramètres de paie ; à faire valider par votre comptable. Les états CSV s&apos;ouvrent dans Excel.</p>

      {editing && (
        <Modal title={`Bulletin · ${editing.snapshot?.name || ""}`} onClose={() => setEditing(null)} wide>
          <PayslipEditor
            slip={editing} closed={closed}
            onSaved={(p) => setSlips((list) => list.map((x) => (x.id === p.id ? p : x)))}
            onRemove={() => {
              if (!window.confirm(`Retirer ${editing.snapshot?.name} de la paie de ${monthLabel(period)} ?`)) return;
              const id = editing.id;
              setEditing(null);
              void act("remove", () => payroll.removePayslip(id), "Bulletin retiré.");
            }}
            onClose={() => setEditing(null)}
          />
        </Modal>
      )}
      {showSettings && settings && (
        <Modal title="Paramètres de paie" onClose={() => setShowSettings(false)} wide>
          <SettingsForm companyId={ws.company_id} initial={settings} onClose={() => setShowSettings(false)}
            onSaved={(s) => { setSettings(s); setShowSettings(false); setFlash("Paramètres enregistrés. Les paies non clôturées ont été recalculées."); void load(); }} />
        </Modal>
      )}
    </div>
  );
}

export default function HrPayrollPage() {
  return (
    <HrShell title="Paie" subtitle="Bulletins, CNSS, retenue sur salaire et états mensuels">
      <Payroll />
    </HrShell>
  );
}
