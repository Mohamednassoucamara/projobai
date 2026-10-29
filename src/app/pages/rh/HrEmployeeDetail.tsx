import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { ArrowLeft, Loader2, Pencil, FilePlus2, CalendarPlus, Smartphone, Mail, Phone, MapPin, Briefcase, Users, PlusCircle, FileText } from "lucide-react";
import HrShell, { useWorkspace, card, btnPrimary, btnGhost, field, Modal, Pill, ErrorNote, Label } from "./HrShell";
import { EmployeeForm, ContractForm, LeaveForm } from "./HrForms";
import {
  hr, hrErrorMessage, fullName, fmtDate, fmtDays, fmtPeriod, gnfOrDash, LEAVE_STATUS, STATUS_LABELS,
  type Contract, type Department, type Employee, type LeaveBalance, type LeaveRequest, type LeaveType,
} from "../../../lib/hr";

function Info({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <Icon className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
      <div className="min-w-0"><span className="block text-xs text-slate-500">{label}</span><span className="text-slate-800 break-words">{children || "—"}</span></div>
    </div>
  );
}

function AdjustmentForm({ employee, types, onSaved, onCancel }: { employee: Employee; types: LeaveType[]; onSaved: () => void; onCancel: () => void }) {
  const counted = types.filter((t) => t.deducts_balance);
  const [typeId, setTypeId] = useState(counted[0]?.id || "");
  const [days, setDays] = useState("");
  const [reason, setReason] = useState("Reprise du solde existant");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(days.replace(",", "."));
    if (!n || Number.isNaN(n)) { setError("Indiquez un nombre de jours (négatif pour retirer)."); return; }
    setBusy(true); setError("");
    try {
      await hr.addAdjustment({ company_id: employee.company_id, employee_id: employee.id, leave_type_id: typeId, days: n, reason: reason.trim() || "Ajustement" });
      onSaved();
    } catch (err) { setError(hrErrorMessage(err)); setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Label text="Type de congé" required>
        <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className={field}>
          {counted.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Label>
      <Label text="Jours à ajouter" required hint="Exemple : 12 pour reprendre un solde, -2 pour corriger une erreur.">
        <input required inputMode="decimal" value={days} onChange={(e) => setDays(e.target.value)} className={field} />
      </Label>
      <Label text="Motif" required><input required value={reason} onChange={(e) => setReason(e.target.value)} className={field} /></Label>
      <ErrorNote>{error}</ErrorNote>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button type="button" onClick={onCancel} className={btnGhost}>Annuler</button>
        <button type="submit" disabled={busy} className={btnPrimary}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Enregistrer</button>
      </div>
    </form>
  );
}

function DetailBody() {
  const ws = useWorkspace();
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const [emp, setEmp] = useState<Employee | null | undefined>(undefined);
  const [all, setAll] = useState<Employee[]>([]);
  const [deps, setDeps] = useState<Department[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<null | "edit" | "contract" | "leave" | "adjust">(params.get("contrat") === "1" ? "contract" : null);

  const load = useCallback(async () => {
    try {
      const [e, list, d, c, t, l] = await Promise.all([
        hr.employee(id), hr.employees(ws.company_id), hr.departments(ws.company_id), hr.contracts(id),
        hr.leaveTypes(ws.company_id), hr.leaveRequests(ws.company_id, { employeeId: id }),
      ]);
      setEmp(e); setAll(list); setDeps(d); setContracts(c); setTypes(t); setLeaves(l);
      if (e) setBalances(await hr.balances(id).catch(() => []));
    } catch (err) { setError(hrErrorMessage(err)); }
  }, [id, ws.company_id]);
  useEffect(() => { void load(); }, [load]);

  const close = () => {
    setModal(null);
    if (params.get("contrat")) { params.delete("contrat"); setParams(params, { replace: true }); }
  };
  const done = () => { close(); void load(); };

  const current = contracts.find((c) => c.is_current) || null;
  const manager = useMemo(() => all.find((x) => x.id === emp?.manager_id), [all, emp?.manager_id]);
  const reports = useMemo(() => all.filter((x) => x.manager_id === emp?.id && x.status !== "sorti"), [all, emp?.id]);
  const dep = deps.find((d) => d.id === emp?.department_id);

  if (error) return <p role="alert" className="text-red-700">{error}</p>;
  if (emp === undefined) return <div className="py-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#050FA0]" /></div>;
  if (emp === null) return <p className="text-slate-600">Employé introuvable. <Link to="/rh/employes" className="text-[#050FA0] font-semibold underline">Retour à la liste</Link></p>;

  const cancel = async (r: LeaveRequest) => {
    if (!window.confirm(`Annuler ${r.hr_leave_types?.name.toLowerCase() || "ce congé"} ${fmtPeriod(r.start_date, r.end_date)} ?`)) return;
    try { await hr.cancelLeave(r.id); void load(); } catch (err) { setError(hrErrorMessage(err)); }
  };

  return (
    <div className="space-y-5">
      <Link to="/rh/employes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#050FA0]"><ArrowLeft className="h-4 w-4" /> Tous les employés</Link>

      <section className={`${card} p-5 sm:p-6`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <span className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#050FA0] to-[#1A27C2] text-white font-bold text-lg grid place-items-center shrink-0">
              {(emp.first_name[0] || "") + (emp.last_name[0] || "")}
            </span>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-slate-900 truncate">{fullName(emp)}</h2>
              <p className="text-slate-600">{emp.job_title || "Poste non renseigné"}{dep ? ` · ${dep.name}` : ""}</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <Pill cls={STATUS_LABELS[emp.status].cls}>{STATUS_LABELS[emp.status].label}</Pill>
                {emp.user_id
                  ? <Pill cls="bg-emerald-50 text-emerald-700"><Smartphone className="h-3 w-3 mr-1" /> Compte ProJob relié</Pill>
                  : <Pill cls="bg-slate-100 text-slate-600">Sans compte ProJob</Pill>}
                {emp.application_id && <Pill cls="bg-[#050FA0]/10 text-[#050FA0]">Recruté via ProJob</Pill>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setModal("edit")} className={btnGhost}><Pencil className="h-4 w-4" /> Modifier</button>
            {emp.status !== "sorti" && <button type="button" onClick={() => setModal("leave")} className={btnPrimary}><CalendarPlus className="h-4 w-4" /> Saisir une absence</button>}
          </div>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Info icon={Mail} label="E-mail">{emp.email}</Info>
          <Info icon={Phone} label="Téléphone">{emp.phone}</Info>
          <Info icon={MapPin} label="Adresse">{emp.address}</Info>
          <Info icon={Briefcase} label="Embauche">{fmtDate(emp.hire_date, true)}{emp.matricule ? ` · matricule ${emp.matricule}` : ""}</Info>
          <Info icon={Users} label="Responsable direct">
            {manager ? <Link to={`/rh/employes/${manager.id}`} className="text-[#050FA0] font-semibold hover:underline">{fullName(manager)}</Link> : "Aucun : les congés vont directement aux RH"}
          </Info>
          <Info icon={Users} label="Équipe">
            {reports.length ? reports.map((r, i) => <span key={r.id}>{i ? ", " : ""}<Link to={`/rh/employes/${r.id}`} className="text-[#050FA0] hover:underline">{fullName(r)}</Link></span>) : "—"}
          </Info>
          {emp.birth_date && <Info icon={FileText} label="Naissance">{fmtDate(emp.birth_date, true)}{emp.gender ? ` · ${emp.gender === "F" ? "Femme" : "Homme"}` : ""}</Info>}
          {emp.emergency_contact && <Info icon={Phone} label="Personne à prévenir">{emp.emergency_contact}</Info>}
          {emp.status === "sorti" && <Info icon={FileText} label="Sortie">{fmtDate(emp.exit_date, true)}{emp.exit_reason ? ` · ${emp.exit_reason}` : ""}</Info>}
        </div>
        {emp.notes && <p className="mt-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700 whitespace-pre-line">{emp.notes}</p>}
        {!emp.user_id && emp.status !== "sorti" && (
          <p className="mt-4 text-sm text-slate-600">
            Pour lui ouvrir son espace employé (congés en ligne et sur WhatsApp), demandez-lui de créer un compte candidat gratuit sur projobai.com
            {emp.email ? <> avec l&apos;adresse <span className="font-semibold">{emp.email}</span> : la fiche sera reliée automatiquement.</> : <> puis renseignez son e-mail sur cette fiche.</>}
          </p>
        )}
      </section>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* Contrats */}
        <section className={`${card} p-5 lg:col-span-2`} aria-labelledby="contrat-titre">
          <div className="flex items-center justify-between gap-2">
            <h3 id="contrat-titre" className="font-bold text-slate-900">Contrat</h3>
            <button type="button" onClick={() => setModal("contract")} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#050FA0] hover:underline"><FilePlus2 className="h-4 w-4" /> {current ? "Nouveau contrat" : "Saisir le contrat"}</button>
          </div>
          {!current ? <p className="mt-3 text-sm text-amber-700">Aucun contrat en cours.</p> : (
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-slate-500">Type</dt><dd className="font-bold text-slate-900">{current.contract_type}</dd></div>
              <div><dt className="text-xs text-slate-500">Salaire de base</dt><dd className="font-semibold text-slate-900 tabular-nums">{gnfOrDash(current.base_salary_gnf)}</dd></div>
              <div><dt className="text-xs text-slate-500">Début</dt><dd>{fmtDate(current.start_date)}</dd></div>
              <div><dt className="text-xs text-slate-500">Fin</dt><dd>{current.end_date ? fmtDate(current.end_date) : "Indéterminée"}</dd></div>
              <div><dt className="text-xs text-slate-500">Fin d&apos;essai</dt><dd>{fmtDate(current.trial_end_date)}</dd></div>
              <div><dt className="text-xs text-slate-500">Horaire</dt><dd>{current.weekly_hours ?? 40} h / semaine</dd></div>
            </dl>
          )}
          {contracts.filter((c) => !c.is_current).length > 0 && (
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer font-semibold text-slate-600">Contrats précédents ({contracts.filter((c) => !c.is_current).length})</summary>
              <ul className="mt-2 divide-y">
                {contracts.filter((c) => !c.is_current).map((c) => (
                  <li key={c.id} className="py-2 flex justify-between gap-2"><span>{c.contract_type} · {c.job_title || "—"}</span><span className="text-slate-500 tabular-nums">{fmtDate(c.start_date)} → {c.end_date ? fmtDate(c.end_date) : "…"}</span></li>
                ))}
              </ul>
            </details>
          )}
        </section>

        {/* Congés */}
        <section className={`${card} p-5 lg:col-span-3`} aria-labelledby="conges-titre">
          <div className="flex items-center justify-between gap-2">
            <h3 id="conges-titre" className="font-bold text-slate-900">Congés et absences</h3>
            <button type="button" onClick={() => setModal("adjust")} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#050FA0] hover:underline"><PlusCircle className="h-4 w-4" /> Ajuster un solde</button>
          </div>
          <div className="mt-3 grid sm:grid-cols-3 gap-3">
            {balances.filter((b) => b.deducts_balance).map((b) => (
              <div key={b.leave_type_id} className="rounded-xl bg-[#050FA0]/5 border border-[#050FA0]/15 p-3 sm:col-span-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                <span className="text-sm font-bold text-slate-900">{b.name}</span>
                <span className="text-2xl font-bold text-[#050FA0] tabular-nums">{fmtDays(b.available)}</span>
                <span className="text-xs text-slate-600">disponibles · acquis {fmtDays(b.acquired)} sur {b.months} mois{Number(b.adjustments) ? `, ajustements ${Number(b.adjustments) > 0 ? "+" : ""}${b.adjustments}` : ""}, pris {fmtDays(b.taken)}{Number(b.pending) ? `, en attente ${fmtDays(b.pending)}` : ""}</span>
              </div>
            ))}
          </div>
          {leaves.length === 0 ? <p className="mt-4 text-sm text-slate-500">Aucune demande pour l&apos;instant.</p> : (
            <ul className="mt-4 divide-y">
              {leaves.map((r) => (
                <li key={r.id} className="py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div>
                    <span className="font-semibold text-slate-900">{r.hr_leave_types?.name}</span>
                    <span className="block text-slate-600">{fmtPeriod(r.start_date, r.end_date)} · {fmtDays(r.days)}{r.reason ? ` · ${r.reason}` : ""}</span>
                    {r.decision_note && <span className="block text-xs text-slate-500">Note : {r.decision_note}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill cls={LEAVE_STATUS[r.status].cls}>{LEAVE_STATUS[r.status].label}</Pill>
                    {!["refusee", "annulee"].includes(r.status) && (
                      <button type="button" onClick={() => cancel(r)} className="text-xs font-semibold text-slate-500 hover:text-red-700 underline">Annuler</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {modal === "edit" && (
        <Modal title={`Modifier — ${fullName(emp)}`} onClose={close} wide>
          <EmployeeForm companyId={ws.company_id} initial={emp} departments={deps} employees={all} onCancel={close} onSaved={done} />
        </Modal>
      )}
      {modal === "contract" && (
        <Modal title={current ? "Nouveau contrat" : "Contrat de travail"} onClose={close} wide>
          <ContractForm employee={emp} last={current} onCancel={close} onSaved={done} />
        </Modal>
      )}
      {modal === "leave" && (
        <Modal title={`Absence — ${fullName(emp)}`} onClose={close}>
          <LeaveForm asStaff companyId={ws.company_id} types={types} employeeId={emp.id} balances={balances} onCancel={close} onSaved={done} />
        </Modal>
      )}
      {modal === "adjust" && (
        <Modal title="Ajuster un solde de congés" onClose={close}>
          <AdjustmentForm employee={emp} types={types} onCancel={close} onSaved={done} />
        </Modal>
      )}
    </div>
  );
}

export default function HrEmployeeDetailPage() {
  return (
    <HrShell title="Dossier employé">
      <DetailBody />
    </HrShell>
  );
}
