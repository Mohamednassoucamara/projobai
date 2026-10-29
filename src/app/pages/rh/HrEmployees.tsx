import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Search, UserPlus, Loader2, Smartphone, Download } from "lucide-react";
import HrShell, { useWorkspace, card, btnAccent, btnGhost, field, Modal, Pill } from "./HrShell";
import { EmployeeForm } from "./HrForms";
import { hr, hrErrorMessage, fullName, fmtDate, STATUS_LABELS, type Contract, type Department, type Employee, type EmployeeStatus } from "../../../lib/hr";

function csvCell(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function EmployeesBody() {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<Employee[] | null>(null);
  const [deps, setDeps] = useState<Department[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [dep, setDep] = useState("");
  const [status, setStatus] = useState<"" | EmployeeStatus | "en_poste">("en_poste");
  const creating = params.get("nouveau") === "1";

  const load = useCallback(() => {
    Promise.all([hr.employees(ws.company_id), hr.departments(ws.company_id), hr.currentContracts(ws.company_id)]).then(
      ([e, d, c]) => { setRows(e); setDeps(d); setContracts(c); },
      (err) => setError(hrErrorMessage(err)),
    );
  }, [ws.company_id]);
  useEffect(load, [load]);

  const depName = useMemo(() => Object.fromEntries(deps.map((d) => [d.id, d.name])), [deps]);
  const byId = useMemo(() => Object.fromEntries((rows || []).map((e) => [e.id, e])), [rows]);
  const contractOf = useMemo(() => Object.fromEntries(contracts.map((c) => [c.employee_id, c])), [contracts]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (rows || []).filter((e) =>
      (!dep || e.department_id === dep)
      && (status === "" || (status === "en_poste" ? e.status !== "sorti" : e.status === status))
      && (!needle || [fullName(e), e.job_title, e.email, e.phone, e.matricule].some((v) => v?.toLowerCase().includes(needle))));
  }, [rows, q, dep, status]);

  const exportCsv = () => {
    const head = ["Matricule", "Prénom", "Nom", "Poste", "Service", "Responsable", "Contrat", "Embauche", "Statut", "E-mail", "Téléphone"];
    const lines = shown.map((e) => [
      e.matricule, e.first_name, e.last_name, e.job_title, e.department_id ? depName[e.department_id] : "",
      e.manager_id && byId[e.manager_id] ? fullName(byId[e.manager_id]) : "", contractOf[e.id]?.contract_type || "",
      fmtDate(e.hire_date), STATUS_LABELS[e.status].label, e.email, e.phone,
    ].map(csvCell).join(";"));
    const blob = new Blob(["﻿" + [head.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `employes-${ws.company_name.replace(/[^\w-]+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const closeCreate = () => { params.delete("nouveau"); setParams(params, { replace: true }); };

  if (error) return <p role="alert" className="text-red-700">{error}</p>;
  if (!rows) return <div className="py-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#050FA0]" /></div>;

  return (
    <>
      <div className={`${card} p-4 mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] items-center`}>
        <label className="relative block">
          <span className="sr-only">Rechercher</span>
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, poste, téléphone, matricule…" className={`${field} pl-9`} />
        </label>
        <label className="block">
          <span className="sr-only">Service</span>
          <select value={dep} onChange={(e) => setDep(e.target.value)} className={field}>
            <option value="">Tous les services</option>
            {deps.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="sr-only">Statut</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={field}>
            <option value="en_poste">En poste</option>
            <option value="">Tous</option>
            {(Object.keys(STATUS_LABELS) as EmployeeStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s].label}</option>)}
          </select>
        </label>
        <button type="button" onClick={exportCsv} disabled={!shown.length} className={btnGhost}><Download className="h-4 w-4" /> Exporter</button>
      </div>

      {shown.length === 0 ? (
        <div className={`${card} p-10 text-center text-slate-600`}>
          {rows.length === 0 ? "Aucun employé pour l'instant." : "Aucun employé ne correspond à ces filtres."}
        </div>
      ) : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-slate-500 border-b bg-slate-50/60">
                <th className="py-3 px-4 font-semibold">Employé</th>
                <th className="py-3 px-3 font-semibold">Service</th>
                <th className="py-3 px-3 font-semibold">Responsable</th>
                <th className="py-3 px-3 font-semibold">Contrat</th>
                <th className="py-3 px-3 font-semibold">Embauche</th>
                <th className="py-3 px-4 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => {
                const c = contractOf[e.id];
                return (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/rh/employes/${e.id}`)}>
                    <td className="py-3 px-4">
                      <Link to={`/rh/employes/${e.id}`} className="font-bold text-slate-900 hover:text-[#050FA0]" onClick={(ev) => ev.stopPropagation()}>{fullName(e)}</Link>
                      <span className="flex items-center gap-1.5 text-slate-500">
                        {e.job_title || "Poste non renseigné"}
                        {e.user_id && <Smartphone className="h-3.5 w-3.5 text-emerald-600" aria-label="Compte ProJob relié" />}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700">{e.department_id ? depName[e.department_id] : "—"}</td>
                    <td className="py-3 px-3 text-slate-700">{e.manager_id && byId[e.manager_id] ? fullName(byId[e.manager_id]) : "—"}</td>
                    <td className="py-3 px-3 text-slate-700">
                      {c ? <>{c.contract_type}{c.end_date && <span className="block text-xs text-slate-500">jusqu&apos;au {fmtDate(c.end_date)}</span>}</> : <span className="text-amber-700">À saisir</span>}
                    </td>
                    <td className="py-3 px-3 text-slate-700 tabular-nums">{fmtDate(e.hire_date)}</td>
                    <td className="py-3 px-4"><Pill cls={STATUS_LABELS[e.status].cls}>{STATUS_LABELS[e.status].label}</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500 flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5 text-emerald-600" /> = compte ProJob relié : l&apos;employé a son espace en ligne et sur WhatsApp.</p>

      {creating && (
        <Modal title="Nouvel employé" onClose={closeCreate} wide>
          <EmployeeForm
            companyId={ws.company_id}
            departments={deps}
            employees={rows}
            onCancel={closeCreate}
            onSaved={(e) => navigate(`/rh/employes/${e.id}?contrat=1`, { replace: true })}
          />
        </Modal>
      )}
    </>
  );
}

export default function HrEmployeesPage() {
  return (
    <HrShell title="Employés" actions={<Link to="/rh/employes?nouveau=1" className={btnAccent}><UserPlus className="h-4 w-4" /> Ajouter un employé</Link>}>
      <EmployeesBody />
    </HrShell>
  );
}
