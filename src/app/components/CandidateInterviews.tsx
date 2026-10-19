import { useEffect, useState } from "react";
import { CalendarDays, Video, MapPin, Phone, Download, Clock, MessageSquare } from "lucide-react";
import { Link } from "react-router";
import { atsService } from "../../services/ats.service";
import { MODE_LABELS, downloadIcs, formatWhen, googleCalendarLink, type Interview } from "../../lib/ats";

type Row = Interview & { applications?: { id: string; jobs?: { id: string; title?: string; company_profiles?: { company_name?: string } } } };

const MODE_ICON = { visio: Video, presentiel: MapPin, telephone: Phone } as const;

/** Entretiens à venir du candidat, avec ajout à l'agenda et lien de visioconférence. */
export default function CandidateInterviews() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    atsService.candidateInterviews().then((d) => setRows(d as unknown as Row[]), () => setRows([])).finally(() => setLoaded(true));
  }, []);

  const now = Date.now();
  const upcoming = rows.filter((r) => r.status !== "cancelled" && new Date(r.scheduled_at).getTime() + r.duration_minutes * 60000 >= now);
  const cancelled = rows.filter((r) => r.status === "cancelled" && new Date(r.scheduled_at).getTime() >= now);
  if (!loaded || (upcoming.length === 0 && cancelled.length === 0)) return null;

  return (
    <section id="mes-entretiens" className="mb-12 sm:mb-16 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border-2 border-violet-200 shadow-xl shadow-violet-100/60 scroll-mt-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-2xl bg-violet-700 flex items-center justify-center shadow-lg shadow-violet-700/30">
          <CalendarDays className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Mes entretiens</h2>
          <p className="text-slate-600">Vous recevez un rappel la veille de chaque entretien.</p>
        </div>
      </div>
      <ul className="space-y-4">
        {[...upcoming, ...cancelled].map((r) => {
          const Icon = MODE_ICON[r.mode];
          const job = r.applications?.jobs;
          const company = job?.company_profiles?.company_name || "Entreprise";
          const title = `Entretien — ${job?.title || "Offre"} (${company})`;
          const desc = [r.meeting_url ? `Lien : ${r.meeting_url}` : "", r.location || "", r.message || ""].filter(Boolean).join("\n");
          const soon = new Date(r.scheduled_at).getTime() - now < 30 * 60000;
          return (
            <li key={r.id} className={`rounded-2xl border-2 p-4 sm:p-5 ${r.status === "cancelled" ? "border-slate-200 bg-slate-50" : "border-violet-100"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`font-bold text-lg ${r.status === "cancelled" ? "line-through text-slate-500" : "text-slate-900"}`}>{formatWhen(r.scheduled_at)}</p>
                  <p className="text-slate-700 mt-0.5">{job?.title} · {company}</p>
                  <p className="text-sm text-slate-600 mt-1 flex items-center gap-1.5 flex-wrap">
                    <Icon className="h-4 w-4 text-violet-700" /> {MODE_LABELS[r.mode]}
                    <Clock className="h-3.5 w-3.5 ml-2" /> {r.duration_minutes} min
                    {r.interviewer ? <span>· avec {r.interviewer}</span> : null}
                  </p>
                  {r.mode === "presentiel" && r.location && <p className="text-sm text-slate-800 mt-1 font-medium">{r.location}</p>}
                  {r.message && <p className="mt-2 text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">{r.message}</p>}
                </div>
                {r.status === "cancelled" && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-200 text-slate-600">Annulé</span>}
              </div>
              {r.status !== "cancelled" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {r.meeting_url && (
                    <a href={r.meeting_url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${soon ? "bg-violet-700 text-white hover:bg-violet-800" : "border-2 border-violet-300 text-violet-800 hover:bg-violet-50"}`}>
                      <Video className="h-4 w-4" /> Rejoindre la visio
                    </a>
                  )}
                  <button type="button" onClick={() => downloadIcs(r, title, desc)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-slate-200 text-sm font-bold text-slate-700 hover:border-[#050FA0]">
                    <Download className="h-4 w-4" /> Ajouter à mon agenda
                  </button>
                  <a href={googleCalendarLink(r, title, desc)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-slate-200 text-sm font-bold text-slate-700 hover:border-[#050FA0]">
                    Google Agenda
                  </a>
                  <Link to="/interview-prep" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-slate-200 text-sm font-bold text-slate-700 hover:border-[#050FA0]">
                    <MessageSquare className="h-4 w-4" /> M&apos;entraîner
                  </Link>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
