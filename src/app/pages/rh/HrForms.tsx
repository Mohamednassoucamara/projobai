import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  hr, hrErrorMessage, fmtDays, fullName, today, CONTRACT_TYPES, STATUS_LABELS,
  type Contract, type ContractType, type Department, type Employee, type EmployeeStatus, type LeaveBalance, type LeaveType,
} from "../../../lib/hr";
import { field, btnPrimary, btnGhost, ErrorNote, Label } from "./HrShell";

const clean = (v: string) => (v.trim() === "" ? null : v.trim());

// ---------------------------------------------------------------------------
/** Création ou modification d'une fiche employé. */
export function EmployeeForm({
  companyId, initial, departments, employees, onSaved, onCancel,
}: {
  companyId: string;
  initial?: Employee | null;
  departments: Department[];
  employees: Employee[];
  onSaved: (e: Employee) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    first_name: initial?.first_name || "",
    last_name: initial?.last_name || "",
    email: initial?.email || "",
    phone: initial?.phone || "",
    gender: initial?.gender || "",
    birth_date: initial?.birth_date || "",
    address: initial?.address || "",
    matricule: initial?.matricule || "",
    job_title: initial?.job_title || "",
    department_id: initial?.department_id || "",
    manager_id: initial?.manager_id || "",
    hire_date: initial?.hire_date || today(),
    status: (initial?.status || "actif") as EmployeeStatus,
    exit_date: initial?.exit_date || "",
    exit_reason: initial?.exit_reason || "",
    emergency_contact: initial?.emergency_contact || "",
    notes: initial?.notes || "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  // Un employé ne peut pas être son propre responsable, ni dépendre d'un de ses subordonnés directs
  const managers = employees.filter((e) => e.id !== initial?.id && e.status !== "sorti" && e.manager_id !== initial?.id);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (f.status === "sorti" && !f.exit_date) { setError("Indiquez la date de sortie."); return; }
    setBusy(true);
    const row = {
      first_name: f.first_name.trim(),
      last_name: f.last_name.trim(),
      email: clean(f.email),
      phone: clean(f.phone),
      gender: (clean(f.gender) as Employee["gender"]),
      birth_date: clean(f.birth_date),
      address: clean(f.address),
      matricule: clean(f.matricule),
      job_title: clean(f.job_title),
      department_id: clean(f.department_id),
      manager_id: clean(f.manager_id),
      hire_date: f.hire_date,
      status: f.status,
      exit_date: f.status === "sorti" ? clean(f.exit_date) : null,
      exit_reason: f.status === "sorti" ? clean(f.exit_reason) : null,
      emergency_contact: clean(f.emergency_contact),
      notes: clean(f.notes),
    };
    try {
      const saved = initial ? await hr.updateEmployee(initial.id, row) : await hr.createEmployee({ ...row, company_id: companyId });
      onSaved(saved);
    } catch (err) {
      setError(hrErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset className="grid sm:grid-cols-2 gap-4">
        <legend className="sr-only">Identité</legend>
        <Label text="Prénom" required><input required value={f.first_name} onChange={set("first_name")} className={field} autoComplete="off" /></Label>
        <Label text="Nom" required><input required value={f.last_name} onChange={set("last_name")} className={field} autoComplete="off" /></Label>
        <Label text="E-mail" hint="Si la personne a un compte ProJob avec cette adresse, sa fiche y est reliée automatiquement.">
          <input type="email" value={f.email} onChange={set("email")} className={field} autoComplete="off" />
        </Label>
        <Label text="Téléphone"><input type="tel" value={f.phone} onChange={set("phone")} className={field} placeholder="622 00 00 00" /></Label>
        <Label text="Sexe">
          <select value={f.gender} onChange={set("gender")} className={field}>
            <option value="">—</option><option value="F">Femme</option><option value="M">Homme</option>
          </select>
        </Label>
        <Label text="Date de naissance"><input type="date" value={f.birth_date} onChange={set("birth_date")} className={field} max={today()} /></Label>
        <div className="sm:col-span-2"><Label text="Adresse"><input value={f.address} onChange={set("address")} className={field} placeholder="Quartier, commune, ville" /></Label></div>
      </fieldset>

      <fieldset className="grid sm:grid-cols-2 gap-4 border-t pt-5">
        <legend className="sr-only">Poste</legend>
        <Label text="Poste"><input value={f.job_title} onChange={set("job_title")} className={field} /></Label>
        <Label text="Matricule"><input value={f.matricule} onChange={set("matricule")} className={field} /></Label>
        <Label text="Service">
          <select value={f.department_id} onChange={set("department_id")} className={field}>
            <option value="">Aucun</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Label>
        <Label text="Responsable direct" hint="Il valide les congés en premier.">
          <select value={f.manager_id} onChange={set("manager_id")} className={field}>
            <option value="">Aucun (validation directe par les RH)</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{fullName(m)}{m.job_title ? ` · ${m.job_title}` : ""}</option>)}
          </select>
        </Label>
        <Label text="Date d'embauche" required><input type="date" required value={f.hire_date} onChange={set("hire_date")} className={field} /></Label>
        <Label text="Statut">
          <select value={f.status} onChange={set("status")} className={field}>
            {(Object.keys(STATUS_LABELS) as EmployeeStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s].label}</option>)}
          </select>
        </Label>
        {f.status === "sorti" && (
          <>
            <Label text="Date de sortie" required><input type="date" required value={f.exit_date} onChange={set("exit_date")} className={field} /></Label>
            <Label text="Motif de sortie">
              <select value={f.exit_reason} onChange={set("exit_reason")} className={field}>
                <option value="">—</option>
                {["Démission", "Fin de contrat", "Licenciement", "Rupture d'un commun accord", "Retraite", "Décès", "Autre"].map((r) => <option key={r}>{r}</option>)}
              </select>
            </Label>
          </>
        )}
      </fieldset>

      <fieldset className="grid sm:grid-cols-2 gap-4 border-t pt-5">
        <legend className="sr-only">Autres informations</legend>
        <Label text="Personne à prévenir"><input value={f.emergency_contact} onChange={set("emergency_contact")} className={field} placeholder="Nom, lien, téléphone" /></Label>
        <div className="sm:col-span-2"><Label text="Notes internes"><textarea value={f.notes} onChange={set("notes")} rows={3} className={field} /></Label></div>
      </fieldset>

      <ErrorNote>{error}</ErrorNote>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button type="button" onClick={onCancel} className={btnGhost}>Annuler</button>
        <button type="submit" disabled={busy} className={btnPrimary}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{initial ? "Enregistrer" : "Créer la fiche"}</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
/** Nouveau contrat (le précédent n'est plus « en cours »). */
export function ContractForm({ employee, last, onSaved, onCancel }: { employee: Employee; last?: Contract | null; onSaved: (c: Contract) => void; onCancel: () => void }) {
  const [type, setType] = useState<ContractType>(last?.contract_type || "CDI");
  const [jobTitle, setJobTitle] = useState(last?.job_title || employee.job_title || "");
  const [start, setStart] = useState(last ? today() : employee.hire_date);
  const [end, setEnd] = useState("");
  const [trial, setTrial] = useState("");
  const [salary, setSalary] = useState(last?.base_salary_gnf ? String(last.base_salary_gnf) : "");
  const [hours, setHours] = useState(String(last?.weekly_hours ?? 40));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const needsEnd = type === "CDD" || type === "Stage" || type === "Apprentissage";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (needsEnd && !end) { setError("Indiquez la date de fin du contrat."); return; }
    if (end && end < start) { setError("La date de fin doit être après la date de début."); return; }
    setBusy(true);
    try {
      const c = await hr.addContract({
        company_id: employee.company_id, employee_id: employee.id, contract_type: type, job_title: clean(jobTitle),
        start_date: start, end_date: end || null, trial_end_date: trial || null,
        base_salary_gnf: salary ? Number(salary.replace(/\s/g, "")) : null, weekly_hours: hours ? Number(hours) : 40, notes: clean(notes),
      });
      onSaved(c);
    } catch (err) {
      setError(hrErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Label text="Type de contrat" required>
          <select value={type} onChange={(e) => setType(e.target.value as ContractType)} className={field}>
            {CONTRACT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Label>
        <Label text="Poste"><input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className={field} /></Label>
        <Label text="Début" required><input type="date" required value={start} onChange={(e) => setStart(e.target.value)} className={field} /></Label>
        <Label text={needsEnd ? "Fin" : "Fin (facultatif)"} required={needsEnd}><input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className={field} /></Label>
        <Label text="Fin de la période d'essai" hint="Une alerte s'affiche 30 jours avant."><input type="date" value={trial} min={start} onChange={(e) => setTrial(e.target.value)} className={field} /></Label>
        <Label text="Salaire de base mensuel (GNF)">
          <input inputMode="numeric" value={salary} onChange={(e) => setSalary(e.target.value.replace(/[^\d\s]/g, ""))} className={field} placeholder="Ex. : 3 500 000" />
        </Label>
        <Label text="Heures par semaine"><input type="number" min={1} max={60} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} className={field} /></Label>
        <div className="sm:col-span-2"><Label text="Notes"><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={field} /></Label></div>
      </div>
      {last && <p className="text-xs text-slate-500">Le contrat {last.contract_type} actuel sera archivé (il reste visible dans l&apos;historique).</p>}
      <ErrorNote>{error}</ErrorNote>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button type="button" onClick={onCancel} className={btnGhost}>Annuler</button>
        <button type="submit" disabled={busy} className={btnPrimary}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Enregistrer le contrat</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
/** Demande de congé (par l'employé) ou saisie d'une absence (par les RH, pour un employé). */
export function LeaveForm({
  companyId, types, employees, employeeId, balances, onSaved, onCancel, asStaff = false,
}: {
  companyId: string;
  types: LeaveType[];
  employees?: Employee[];
  employeeId?: string;
  balances?: LeaveBalance[];
  onSaved: (r: { status: string; days: number }) => void;
  onCancel: () => void;
  asStaff?: boolean;
}) {
  const active = types.filter((t) => t.is_active);
  const [emp, setEmp] = useState(employeeId || "");
  const [typeId, setTypeId] = useState(active[0]?.id || "");
  const [start, setStart] = useState(today());
  const [end, setEnd] = useState(today());
  const [reason, setReason] = useState("");
  const [days, setDays] = useState<number | null>(null);
  const [bal, setBal] = useState<LeaveBalance[] | undefined>(balances);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const type = active.find((t) => t.id === typeId);

  useEffect(() => {
    if (!start || !end || end < start) { setDays(null); return; }
    let stop = false;
    hr.workingDays(companyId, start, end).then((n) => { if (!stop) setDays(n); }, () => setDays(null));
    return () => { stop = true; };
  }, [companyId, start, end]);

  useEffect(() => {
    if (balances) { setBal(balances); return; }
    if (!emp) { setBal(undefined); return; }
    hr.balances(emp).then(setBal, () => setBal(undefined));
  }, [emp, balances]);

  const balance = useMemo(() => bal?.find((b) => b.leave_type_id === typeId), [bal, typeId]);
  const tooMuch = Boolean(type?.deducts_balance && balance?.available !== null && balance?.available !== undefined && days !== null && days > Number(balance.available));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (end < start) { setError("La date de fin doit être après la date de début."); return; }
    if (asStaff && !emp) { setError("Choisissez l'employé."); return; }
    setBusy(true);
    try {
      const r = await hr.requestLeave({ company: companyId, leaveType: typeId, start, end, reason, employeeId: asStaff ? emp : undefined });
      onSaved(r);
    } catch (err) {
      setError(hrErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {asStaff && employees && !employeeId && (
        <Label text="Employé" required>
          <select required value={emp} onChange={(e) => setEmp(e.target.value)} className={field}>
            <option value="">Choisir…</option>
            {employees.filter((x) => x.status !== "sorti").map((x) => <option key={x.id} value={x.id}>{fullName(x)}</option>)}
          </select>
        </Label>
      )}
      <Label text="Type" required>
        <select required value={typeId} onChange={(e) => setTypeId(e.target.value)} className={field}>
          {active.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_paid ? "" : " (non payé)"}</option>)}
        </select>
      </Label>
      <div className="grid grid-cols-2 gap-4">
        <Label text="Du" required><input type="date" required value={start} onChange={(e) => { setStart(e.target.value); if (end < e.target.value) setEnd(e.target.value); }} className={field} /></Label>
        <Label text="Au (inclus)" required><input type="date" required value={end} min={start} onChange={(e) => setEnd(e.target.value)} className={field} /></Label>
      </div>
      <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700" aria-live="polite">
        {days === null ? "Calcul des jours ouvrés…" : days === 0 ? "Aucun jour ouvré sur cette période (week-end ou jours fériés)." : <>Soit <span className="font-bold">{fmtDays(days)} ouvré{days > 1 ? "s" : ""}</span>, hors week-ends et jours fériés.</>}
        {type?.deducts_balance && balance?.available !== null && balance?.available !== undefined && (
          <span className={`block mt-1 ${tooMuch ? "text-red-700 font-semibold" : "text-slate-600"}`}>
            Solde disponible : {fmtDays(Number(balance.available))}{tooMuch ? " — insuffisant pour cette demande." : "."}
          </span>
        )}
        {type?.requires_document && <span className="block mt-1 text-slate-600">Un justificatif sera demandé (certificat, acte…).</span>}
      </div>
      <Label text={asStaff ? "Commentaire" : "Motif (facultatif)"}><textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={field} maxLength={500} /></Label>
      {asStaff && <p className="text-xs text-slate-500">Une absence saisie par les RH est approuvée directement ; l&apos;employé est prévenu.</p>}
      <ErrorNote>{error}</ErrorNote>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button type="button" onClick={onCancel} className={btnGhost}>Annuler</button>
        <button type="submit" disabled={busy || !days || tooMuch} className={btnPrimary}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{asStaff ? "Enregistrer l'absence" : "Envoyer la demande"}</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
/** Décision sur une demande (avec motif facultatif). */
export function DecisionButtons({ requestId, onDone, compact = false }: { requestId: string; onDone: () => void; compact?: boolean }) {
  const [mode, setMode] = useState<null | "refuse">(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const decide = async (approve: boolean) => {
    setBusy(true); setError("");
    try { await hr.decideLeave(requestId, approve, note); onDone(); }
    catch (err) { setError(hrErrorMessage(err)); setBusy(false); }
  };
  if (mode === "refuse") {
    return (
      <div className="space-y-2 w-full">
        <input value={note} onChange={(e) => setNote(e.target.value)} className={field} placeholder="Motif du refus (envoyé à l'employé)" aria-label="Motif du refus" />
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => decide(false)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-bold disabled:opacity-60">Confirmer le refus</button>
          <button type="button" onClick={() => setMode(null)} className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">Retour</button>
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
    );
  }
  return (
    <div className={`flex ${compact ? "" : "flex-wrap"} items-center gap-2`}>
      <button type="button" disabled={busy} onClick={() => decide(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}Approuver
      </button>
      <button type="button" disabled={busy} onClick={() => setMode("refuse")} className="px-3 py-2 rounded-lg border-2 border-red-200 text-red-700 text-sm font-bold hover:bg-red-50 disabled:opacity-60">Refuser</button>
      {error && <p role="alert" className="text-sm text-red-700 w-full">{error}</p>}
    </div>
  );
}
