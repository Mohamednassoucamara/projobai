import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { Loader2, LayoutDashboard, Users, CalendarDays, Network, Settings, X, Building2, AlertCircle } from "lucide-react";
import DashboardHeader from "../../components/DashboardHeader";
import Footer from "../../components/Footer";
import { PremiumUpsell } from "../../components/PremiumGate";
import { hr, hrErrorMessage, ROLE_LABELS, type Workspace } from "../../../lib/hr";

export const field = "w-full px-3 py-2.5 rounded-lg border-2 border-slate-200 focus:border-[#050FA0] outline-none bg-white text-sm";
export const btnPrimary = "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#050FA0] text-white text-sm font-bold hover:bg-[#0A16C0] disabled:opacity-60";
export const btnAccent = "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#E4220F] to-[#F92813] text-white text-sm font-bold shadow-lg shadow-[#E4220F]/20 disabled:opacity-60";
export const btnGhost = "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-bold hover:border-[#050FA0] hover:text-[#050FA0] disabled:opacity-60";
export const card = "bg-white rounded-2xl border-2 border-slate-100";

const WorkspaceContext = createContext<Workspace | null>(null);
/** Entreprise ouverte dans l'espace RH (staff uniquement). */
export const useWorkspace = () => {
  const ws = useContext(WorkspaceContext);
  if (!ws) throw new Error("useWorkspace hors de HrShell");
  return ws;
};

const STORAGE_KEY = "projob_rh_company";

/** Charge les espaces de l'utilisateur ; retient l'entreprise choisie s'il en gère plusieurs. */
export function useWorkspaces() {
  const [list, setList] = useState<Workspace[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    hr.workspaces().then(setList, (e) => { setError(hrErrorMessage(e)); setList([]); });
  }, []);
  return { list, error };
}

const TABS = [
  { to: "/rh", label: "Tableau de bord", icon: LayoutDashboard, end: true },
  { to: "/rh/employes", label: "Employés", icon: Users },
  { to: "/rh/conges", label: "Congés", icon: CalendarDays },
  { to: "/rh/organigramme", label: "Organigramme", icon: Network },
  { to: "/rh/parametres", label: "Paramètres", icon: Settings },
];

/** Cadre commun des pages ProJob+ RH : en-tête, onglets, contrôle du rôle et de l'abonnement. */
export default function HrShell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  const { list, error } = useWorkspaces();
  const staff = (list || []).filter((w) => w.role === "admin" || w.role === "rh");
  const [companyId, setCompanyId] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });
  const ws = staff.find((w) => w.company_id === companyId) || staff.find((w) => w.role === "admin") || staff[0] || null;
  const setupDone = useRef<string | null>(null);

  useEffect(() => {
    if (ws?.enabled && setupDone.current !== ws.company_id) {
      setupDone.current = ws.company_id;
      void hr.ensureSetup(ws.company_id).catch(() => undefined);
    }
  }, [ws?.company_id, ws?.enabled]);

  const choose = (id: string) => {
    setCompanyId(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* stockage indisponible */ }
  };

  let body: ReactNode;
  if (list === null) {
    body = <div className="py-20 flex justify-center"><Loader2 className="h-9 w-9 animate-spin text-[#050FA0]" /></div>;
  } else if (error) {
    body = <p role="alert" className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</p>;
  } else if (!ws) {
    body = (
      <div className={`${card} p-8 text-center max-w-xl mx-auto`}>
        <Building2 className="h-10 w-10 text-slate-400 mx-auto" />
        <h2 className="mt-3 text-xl font-bold text-slate-900">Espace réservé aux RH</h2>
        <p className="mt-2 text-slate-600">La gestion RH ProJob+ est accessible au compte entreprise et aux gestionnaires RH qu&apos;il a ajoutés.</p>
        {(list || []).some((w) => w.employee_id) && (
          <Link to="/mon-espace-rh" className={`${btnPrimary} mt-5`}>Ouvrir mon espace employé</Link>
        )}
      </div>
    );
  } else if (!ws.enabled) {
    body = (
      <PremiumUpsell
        feature="sirh"
        description={ws.role === "admin"
          ? "Gérez vos employés, leurs contrats et leurs congés, avec un espace employé sur le web et WhatsApp."
          : `L'abonnement ProJob+ de ${ws.company_name} n'est pas actif : le compte entreprise doit le renouveler.`}
      />
    );
  } else {
    body = <WorkspaceContext.Provider value={ws}>{children}</WorkspaceContext.Provider>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardHeader />
      <main className="page-container py-6 sm:py-10 flex-1 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#E4220F] tracking-wide">
              ProJob+ RH{ws ? ` · ${ws.company_name}` : ""}
              {ws?.role === "rh" && <span className="ml-2 text-xs font-semibold text-slate-500">({ROLE_LABELS.rh})</span>}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{title}</h1>
            {subtitle && <p className="text-slate-600 mt-1">{subtitle}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {staff.length > 1 && ws && (
              <label className="text-sm">
                <span className="sr-only">Entreprise</span>
                <select value={ws.company_id} onChange={(e) => choose(e.target.value)} className={`${field} w-auto`}>
                  {staff.map((w) => <option key={w.company_id} value={w.company_id}>{w.company_name}</option>)}
                </select>
              </label>
            )}
            {ws?.enabled && actions}
          </div>
        </div>
        {ws?.enabled && (
          <nav aria-label="Sections RH" className="mb-6 -mx-4 px-4 overflow-x-auto">
            <ul className="flex gap-1 min-w-max border-b-2 border-slate-200">
              {TABS.map((t) => (
                <li key={t.to}>
                  <NavLink
                    to={t.to}
                    end={t.end}
                    className={({ isActive }) =>
                      `inline-flex items-center gap-2 px-4 py-2.5 -mb-[2px] border-b-2 text-sm font-bold whitespace-nowrap ${isActive ? "border-[#050FA0] text-[#050FA0]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                  >
                    <t.icon className="h-4 w-4" /> {t.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
        {body}
      </main>
      <Footer />
    </div>
  );
}

/** Fenêtre modale simple et accessible (Échap ferme, focus dans la fenêtre). */
export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={`bg-white w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"} rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto`}>
        <div className="sticky top-0 bg-white flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="p-2 -mr-2 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 sm:px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="flex gap-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {children}
    </p>
  );
}

export function Pill({ cls, children }: { cls: string; children: ReactNode }) {
  return <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${cls}`}>{children}</span>;
}

export function Label({ text, required, children, hint }: { text: string; required?: boolean; children: ReactNode; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="block font-semibold text-slate-700 mb-1">{text}{required && <span className="text-[#E4220F]"> *</span>}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500 mt-1">{hint}</span>}
    </label>
  );
}
