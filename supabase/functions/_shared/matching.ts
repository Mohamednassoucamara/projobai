// Copie serveur de src/lib/matching.ts (score de compatibilité pour le bot). Garder les deux fichiers alignés.
// Score de compatibilité entre une offre et un CV (0 à 100).
// Calcul local, transparent et explicable : chaque critère indique ses points et sa raison.
// C'est une aide à la décision : le recruteur garde toujours la décision finale.

type CVLike = {
  jobTitle?: string;
  location?: string;
  skills?: string[];
  profile?: string;
  experiences?: { title?: string; period?: string; description?: string[] }[];
  education?: { degree?: string; institution?: string }[];
};
type JobLike = {
  title?: string;
  location?: string;
  description?: string;
  requirements?: string[] | null;
  experience_level?: string | null;
  education_level?: string | null;
  job_skills?: { skill_name: string }[] | null;
};

export type CriterionKey = "skills" | "title" | "experience" | "education" | "location";

export interface Criterion {
  key: CriterionKey;
  label: string;
  points: number;
  max: number;
  /** Phrase courte expliquant le résultat de ce critère. */
  detail: string;
}

export interface MatchResult {
  score: number;
  matched: string[];
  missing: string[];
  criteria: Criterion[];
  /** Années d'expérience estimées à partir des périodes du CV. */
  years: number | null;
}

const STOP = new Set(["de", "des", "du", "la", "le", "les", "et", "en", "un", "une", "au", "aux", "pour", "h/f", "f/h", "a", "à", "d", "l"]);

export function norm(s: string) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9+#. ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(s: string) {
  return norm(s).split(" ").filter((w) => w.length > 2 && !STOP.has(w));
}

function overlaps(a: string, b: string) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wa = words(na);
  const wb = new Set(words(nb));
  return wa.length > 0 && wa.filter((w) => wb.has(w)).length / wa.length >= 0.5;
}

export function hasMatchableCV(cv: CVLike) {
  return Boolean((cv.skills && cv.skills.length > 0) || cv.jobTitle);
}

// ---------- Expérience ----------

/** Années demandées par l'offre (valeurs du formulaire de publication). */
export function requiredYears(level?: string | null): number | null {
  const l = norm(level || "");
  if (!l) return null;
  if (l.includes("debutant")) return 0;
  const m = l.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

const NOW_WORDS = /(present|aujourd|actuel|en cours|ce jour|now)/;

/** Estime les années d'expérience à partir des périodes « 2019 - 2022 », « 2021 – Présent »… */
export function estimateYears(experiences: CVLike["experiences"], now = new Date()): number | null {
  if (!experiences || experiences.length === 0) return null;
  const thisYear = now.getFullYear();
  const spans: [number, number][] = [];
  for (const e of experiences) {
    const p = norm(e.period || "");
    const years = (p.match(/(19|20)\d{2}/g) || []).map(Number).filter((y) => y <= thisYear + 1);
    if (!years.length) continue;
    const start = Math.min(...years);
    const end = NOW_WORDS.test(p) ? thisYear : years.length > 1 ? Math.max(...years) : start;
    spans.push([start, Math.max(end, start + (end === start ? 0.5 : 0))]);
  }
  if (!spans.length) return null;
  // Fusion des périodes qui se chevauchent pour ne pas compter deux fois la même année.
  spans.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [cs, ce] = spans[0];
  for (const [s, e] of spans.slice(1)) {
    if (s <= ce) ce = Math.max(ce, e);
    else { total += ce - cs; [cs, ce] = [s, e]; }
  }
  total += ce - cs;
  return Math.round(total * 10) / 10;
}

// ---------- Diplôme ----------

const EDU_LEVELS: { rank: number; label: string; re: RegExp }[] = [
  { rank: 5, label: "Doctorat", re: /(doctorat|phd|ph\.d|docteur)/ },
  { rank: 4, label: "Master", re: /(master|\bmba\b|bac ?\+ ?5|ingenieur|\bdess\b|\bdea\b|mastere)/ },
  { rank: 3.5, label: "Maîtrise", re: /(maitrise|bac ?\+ ?4)/ },
  { rank: 3, label: "Licence", re: /(licence|bachelor|bac ?\+ ?3)/ },
  { rank: 2, label: "Bac+2", re: /(bac ?\+ ?2|\bbts\b|\bdut\b|\bdts\b|\bdeug\b|technicien superieur)/ },
  { rank: 1, label: "Bac", re: /(baccalaureat|\bbac\b|\bcap\b|\bbep\b|brevet)/ },
];

export function educationRank(text?: string | null): number | null {
  const t = norm(text || "").replace(/\s*\+\s*/g, " + ").replace(/bac \+ /g, "bac +");
  if (!t) return null;
  for (const lvl of EDU_LEVELS) if (lvl.re.test(t)) return lvl.rank;
  return null;
}

function highestEducation(education: CVLike["education"]): { rank: number; label: string } | null {
  let best: { rank: number; label: string } | null = null;
  for (const e of education || []) {
    const r = educationRank(e.degree);
    if (r !== null && (!best || r > best.rank)) best = { rank: r, label: e.degree || "" };
  }
  return best;
}

// ---------- Score ----------

const WEIGHTS: Record<CriterionKey, number> = { skills: 45, title: 20, experience: 15, education: 10, location: 10 };

export function matchJob(job: JobLike, cv: CVLike): MatchResult {
  const cvSkills = (cv.skills || []).filter(Boolean);
  const required = [
    ...(job.job_skills || []).map((s) => s.skill_name),
    ...(job.requirements || []),
  ].filter(Boolean).slice(0, 15);

  const matched: string[] = [];
  const missing: string[] = [];
  for (const r of required) {
    (cvSkills.some((s) => overlaps(s, r)) ? matched : missing).push(r);
  }

  const criteria: Criterion[] = [];

  // 1. Compétences
  if (required.length) {
    criteria.push({
      key: "skills", label: "Compétences", max: WEIGHTS.skills,
      points: (matched.length / required.length) * WEIGHTS.skills,
      detail: `${matched.length} compétence${matched.length > 1 ? "s" : ""} demandée${matched.length > 1 ? "s" : ""} sur ${required.length} présente${matched.length > 1 ? "s" : ""} dans le CV`,
    });
  } else {
    const text = norm(`${job.title} ${job.description || ""}`);
    const hits = cvSkills.filter((s) => norm(s) && text.includes(norm(s)));
    criteria.push({
      key: "skills", label: "Compétences", max: WEIGHTS.skills,
      points: cvSkills.length ? Math.min(1, hits.length / Math.min(cvSkills.length, 4)) * WEIGHTS.skills : 0,
      detail: cvSkills.length
        ? hits.length ? `${hits.length} compétence${hits.length > 1 ? "s" : ""} du CV citée${hits.length > 1 ? "s" : ""} dans l'offre` : "Aucune compétence du CV n'est citée dans l'offre"
        : "Aucune compétence renseignée dans le CV",
    });
  }

  // 2. Intitulé du poste
  const titleWords = words(job.title || "");
  // Titre visé et intitulés des postes occupés (pas le texte libre du profil, facile à « gonfler »).
  const cvTitle = new Set(words(`${cv.jobTitle || ""} ${(cv.experiences || []).map((e) => e.title || "").join(" ")}`));
  const titleHits = titleWords.filter((w) => cvTitle.has(w)).length;
  criteria.push({
    key: "title", label: "Poste", max: WEIGHTS.title,
    points: titleWords.length ? (titleHits / titleWords.length) * WEIGHTS.title : 0,
    detail: titleHits === titleWords.length && titleWords.length
      ? "Le poste correspond au titre ou aux expériences du CV"
      : titleHits ? "Le poste est proche du profil du CV" : "Le poste diffère du titre et des expériences du CV",
  });

  // 3. Expérience
  const need = requiredYears(job.experience_level);
  const years = estimateYears(cv.experiences);
  if (need !== null) {
    let ratio: number;
    let detail: string;
    if (need === 0) {
      ratio = 1;
      detail = "Débutants acceptés";
    } else if (years === null) {
      ratio = 0;
      detail = `${need} an${need > 1 ? "s" : ""} minimum demandé${need > 1 ? "s" : ""} — durée non indiquée dans le CV`;
    } else {
      ratio = Math.min(1, years / need);
      detail = `Environ ${formatYears(years)} d'expérience pour ${need} an${need > 1 ? "s" : ""} demandé${need > 1 ? "s" : ""}`;
    }
    criteria.push({ key: "experience", label: "Expérience", max: WEIGHTS.experience, points: ratio * WEIGHTS.experience, detail });
  }

  // 4. Diplôme
  const needEdu = educationRank(job.education_level);
  if (needEdu !== null) {
    const best = highestEducation(cv.education);
    let ratio = 0;
    let detail: string;
    if (!best) {
      detail = `${job.education_level} demandé — diplôme non reconnu ou absent du CV`;
    } else if (best.rank >= needEdu) {
      ratio = 1;
      detail = `Niveau demandé (${job.education_level}) atteint`;
    } else {
      ratio = best.rank >= needEdu - 1 ? 0.5 : 0;
      detail = `${job.education_level} demandé, niveau du CV inférieur`;
    }
    criteria.push({ key: "education", label: "Diplôme", max: WEIGHTS.education, points: ratio * WEIGHTS.education, detail });
  }

  // 5. Ville
  const city = (s?: string) => norm((s || "").split(",")[0]);
  const sameCity = Boolean(cv.location && job.location && city(cv.location) && city(job.location).includes(city(cv.location)));
  criteria.push({
    key: "location", label: "Ville", max: WEIGHTS.location,
    points: sameCity ? WEIGHTS.location : 0,
    detail: sameCity ? `Basé(e) à ${job.location?.split(",")[0]}` : cv.location ? `Basé(e) à ${cv.location}, poste à ${job.location || "—"}` : "Ville non indiquée dans le CV",
  });

  const max = criteria.reduce((s, c) => s + c.max, 0);
  const pts = criteria.reduce((s, c) => s + c.points, 0);
  for (const c of criteria) c.points = Math.round(c.points);

  return {
    score: max ? Math.round(Math.min(100, (pts / max) * 100)) : 0,
    matched,
    missing,
    criteria,
    years,
  };
}

function formatYears(y: number) {
  if (y < 1) return "moins d'un an";
  const r = Math.round(y);
  return `${r} an${r > 1 ? "s" : ""}`;
}

export function matchTone(score: number) {
  if (score >= 70) return { label: "Très compatible", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (score >= 45) return { label: "Compatible", cls: "bg-amber-50 text-amber-800 border-amber-200" };
  return { label: "Peu compatible", cls: "bg-slate-50 text-slate-600 border-slate-200" };
}

export const MATCH_DISCLAIMER =
  "Ce score est une aide à la lecture des candidatures : il ne remplace pas l'examen du dossier et n'élimine aucun candidat automatiquement.";
