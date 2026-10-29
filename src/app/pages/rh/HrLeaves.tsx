import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { CalendarPlus, ChevronLeft, ChevronRight, Loader2, Inbox, MessageCircle } from "lucide-react";
import HrShell, { useWorkspace, card, btnAccent, field, Modal, Pill } from "./HrShell";
import { LeaveForm, DecisionButtons } from "./HrForms";
import {
  hr, hrErrorMessage, fmtDays, fmtPeriod, fullName, today, LEAVE_STATUS,
  type Employee, type Holiday, type LeaveRequest, type LeaveStatus, type LeaveType,
} from "../../../lib/hr";

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Calendrier d'équipe du mois : une ligne par employé absent, une colonne par jour. */
function TeamCalendar({ month, requests, holidays }: { month: Date; requests: LeaveRequest[]; holidays: Holiday[] }) {
  const days = useMemo(() => {
    const n = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: n }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1));
  }, [month]);
  const holidaySet = useMemo(() => new Set(holidays.map((h) => h.day)), [holidays]);
  const rows = useMemo(() => {
    const map = new Map<string, { name: string; items: LeaveRequest[] }>();
    for (const r of requests) {
      if (r.status !== "approuvee" && r.status !== "validee_responsable" && r.status !== "en_attente") continue;
      const key = r.employee_id;
      const name = r.hr_employees ? `${r.hr_employees.first_name} ${r.hr_employees.last_name}` : "—";
      if (!map.has(key)) map.set(key, { name, items: [] });
      map.get(key)!.items.push(r);
    }
    return [...map.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name, "fr"));
  }, [requests]);
  const t = today();

  if (rows.length === 0) return <p className="text-sm text-slate-500 py-4">Personne n&apos;est absent ce mois-ci.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-separate border-spacing-0 min-w-max">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white text-left font-semibold text-slate-500 pr-3 py-1 min-w-[140px]">Employé</th>
            {days.map((d) => {
              const we = d.getDay() === 0 || d.getDay() === 6;
              return (
                <th key={d.getDate()} className={`w-7 text-center font-semibold py-1 ${iso(d) === t ? "text-[#E4220F]" : we || holidaySet.has(iso(d)) ? "text-slate-300" : "text-slate-500"}`}>
                  {d.getDate()}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map(([id, row]) => (
            <tr key={id}>
              <th scope="row" className="sticky left-0 bg-white text-left font-semibold text-slate-800 pr-3 py-1 whitespace-nowrap">
                <Link to={`/rh/employes/${id}`} className="hover:text-[#050FA0]">{row.name}</Link>
              </th>
              {days.map((d) => {
                const day = iso(d);
                const off = d.getDay() === 0 || d.getDay() === 6 || holidaySet.has(day);
                const r = row.items.find((x) => x.start_date <= day && x.end_date >= day);
                const cls = !r ? (off ? "bg-slate-100" : "bg-slate-50")
                  : r.status === "approuvee" ? (off ? "bg-emerald-200" : "bg-emerald-500")
                  : (off ? "bg-amber-100" : "bg-amber-300");
                return (
                  <td key={day} className="p-[1.5px]">
                    <span className={`block h-6 w-6 rounded ${cls}`} title={r ? `${r.hr_leave_types?.name} · ${LEAVE_STATUS[r.status].label}` : undefined} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-500" /> Approuvé</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-300" /> En attente</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-slate-100 border border-slate-200" /> Week-end ou férié</span>
      </p>
    </div>
  );
}

function LeavesBody() {
  const ws = useWorkspace();
  const [pending, setPending] = useState<LeaveRequest[] | null>(null);
  const [monthReqs, setMonthReqs] = useState<LeaveRequest[]>([]);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [filter, setFilter] = useState<"" | LeaveStatus>("");

  const load = useCallback(async () => {
    const first = iso(month);
    const last = iso(new Date(month.getFullYear(), month.getMonth() + 1, 0));
    try {
      const [p, m, h, hol] = await Promise.all([
        hr.leaveRequests(ws.company_id, { statuses: ["en_attente", "validee_responsable"] }),
        hr.leaveRequests(ws.company_id, { from: first, to: last }),
        hr.leaveRequests(ws.company_id, {}),
        hr.holidays(ws.company_id, month.getFullYear()),
      ]);
      setPending(p.sort((a, b) => (a.status === b.status ? a.start_date.localeCompare(b.start_date) : a.status === "validee_responsable" ? -1 : 1)));
      setMonthReqs(m); setHistory(h); setHolidays(hol);
    } catch (err) { setError(hrErrorMessage(err)); }
  }, [ws.company_id, month]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const h = () => void load();
    window.addEventListener("hr:leave-saved", h);
    return () => window.removeEventListener("hr:leave-saved", h);
  }, [load]);

  if (error) return <p role="alert" className="text-red-700">{error}</p>;
  if (!pending) return <div className="py-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#050FA0]" /></div>;

  const shownHistory = history.filter((r) => !filter || r.status === filter).slice(0, 100);

  return (
    <div className="space-y-5">
      <section className={`${card} p-5`} aria-labelledby="a-traiter">
        <h2 id="a-traiter" className="font-bold text-slate-900 flex items-center gap-2"><Inbox className="h-5 w-5 text-[#E4220F]" /> À traiter ({pending.length})</h2>
        {pending.length === 0 ? <p className="mt-3 text-sm text-slate-500">Aucune demande en attente.</p> : (
          <ul className="mt-3 divide-y">
            {pending.map((r) => (
              <li key={r.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">
                    <Link to={`/rh/employes/${r.employee_id}`} className="hover:text-[#050FA0]">{r.hr_employees ? fullName(r.hr_employees) : "—"}</Link>
                    <span className="font-normal text-slate-500"> · {r.hr_leave_types?.name}</span>
                  </p>
                  <p className="text-sm text-slate-700">{fmtPeriod(r.start_date, r.end_date)} · <span className="font-semibold">{fmtDays(r.days)}</span></p>
                  {r.reason && <p className="text-sm text-slate-500">« {r.reason} »</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Pill cls={LEAVE_STATUS[r.status].cls}>{LEAVE_STATUS[r.status].label}</Pill>
                    {r.source === "whatsapp" && <Pill cls="bg-emerald-50 text-emerald-700"><MessageCircle className="h-3 w-3 mr-1" /> WhatsApp</Pill>}
                    {r.status === "en_attente" && <span className="text-xs text-slate-500">Vous pouvez décider sans attendre le responsable.</span>}
                  </div>
                </div>
                <div className="md:w-72 shrink-0"><DecisionButtons requestId={r.id} onDone={() => void load()} /></div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${card} p-5`} aria-labelledby="calendrier">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 id="calendrier" className="font-bold text-slate-900">Calendrier de l&apos;équipe</h2>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Mois précédent"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-sm font-bold text-slate-800 min-w-[130px] text-center capitalize">{MONTHS[month.getMonth()]} {month.getFullYear()}</span>
            <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Mois suivant"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        <TeamCalendar month={month} requests={monthReqs} holidays={holidays} />
      </section>

      <section className={`${card} p-5`} aria-labelledby="historique">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 id="historique" className="font-bold text-slate-900">Toutes les demandes</h2>
          <label className="text-sm">
            <span className="sr-only">Filtrer par statut</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className={`${field} w-auto`}>
              <option value="">Tous les statuts</option>
              {(Object.keys(LEAVE_STATUS) as LeaveStatus[]).map((s) => <option key={s} value={s}>{LEAVE_STATUS[s].label}</option>)}
            </select>
          </label>
        </div>
        {shownHistory.length === 0 ? <p className="mt-3 text-sm text-slate-500">Aucune demande.</p> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm min-w-[620px]">
              <thead><tr className="text-left text-slate-500 border-b"><th className="py-2 pr-3 font-semibold">Employé</th><th className="py-2 px-3 font-semibold">Type</th><th className="py-2 px-3 font-semibold">Période</th><th className="py-2 px-3 font-semibold text-right">Jours</th><th className="py-2 pl-3 font-semibold">Statut</th></tr></thead>
              <tbody>
                {shownHistory.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-3"><Link to={`/rh/employes/${r.employee_id}`} className="font-semibold text-slate-900 hover:text-[#050FA0]">{r.hr_employees ? fullName(r.hr_employees) : "—"}</Link></td>
                    <td className="py-2.5 px-3">{r.hr_leave_types?.name}</td>
                    <td className="py-2.5 px-3 tabular-nums">{fmtPeriod(r.start_date, r.end_date)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{Number(r.days)}</td>
                    <td className="py-2.5 pl-3"><Pill cls={LEAVE_STATUS[r.status].cls}>{LEAVE_STATUS[r.status].label}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/** Saisie d'une absence par les RH (fenêtre ouverte depuis l'en-tête). */
function NewLeaveModal({ onClose }: { onClose: () => void }) {
  const ws = useWorkspace();
  const [types, setTypes] = useState<LeaveType[] | null>(null);
  const [emps, setEmps] = useState<Employee[]>([]);
  useEffect(() => {
    Promise.all([hr.leaveTypes(ws.company_id), hr.employees(ws.company_id)]).then(([t, e]) => { setTypes(t); setEmps(e); }, () => setTypes([]));
  }, [ws.company_id]);
  return (
    <Modal title="Saisir une absence" onClose={onClose}>
      {!types ? <Loader2 className="h-6 w-6 animate-spin text-[#050FA0]" /> : (
        <LeaveForm asStaff companyId={ws.company_id} types={types} employees={emps} onCancel={onClose}
          onSaved={() => { onClose(); window.dispatchEvent(new Event("hr:leave-saved")); }} />
      )}
    </Modal>
  );
}

export default function HrLeavesPage() {
  const [open, setOpen] = useState(false);
  return (
    <HrShell
      title="Congés et absences"
      subtitle="Les demandes passent par le responsable direct, puis par les RH."
      actions={<button type="button" onClick={() => setOpen(true)} className={btnAccent}><CalendarPlus className="h-4 w-4" /> Saisir une absence</button>}
    >
      <LeavesBody />
      {open && <NewLeaveModal onClose={() => setOpen(false)} />}
    </HrShell>
  );
}
