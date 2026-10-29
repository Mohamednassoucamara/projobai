// ProJob+ Paie : paies mensuelles, bulletins, états. Les calculs sont faits dans la base (migration 015).
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typedClient } from "./supabase";
import { drawPayslips, monthLabel, money } from "../../supabase/functions/_shared/payslipPdf";

export { monthLabel, money };

const supabase = typedClient as unknown as SupabaseClient;

export interface PayrollSettings {
  company_id: string;
  cnss_employee_rate: number;
  cnss_employer_rate: number;
  cnss_ceiling: number;
  cnss_floor: number;
  rts_brackets: { upto: number | null; rate: number }[];
  rts_deduct_cnss: boolean;
  apprenticeship_rate: number;
  other_employer_rate: number;
  overtime_weekday_rate: number;
  overtime_sunday_rate: number;
  overtime_night_rate: number;
  overtime_holiday_rate: number;
  monthly_hours: number;
  cnss_number: string | null;
}

export interface PayrollRun {
  id: string;
  company_id: string;
  period: string;
  status: "brouillon" | "cloturee";
  settings: PayrollSettings | null;
  closed_at: string | null;
  created_at: string;
}

export interface Bonus { label: string; amount: number; taxable?: boolean; cnss?: boolean }
export interface Deduction { label: string; amount: number }

export interface Payslip {
  id: string;
  run_id: string;
  company_id: string;
  employee_id: string;
  base_salary: number;
  unpaid_days: number;
  month_working_days: number;
  ot_weekday_hours: number;
  ot_sunday_hours: number;
  ot_night_hours: number;
  ot_holiday_hours: number;
  bonuses: Bonus[];
  deductions: Deduction[];
  note: string | null;
  absence_amount: number;
  overtime_amount: number;
  bonuses_total: number;
  gross: number;
  cnss_base: number;
  cnss_employee: number;
  cnss_employer: number;
  taxable: number;
  rts: number;
  deductions_total: number;
  net: number;
  apprenticeship: number;
  other_employer: number;
  employer_cost: number;
  snapshot: {
    name: string; matricule: string | null; job_title: string | null; contract_type: string | null; hire_date: string | null;
    cnss_number: string | null; department: string | null; payment_method: string | null; payment_account: string | null;
  } | null;
  payroll_runs?: { period: string; status: string; settings: PayrollSettings | null } | null;
}

export type PayslipInput = Pick<Payslip, "base_salary" | "unpaid_days" | "ot_weekday_hours" | "ot_sunday_hours" | "ot_night_hours" | "ot_holiday_hours" | "bonuses" | "deductions" | "note">;

export const monthStart = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

const ERRORS: Record<string, string> = {
  not_allowed: "Vous n'avez pas les droits pour cette action (paie réservée au compte entreprise et aux gestionnaires RH, avec ProJob+).",
  payroll_closed: "Cette paie est clôturée : elle ne peut plus être modifiée.",
  payroll_empty: "Aucun bulletin dans cette paie.",
  negative_net: "Un bulletin a un net négatif : réduisez les retenues (avances…) avant de clôturer.",
};
export function payrollErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : String(err || "");
  const miss = raw.match(/missing_salary:(.*)$/);
  if (miss) return `Salaire de base à 0 pour : ${miss[1]}. Saisissez leur contrat ou retirez-les de la paie avant de clôturer.`;
  for (const [code, msg] of Object.entries(ERRORS)) if (raw.includes(code)) return msg;
  if (/payroll_|payslips/.test(raw) && /does not exist/.test(raw)) return "La paie n'est pas encore installée : exécutez la migration 015 dans Supabase.";
  if (/permission denied|row-level security/i.test(raw)) return ERRORS.not_allowed;
  return "L'opération n'a pas abouti. Vérifiez votre connexion et réessayez.";
}

function check<T>({ data, error }: { data: T; error: unknown }): T {
  if (error) throw error;
  return data;
}

export const payroll = {
  settings: async (company: string) => check(await supabase.rpc("payroll_get_settings", { p_company: company })) as PayrollSettings,
  saveSettings: async (company: string, patch: Partial<PayrollSettings>) => {
    check(await supabase.from("payroll_settings").update(patch).eq("company_id", company));
  },
  runs: async (company: string) =>
    check(await supabase.from("payroll_runs").select("*").eq("company_id", company).order("period", { ascending: false })) as PayrollRun[],
  run: async (company: string, period: string) =>
    check(await supabase.from("payroll_runs").select("*").eq("company_id", company).eq("period", period).maybeSingle()) as PayrollRun | null,
  prepare: async (company: string, period: string) =>
    check(await supabase.rpc("payroll_prepare", { p_company: company, p_period: period })) as { run_id: string; added: number; working_days: number },
  payslips: async (runId: string) =>
    (check(await supabase.from("payslips").select("*").eq("run_id", runId)) as Payslip[])
      .sort((a, b) => (a.snapshot?.name || "").localeCompare(b.snapshot?.name || "", "fr")),
  updatePayslip: async (id: string, input: Partial<PayslipInput>) =>
    check(await supabase.from("payslips").update(input).eq("id", id).select().single()) as Payslip,
  removePayslip: async (id: string) => { check(await supabase.rpc("payroll_remove_payslip", { p_payslip: id })); },
  close: async (runId: string) => check(await supabase.rpc("payroll_close", { p_run: runId })),
  reopen: async (runId: string) => { check(await supabase.rpc("payroll_reopen", { p_run: runId })); },
  deleteDraft: async (runId: string) => { check(await supabase.from("payroll_runs").delete().eq("id", runId)); },
  /** Bulletins de l'employé connecté (paies clôturées uniquement, filtré par la base). */
  myPayslips: async (employeeId: string) =>
    (check(await supabase.from("payslips").select("*, payroll_runs(period, status, settings)").eq("employee_id", employeeId)) as Payslip[])
      .filter((p) => p.payroll_runs?.status === "cloturee")
      .sort((a, b) => (b.payroll_runs?.period || "").localeCompare(a.payroll_runs?.period || "")),
};

// ---------------------------------------------------------------------------
// Exports CSV (séparateur ; pour Excel en français)

function csv(rows: (string | number | null | undefined)[][]) {
  return "﻿" + rows.map((r) => r.map((v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(";")).join("\n");
}
function download(name: string, content: string | Blob, type = "text/csv;charset=utf-8") {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function exportPayrollBook(company: string, run: PayrollRun, slips: Payslip[]) {
  const head = ["Matricule", "Employé", "Poste", "Salaire de base", "Absences", "Heures sup.", "Primes", "Brut", "Assiette CNSS",
    "CNSS salarié", "CNSS employeur", "Base imposable", "RTS", "Retenues", "Net à payer", "Taxe d'apprentissage", "Coût employeur", "Paiement"];
  const rows = slips.map((p) => [p.snapshot?.matricule, p.snapshot?.name, p.snapshot?.job_title, p.base_salary, p.absence_amount, p.overtime_amount,
    p.bonuses_total, p.gross, p.cnss_base, p.cnss_employee, p.cnss_employer, p.taxable, p.rts, p.deductions_total, p.net, p.apprenticeship,
    p.employer_cost, [p.snapshot?.payment_method, p.snapshot?.payment_account].filter(Boolean).join(" ")]);
  const t = (k: keyof Payslip) => slips.reduce((s, p) => s + Number(p[k] || 0), 0);
  rows.push(["", "TOTAL", "", t("base_salary"), t("absence_amount"), t("overtime_amount"), t("bonuses_total"), t("gross"), t("cnss_base"),
    t("cnss_employee"), t("cnss_employer"), t("taxable"), t("rts"), t("deductions_total"), t("net"), t("apprenticeship"), t("employer_cost"), ""]);
  download(`livre-de-paie-${run.period.slice(0, 7)}-${slug(company)}.csv`, csv([head, ...rows]));
}

export function exportCnss(company: string, run: PayrollRun, slips: Payslip[], settings?: PayrollSettings | null) {
  const s = run.settings || settings;
  const head = ["N° CNSS", "Matricule", "Employé", "Salaire brut", "Assiette CNSS", `Part salariale (${s?.cnss_employee_rate ?? ""} %)`, `Part patronale (${s?.cnss_employer_rate ?? ""} %)`, "Total"];
  const rows = slips.map((p) => [p.snapshot?.cnss_number, p.snapshot?.matricule, p.snapshot?.name, p.gross, p.cnss_base, p.cnss_employee, p.cnss_employer, p.cnss_employee + p.cnss_employer]);
  const t = (k: keyof Payslip) => slips.reduce((x, p) => x + Number(p[k] || 0), 0);
  rows.push(["", "", "TOTAL", t("gross"), t("cnss_base"), t("cnss_employee"), t("cnss_employer"), t("cnss_employee") + t("cnss_employer")]);
  download(`etat-cnss-${run.period.slice(0, 7)}-${slug(company)}.csv`, csv([[`Employeur : ${company}`, s?.cnss_number ? `N° CNSS employeur : ${s.cnss_number}` : "", `Période : ${monthLabel(run.period)}`], [], head, ...rows]));
}

export function exportRts(company: string, run: PayrollRun, slips: Payslip[]) {
  const head = ["Matricule", "Employé", "Salaire brut", "Base imposable", "Retenue sur salaire (RTS)"];
  const rows = slips.map((p) => [p.snapshot?.matricule, p.snapshot?.name, p.gross, p.taxable, p.rts]);
  const t = (k: keyof Payslip) => slips.reduce((x, p) => x + Number(p[k] || 0), 0);
  rows.push(["", "TOTAL", t("gross"), t("taxable"), t("rts")]);
  download(`etat-rts-${run.period.slice(0, 7)}-${slug(company)}.csv`, csv([[`Employeur : ${company}`, `Période : ${monthLabel(run.period)}`], [], head, ...rows]));
}

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "_");

// ---------------------------------------------------------------------------
// Bulletin de paie PDF (un ou plusieurs bulletins dans le même fichier)

export async function payslipsPdf(company: { name: string; address?: string | null }, period: string, slips: Payslip[], settings?: PayrollSettings | null, fileName?: string) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  drawPayslips(pdf, company, period, slips, settings);
  const blob = pdf.output("blob");
  download(fileName || `bulletins-${period.slice(0, 7)}-${slug(company.name)}.pdf`, blob, "application/pdf");
}
