// ProJob+ Paie : paies mensuelles, bulletins, états. Les calculs sont faits dans la base (migration 015).
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typedClient } from "./supabase";

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

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const monthLabel = (period: string) => { const [y, m] = period.split("-").map(Number); return `${MONTHS[m - 1]} ${y}`; };
export const monthStart = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
export const money = (n: number | null | undefined) => `${Math.round(Number(n || 0)).toLocaleString("fr-FR").replace(/ | /g, " ")} GNF`;
const num = (n: number | null | undefined) => Math.round(Number(n || 0)).toLocaleString("fr-FR").replace(/ | /g, " ");

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
  const W = 210, M = 15;
  const blue: [number, number, number] = [5, 15, 160], red: [number, number, number] = [228, 34, 15], grey: [number, number, number] = [100, 116, 139];
  const font = (style: "normal" | "bold", size: number, color: [number, number, number] = [15, 23, 42]) => {
    pdf.setFont("helvetica", style); pdf.setFontSize(size); pdf.setTextColor(...color);
  };

  slips.forEach((p, i) => {
    if (i > 0) pdf.addPage();
    const s = p.snapshot;
    // En-tête
    pdf.setFillColor(...blue); pdf.rect(0, 0, W, 26, "F");
    font("bold", 16, [255, 255, 255]); pdf.text("BULLETIN DE PAIE", M, 12);
    font("normal", 10, [255, 255, 255]); pdf.text(`Période : ${monthLabel(period)}`, M, 19);
    font("bold", 11, [255, 255, 255]); pdf.text(company.name, W - M, 12, { align: "right" });
    if (settings?.cnss_number) { font("normal", 9, [255, 255, 255]); pdf.text(`N° CNSS employeur : ${settings.cnss_number}`, W - M, 19, { align: "right" }); }

    // Employé
    let y = 36;
    pdf.setDrawColor(226, 232, 240); pdf.roundedRect(M, y - 6, W - 2 * M, 30, 2, 2);
    font("bold", 12); pdf.text(s?.name || "", M + 4, y);
    font("normal", 9, grey);
    const left = [`Poste : ${s?.job_title || "—"}`, `Contrat : ${s?.contract_type || "—"}`, `Service : ${s?.department || "—"}`];
    const right = [`Matricule : ${s?.matricule || "—"}`, `N° CNSS : ${s?.cnss_number || "—"}`, `Embauche : ${s?.hire_date ? s.hire_date.split("-").reverse().join("/") : "—"}`];
    left.forEach((t, k) => pdf.text(t, M + 4, y + 7 + k * 5.5));
    right.forEach((t, k) => pdf.text(t, W / 2 + 5, y + 7 + k * 5.5));

    // Lignes
    y = 76;
    const col = { label: M + 3, base: 110, rate: 140, gain: 165, ret: W - M - 3 };
    pdf.setFillColor(241, 245, 249); pdf.rect(M, y - 5, W - 2 * M, 8, "F");
    font("bold", 8.5, grey);
    pdf.text("Élément", col.label, y); pdf.text("Base", col.base, y, { align: "right" }); pdf.text("Taux", col.rate, y, { align: "right" });
    pdf.text("Gains", col.gain, y, { align: "right" }); pdf.text("Retenues", col.ret, y, { align: "right" });
    y += 8;
    const line = (label: string, base: string, rate: string, gain?: number, ret?: number, bold = false) => {
      font(bold ? "bold" : "normal", 9.5);
      pdf.text(label, col.label, y);
      if (base) pdf.text(base, col.base, y, { align: "right" });
      if (rate) pdf.text(rate, col.rate, y, { align: "right" });
      if (gain) pdf.text(num(gain), col.gain, y, { align: "right" });
      if (ret) pdf.text(num(ret), col.ret, y, { align: "right" });
      y += 6.5;
    };
    const rule = () => { pdf.setDrawColor(226, 232, 240); pdf.line(M, y - 3.5, W - M, y - 3.5); y += 1.5; };

    line("Salaire de base", "", "", p.base_salary);
    if (p.absence_amount) line(`Absences non payées (${Number(p.unpaid_days)} j / ${Number(p.month_working_days)})`, "", "", undefined, p.absence_amount);
    if (p.overtime_amount) {
      const h = Number(p.ot_weekday_hours) + Number(p.ot_sunday_hours) + Number(p.ot_night_hours) + Number(p.ot_holiday_hours);
      line(`Heures supplémentaires (${h} h)`, "", "", p.overtime_amount);
    }
    (p.bonuses || []).forEach((b) => line(`${b.label}${b.taxable === false ? " (non imposable)" : ""}`, "", "", Number(b.amount)));
    rule();
    line("SALAIRE BRUT", "", "", p.gross, undefined, true);
    rule();
    line("CNSS part salariale", num(p.cnss_base), `${settings?.cnss_employee_rate ?? ""} %`, undefined, p.cnss_employee);
    line("Retenue sur traitements et salaires (RTS)", num(p.taxable), "barème", undefined, p.rts);
    (p.deductions || []).forEach((d) => line(d.label, "", "", undefined, Number(d.amount)));
    rule();

    // Net
    y += 2;
    pdf.setFillColor(...red); pdf.roundedRect(W / 2, y - 6, W / 2 - M, 12, 2, 2, "F");
    font("bold", 12, [255, 255, 255]); pdf.text("NET À PAYER", W / 2 + 4, y + 1.5); pdf.text(money(p.net), W - M - 4, y + 1.5, { align: "right" });
    y += 16;

    // Charges patronales
    font("bold", 9, grey); pdf.text("Charges patronales (pour information)", M, y); y += 6;
    font("normal", 9, grey);
    pdf.text(`CNSS part patronale (${settings?.cnss_employer_rate ?? ""} %) : ${money(p.cnss_employer)}`, M, y); y += 5;
    pdf.text(`Taxe d'apprentissage : ${money(p.apprenticeship)}`, M, y); y += 5;
    if (p.other_employer) { pdf.text(`Autre taxe patronale : ${money(p.other_employer)}`, M, y); y += 5; }
    font("bold", 9); pdf.text(`Coût total employeur : ${money(p.employer_cost)}`, M, y); y += 8;
    if (s?.payment_method) { font("normal", 9, grey); pdf.text(`Paiement : ${[s.payment_method, s.payment_account].filter(Boolean).join(" · ")}`, M, y); y += 6; }
    if (p.note) { font("normal", 9, grey); pdf.text(pdf.splitTextToSize(`Note : ${p.note}`, W - 2 * M), M, y); }

    font("normal", 7.5, grey);
    pdf.text("Bulletin établi avec ProJob+ (projobai.com). À conserver sans limitation de durée.", W / 2, 287, { align: "center" });
  });

  const blob = pdf.output("blob");
  download(fileName || `bulletins-${period.slice(0, 7)}-${slug(company.name)}.pdf`, blob, "application/pdf");
}
