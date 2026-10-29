import { useEffect, useState } from "react";
import { Link } from "react-router";
import { UserCheck, Loader2, ArrowRight } from "lucide-react";
import { usePlan } from "../contexts/PlanContext";
import { PremiumUpsell } from "./PremiumGate";
import { Modal, field, btnPrimary, btnGhost, ErrorNote, Label } from "../pages/rh/HrShell";
import { hr, hrErrorMessage, today, CONTRACT_TYPES, type ContractType, type Department } from "../../lib/hr";

/** Embauche d'un candidat retenu : crée sa fiche employé ProJob+ et son contrat. */
export default function HireCard({
  applicationId, candidateName, status, onHired,
}: {
  applicationId: string;
  candidateName: string;
  status: string;
  onHired: () => void;
}) {
  const { can, ready } = usePlan();
  const enabled = can("sirh");
  const [employee, setEmployee] = useState<{ id: string } | null | undefined>(undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    hr.employeeForApplication(applicationId).then(setEmployee, () => setEmployee(null));
  }, [applicationId, enabled]);

  if (!ready || status === "rejected") return null;
  if (!enabled) {
    return status === "accepted"
      ? <PremiumUpsell feature="sirh" compact description="embauchez ce candidat en un clic : dossier employé, contrat et congés sont créés pour vous" />
      : null;
  }
  if (employee === undefined) return null;

  if (employee) {
    return (
      <Link to={`/rh/employes/${employee.id}`} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900 hover:bg-emerald-100">
        <span className="flex items-center gap-2 font-bold"><UserCheck className="h-5 w-5" /> {candidateName} fait partie de vos employés</span>
        <ArrowRight className="h-5 w-5 shrink-0" />
      </Link>
    );
  }

  return (
    <section className="rounded-2xl border-2 border-[#050FA0]/20 bg-white p-5">
      <h2 className="font-bold text-slate-900 flex items-center gap-2"><UserCheck className="h-5 w-5 text-[#050FA0]" /> Embaucher ce candidat</h2>
      <p className="mt-1 text-sm text-slate-600">ProJob+ crée sa fiche employé et son contrat à partir de sa candidature. Il retrouve ses congés dans son espace employé.</p>
      <button type="button" onClick={() => setOpen(true)} className={`${btnPrimary} mt-4 w-full`}>Embaucher {candidateName.split(" ")[0]}</button>
      {open && (
        <HireDialog
          applicationId={applicationId}
          candidateName={candidateName}
          onClose={() => setOpen(false)}
          onDone={(id) => { setOpen(false); setEmployee({ id }); onHired(); }}
        />
      )}
    </section>
  );
}

function HireDialog({ applicationId, candidateName, onClose, onDone }: { applicationId: string; candidateName: string; onClose: () => void; onDone: (employeeId: string) => void }) {
  const [deps, setDeps] = useState<Department[]>([]);
  const [hireDate, setHireDate] = useState(today());
  const [type, setType] = useState<ContractType>("CDI");
  const [end, setEnd] = useState("");
  const [trial, setTrial] = useState("");
  const [salary, setSalary] = useState("");
  const [dep, setDep] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const needsEnd = type === "CDD" || type === "Stage" || type === "Apprentissage";

  useEffect(() => {
    hr.workspaces().then((list) => {
      const ws = list.find((w) => w.role === "admin" || w.role === "rh");
      if (ws) hr.departments(ws.company_id).then(setDeps, () => undefined);
    }, () => undefined);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (needsEnd && !end) { setError("Indiquez la date de fin du contrat."); return; }
    setBusy(true);
    try {
      const r = await hr.hire({
        applicationId, hireDate, contractType: type, departmentId: dep || null,
        salary: salary ? Number(salary.replace(/\s/g, "")) : null, trialEnd: trial || null, endDate: end || null,
      });
      onDone(r.employee_id);
    } catch (err) {
      setError(hrErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal title={`Embaucher ${candidateName}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Label text="Date d'embauche" required><input type="date" required value={hireDate} onChange={(e) => setHireDate(e.target.value)} className={field} /></Label>
          <Label text="Contrat" required>
            <select value={type} onChange={(e) => setType(e.target.value as ContractType)} className={field}>
              {CONTRACT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Label>
          {needsEnd && <Label text="Fin du contrat" required><input type="date" required value={end} min={hireDate} onChange={(e) => setEnd(e.target.value)} className={field} /></Label>}
          <Label text="Fin de la période d'essai"><input type="date" value={trial} min={hireDate} onChange={(e) => setTrial(e.target.value)} className={field} /></Label>
          <Label text="Salaire de base mensuel (GNF)"><input inputMode="numeric" value={salary} onChange={(e) => setSalary(e.target.value.replace(/[^\d\s]/g, ""))} className={field} /></Label>
          <Label text="Service">
            <select value={dep} onChange={(e) => setDep(e.target.value)} className={field}>
              <option value="">Aucun</option>
              {deps.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Label>
        </div>
        <p className="text-xs text-slate-500">La candidature passe à « Retenue » et le candidat est prévenu. Vous compléterez sa fiche (responsable, matricule…) ensuite.</p>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" onClick={onClose} className={btnGhost}>Annuler</button>
          <button type="submit" disabled={busy} className={btnPrimary}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Confirmer l&apos;embauche</button>
        </div>
      </form>
    </Modal>
  );
}
