// Import d'un CV existant (PDF, Word ou texte) : extraction du texte dans le navigateur,
// puis rangement des informations (par l'IA, ou par une lecture simple si l'IA est indisponible).
import type { CVData, Experience, Education, Language } from "../app/contexts/CVDataContext";

export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;

export class ImportError extends Error {}

async function pdfText(file: File) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const worker = (await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= Math.min(doc.numPages, 6); i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // Reconstituer les lignes à partir de la position verticale des morceaux de texte.
    // Reconstituer les lignes : nouvelle ligne quand la position verticale change,
    // ou quand un grand espace horizontal sépare deux colonnes (CV en deux colonnes).
    let lastY: number | null = null;
    let lastEnd = 0;
    let line = "";
    const lines: string[] = [];
    for (const item of content.items as { str: string; transform: number[]; width?: number; hasEOL?: boolean }[]) {
      const x = item.transform[4];
      const y = Math.round(item.transform[5]);
      const newRow = lastY !== null && Math.abs(y - lastY) > 2;
      const columnGap = lastY !== null && !newRow && x - lastEnd > 30;
      if (newRow || columnGap) {
        lines.push(line.trim());
        line = "";
      }
      line += (line && !line.endsWith(" ") && item.str && !item.str.startsWith(" ") ? " " : "") + item.str;
      lastY = y;
      lastEnd = x + (item.width || 0);
      if (item.hasEOL) { lines.push(line.trim()); line = ""; lastY = null; }
    }
    if (line.trim()) lines.push(line.trim());
    pages.push(lines.filter(Boolean).join("\n"));
  }
  await doc.destroy();
  return pages.join("\n\n");
}

async function docxText(file: File) {
  type Mammoth = { extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> };
  const mod = (await import("mammoth/mammoth.browser.min.js")) as unknown as Mammoth & { default?: Mammoth };
  const result = await (mod.default || mod).extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

/** Texte brut du fichier. */
export async function extractCVText(file: File): Promise<string> {
  if (file.size > MAX_IMPORT_BYTES) throw new ImportError("Fichier trop lourd (8 Mo maximum).");
  const name = file.name.toLowerCase();
  let text = "";
  try {
    if (file.type === "application/pdf" || name.endsWith(".pdf")) text = await pdfText(file);
    else if (name.endsWith(".docx")) text = await docxText(file);
    else if (name.endsWith(".txt") || file.type.startsWith("text/")) text = await file.text();
    else if (name.endsWith(".doc")) throw new ImportError("Les anciens fichiers .doc ne sont pas lus : enregistrez votre CV en .docx ou en PDF depuis Word.");
    else throw new ImportError("Format non pris en charge : utilisez un PDF ou un fichier Word (.docx).");
  } catch (e) {
    if (e instanceof ImportError) throw e;
    throw new ImportError("Le fichier n'a pas pu être lu. Vérifiez qu'il n'est pas protégé par un mot de passe.");
  }
  text = text.replace(/ /g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (text.replace(/\s/g, "").length < 40) {
    throw new ImportError("Aucun texte trouvé : ce CV est sans doute une image scannée. Importez la version Word ou PDF d'origine, ou remplissez votre CV avec l'assistant.");
  }
  return text;
}

// ---------- Lecture simple (sans IA) ----------

const HEADINGS: { key: "profile" | "experiences" | "education" | "skills" | "languages" | "other"; re: RegExp }[] = [
  { key: "profile", re: /^(profil|resume|r[ée]sum[ée]|a propos|à propos|objectif|summary|profile)\b/i },
  { key: "experiences", re: /^(exp[ée]riences?( professionnelles?)?|parcours professionnel|emplois?|stages?|work experience|experience)\b/i },
  { key: "education", re: /^(formations?|[ée]tudes|dipl[ôo]mes?|cursus|parcours acad[ée]mique|education)\b/i },
  { key: "skills", re: /^(comp[ée]tences|savoir[- ]faire|aptitudes|skills|connaissances informatiques|informatique)\b/i },
  { key: "languages", re: /^(langues?|languages?)\b/i },
  { key: "other", re: /^(centres? d'int[ée]r[êe]ts?|loisirs|r[ée]f[ée]rences|activit[ée]s|hobbies|certifications?|contacts?|coordonn[ée]es|informations personnelles)\b/i },
];

/** Titres écrits en lettres espacées (« E X P É R I E N C E ») : comparés sans espaces ni accents. */
const COMPACT_HEADINGS: { key: (typeof HEADINGS)[number]["key"]; re: RegExp }[] = [
  { key: "profile", re: /^(profil|resume|apropos|objectif|summary)/ },
  { key: "experiences", re: /^(experience|parcoursprofessionnel|emploi|stage|workexperience)/ },
  { key: "education", re: /^(formation|etude|diplome|cursus|parcoursacademique|education)/ },
  { key: "skills", re: /^(competence|savoirfaire|aptitude|skill|connaissancesinformatiques)/ },
  { key: "languages", re: /^(langue|language)/ },
  { key: "other", re: /^(centresdinteret|centredinteret|loisir|reference|activite|hobbies|certification|contact|coordonnee|informationspersonnelles)/ },
];

const deaccent = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function headingOf(line: string) {
  const l = line.replace(/[:：]$/, "").trim();
  if (l.length > 60) return undefined;
  if (/^(\S ){3,}\S$/.test(l)) {
    const compact = deaccent(l.replace(/\s+/g, "")).replace(/[^a-z]/g, "");
    return COMPACT_HEADINGS.find((h) => h.re.test(compact))?.key;
  }
  return l.length <= 45 ? HEADINGS.find((h) => h.re.test(l))?.key : undefined;
}

const PERIOD_RE = /((janv|f[ée]v|mars|avr|mai|juin|juil|ao[uû]t|sept|oct|nov|d[ée]c)[a-zé.]*\s*)?(19|20)\d{2}\s*([-–—à]|au|to)\s*((janv|f[ée]v|mars|avr|mai|juin|juil|ao[uû]t|sept|oct|nov|d[ée]c)[a-zé.]*\s*)?((19|20)\d{2}|pr[ée]sent|aujourd'hui|ce jour|en cours|actuel)|(19|20)\d{2}/i;

function levelOf(text: string) {
  const t = text.toLowerCase();
  if (/maternelle|natale|native/.test(t)) return { level: "Langue maternelle", percentage: 100 };
  if (/courant|bilingue|fluent|excellent|c1|c2/.test(t)) return { level: "Courant", percentage: 85 };
  if (/interm[ée]diaire|b1|b2|moyen|bon/.test(t)) return { level: "Intermédiaire", percentage: 60 };
  if (/notion|d[ée]butant|a1|a2|scolaire|basique/.test(t)) return { level: "Notions", percentage: 35 };
  return { level: "Intermédiaire", percentage: 60 };
}

export function heuristicParse(text: string): Partial<CVData> {
  const lines = text.split("\n").map((l) => l.replace(/^[•●▪■◦\-*–]\s*/, "").trim()).filter(Boolean);
  const out: Partial<CVData> = {};

  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (email) out.email = email[0];
  const phone = text.match(/(\+?\d[\d .-]{7,}\d)/);
  if (phone) out.phone = phone[1].trim();

  // Nom : de préférence une ligne dont les mots figurent dans l'adresse e-mail,
  // sinon la première ligne courte sans chiffre ni @ en haut du document.
  const looksLikeName = (l: string) => l.length <= 40 && !/[@\d,:]/.test(l) && l.split(" ").length >= 2 && l.split(" ").length <= 5 && !headingOf(l) && !/^(\S ){3,}\S$/.test(l);
  const local = email ? deaccent(email[0].split("@")[0]).replace(/[^a-z]/g, "") : "";
  const nameLine =
    (local && lines.slice(0, 40).find((l) => looksLikeName(l) && deaccent(l).split(/\s+/).filter((w) => w.length >= 3 && local.includes(w.replace(/[^a-z]/g, ""))).length >= 1)) ||
    lines.slice(0, 6).find(looksLikeName);
  if (nameLine) out.fullName = nameLine.replace(/\s+/g, " ");
  const after = nameLine ? lines[lines.indexOf(nameLine) + 1] : undefined;
  if (after && after.length <= 70 && !/[@]/.test(after) && !/\d{4}/.test(after) && !headingOf(after)) out.jobTitle = after;

  const city = text.match(/\b(Conakry|Kindia|Bok[ée]|Kamsar|Lab[ée]|Mamou|Kankan|Siguiri|N'?Z[ée]r[ée]kor[ée]|Fria|Kissidougou|Gu[ée]ck[ée]dou|Faranah|Dubr[ée]ka|Coyah|Dakar|Abidjan|Bamako|Paris)\b/i);
  if (city) out.location = city[1];

  // Découpage par sections
  const sections: Record<string, string[]> = {};
  let current: string | null = null;
  for (const l of lines) {
    // Le nom et le titre (souvent au milieu du texte dans un CV en deux colonnes) ne font partie d'aucune rubrique.
    if (l === nameLine || (out.jobTitle && l === out.jobTitle)) { current = null; continue; }
    const h = headingOf(l);
    if (h) { current = h; sections[current] = sections[current] || []; continue; }
    if (current) sections[current].push(l);
  }

  if (sections.profile?.length) out.profile = sections.profile.join(" ").slice(0, 800);

  const blocks = (list: string[]) => {
    const res: { head: string; period: string; rest: string[] }[] = [];
    for (const l of list) {
      const m = l.match(PERIOD_RE);
      if (m || !res.length) {
        const period = m ? m[0].trim() : "";
        const head = l.replace(m ? m[0] : "", "").replace(/^[\s,:|–—-]+|[\s,:|–—-]+$/g, "");
        res.push({ head, period, rest: [] });
      } else {
        res[res.length - 1].rest.push(l);
      }
    }
    return res.filter((b) => b.head || b.rest.length);
  };

  if (sections.experiences?.length) {
    out.experiences = blocks(sections.experiences).slice(0, 8).map((b): Experience => {
      const head = b.head || b.rest.shift() || "";
      const [title, company] = head.split(/\s[|,–—-]\s|,\s| chez | at /i);
      let comp = company || "";
      if (!comp && b.rest.length && b.rest[0].length < 60) comp = b.rest.shift() || "";
      return { title: (title || head).trim(), company: comp.trim(), period: b.period, description: b.rest.slice(0, 4) };
    });
  }
  if (sections.education?.length) {
    out.education = blocks(sections.education).slice(0, 6).map((b): Education => {
      const head = b.head || b.rest.shift() || "";
      // Établissement sur la ligne suivante : la ligne de titre est le diplôme complet.
      if (b.rest[0] && b.rest[0].length <= 80) return { degree: head.trim(), institution: b.rest[0].trim(), period: b.period };
      const [degree, institution] = head.split(/\s[|–—-]\s|,\s/);
      return { degree: (degree || head).trim(), institution: (institution || "").trim(), period: b.period };
    });
  }
  if (sections.skills?.length) {
    out.skills = sections.skills
      .flatMap((l) => l.split(/[,;•·|]/))
      .map((s) => s.replace(/^[^:]{0,30}:\s*/, "").trim())
      .filter((s) => s.length > 1 && s.length < 50)
      .slice(0, 20);
  }
  if (sections.languages?.length) {
    out.languages = sections.languages
      .flatMap((l) => l.split(/[,;•·|]/))
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 60)
      .slice(0, 6)
      .map((s): Language => {
        const name = s.split(/[:(–—-]/)[0]
          .replace(/\b(langue maternelle|maternelle|courant|bilingue|interm[ée]diaire|notions?|d[ée]butant|avanc[ée]|scolaire|lu,? [ée]crit,? parl[ée]|[abc][12])\b/gi, "")
          .trim();
        return { name, ...levelOf(s) };
      });
  }
  return out;
}

/** Normalise le résultat (IA ou lecture simple) au format du CV ProJob. */
export function normalizeImported(raw: Record<string, unknown>): Partial<CVData> {
  const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  const out: Partial<CVData> = {};
  for (const k of ["fullName", "jobTitle", "phone", "email", "location"] as const) {
    const v = str(raw[k], 120);
    if (v) out[k] = v;
  }
  const profile = str(raw.profile, 1200);
  if (profile) out.profile = profile;
  const exps = arr(raw.experiences).map((e) => {
    const o = (e || {}) as Record<string, unknown>;
    return { title: str(o.title, 120), company: str(o.company, 120), period: str(o.period, 60), description: arr(o.description).map((d) => str(d, 300)).filter(Boolean).slice(0, 5) };
  }).filter((e) => e.title || e.company);
  if (exps.length) out.experiences = exps.slice(0, 10);
  const edu = arr(raw.education).map((e) => {
    const o = (e || {}) as Record<string, unknown>;
    return { degree: str(o.degree, 150), institution: str(o.institution, 150), period: str(o.period, 60) };
  }).filter((e) => e.degree || e.institution);
  if (edu.length) out.education = edu.slice(0, 8);
  const skills = arr(raw.skills).map((s) => str(s, 60)).filter(Boolean);
  if (skills.length) out.skills = [...new Set(skills)].slice(0, 20);
  const langs = arr(raw.languages).map((l) => {
    const o = (l || {}) as Record<string, unknown>;
    const name = str(o.name, 40);
    const lv = levelOf(str(o.level, 40) || "intermédiaire");
    return { name, level: str(o.level, 40) || lv.level, percentage: typeof o.percentage === "number" ? o.percentage : lv.percentage };
  }).filter((l) => l.name);
  if (langs.length) out.languages = langs.slice(0, 8);
  return out;
}

/** Résumé lisible de ce qui a été trouvé. */
export function importSummary(d: Partial<CVData>) {
  const parts: string[] = [];
  if (d.fullName) parts.push("nom");
  if (d.email || d.phone) parts.push("coordonnées");
  if (d.profile) parts.push("profil");
  if (d.experiences?.length) parts.push(`${d.experiences.length} expérience${d.experiences.length > 1 ? "s" : ""}`);
  if (d.education?.length) parts.push(`${d.education.length} formation${d.education.length > 1 ? "s" : ""}`);
  if (d.skills?.length) parts.push(`${d.skills.length} compétence${d.skills.length > 1 ? "s" : ""}`);
  if (d.languages?.length) parts.push(`${d.languages.length} langue${d.languages.length > 1 ? "s" : ""}`);
  return parts;
}
