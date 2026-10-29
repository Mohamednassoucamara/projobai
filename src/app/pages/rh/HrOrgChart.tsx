import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Loader2, Users } from "lucide-react";
import HrShell, { useWorkspace, card, field } from "./HrShell";
import { hr, hrErrorMessage, fullName, type Department, type Employee } from "../../../lib/hr";

type Node = Employee & { children: Node[] };

function Person({ e, dep }: { e: Employee; dep?: string }) {
  return (
    <Link to={`/rh/employes/${e.id}`} className="inline-flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-3 py-2 hover:border-[#050FA0] min-w-[220px]">
      <span className="h-9 w-9 rounded-lg bg-[#050FA0]/10 text-[#050FA0] font-bold text-sm grid place-items-center shrink-0">{(e.first_name[0] || "") + (e.last_name[0] || "")}</span>
      <span className="min-w-0 text-left">
        <span className="block font-bold text-slate-900 text-sm truncate">{fullName(e)}</span>
        <span className="block text-xs text-slate-500 truncate">{e.job_title || "—"}{dep ? ` · ${dep}` : ""}</span>
      </span>
    </Link>
  );
}

function Branch({ node, deps, depth }: { node: Node; deps: Record<string, string>; depth: number }) {
  return (
    <li className="relative">
      <Person e={node} dep={node.department_id ? deps[node.department_id] : undefined} />
      {node.children.length > 0 && (
        <ul className={`mt-2 ml-5 pl-5 space-y-2 border-l-2 ${depth % 2 ? "border-[#E4220F]/25" : "border-[#050FA0]/20"}`}>
          {node.children.map((c) => <Branch key={c.id} node={c} deps={deps} depth={depth + 1} />)}
        </ul>
      )}
    </li>
  );
}

function OrgBody() {
  const ws = useWorkspace();
  const [rows, setRows] = useState<Employee[] | null>(null);
  const [deps, setDeps] = useState<Department[]>([]);
  const [dep, setDep] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([hr.employees(ws.company_id), hr.departments(ws.company_id)]).then(
      ([e, d]) => { setRows(e.filter((x) => x.status !== "sorti")); setDeps(d); },
      (err) => setError(hrErrorMessage(err)),
    );
  }, [ws.company_id]);

  const depName = useMemo(() => Object.fromEntries(deps.map((d) => [d.id, d.name])), [deps]);
  const roots = useMemo(() => {
    const list = (rows || []).filter((e) => !dep || e.department_id === dep);
    const ids = new Set(list.map((e) => e.id));
    const byId = new Map<string, Node>(list.map((e) => [e.id, { ...e, children: [] }]));
    const top: Node[] = [];
    for (const n of byId.values()) {
      const parent = n.manager_id && ids.has(n.manager_id) ? byId.get(n.manager_id) : null;
      (parent ? parent.children : top).push(n);
    }
    const sort = (a: Node[]) => { a.sort((x, y) => fullName(x).localeCompare(fullName(y), "fr")); a.forEach((n) => sort(n.children)); };
    sort(top);
    // Les responsables d'équipe d'abord
    return top.sort((a, b) => b.children.length - a.children.length);
  }, [rows, dep]);

  if (error) return <p role="alert" className="text-red-700">{error}</p>;
  if (!rows) return <div className="py-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#050FA0]" /></div>;

  return (
    <section className={`${card} p-5 sm:p-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <p className="text-sm text-slate-600 flex items-center gap-2"><Users className="h-4 w-4" /> Construit à partir du « responsable direct » de chaque fiche.</p>
        <label className="text-sm">
          <span className="sr-only">Service</span>
          <select value={dep} onChange={(e) => setDep(e.target.value)} className={`${field} w-auto`}>
            <option value="">Toute l&apos;entreprise</option>
            {deps.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
      </div>
      {roots.length === 0 ? <p className="text-slate-500">Aucun employé {dep ? "dans ce service" : "pour l'instant"}.</p> : (
        <div className="overflow-x-auto pb-2">
          <ul className="space-y-3 min-w-max">
            {roots.map((n) => <Branch key={n.id} node={n} deps={depName} depth={0} />)}
          </ul>
        </div>
      )}
    </section>
  );
}

export default function HrOrgChartPage() {
  return (
    <HrShell title="Organigramme">
      <OrgBody />
    </HrShell>
  );
}
