// ProJob+ (SIRH) : employés, contrats, congés. Les règles et contrôles d'accès sont dans la base (migration 014).
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typedClient } from "./supabase";

const supabase = typedClient as unknown as SupabaseClient;

export type HrRole = "admin" | "rh" | "manager" | "employee";
export type EmployeeStatus = "actif" | "essai" | "suspendu" | "sorti";
export type ContractType = "CDI" | "CDD" | "Stage" | "Prestation" | "Apprentissage";
export type LeaveStatus = "en_attente" | "validee_responsable" | "approuvee" | "refusee" | "annulee";

export interface Workspace {
  company_id: string;
  company_name: string;
  logo_url: string | null;
  role: HrRole | null;
  employee_id: string | null;
  enabled: boolean;
}

export interface Department { id: string; company_id: string; name: string; parent_id: string | null }

export interface Employee {
  id: string;
  company_id: string;
  user_id: string | null;
  application_id: string | null;
  matricule: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  gender: "F" | "M" | null;
  birth_date: string | null;
  address: string | null;
  job_title: string | null;
  department_id: string | null;
  manager_id: string | null;
  hire_date: string;
  status: EmployeeStatus;
  exit_date: string | null;
  exit_reason: string | null;
  emergency_contact: string | null;
  notes: string | null;
  cnss_number?: string | null;
  payment_method?: string | null;
  payment_account?: string | null;
  created_at: string;
}

export interface Contract {
  id: string;
  company_id: string;
  employee_id: string;
  contract_type: ContractType;
  job_title: string | null;
  start_date: string;
  end_date: string | null;
  trial_end_date: string | null;
  base_salary_gnf: number | null;
  weekly_hours: number | null;
  notes: string | null;
  is_current: boolean;
  created_at: string;
}

export interface LeaveType {
  id: string;
  company_id: string;
  code: string;
  name: string;
  is_paid: boolean;
  deducts_balance: boolean;
  monthly_accrual: number;
  requires_document: boolean;
  is_active: boolean;
  sort: number;
}

export interface LeaveRequest {
  id: string;
  company_id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: LeaveStatus;
  decision_note: string | null;
  source: "web" | "whatsapp" | "rh";
  created_at: string;
  manager_decided_at: string | null;
  hr_decided_at: string | null;
  hr_employees?: { first_name: string; last_name: string; job_title: string | null; manager_id: string | null } | null;
  hr_leave_types?: { name: string; code: string } | null;
}

export interface LeaveBalance {
  leave_type_id: string;
  code: string;
  name: string;
  deducts_balance: boolean;
  months: number;
  acquired: number;
  adjustments: number;
  taken: number;
  pending: number;
  available: number | null;
}

export interface Holiday { id: string; company_id: string | null; day: string; name: string }

export interface HrMember { user_id: string; full_name: string; email: string; role: string; created_at: string }

export interface HrDashboard {
  headcount: number;
  on_trial: number;
  with_account: number;
  on_leave_today: number;
  pending_requests: number;
  to_approve: number;
  contracts_ending: { employee_id: string; name: string; contract_type: string; end_date: string }[];
  trials_ending: { employee_id: string; name: string; trial_end_date: string }[];
  absent_today: { employee_id: string; name: string; type: string; end_date: string }[];
}

// ---------------------------------------------------------------------------
// Libellés

export const ROLE_LABELS: Record<HrRole, string> = {
  admin: "Administrateur",
  rh: "Gestionnaire RH",
  manager: "Responsable d'équipe",
  employee: "Employé",
};

export const STATUS_LABELS: Record<EmployeeStatus, { label: string; cls: string }> = {
  actif: { label: "Actif", cls: "bg-emerald-100 text-emerald-800" },
  essai: { label: "Période d'essai", cls: "bg-sky-100 text-sky-800" },
  suspendu: { label: "Suspendu", cls: "bg-amber-100 text-amber-800" },
  sorti: { label: "Sorti", cls: "bg-slate-100 text-slate-600" },
};

export const LEAVE_STATUS: Record<LeaveStatus, { label: string; cls: string }> = {
  en_attente: { label: "Chez le responsable", cls: "bg-amber-100 text-amber-800" },
  validee_responsable: { label: "À approuver par les RH", cls: "bg-sky-100 text-sky-800" },
  approuvee: { label: "Approuvé", cls: "bg-emerald-100 text-emerald-800" },
  refusee: { label: "Refusé", cls: "bg-red-100 text-red-700" },
  annulee: { label: "Annulé", cls: "bg-slate-100 text-slate-600" },
};

export const CONTRACT_TYPES: ContractType[] = ["CDI", "CDD", "Stage", "Prestation", "Apprentissage"];

export const fullName = (e: Pick<Employee, "first_name" | "last_name">) => `${e.first_name} ${e.last_name}`.trim();

export const fmtDate = (iso: string | null | undefined, long = false) =>
  iso
    ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", long ? { day: "numeric", month: "long", year: "numeric" } : { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

export const fmtPeriod = (start: string, end: string) => (start === end ? `le ${fmtDate(start)}` : `du ${fmtDate(start)} au ${fmtDate(end)}`);

export const fmtDays = (n: number | null | undefined) => {
  if (n === null || n === undefined) return "—";
  const v = Number(n);
  const s = Number.isInteger(v) ? String(v) : v.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  return `${s} jour${Math.abs(v) > 1 ? "s" : ""}`;
};

export const gnfOrDash = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `${Math.round(Number(n)).toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")} GNF`;

export const today = () => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Erreurs

const ERRORS: Record<string, string> = {
  not_allowed: "Vous n'avez pas les droits pour cette action.",
  not_authenticated: "Votre session a expiré : reconnectez-vous.",
  sirh_disabled: "ProJob+ n'est pas actif pour cette entreprise.",
  employee_not_found: "Fiche employé introuvable.",
  employee_left: "Cet employé a quitté l'entreprise.",
  leave_type_not_found: "Type de congé introuvable.",
  invalid_dates: "La date de fin doit être après la date de début.",
  too_long: "Une demande ne peut pas dépasser un an.",
  too_old: "Impossible de déclarer un congé passé de plus de 60 jours : contactez les RH.",
  no_working_day: "Cette période ne contient aucun jour ouvré (week-end ou jours fériés).",
  overlap: "Une autre demande couvre déjà une partie de ces dates.",
  request_not_found: "Demande introuvable.",
  already_closed: "Cette demande est déjà clôturée.",
  application_not_found: "Candidature introuvable.",
  already_employee: "Ce candidat fait déjà partie de vos employés.",
  department_not_found: "Service introuvable.",
  account_not_found: "Aucun compte candidat ProJob avec cette adresse. La personne doit d'abord créer un compte gratuit sur projobai.com.",
};

export function hrErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : String(err || "");
  const bal = raw.match(/insufficient_balance:([-\d.]+)/);
  if (bal) return `Solde insuffisant : il reste ${fmtDays(Number(bal[1]))} disponible${Number(bal[1]) > 1 ? "s" : ""}.`;
  for (const [code, msg] of Object.entries(ERRORS)) if (raw.includes(code)) return msg;
  if (/duplicate key.*matricule/i.test(raw)) return "Ce matricule est déjà utilisé.";
  if (/duplicate key.*hr_departments/i.test(raw)) return "Un service porte déjà ce nom.";
  if (/duplicate key.*uq_hr_employees_user/i.test(raw)) return "Ce compte est déjà relié à un autre employé.";
  if (/duplicate key.*uq_hr_holidays/i.test(raw)) return "Un jour férié existe déjà à cette date.";
  if (/row-level security|permission denied/i.test(raw)) return "Action refusée : vérifiez votre rôle ou votre abonnement ProJob+.";
  if (/function .* does not exist|relation .*hr_.* does not exist/i.test(raw)) return "ProJob+ n'est pas encore installé : exécutez la migration 014 dans Supabase.";
  return "L'opération n'a pas abouti. Vérifiez votre connexion et réessayez.";
}

function check<T>({ data, error }: { data: T; error: unknown }): T {
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// API

export const hr = {
  async workspaces(): Promise<Workspace[]> {
    const { data, error } = await supabase.rpc("hr_my_workspaces");
    if (error) throw error;
    return (data || []) as Workspace[];
  },
  ensureSetup: async (company: string) => { check(await supabase.rpc("hr_ensure_setup", { p_company: company })); },
  dashboard: async (company: string) => check(await supabase.rpc("hr_dashboard", { p_company: company })) as HrDashboard,

  // Services
  departments: async (company: string) =>
    check(await supabase.from("hr_departments").select("*").eq("company_id", company).order("name")) as Department[],
  addDepartment: async (company: string, name: string) =>
    check(await supabase.from("hr_departments").insert({ company_id: company, name: name.trim() }).select().single()) as Department,
  renameDepartment: async (id: string, name: string) => { check(await supabase.from("hr_departments").update({ name: name.trim() }).eq("id", id)); },
  deleteDepartment: async (id: string) => { check(await supabase.from("hr_departments").delete().eq("id", id)); },

  // Employés
  employees: async (company: string) =>
    check(await supabase.from("hr_employees").select("*").eq("company_id", company).order("last_name").order("first_name")) as Employee[],
  employee: async (id: string) => check(await supabase.from("hr_employees").select("*").eq("id", id).maybeSingle()) as Employee | null,
  createEmployee: async (row: Partial<Employee> & { company_id: string; first_name: string; last_name: string }) =>
    check(await supabase.from("hr_employees").insert(row).select().single()) as Employee,
  updateEmployee: async (id: string, patch: Partial<Employee>) =>
    check(await supabase.from("hr_employees").update(patch).eq("id", id).select().single()) as Employee,

  // Contrats
  contracts: async (employeeId: string) =>
    check(await supabase.from("hr_contracts").select("*").eq("employee_id", employeeId).order("start_date", { ascending: false })) as Contract[],
  currentContracts: async (company: string) =>
    check(await supabase.from("hr_contracts").select("*").eq("company_id", company).eq("is_current", true)) as Contract[],
  async addContract(row: Omit<Contract, "id" | "created_at" | "is_current"> & { is_current?: boolean }) {
    // Un nouveau contrat en cours remplace le précédent
    if (row.is_current !== false) {
      check(await supabase.from("hr_contracts").update({ is_current: false }).eq("employee_id", row.employee_id).eq("is_current", true));
    }
    return check(await supabase.from("hr_contracts").insert({ ...row, is_current: row.is_current !== false }).select().single()) as Contract;
  },
  updateContract: async (id: string, patch: Partial<Contract>) =>
    check(await supabase.from("hr_contracts").update(patch).eq("id", id).select().single()) as Contract,

  // Congés
  leaveTypes: async (company: string) =>
    check(await supabase.from("hr_leave_types").select("*").eq("company_id", company).order("sort")) as LeaveType[],
  updateLeaveType: async (id: string, patch: Partial<LeaveType>) => { check(await supabase.from("hr_leave_types").update(patch).eq("id", id)); },
  addLeaveType: async (company: string, name: string) => {
    const code = `perso_${Date.now().toString(36)}`;
    check(await supabase.from("hr_leave_types").insert({ company_id: company, code, name: name.trim(), sort: 50 }));
  },
  leaveRequests: async (company: string, opts: { employeeId?: string; statuses?: LeaveStatus[]; from?: string; to?: string } = {}) => {
    let q = supabase
      .from("hr_leave_requests")
      .select("*, hr_employees(first_name, last_name, job_title, manager_id), hr_leave_types(name, code)")
      .eq("company_id", company)
      .order("start_date", { ascending: false })
      .limit(500);
    if (opts.employeeId) q = q.eq("employee_id", opts.employeeId);
    if (opts.statuses?.length) q = q.in("status", opts.statuses);
    if (opts.from) q = q.gte("end_date", opts.from);
    if (opts.to) q = q.lte("start_date", opts.to);
    return check(await q) as LeaveRequest[];
  },
  balances: async (employeeId: string) => (check(await supabase.rpc("hr_leave_balances", { p_employee: employeeId })) || []) as LeaveBalance[],
  workingDays: async (company: string, start: string, end: string) =>
    Number(check(await supabase.rpc("hr_working_days", { p_company: company, p_start: start, p_end: end }))),
  requestLeave: async (p: { company: string; leaveType: string; start: string; end: string; reason?: string; employeeId?: string }) =>
    check(await supabase.rpc("hr_request_leave", {
      p_company: p.company, p_leave_type: p.leaveType, p_start: p.start, p_end: p.end,
      p_reason: p.reason || null, p_employee: p.employeeId || null, p_source: "web",
    })) as { id: string; status: LeaveStatus; days: number },
  decideLeave: async (id: string, approve: boolean, note?: string) =>
    check(await supabase.rpc("hr_decide_leave", { p_request: id, p_approve: approve, p_note: note || null })),
  cancelLeave: async (id: string) => check(await supabase.rpc("hr_cancel_leave", { p_request: id })),
  addAdjustment: async (row: { company_id: string; employee_id: string; leave_type_id: string; days: number; reason: string }) => {
    const { data: u } = await supabase.auth.getUser();
    check(await supabase.from("hr_leave_adjustments").insert({ ...row, created_by: u.user?.id }));
  },

  // Jours fériés
  holidays: async (company: string, year: number) =>
    check(await supabase.from("hr_holidays").select("*")
      .or(`company_id.is.null,company_id.eq.${company}`)
      .gte("day", `${year}-01-01`).lte("day", `${year}-12-31`).order("day")) as Holiday[],
  addHoliday: async (company: string, day: string, name: string) => {
    check(await supabase.from("hr_holidays").insert({ company_id: company, day, name: name.trim() }));
  },
  deleteHoliday: async (id: string) => { check(await supabase.from("hr_holidays").delete().eq("id", id)); },

  // Équipe RH
  members: async (company: string) => (check(await supabase.rpc("hr_list_members", { p_company: company })) || []) as HrMember[],
  addMember: async (email: string) => check(await supabase.rpc("hr_add_member", { p_email: email })) as { user_id: string; full_name: string },
  removeMember: async (company: string, userId: string) => {
    check(await supabase.from("hr_members").delete().eq("company_id", company).eq("user_id", userId));
  },

  // Embauche depuis une candidature
  hire: async (p: { applicationId: string; hireDate: string; contractType: ContractType; salary?: number | null; departmentId?: string | null; trialEnd?: string | null; endDate?: string | null }) =>
    check(await supabase.rpc("hr_hire_from_application", {
      p_application: p.applicationId, p_hire_date: p.hireDate, p_contract_type: p.contractType,
      p_salary: p.salary ?? null, p_department: p.departmentId || null, p_trial_end: p.trialEnd || null, p_end_date: p.endDate || null,
    })) as { employee_id: string },
  employeeForApplication: async (applicationId: string) =>
    check(await supabase.from("hr_employees").select("id, status").eq("application_id", applicationId).maybeSingle()) as { id: string; status: EmployeeStatus } | null,
};
