import { useState } from "react";
import { Loader2, Video, MapPin, Phone, Wand2 } from "lucide-react";
import { jitsiLink, toLocalInput, MODE_LABELS, type Interview, type InterviewMode } from "../../lib/ats";

export type InterviewDraft = {
  scheduled_at: string;
  duration_minutes: number;
  mode: InterviewMode;
  location: string | null;
  meeting_url: string | null;
  interviewer: string | null;
  message: string | null;
};

const MODE_ICONS = { visio: Video, presentiel: MapPin, telephone: Phone } as const;

/** Formulaire de planification (ou de modification) d'un entretien. */
export default function InterviewForm({
  initial,
  defaultLocation,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: Interview | null;
  defaultLocation?: string;
  onSubmit: (draft: InterviewDraft) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [when, setWhen] = useState(toLocalInput(initial?.scheduled_at));
  const [duration, setDuration] = useState(initial?.duration_minutes || 45);
  const [mode, setMode] = useState<InterviewMode>(initial?.mode || "visio");
  const [location, setLocation] = useState(initial?.location || defaultLocation || "");
  const [url, setUrl] = useState(initial?.meeting_url || "");
  const [interviewer, setInterviewer] = useState(initial?.interviewer || "");
  const [message, setMessage] = useState(initial?.message || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const date = new Date(when);
    if (Number.isNaN(date.getTime())) return setError("Indiquez la date et l'heure de l'entretien.");
    if (!initial && date.getTime() < Date.now() - 5 * 60000) return setError("La date choisie est déjà passée.");
    if (mode === "presentiel" && !location.trim()) return setError("Indiquez l'adresse de l'entretien.");
    let meeting = url.trim();
    if (mode === "visio" && !meeting) meeting = jitsiLink();
    if (meeting && !/^https:\/\//i.test(meeting)) return setError("Le lien de visioconférence doit commencer par https://");
    setBusy(true);
    try {
      await onSubmit({
        scheduled_at: date.toISOString(),
        duration_minutes: duration,
        mode,
        location: mode === "presentiel" ? location.trim() : null,
        meeting_url: mode === "visio" ? meeting : null,
        interviewer: interviewer.trim() || null,
        message: message.trim() || null,
      });
    } catch (err) {
      setError((err as Error).message || "L'entretien n'a pas pu être enregistré.");
    } finally {
      setBusy(false);
    }
  };

  const field = "w-full px-3 py-2.5 rounded-lg border-2 border-slate-200 focus:border-[#050FA0] outline-none bg-white text-sm";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="block font-semibold text-slate-700 mb-1">Date et heure *</span>
          <input type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} className={field} />
        </label>
        <label className="block text-sm">
          <span className="block font-semibold text-slate-700 mb-1">Durée</span>
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={field}>
            {[20, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} h${m % 60 ? " 30" : ""}`}</option>)}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="block text-sm font-semibold text-slate-700 mb-2">Type d&apos;entretien</legend>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(MODE_LABELS) as InterviewMode[]).map((m) => {
            const Icon = MODE_ICONS[m];
            const on = mode === m;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={on}
                onClick={() => setMode(m)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl border-2 text-sm font-semibold ${on ? "border-[#050FA0] bg-[#050FA0]/5 text-[#050FA0]" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
              >
                <Icon className="h-4 w-4" /> {MODE_LABELS[m]}
              </button>
            );
          })}
        </div>
      </fieldset>

      {mode === "visio" && (
        <label className="block text-sm">
          <span className="block font-semibold text-slate-700 mb-1">Lien de visioconférence</span>
          <div className="flex gap-2">
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Google Meet, Zoom, Teams… ou laissez vide" className={field} />
            <button type="button" onClick={() => setUrl(jitsiLink())} className="shrink-0 inline-flex items-center gap-1.5 px-3 rounded-lg border-2 border-slate-200 text-sm font-semibold text-slate-700 hover:border-[#050FA0]">
              <Wand2 className="h-4 w-4" /> Créer
            </button>
          </div>
          <span className="block text-xs text-slate-500 mt-1">Laissé vide, un lien Jitsi Meet gratuit est créé automatiquement. Le candidat le reçoit avec la convocation.</span>
        </label>
      )}
      {mode === "presentiel" && (
        <label className="block text-sm">
          <span className="block font-semibold text-slate-700 mb-1">Adresse *</span>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex. : Immeuble X, Kaloum, Conakry — 2e étage" className={field} />
        </label>
      )}
      {mode === "telephone" && (
        <p className="text-xs text-slate-500">Vous appellerez le candidat au numéro indiqué dans sa candidature.</p>
      )}

      <label className="block text-sm">
        <span className="block font-semibold text-slate-700 mb-1">Recruteur(s) présent(s)</span>
        <input value={interviewer} onChange={(e) => setInterviewer(e.target.value)} placeholder="Ex. : Mme Diallo, responsable RH" className={field} />
      </label>
      <label className="block text-sm">
        <span className="block font-semibold text-slate-700 mb-1">Message au candidat</span>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={1000} placeholder="Ex. : Merci de vous munir d'une pièce d'identité et de vos diplômes." className={field} />
      </label>

      {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#050FA0] text-white font-bold text-sm hover:bg-[#060C6E] disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-900">Annuler</button>
        )}
      </div>
    </form>
  );
}
