import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Building2, ArrowRight } from "lucide-react";
import { hr, type Workspace } from "../../lib/hr";

/** Affiché aux candidats reliés à une entreprise ProJob+ (employé ou gestionnaire RH). */
export default function EmployeeSpaceBanner() {
  const [list, setList] = useState<Workspace[]>([]);
  useEffect(() => { hr.workspaces().then(setList, () => undefined); }, []);
  const mine = list.filter((w) => w.enabled && (w.employee_id || w.role === "rh"));
  if (!mine.length) return null;
  const staff = mine.some((w) => w.role === "rh");
  return (
    <Link to="/mon-espace-rh" className="mb-8 flex items-center justify-between gap-4 rounded-2xl border-2 border-[#050FA0]/20 bg-white px-5 py-4 hover:border-[#050FA0] transition-colors">
      <span className="flex items-center gap-4 min-w-0">
        <span className="h-12 w-12 rounded-xl bg-[#050FA0]/10 text-[#050FA0] grid place-items-center shrink-0"><Building2 className="h-6 w-6" /></span>
        <span className="min-w-0">
          <span className="block text-lg font-bold text-slate-900">Mon espace employé{staff ? " et gestion RH" : ""}</span>
          <span className="block text-sm text-slate-600 truncate">{mine.map((w) => w.company_name).join(", ")} · congés, contrat, demandes de l&apos;équipe</span>
        </span>
      </span>
      <ArrowRight className="h-5 w-5 text-[#050FA0] shrink-0" />
    </Link>
  );
}
