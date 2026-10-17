// Lettre de motivation en PDF vectoriel, assortie au CV (même couleur, photo et motif).
// Trois modèles : moderne (bandeau), classique (sobre), élégant (bande latérale).

import type { CVData, LetterTemplate } from "../app/contexts/CVDataContext";
import { safeAccent, tint, initials, type RGB } from "./cvTheme";
import { drawMotif } from "./motifs";

export interface LetterContent {
  company: string;
  attention: string;
  place: string;
  date: string;
  objet: string;
  /** De la formule d'appel à la formule de politesse, paragraphes séparés par une ligne vide. */
  body: string;
}

const INK: RGB = [27, 35, 51];
const MUTED: RGB = [96, 106, 122];
const WHITE: RGB = [255, 255, 255];

function clean(text: string): string {
  return String(text || "")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "–")
    .replace(/…/g, "...")
    .replace(/[  ]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** Découpe un texte de lettre complet (IA ou modèle) en objet + corps. */
export function splitLetter(text: string, signature: string): { objet: string; body: string } {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  let objet = "";
  let objIdx = lines.findIndex((l) => /^\s*objet\s*:/i.test(l));
  if (objIdx >= 0) objet = lines[objIdx].replace(/^\s*objet\s*:\s*/i, "").trim();
  let start = lines.findIndex((l, i) => i > objIdx && /^\s*(madame|monsieur|cher|chère|mesdames)/i.test(l));
  if (start < 0) {
    start = objIdx + 1;
    while (start < lines.length && !lines[start].trim()) start++;
  }
  let end = lines.length;
  while (end > start && (!lines[end - 1].trim() || clean(lines[end - 1]).toLowerCase() === clean(signature).toLowerCase())) end--;
  const body = lines.slice(Math.max(0, start), end).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (objIdx < 0) objIdx = -1;
  return { objet, body };
}

export function letterFileName(name: string) {
  const base = clean(name || "Lettre").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `Lettre_motivation_${base || "ProJob"}.pdf`;
}

export async function buildLetterPdf(cv: CVData, content: LetterContent) {
  const mod = await import("jspdf");
  const jsPDF = (mod as unknown as { jsPDF?: typeof mod.default }).jsPDF || mod.default;
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const W = 210;
  const H = 297;
  const accent = safeAccent(cv.theme);
  const template: LetterTemplate = cv.letterTemplate;

  const color = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2]);
  const fill = (c: RGB) => pdf.setFillColor(c[0], c[1], c[2]);
  const draw = (c: RGB) => pdf.setDrawColor(c[0], c[1], c[2]);
  const font = (style: "normal" | "bold" | "italic", size: number) => { pdf.setFont("helvetica", style); pdf.setFontSize(size); };
  const lh = (size: number, k = 1.45) => size * 0.3528 * k;

  let photo: string | null = null;
  if (cv.photo && typeof document !== "undefined") {
    try {
      const { circularPhoto } = await import("./cvPhoto");
      photo = await circularPhoto(cv.photo, template === "moderne" ? "#ffffff" : `rgb(${accent.join(",")})`);
    } catch { photo = null; }
  }
  const contact = [cv.phone, cv.email, cv.location].map(clean).filter(Boolean);

  const avatar = (x: number, y: number, d: number, onDark: boolean) => {
    if (photo) { pdf.addImage(photo, "PNG", x, y, d, d); return true; }
    const ini = initials(cv.fullName);
    if (!ini) return false;
    fill(onDark ? tint(accent, 0.18) : tint(accent, 0.86));
    pdf.circle(x + d / 2, y + d / 2, d / 2, "F");
    font("bold", d * 0.55);
    color(onDark ? WHITE : accent);
    pdf.text(ini, x + d / 2, y + d / 2 + d * 0.07, { align: "center" });
    return true;
  };

  let left = 22;
  let right = W - 22;
  let y = 0;

  // ---------- En-tête selon le modèle ----------
  if (template === "moderne") {
    const bandH = 46;
    fill(accent);
    pdf.rect(0, 0, W, bandH, "F");
    drawMotif(pdf, cv.motif, 0, 0, W, bandH, tint(accent, 0.16));
    const d = 28;
    const hasAv = avatar(left, (bandH - d) / 2, d, true);
    const tx = hasAv ? left + d + 8 : left;
    font("bold", 21); color(WHITE);
    pdf.text(clean(cv.fullName), tx, 19);
    if (cv.jobTitle) { font("normal", 11.5); color(tint(accent, 0.8)); pdf.text(clean(cv.jobTitle), tx, 26.5); }
    font("normal", 8.6); color(WHITE);
    pdf.text(pdf.splitTextToSize(contact.join("   |   "), right - tx)[0] || "", tx, 35);
    y = bandH + 16;
  } else if (template === "classique") {
    fill(accent);
    pdf.rect(0, 0, W, 7, "F");
    drawMotif(pdf, cv.motif, 0, 0, W, 7, tint(accent, 0.2));
    const d = 26;
    const hasAv = cv.photo ? avatar(right - d, 15, d, false) : false;
    const textRight = hasAv ? right - d - 6 : right;
    font("bold", 22); color(accent);
    pdf.text(clean(cv.fullName), left, 27);
    if (cv.jobTitle) { font("normal", 11.5); color(MUTED); pdf.text(clean(cv.jobTitle), left, 34); }
    font("normal", 8.8); color(INK);
    let cy = 42;
    for (const c of contact) { pdf.text(c, left, cy); cy += 4.4; }
    void textRight;
    draw(tint(accent, 0.6)); pdf.setLineWidth(0.5);
    const ruleY = Math.max(cy + 2, 15 + d + 6);
    pdf.line(left, ruleY, right, ruleY);
    y = ruleY + 13;
  } else {
    const stripW = 15;
    fill(accent);
    pdf.rect(0, 0, stripW, H, "F");
    drawMotif(pdf, cv.motif, 0, 0, stripW, H, tint(accent, 0.16));
    left = stripW + 16;
    const d = 26;
    const hasAv = avatar(left, 16, d, false);
    const tx = hasAv ? left + d + 7 : left;
    font("bold", 21); color(INK);
    pdf.text(clean(cv.fullName), tx, 26);
    if (cv.jobTitle) { font("normal", 11.5); color(accent); pdf.text(clean(cv.jobTitle), tx, 33); }
    font("normal", 8.6); color(MUTED);
    pdf.text(pdf.splitTextToSize(contact.join("  ·  "), right - tx)[0] || "", tx, 39.5);
    draw(accent); pdf.setLineWidth(0.6);
    pdf.line(left, 50, left + 18, 50);
    y = 64;
  }

  const width = right - left;
  const bottom = H - 20;
  const newPage = () => {
    pdf.addPage();
    if (template === "elegant") { fill(accent); pdf.rect(0, 0, 15, H, "F"); drawMotif(pdf, cv.motif, 0, 0, 15, H, tint(accent, 0.16)); }
    if (template === "classique") { fill(accent); pdf.rect(0, 0, W, 4, "F"); }
    y = 24;
  };
  const need = (h: number) => { if (y + h > bottom) newPage(); };

  // ---------- Destinataire et date ----------
  font("normal", 10);
  color(INK);
  const placeDate = `${clean(content.place) || "Conakry"}, le ${clean(content.date)}`;
  pdf.text(placeDate, right, y, { align: "right" });
  y += 9;
  const recip = [content.company, content.attention].map(clean).filter(Boolean);
  recip.forEach((r, i) => {
    font(i === 0 ? "bold" : "normal", 10.2);
    color(INK);
    pdf.text(r, right, y, { align: "right" });
    y += lh(10.2, 1.4);
  });
  y += 9;

  // ---------- Objet ----------
  if (clean(content.objet)) {
    font("bold", 10.5);
    color(accent);
    const label = "Objet : ";
    pdf.text(label, left, y);
    const lw = pdf.getTextWidth(label);
    color(INK);
    const objLines = pdf.splitTextToSize(clean(content.objet), width - lw) as string[];
    objLines.forEach((l, i) => { pdf.text(l, left + lw, y + i * lh(10.5, 1.35)); });
    y += objLines.length * lh(10.5, 1.35) + 8;
  }

  // ---------- Corps ----------
  const paragraphs = String(content.body || "").replace(/\r/g, "").split(/\n\s*\n|\n/).map(clean).filter(Boolean);
  const size = 10.6;
  font("normal", size);
  for (const [i, p] of paragraphs.entries()) {
    const lines = pdf.splitTextToSize(p, width) as string[];
    const isShort = lines.length === 1 && p.length < 60; // formule d'appel
    for (let k = 0; k < lines.length; k++) {
      need(lh(size));
      font("normal", size);
      color(INK);
      const last = k === lines.length - 1;
      const words = lines[k].trim().split(/\s+/);
      if (!last && !isShort && words.length > 1) {
        // Justification manuelle : l'espace restant est réparti entre les mots.
        const wordsW = words.reduce((acc, w) => acc + pdf.getTextWidth(w), 0);
        const gap = (width - wordsW) / (words.length - 1);
        if (gap < pdf.getTextWidth(" ") * 3) {
          let x = left;
          for (const w of words) { pdf.text(w, x, y); x += pdf.getTextWidth(w) + gap; }
        } else pdf.text(lines[k], left, y);
      } else pdf.text(lines[k], left, y);
      y += lh(size, 1.5);
    }
    y += i === paragraphs.length - 1 ? 0 : 3.4;
  }

  // ---------- Signature ----------
  need(26);
  y += 12;
  font("bold", 11);
  color(INK);
  pdf.text(clean(cv.fullName), right, y, { align: "right" });
  if (cv.jobTitle) { font("normal", 9.2); color(MUTED); pdf.text(clean(cv.jobTitle), right, y + 5, { align: "right" }); }
  draw(accent); pdf.setLineWidth(0.5);
  pdf.line(right - 30, y - 7, right, y - 7);

  pdf.setProperties({ title: `Lettre de motivation - ${clean(cv.fullName)}`, subject: clean(content.objet), author: clean(cv.fullName), creator: "ProJob AI" });
  return pdf;
}

export async function generateLetterPdf(cv: CVData, content: LetterContent) {
  const pdf = await buildLetterPdf(cv, content);
  pdf.save(letterFileName(cv.fullName));
}
