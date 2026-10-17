// Score de compatibilité entre une offre et le CV du candidat (0 à 100).
// Calcul local, transparent et explicable : compétences (60), poste (25), ville (15).

type CVLike = { jobTitle?: string; location?: string; skills?: string[]; profile?: string };
type JobLike = {
  title?: string;
  location?: string;
  description?: string;
  requirements?: string[] | null;
  job_skills?: { skill_name: string }[] | null;
};

export interface MatchResult {
  score: number;
  matched: string[];
  missing: string[];
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

  let skillPart: number;
  if (required.length) {
    skillPart = (matched.length / required.length) * 60;
  } else {
    // Pas de compétences listées : on compare les compétences du CV au texte de l'offre.
    const text = norm(`${job.title} ${job.description || ""}`);
    const hits = cvSkills.filter((s) => norm(s) && text.includes(norm(s))).length;
    skillPart = cvSkills.length ? Math.min(1, hits / Math.min(cvSkills.length, 4)) * 60 : 0;
  }

  const titleWords = words(job.title || "");
  const cvTitle = new Set(words(`${cv.jobTitle || ""} ${cv.profile || ""}`));
  const titlePart = titleWords.length ? (titleWords.filter((w) => cvTitle.has(w)).length / titleWords.length) * 25 : 0;

  const city = (s?: string) => norm((s || "").split(",")[0]);
  const locPart = cv.location && job.location && city(cv.location) && city(job.location).includes(city(cv.location)) ? 15 : 0;

  return {
    score: Math.round(Math.min(100, skillPart + titlePart + locPart)),
    matched,
    missing,
  };
}

export function matchTone(score: number) {
  if (score >= 70) return { label: "Très compatible", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (score >= 45) return { label: "Compatible", cls: "bg-amber-50 text-amber-800 border-amber-200" };
  return { label: "Peu compatible", cls: "bg-slate-50 text-slate-600 border-slate-200" };
}
