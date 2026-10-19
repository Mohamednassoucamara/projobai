import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { CalendarDays, Loader2, Video, MapPin, Phone, Download, FolderOpen, Clock } from "lucide-react";
import DashboardHeader from "../components/DashboardHeader";
import Footer from "../components/Footer";
import { MODE_LABELS, downloadIcs, type Interview } from "../../lib/ats";
import { atsService, atsErrorMessage } from "../../services/ats.service";

type Row = Interview & {
  applications?: { id: string; jobs?: { title?: string }; candidate_profiles?: { profiles?: { full_name?: string; phone?: string } } };
};

const MODE_ICON = { visio: Video, presentiel: MapPin, telephone: Phone } as const;

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86400000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const base = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
  if (same(d, today)) return `Aujourd'hui · ${base}`;
  if (same(d, tomorrow)) return `Demain · ${base}`;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** Agenda des entretiens de l'entreprise. */
export default function CompanyInterviews() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    atsService.companyInterviews().then(
      (data) => setRows(data as unknown as Row[]),
      (err) => setError(atsErrorMessage(err)),
    ).finally(() => setLoading(false));
  }, []);

  const now = Date.now();
  const list = useMemo(() => {
    const filtered = rows.filter((r) =>
      view === "upcoming"
        ? r.status === "planned" && new Date(r.scheduled_at).getTime() + r.duration_minutes * 60000 >= now
        : r.status !== "planned" || new Date(r.scheduled_at).getTime() + r.duration_minutes * 60000 < now,
    );
    filtered.sort((a, b) => (view === "upcoming" ? 1 : -1) * (+new Date(a.scheduled_at) - +new Date(b.scheduled_at)));
    const groups: { key: string; label: string; items: Row[] }[] = [];
    for (const r of filtered) {
      const k = dayKey(r.scheduled_at);
      let g = groups.find((x) => x.key === k);
      if (!g) groups.push((g = { key: k, label: dayLabel(r.scheduled_at), items: [] }));
      g.items.push(r);
    }
    return groups;
  }, [rows, view, now]);

  const upcomingCount = rows.filter((r) => r.status === "planned" && new Date(r.scheduled_at).getTime() >= now).length;
  const toEvaluate = rows.filter((r) => r.status === "planned" && new Date(r.scheduled_at).getTime() < now).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardHeader />
      <main className="page-container py-8 sm:py-12 flex-1">
        <Link to="/company/dashboard" className="text-sm font-semibold text-[#050FA0] hover:underline">← Tableau de bord</Link>
        <h1 className="page-title mt-3 mb-2 flex items-center gap-3"><CalendarDays className="h-8 w-8 text-violet-700" /> Agenda des entretiens</h1>
        <p className="page-subtitle mb-6">Planifiez un entretien depuis le dossier d&apos;un candidat : il reçoit la convocation et un rappel la veille.</p>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="inline-flex rounded-xl border-2 border-slate-200 bg-white p-1" role="tablist">
            {([["upcoming", `À venir (${upcomingCount})`], ["past", `Passés${toEvaluate ? ` · ${toEvaluate} à évaluer` : ""}`]] as const).map(([v, label]) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`px-4 py-2 rounded-lg text-sm font-bold ${view === v ? "bg-[#050FA0] text-white" : "text-slate-600 hover:text-slate-900"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#050FA0]" /></div>
        ) : error ? (
          <p className="rounded-xl px-4 py-3 text-sm border-2 bg-amber-50 border-amber-200 text-amber-900">{error}</p>
        ) : list.length === 0 ? (
          <div className="text-center py-14 rounded-2xl bg-white border border-dashed border-slate-300">
            <CalendarDays className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-700">{view === "upcoming" ? "Aucun entretien à venir." : "Aucun entretien passé."}</p>
            <p className="text-sm text-slate-500 mt-1">Ouvrez une candidature puis « Planifier un entretien ».</p>
          </div>
        ) : (
          <div className="space-y-8">
            {list.map((g) => (
              <section key={g.key} aria-label={g.label}>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">{g.label}</h2>
                <ul className="space-y-3">
                  {g.items.map((r) => {
                    const Icon = MODE_ICON[r.mode];
                    const name = r.applications?.candidate_profiles?.profiles?.full_name || "Candidat";
                    const job = r.applications?.jobs?.title || "Offre";
                    const time = new Date(r.scheduled_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                    const past = new Date(r.scheduled_at).getTime() < now;
                    return (
                      <li key={r.id} className={`bg-white rounded-2xl border-2 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${r.status === "cancelled" ? "opacity-60 border-slate-200" : "border-slate-100"}`}>
                        <div className="sm:w-24 shrink-0">
                          <p className="text-2xl font-bold text-slate-900 tabular-nums">{time}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1"><Clock className="h-3 w-3" /> {r.duration_minutes} min</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900">{name}</p>
                          <p className="text-sm text-slate-600">{job}</p>
                          <p className="text-sm text-slate-600 mt-1 flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5 text-violet-700" /> {MODE_LABELS[r.mode]}
                            {r.mode === "presentiel" && r.location ? ` · ${r.location}` : ""}
                            {r.interviewer ? ` · ${r.interviewer}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          {r.status === "cancelled" && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-200 text-slate-600">Annulé</span>}
                          {r.status === "done" && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">Réalisé</span>}
                          {r.status === "planned" && past && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">À évaluer</span>}
                          {r.status === "planned" && !past && r.meeting_url && (
                            <a href={r.meeting_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-700 text-white text-xs font-bold hover:bg-violet-800">
                              <Video className="h-3.5 w-3.5" /> Rejoindre
                            </a>
                          )}
                          {r.status === "planned" && !past && (
                            <button type="button" onClick={() => downloadIcs(r, `Entretien ${name} — ${job}`, r.meeting_url || "")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:border-[#050FA0]">
                              <Download className="h-3.5 w-3.5" /> .ics
                            </button>
                          )}
                          <Link to={`/company/applications/${r.application_id}#entretien`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:border-[#050FA0] hover:text-[#050FA0]">
                            <FolderOpen className="h-3.5 w-3.5" /> {past && r.status !== "cancelled" ? "Évaluer" : "Dossier"}
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
