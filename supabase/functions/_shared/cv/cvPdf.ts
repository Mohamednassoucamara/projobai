// Copie serveur de src/lib/cvPdf.ts (génération du CV pour le bot WhatsApp). Garder les deux fichiers alignés.
// Génération du CV en PDF vectoriel (jsPDF) : texte net, sélectionnable et lisible
// par les logiciels de recrutement (ATS). Remplace la capture d'écran html2canvas,
// qui échouait sur les couleurs oklch de Tailwind et retombait sur l'impression navigateur.

import type { CVData } from "./types.ts";
import { safeAccent, tint, initials, type RGB } from "./cvTheme.ts";
import { drawMotif } from "./motifs.ts";

const PAGE_W = 210;
const PAGE_H = 297;
const SIDE_W = 68;
const SIDE_PAD = 9;
const MAIN_X = SIDE_W + 11;
const MAIN_W = PAGE_W - MAIN_X - 13;
const TOP = 18;
const BOTTOM = PAGE_H - 16;

const INK: RGB = [27, 35, 51];
const MUTED: RGB = [96, 106, 122];
const RULE: RGB = [222, 227, 235];
const WHITE: RGB = [255, 255, 255];

/** Les polices standard du PDF couvrent le jeu Windows-1252 : on remplace le reste. */
function clean(text: string): string {
  return String(text || "")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”«»]/g, (c) => (c === "«" || c === "»" ? c : '"'))
    .replace(/[–—]/g, "–")
    .replace(/•/g, "-")
    .replace(/…/g, "...")
    .replace(/[  ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cvFileName(name: string) {
  const base = clean(name || "CV")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return `CV_${base || "ProJob"}.pdf`;
}

export async function buildCvPdf(cv: CVData) {
  const mod = await import("npm:jspdf@4.2.1");
  const jsPDF = (mod as unknown as { jsPDF?: typeof mod.default }).jsPDF || mod.default;
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const accent = safeAccent(cv.theme);
  const accentSoft = tint(accent, 0.86);
  const onSideMuted = tint(accent, 0.72);

  const setColor = (rgb: RGB) => pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
  const setFill = (rgb: RGB) => pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
  const setDraw = (rgb: RGB) => pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);
  const font = (style: "normal" | "bold" | "italic", size: number) => {
    pdf.setFont("helvetica", style);
    pdf.setFontSize(size);
  };
  const lineH = (size: number, k = 1.38) => (size * 0.3528) * k;

  const drawSideBand = () => {
    setFill(accent);
    pdf.rect(0, 0, SIDE_W, PAGE_H, "F");
  };

  // ---------- Colonne latérale (page 1) ----------
  drawSideBand();
  drawMotif(pdf, cv.motif, 0, 0, SIDE_W, 62, tint(accent, 0.16));
  let sy = TOP + 2;
  const sideW = SIDE_W - SIDE_PAD * 2;

  const ini = initials(cv.fullName);
  let photoPng: string | null = null;
  // Côté serveur : pas de photo (pas de DOM pour la recadrer), les initiales sont utilisées.
  if (photoPng) {
    const d = 34;
    pdf.addImage(photoPng, "PNG", (SIDE_W - d) / 2, sy - 2, d, d);
    sy += d + 7;
  } else if (ini) {
    const r = 15;
    const cx = SIDE_W / 2;
    setFill(tint(accent, 0.18));
    pdf.circle(cx, sy + r, r, "F");
    setDraw(tint(accent, 0.45));
    pdf.setLineWidth(0.6);
    pdf.circle(cx, sy + r, r, "S");
    font("bold", 20);
    setColor(WHITE);
    pdf.text(ini, cx, sy + r + 2.6, { align: "center" });
    sy += r * 2 + 10;
  }

  const sideHeading = (label: string) => {
    font("bold", 8.5);
    setColor(WHITE);
    pdf.setCharSpace(0.9);
    pdf.text(label.toUpperCase(), SIDE_PAD, sy);
    pdf.setCharSpace(0);
    setDraw(tint(accent, 0.4));
    pdf.setLineWidth(0.35);
    pdf.line(SIDE_PAD, sy + 2, SIDE_PAD + sideW, sy + 2);
    sy += 7.5;
  };

  const sideField = (label: string, value: string) => {
    if (!value) return;
    font("normal", 7.2);
    setColor(onSideMuted);
    pdf.text(label, SIDE_PAD, sy);
    sy += lineH(7.2, 1.25);
    const v = clean(value);
    // Une adresse e-mail ne doit pas être coupée : on réduit la taille pour qu'elle tienne.
    let size = 9;
    if (!/\s/.test(v)) {
      font("normal", size);
      while (size > 6.8 && pdf.getTextWidth(v) > sideW) {
        size -= 0.2;
        font("normal", size);
      }
    }
    font("normal", size);
    setColor(WHITE);
    const lines = pdf.splitTextToSize(v, sideW) as string[];
    lines.forEach((l) => {
      pdf.text(l, SIDE_PAD, sy);
      sy += lineH(size, 1.3);
    });
    sy += 2.4;
  };

  if (cv.phone || cv.email || cv.location) {
    sideHeading("Contact");
    sideField("Téléphone", cv.phone);
    sideField("E-mail", cv.email);
    sideField("Ville", cv.location);
    sy += 3;
  }

  const skills = cv.skills.map(clean).filter(Boolean);
  if (skills.length) {
    sideHeading("Compétences");
    font("normal", 9);
    for (const s of skills.slice(0, 16)) {
      const lines = pdf.splitTextToSize(s, sideW - 4) as string[];
      if (sy + lines.length * lineH(9) > BOTTOM) break;
      setFill(tint(accent, 0.55));
      pdf.rect(SIDE_PAD, sy - 1.9, 1.6, 1.6, "F");
      setColor(WHITE);
      lines.forEach((l, i) => pdf.text(l, SIDE_PAD + 4, sy + i * lineH(9, 1.3)));
      sy += lines.length * lineH(9, 1.3) + 1.6;
    }
    sy += 4;
  }

  const langs = cv.languages.filter((l) => clean(l.name));
  if (langs.length && sy < BOTTOM - 20) {
    sideHeading("Langues");
    for (const l of langs.slice(0, 7)) {
      if (sy > BOTTOM - 8) break;
      font("bold", 9);
      setColor(WHITE);
      pdf.text(clean(l.name), SIDE_PAD, sy);
      font("normal", 7.5);
      setColor(onSideMuted);
      pdf.text(clean(l.level), SIDE_PAD + sideW, sy, { align: "right" });
      sy += 2.4;
      setFill(tint(accent, 0.28));
      pdf.roundedRect(SIDE_PAD, sy, sideW, 1.6, 0.8, 0.8, "F");
      setFill(WHITE);
      const pct = Math.max(0.08, Math.min(1, (l.percentage || 50) / 100));
      pdf.roundedRect(SIDE_PAD, sy, sideW * pct, 1.6, 0.8, 0.8, "F");
      sy += 7;
    }
  }

  // ---------- Colonne principale ----------
  let y = TOP + 6;
  let page = 1;

  const newPage = () => {
    pdf.addPage();
    page++;
    drawSideBand();
    y = TOP;
  };
  const need = (h: number) => {
    if (y + h > BOTTOM) newPage();
  };

  // En-tête : nom et poste
  font("bold", 24);
  setColor(INK);
  const nameLines = pdf.splitTextToSize(clean(cv.fullName), MAIN_W) as string[];
  nameLines.forEach((l) => {
    pdf.text(l, MAIN_X, y);
    y += lineH(24, 1.12);
  });
  if (cv.jobTitle) {
    y += 0.6;
    font("normal", 12.5);
    setColor(accent);
    (pdf.splitTextToSize(clean(cv.jobTitle), MAIN_W) as string[]).forEach((l) => {
      pdf.text(l, MAIN_X, y);
      y += lineH(12.5, 1.25);
    });
  }
  y += 2;
  setFill(accent);
  pdf.rect(MAIN_X, y, 16, 1.1, "F");
  y += 10;

  const heading = (label: string) => {
    need(16);
    font("bold", 10.5);
    setColor(accent);
    pdf.setCharSpace(0.8);
    pdf.text(label.toUpperCase(), MAIN_X, y);
    pdf.setCharSpace(0);
    setDraw(RULE);
    pdf.setLineWidth(0.3);
    const w = pdf.getTextWidth(label.toUpperCase()) + label.length * 0.8 + 3;
    pdf.line(MAIN_X + w, y - 1.3, MAIN_X + MAIN_W, y - 1.3);
    y += 6.5;
  };

  const paragraph = (text: string, size = 9.8, color: RGB = INK, indent = 0) => {
    font("normal", size);
    setColor(color);
    const lines = pdf.splitTextToSize(clean(text), MAIN_W - indent) as string[];
    for (const l of lines) {
      need(lineH(size));
      pdf.text(l, MAIN_X + indent, y);
      y += lineH(size, 1.42);
    }
  };

  const entry = (title: string, period: string, org: string, bullets: string[]) => {
    const periodTxt = clean(period);
    font("normal", 8.8);
    const periodW = periodTxt ? pdf.getTextWidth(periodTxt) + 4 : 0;
    font("bold", 10.8);
    const titleLines = pdf.splitTextToSize(clean(title) || " ", MAIN_W - periodW) as string[];
    need(titleLines.length * lineH(10.8) + (org ? 5 : 0) + (bullets.length ? 5 : 0));

    if (periodTxt) {
      // pastille de période
      font("normal", 8.8);
      const pw = pdf.getTextWidth(periodTxt) + 3.6;
      setFill(accentSoft);
      pdf.roundedRect(MAIN_X + MAIN_W - pw, y - 3.6, pw, 5, 1.2, 1.2, "F");
      setColor(accent);
      pdf.text(periodTxt, MAIN_X + MAIN_W - 1.8, y, { align: "right" });
    }
    font("bold", 10.8);
    setColor(INK);
    titleLines.forEach((l) => {
      pdf.text(l, MAIN_X, y);
      y += lineH(10.8, 1.3);
    });
    if (org) {
      font("italic", 9.3);
      setColor(MUTED);
      (pdf.splitTextToSize(clean(org), MAIN_W) as string[]).forEach((l) => {
        need(lineH(9.3));
        pdf.text(l, MAIN_X, y);
        y += lineH(9.3, 1.35);
      });
    }
    y += 0.8;
    for (const b of bullets) {
      font("normal", 9.6);
      const lines = pdf.splitTextToSize(clean(b), MAIN_W - 5) as string[];
      need(lines.length * lineH(9.6, 1.4));
      setFill(accent);
      pdf.circle(MAIN_X + 1.2, y - 1.2, 0.65, "F");
      setColor(INK);
      lines.forEach((l) => {
        pdf.text(l, MAIN_X + 4.5, y);
        y += lineH(9.6, 1.4);
      });
    }
    y += 4;
  };

  if (clean(cv.profile)) {
    heading("Profil");
    paragraph(cv.profile);
    y += 5;
  }

  const exps = cv.experiences.filter((e) => clean(e.title) || clean(e.company));
  if (exps.length) {
    heading("Expérience professionnelle");
    exps.forEach((e) => entry(e.title, e.period, e.company, e.description.map(clean).filter(Boolean)));
    y += 1;
  }

  const edus = cv.education.filter((e) => clean(e.degree) || clean(e.institution));
  if (edus.length) {
    heading("Formation");
    edus.forEach((e) => entry(e.degree, e.period, e.institution, []));
  }

  // Numéros de page discrets si le CV dépasse une page
  if (page > 1) {
    const total = pdf.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      pdf.setPage(i);
      font("normal", 7.5);
      setColor(MUTED);
      pdf.text(`${i} / ${total}`, MAIN_X + MAIN_W, PAGE_H - 8, { align: "right" });
    }
  }

  pdf.setProperties({
    title: `CV - ${clean(cv.fullName)}`,
    subject: clean(cv.jobTitle) || "Curriculum vitae",
    author: clean(cv.fullName),
    creator: "ProJob AI",
  });
  return pdf;
}
