// Bulletin de paie PDF, partagé entre le site (src/lib/payroll.ts) et le bot (bot-api).
// Aucune dépendance : on reçoit une instance jsPDF déjà créée (A4, mm).

export interface PayslipPdfSettings { cnss_employee_rate?: number; cnss_employer_rate?: number; cnss_number?: string | null }
export interface PayslipPdfData {
  base_salary: number; unpaid_days: number; month_working_days: number;
  ot_weekday_hours: number; ot_sunday_hours: number; ot_night_hours: number; ot_holiday_hours: number;
  bonuses: { label: string; amount: number; taxable?: boolean }[] | null; deductions: { label: string; amount: number }[] | null; note: string | null;
  absence_amount: number; overtime_amount: number; gross: number; cnss_base: number; cnss_employee: number; cnss_employer: number;
  taxable: number; rts: number; net: number; apprenticeship: number; other_employer: number; employer_cost: number;
  snapshot: {
    name: string; matricule: string | null; job_title: string | null; contract_type: string | null; hire_date: string | null;
    cnss_number: string | null; department: string | null; payment_method: string | null; payment_account: string | null;
  } | null;
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
/** « 2026-10-01 » → « octobre 2026 » */
export const monthLabel = (period: string) => { const [y, m] = period.split("-").map(Number); return `${MONTHS[m - 1]} ${y}`; };
/** Nombre sans décimales, espaces ordinaires (helvetica n'a pas l'espace fine insécable). */
export const fmtNum = (n: number | null | undefined) => Math.round(Number(n || 0)).toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ");
export const money = (n: number | null | undefined) => `${fmtNum(n)} GNF`;
const num = fmtNum;

// deno-lint-ignore no-explicit-any
export function drawPayslips(pdf: any, company: { name: string }, period: string, slips: PayslipPdfData[], settings?: PayslipPdfSettings | null) {
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

}
