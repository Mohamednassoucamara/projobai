// Données partagées du suivi des candidatures (ATS) et des entretiens.

export type AppStatus = "pending" | "reviewed" | "shortlisted" | "interview" | "accepted" | "rejected";

/** Étapes dans l'ordre du recrutement (le refus est une sortie possible à chaque étape). */
export const PIPELINE: { status: AppStatus; label: string; short: string }[] = [
  { status: "pending", label: "Reçue", short: "Reçues" },
  { status: "reviewed", label: "Examinée", short: "Examinées" },
  { status: "shortlisted", label: "Présélectionnée", short: "Présélectionnées" },
  { status: "interview", label: "Entretien", short: "Entretien" },
  { status: "accepted", label: "Retenue", short: "Retenues" },
];

export const STATUS_LABELS: Record<string, string> = {
  pending: "Reçue",
  reviewed: "Examinée",
  shortlisted: "Présélectionnée",
  interview: "Entretien",
  accepted: "Retenue",
  rejected: "Non retenue",
};

export const STATUS_STYLES: Record<string, string> = {
  pending: "bg-slate-200 text-slate-700",
  reviewed: "bg-[#050FA0]/10 text-[#050FA0]",
  shortlisted: "bg-amber-100 text-amber-800",
  interview: "bg-violet-100 text-violet-800",
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
};

export const STAGE_RANK: Record<string, number> = { pending: 0, reviewed: 1, shortlisted: 2, interview: 3, accepted: 4, rejected: -1 };

// ---------- Provenance des candidatures ----------

export const SOURCES: Record<string, string> = {
  projob: "ProJob AI (site)",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  email: "E-mail",
  cvtheque: "CVthèque",
  autre: "Autre lien",
};

/** Garde une valeur de source connue (les liens partagés ajoutent ?source=whatsapp…). */
export function cleanSource(raw?: string | null): string {
  const s = String(raw || "").toLowerCase().trim();
  if (!s) return "projob";
  return s in SOURCES ? s : "autre";
}

const SOURCE_KEY = "projob_source_";

export function rememberSource(jobId: string, raw: string | null) {
  if (!raw) return;
  try { sessionStorage.setItem(SOURCE_KEY + jobId, cleanSource(raw)); } catch { /* navigation privée */ }
}

export function recalledSource(jobId: string): string {
  try { return sessionStorage.getItem(SOURCE_KEY + jobId) || "projob"; } catch { return "projob"; }
}

// ---------- Entretiens ----------

export type InterviewMode = "visio" | "presentiel" | "telephone";

export const MODE_LABELS: Record<InterviewMode, string> = {
  visio: "Visioconférence",
  presentiel: "Présentiel",
  telephone: "Téléphone",
};

export interface Interview {
  id: string;
  application_id: string;
  company_id: string;
  candidate_id: string;
  scheduled_at: string;
  duration_minutes: number;
  mode: InterviewMode;
  location: string | null;
  meeting_url: string | null;
  interviewer: string | null;
  message: string | null;
  status: "planned" | "done" | "cancelled";
  created_at?: string;
}

export const EVALUATION_CRITERIA: { key: string; label: string }[] = [
  { key: "competences", label: "Compétences techniques" },
  { key: "experience", label: "Expérience pertinente" },
  { key: "communication", label: "Communication" },
  { key: "motivation", label: "Motivation et connaissance de l'entreprise" },
  { key: "adequation", label: "Adéquation avec l'équipe et le poste" },
];

export const RECOMMENDATIONS: { value: "retenir" | "a_revoir" | "refuser"; label: string; cls: string }[] = [
  { value: "retenir", label: "À retenir", cls: "border-emerald-500 bg-emerald-50 text-emerald-800" },
  { value: "a_revoir", label: "À revoir", cls: "border-amber-500 bg-amber-50 text-amber-800" },
  { value: "refuser", label: "Ne pas retenir", cls: "border-red-500 bg-red-50 text-red-800" },
];

/** Salle Jitsi Meet gratuite, sans compte côté candidat. */
export function jitsiLink() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const id = Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 10);
  return `https://meet.jit.si/ProJobAI-${id}`;
}

export function formatWhen(iso: string, opts: { withDay?: boolean } = {}) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", {
    weekday: opts.withDay === false ? undefined : "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} à ${time}`;
}

function icsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsEscape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => "\\" + m);
}

export function interviewWhere(iv: Pick<Interview, "mode" | "location" | "meeting_url">) {
  if (iv.mode === "visio") return iv.meeting_url || "Visioconférence";
  if (iv.mode === "telephone") return "Entretien téléphonique";
  return iv.location || "Présentiel";
}

/** Fichier .ics : s'ajoute à Google Agenda, Outlook ou au calendrier du téléphone. */
export function interviewIcs(iv: Interview, title: string, description: string) {
  const start = new Date(iv.scheduled_at);
  const end = new Date(start.getTime() + (iv.duration_minutes || 45) * 60000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ProJob AI//Entretiens//FR",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${iv.id}@projobai.com`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(title)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    `LOCATION:${icsEscape(interviewWhere(iv))}`,
    ...(iv.meeting_url ? [`URL:${iv.meeting_url}`] : []),
    iv.status === "cancelled" ? "STATUS:CANCELLED" : "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function downloadIcs(iv: Interview, title: string, description: string) {
  const blob = new Blob([interviewIcs(iv, title, description)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "entretien-projob.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function googleCalendarLink(iv: Interview, title: string, description: string) {
  const start = new Date(iv.scheduled_at);
  const end = new Date(start.getTime() + (iv.duration_minutes || 45) * 60000);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${icsDate(start)}/${icsDate(end)}`,
    details: description,
    location: interviewWhere(iv),
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** Valeur pour <input type="datetime-local"> à partir d'une date ISO (heure locale). */
export function toLocalInput(iso?: string) {
  const d = iso ? new Date(iso) : new Date(Date.now() + 2 * 86400000);
  if (!iso) d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Lien WhatsApp (wa.me) vers un numéro guinéen ou international. */
export function whatsappNumber(phone?: string | null) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 9 && digits.startsWith("6")) return "224" + digits;
  if (digits.startsWith("00")) return digits.slice(2);
  return digits;
}
