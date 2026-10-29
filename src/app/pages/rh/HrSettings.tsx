import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Pencil, Check, X, UserPlus } from "lucide-react";
import HrShell, { useWorkspace, card, btnPrimary, field, ErrorNote } from "./HrShell";
import { hr, hrErrorMessage, fmtDate, type Department, type Holiday, type HrMember, type LeaveType } from "../../../lib/hr";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className={`${card} p-5 sm:p-6`}>
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      {description && <p className="text-sm text-slate-600 mt-1">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Departments() {
  const ws = useWorkspace();
  const [rows, setRows] = useState<Department[] | null>(null);
  const [name, setName] = useState("");
  const [edit, setEdit] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => { hr.departments(ws.company_id).then(setRows, (e) => setError(hrErrorMessage(e))); }, [ws.company_id]);
  useEffect(load, [load]);
  const run = async (fn: () => Promise<unknown>) => { setError(""); try { await fn(); load(); } catch (e) { setError(hrErrorMessage(e)); } };

  return (
    <Section title="Services" description="Pour classer les employés et filtrer l'organigramme.">
      <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) void run(async () => { await hr.addDepartment(ws.company_id, name); setName(""); }); }} className="flex gap-2">
        <label className="flex-1"><span className="sr-only">Nouveau service</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. : Commercial, Comptabilité, Logistique" className={field} /></label>
        <button type="submit" className={btnPrimary}><Plus className="h-4 w-4" /> Ajouter</button>
      </form>
      <ErrorNote>{error}</ErrorNote>
      {!rows ? <Loader2 className="mt-4 h-5 w-5 animate-spin text-[#050FA0]" /> : rows.length === 0 ? <p className="mt-3 text-sm text-slate-500">Aucun service.</p> : (
        <ul className="mt-3 divide-y">
          {rows.map((d) => (
            <li key={d.id} className="py-2.5 flex items-center justify-between gap-2">
              {edit?.id === d.id ? (
                <form className="flex-1 flex gap-2" onSubmit={(e) => { e.preventDefault(); void run(async () => { await hr.renameDepartment(d.id, edit.name); setEdit(null); }); }}>
                  <input autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={field} aria-label="Nom du service" />
                  <button type="submit" className="p-2 rounded-lg text-emerald-700 hover:bg-emerald-50" aria-label="Enregistrer"><Check className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setEdit(null)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Annuler"><X className="h-4 w-4" /></button>
                </form>
              ) : (
                <>
                  <span className="font-semibold text-slate-800">{d.name}</span>
                  <span className="flex gap-1">
                    <button type="button" onClick={() => setEdit({ id: d.id, name: d.name })} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" aria-label={`Renommer ${d.name}`}><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => { if (window.confirm(`Supprimer le service « ${d.name} » ? Les employés restent, sans service.`)) void run(() => hr.deleteDepartment(d.id)); }} className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700" aria-label={`Supprimer ${d.name}`}><Trash2 className="h-4 w-4" /></button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function LeaveTypes() {
  const ws = useWorkspace();
  const [rows, setRows] = useState<LeaveType[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(() => { hr.leaveTypes(ws.company_id).then(setRows, (e) => setError(hrErrorMessage(e))); }, [ws.company_id]);
  useEffect(load, [load]);
  const patch = async (id: string, p: Partial<LeaveType>) => { setError(""); try { await hr.updateLeaveType(id, p); load(); } catch (e) { setError(hrErrorMessage(e)); } };

  return (
    <Section title="Types de congé" description="Le congé annuel s'acquiert chaque mois de service (2,5 jours par mois selon le Code du travail, soit 30 jours par an). Vérifiez ces valeurs avec votre convention.">
      <ErrorNote>{error}</ErrorNote>
      {!rows ? <Loader2 className="h-5 w-5 animate-spin text-[#050FA0]" /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead><tr className="text-left text-slate-500 border-b"><th className="py-2 pr-3 font-semibold">Type</th><th className="py-2 px-3 font-semibold">Payé</th><th className="py-2 px-3 font-semibold">Décompté du solde</th><th className="py-2 px-3 font-semibold">Jours acquis / mois</th><th className="py-2 pl-3 font-semibold">Actif</th></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-2.5 pr-3 font-semibold text-slate-800">{t.name}</td>
                  <td className="py-2.5 px-3"><input type="checkbox" checked={t.is_paid} onChange={(e) => patch(t.id, { is_paid: e.target.checked })} aria-label={`${t.name} payé`} className="h-4 w-4 accent-[#050FA0]" /></td>
                  <td className="py-2.5 px-3"><input type="checkbox" checked={t.deducts_balance} onChange={(e) => patch(t.id, { deducts_balance: e.target.checked })} aria-label={`${t.name} décompté du solde`} className="h-4 w-4 accent-[#050FA0]" /></td>
                  <td className="py-2.5 px-3">
                    <input type="number" min={0} max={5} step={0.25} defaultValue={Number(t.monthly_accrual)} disabled={!t.deducts_balance}
                      onBlur={(e) => { const v = Number(e.target.value); if (v !== Number(t.monthly_accrual)) void patch(t.id, { monthly_accrual: v }); }}
                      className={`${field} w-24`} aria-label={`${t.name} jours acquis par mois`} />
                  </td>
                  <td className="py-2.5 pl-3"><input type="checkbox" checked={t.is_active} onChange={(e) => patch(t.id, { is_active: e.target.checked })} aria-label={`${t.name} actif`} className="h-4 w-4 accent-[#050FA0]" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) void hr.addLeaveType(ws.company_id, name).then(() => { setName(""); load(); }, (err) => setError(hrErrorMessage(err))); }} className="mt-4 flex gap-2">
        <label className="flex-1"><span className="sr-only">Nouveau type</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. : Congé de paternité, Formation" className={field} /></label>
        <button type="submit" className={btnPrimary}><Plus className="h-4 w-4" /> Ajouter</button>
      </form>
    </Section>
  );
}

function Holidays() {
  const ws = useWorkspace();
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState<Holiday[] | null>(null);
  const [day, setDay] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(() => { hr.holidays(ws.company_id, year).then(setRows, (e) => setError(hrErrorMessage(e))); }, [ws.company_id, year]);
  useEffect(load, [load]);

  return (
    <Section title="Jours fériés" description="Ils ne sont pas comptés dans les congés. Les fêtes religieuses (Aïd el-Fitr, Tabaski, Maouloud…) changent chaque année : ajoutez-les dès que les dates sont annoncées.">
      <div className="flex items-center gap-2 mb-3">
        {[year - 1, year, year + 1].map((y) => (
          <button key={y} type="button" onClick={() => setYear(y)} className={`px-3 py-1.5 rounded-lg text-sm font-bold ${y === year ? "bg-[#050FA0] text-white" : "text-slate-600 hover:bg-slate-100"}`}>{y}</button>
        ))}
      </div>
      <ErrorNote>{error}</ErrorNote>
      {!rows ? <Loader2 className="h-5 w-5 animate-spin text-[#050FA0]" /> : rows.length === 0 ? <p className="text-sm text-slate-500">Aucun jour férié enregistré pour {year}.</p> : (
        <ul className="divide-y">
          {rows.map((h) => (
            <li key={h.id} className="py-2 flex items-center justify-between gap-2 text-sm">
              <span><span className="font-semibold text-slate-800 tabular-nums">{fmtDate(h.day)}</span> · {h.name}{!h.company_id && <span className="ml-2 text-xs text-slate-500">(national)</span>}</span>
              {h.company_id && (
                <button type="button" onClick={() => hr.deleteHoliday(h.id).then(load, (e) => setError(hrErrorMessage(e)))} className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700" aria-label={`Supprimer ${h.name}`}><Trash2 className="h-4 w-4" /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={(e) => { e.preventDefault(); if (day && name.trim()) void hr.addHoliday(ws.company_id, day, name).then(() => { setDay(""); setName(""); setYear(Number(day.slice(0, 4))); load(); }, (err) => setError(hrErrorMessage(err))); }} className="mt-4 grid sm:grid-cols-[180px_1fr_auto] gap-2">
        <label><span className="sr-only">Date</span><input type="date" required value={day} onChange={(e) => setDay(e.target.value)} className={field} /></label>
        <label><span className="sr-only">Nom</span><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. : Tabaski" className={field} /></label>
        <button type="submit" className={btnPrimary}><Plus className="h-4 w-4" /> Ajouter</button>
      </form>
    </Section>
  );
}

function Team() {
  const ws = useWorkspace();
  const [rows, setRows] = useState<HrMember[] | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const load = useCallback(() => { hr.members(ws.company_id).then(setRows, (e) => setError(hrErrorMessage(e))); }, [ws.company_id]);
  useEffect(load, [load]);
  const isAdmin = ws.role === "admin";

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(""); setOk("");
    try { const m = await hr.addMember(email); setOk(`${m.full_name} a maintenant accès à la gestion RH.`); setEmail(""); load(); }
    catch (err) { setError(hrErrorMessage(err)); }
    setBusy(false);
  };

  return (
    <Section title="Équipe RH" description="Les gestionnaires RH voient tous les dossiers, les contrats et les salaires, et valident les congés. Ils se connectent avec leur propre compte ProJob.">
      {!rows ? <Loader2 className="h-5 w-5 animate-spin text-[#050FA0]" /> : rows.length === 0 ? <p className="text-sm text-slate-500">Seul le compte entreprise gère les RH pour l&apos;instant.</p> : (
        <ul className="divide-y">
          {rows.map((m) => (
            <li key={m.user_id} className="py-2.5 flex items-center justify-between gap-2 text-sm">
              <span><span className="font-semibold text-slate-800">{m.full_name}</span> <span className="text-slate-500">· {m.email}</span></span>
              {isAdmin && (
                <button type="button" onClick={() => { if (window.confirm(`Retirer l'accès RH de ${m.full_name} ?`)) void hr.removeMember(ws.company_id, m.user_id).then(load, (err) => setError(hrErrorMessage(err))); }} className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700" aria-label={`Retirer ${m.full_name}`}><Trash2 className="h-4 w-4" /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      {isAdmin ? (
        <form onSubmit={add} className="mt-4 flex flex-col sm:flex-row gap-2">
          <label className="flex-1"><span className="sr-only">E-mail du gestionnaire RH</span><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail de son compte ProJob" className={field} /></label>
          <button type="submit" disabled={busy} className={btnPrimary}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Donner l&apos;accès</button>
        </form>
      ) : <p className="mt-3 text-xs text-slate-500">Seul le compte entreprise peut ajouter ou retirer des gestionnaires.</p>}
      {ok && <p role="status" className="mt-3 text-sm text-emerald-700">{ok}</p>}
      <ErrorNote>{error}</ErrorNote>
    </Section>
  );
}

export default function HrSettingsPage() {
  return (
    <HrShell title="Paramètres RH">
      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <Departments />
        <Team />
        <div className="lg:col-span-2"><LeaveTypes /></div>
        <div className="lg:col-span-2"><Holidays /></div>
      </div>
    </HrShell>
  );
}
