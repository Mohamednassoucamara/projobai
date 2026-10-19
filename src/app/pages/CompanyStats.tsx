import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { BarChart3, Loader2, Info } from "lucide-react";
import DashboardHeader from "../components/DashboardHeader";
import Footer from "../components/Footer";
import { supabase } from "../../lib/supabase";
import { companyService } from "../../services/supabase.service";
import { atsService, type ApplicationEvent } from "../../services/ats.service";
import { PIPELINE, SOURCES, STAGE_RANK, type Interview } from "../../lib/ats";

type Job = { id: string; title: string; is_active: boolean; published_at?: string; created_at: string; views_count?: number; recruitment_cost?: number | null };
type App = { id: string; job_id: string; status: string; applied_at: string; source?: string | null };

const PERIODS = [
  { v: 30, label: "30 jours" },
  { v: 90, label: "3 mois" },
  { v: 365, label: "12 mois" },
  { v: 0, label: "Tout" },
];

const DAY = 86400000;
const gnf = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} GNF`;
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "—");
const days = (ms: number) => {
  const d = ms / DAY;
  return d < 1 ? "moins d'un jour" : `${Math.round(d)} jour${Math.round(d) > 1 ? "s" : ""}`;
};

/** Tableau de bord RH : volumes, conversion par étape, délais, coûts et sources. */
export default function CompanyStats() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [events, setEvents] = useState<ApplicationEvent[] | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState(90);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [j, a] = await Promise.all([companyService.getJobs(user.id), companyService.getApplications(user.id)]);
        const { data: budgets } = await (supabase as unknown as import("@supabase/supabase-js").SupabaseClient).from("job_budgets").select("job_id, amount");
        const byJob = new Map((budgets || []).map((b: { job_id: string; amount: number }) => [b.job_id, Number(b.amount)]));
        setJobs(((j || []) as unknown as Job[]).map((x) => ({ ...x, recruitment_cost: byJob.get(x.id) ?? null })));
        const list = (a || []) as unknown as App[];
        setApps(list);
        const [ev, iv] = await Promise.allSettled([atsService.getStatusEvents(list.map((x) => x.id)), atsService.companyInterviews()]);
        setEvents(ev.status === "fulfilled" ? ev.value : null);
        setInterviews(iv.status === "fulfilled" ? (iv.value as unknown as Interview[]) : []);
      } catch {
        setError("Les statistiques n'ont pas pu être chargées. Vérifiez votre connexion.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const s = useMemo(() => {
    const since = period ? Date.now() - period * DAY : 0;
    const inPeriod = apps.filter((a) => new Date(a.applied_at).getTime() >= since);
    const ids = new Set(inPeriod.map((a) => a.id));
    const evByApp = new Map<string, ApplicationEvent[]>();
    for (const e of events || []) {
      if (!ids.has(e.application_id)) continue;
      (evByApp.get(e.application_id) || evByApp.set(e.application_id, []).get(e.application_id)!).push(e);
    }

    // Étape la plus avancée atteinte par chaque candidature (même si elle a été refusée ensuite).
    const reached = (a: App) => {
      const list = evByApp.get(a.id) || [];
      let best = STAGE_RANK[a.status] ?? 0;
      for (const e of list) best = Math.max(best, STAGE_RANK[e.to_status || ""] ?? 0);
      return best;
    };
    const funnel = PIPELINE.map((st) => ({ ...st, count: inPeriod.filter((a) => reached(a) >= STAGE_RANK[st.status]).length }));

    const hired = inPeriod.filter((a) => a.status === "accepted");
    const hireDelays: number[] = [];
    const firstResponse: number[] = [];
    for (const a of inPeriod) {
      const list = (evByApp.get(a.id) || []).filter((e) => e.from_status).sort((x, y) => +new Date(x.created_at) - +new Date(y.created_at));
      if (list.length) firstResponse.push(+new Date(list[0].created_at) - +new Date(a.applied_at));
      const acc = list.find((e) => e.to_status === "accepted");
      if (a.status === "accepted" && acc) hireDelays.push(+new Date(acc.created_at) - +new Date(a.applied_at));
    }
    const avg = (l: number[]) => (l.length ? l.reduce((x, y) => x + y, 0) / l.length : null);

    // Coût par recrutement : budgets des offres ayant abouti à au moins une embauche.
    const hiresByJob = new Map<string, number>();
    for (const a of hired) hiresByJob.set(a.job_id, (hiresByJob.get(a.job_id) || 0) + 1);
    let cost = 0;
    let costHires = 0;
    for (const j of jobs) {
      const h = hiresByJob.get(j.id) || 0;
      if (h && j.recruitment_cost) { cost += Number(j.recruitment_cost); costHires += h; }
    }

    const sources = new Map<string, { n: number; hired: number }>();
    for (const a of inPeriod) {
      const k = a.source || "projob";
      const cur = sources.get(k) || { n: 0, hired: 0 };
      cur.n++;
      if (a.status === "accepted") cur.hired++;
      sources.set(k, cur);
    }

    const ivInPeriod = interviews.filter((i) => new Date(i.scheduled_at).getTime() >= since);
    const recruiters = new Map<string, { planned: number; done: number; cancelled: number }>();
    for (const i of ivInPeriod) {
      const k = (i.interviewer || "").trim() || "Non précisé";
      const cur = recruiters.get(k) || { planned: 0, done: 0, cancelled: 0 };
      if (i.status === "done") cur.done++;
      else if (i.status === "cancelled") cur.cancelled++;
      else cur.planned++;
      recruiters.set(k, cur);
    }

    const perJob = jobs.map((j) => {
      const list = inPeriod.filter((a) => a.job_id === j.id);
      return {
        j,
        n: list.length,
        interview: list.filter((a) => reached(a) >= STAGE_RANK.interview).length,
        hired: list.filter((a) => a.status === "accepted").length,
      };
    }).filter((r) => r.n > 0 || r.j.is_active);

    const jobsPublished = jobs.filter((j) => new Date(j.published_at || j.created_at).getTime() >= since).length;

    return {
      total: inPeriod.length,
      jobsPublished,
      activeJobs: jobs.filter((j) => j.is_active).length,
      funnel,
      hired: hired.length,
      rejected: inPeriod.filter((a) => a.status === "rejected").length,
      avgHire: avg(hireDelays),
      avgFirst: avg(firstResponse),
      pending: inPeriod.filter((a) => a.status === "pending").length,
      costPerHire: costHires ? cost / costHires : null,
      interviewsDone: ivInPeriod.filter((i) => i.status === "done").length,
      interviewsPlanned: ivInPeriod.filter((i) => i.status === "planned").length,
      sources: [...sources.entries()].sort((a, b) => b[1].n - a[1].n),
      recruiters: [...recruiters.entries()].sort((a, b) => b[1].done + b[1].planned - (a[1].done + a[1].planned)),
      perJob,
    };
  }, [apps, jobs, events, interviews, period]);

  const kpis = [
    { label: "Offres publiées", value: s.jobsPublished, hint: `${s.activeJobs} en ligne actuellement` },
    { label: "Candidatures reçues", value: s.total, hint: `${s.pending} en attente de réponse` },
    { label: "Entretiens", value: s.interviewsDone + s.interviewsPlanned, hint: `${s.interviewsDone} réalisés · ${s.interviewsPlanned} planifiés` },
    { label: "Recrutements", value: s.hired, hint: `Taux d'embauche ${pct(s.hired, s.total)}` },
    { label: "Délai moyen de recrutement", value: s.avgHire !== null ? days(s.avgHire) : "—", hint: "De la candidature à « Retenue »" },
    { label: "Délai moyen de première réponse", value: s.avgFirst !== null ? days(s.avgFirst) : "—", hint: "Premier changement d'étape" },
    { label: "Coût par recrutement", value: s.costPerHire !== null ? gnf(s.costPerHire) : "—", hint: s.costPerHire !== null ? "Budget des offres ÷ embauches" : "Renseignez le budget dans vos offres" },
  ];

  const maxFunnel = Math.max(1, ...s.funnel.map((f) => f.count));
  const maxSource = Math.max(1, ...s.sources.map(([, v]) => v.n));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardHeader />
      <main className="page-container py-8 sm:py-12 flex-1">
        <Link to="/company/dashboard" className="text-sm font-semibold text-[#050FA0] hover:underline">← Tableau de bord</Link>
        <div className="mt-3 mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="page-title mb-2 flex items-center gap-3"><BarChart3 className="h-8 w-8 text-[#050FA0]" /> Statistiques RH</h1>
            <p className="page-subtitle">Candidatures reçues sur la période choisie et leur progression.</p>
          </div>
          <div className="inline-flex rounded-xl border-2 border-slate-200 bg-white p-1" role="group" aria-label="Période">
            {PERIODS.map((p) => (
              <button key={p.v} type="button" aria-pressed={period === p.v} onClick={() => setPeriod(p.v)} className={`px-3 py-1.5 rounded-lg text-sm font-bold ${period === p.v ? "bg-[#050FA0] text-white" : "text-slate-600 hover:text-slate-900"}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#050FA0]" /></div>
        ) : error ? (
          <p className="rounded-xl px-4 py-3 text-sm border-2 bg-red-50 border-red-200 text-red-800">{error}</p>
        ) : (
          <>
            {events === null && (
              <p className="mb-6 rounded-xl px-4 py-3 text-sm border-2 bg-amber-50 border-amber-200 text-amber-900">
                Les délais et la conversion détaillée demandent la migration 011 dans Supabase. Les chiffres ci-dessous utilisent l&apos;étape actuelle des candidatures.
              </p>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {kpis.map((k) => (
                <div key={k.label} className="bg-white rounded-2xl border-2 border-slate-100 p-5">
                  <p className="text-sm font-medium text-slate-600">{k.label}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 tabular-nums">{k.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{k.hint}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              <section className="bg-white rounded-2xl border p-5 sm:p-6">
                <h2 className="text-lg font-bold mb-1">Conversion par étape</h2>
                <p className="text-xs text-slate-500 mb-4">Part des candidatures qui ont atteint chaque étape (même si elles ont été refusées ensuite).</p>
                <ul className="space-y-3">
                  {s.funnel.map((f, i) => (
                    <li key={f.status}>
                      <div className="flex items-baseline justify-between text-sm gap-2">
                        <span className="font-semibold text-slate-800">{f.label}</span>
                        <span className="tabular-nums text-slate-600">
                          {f.count} · {pct(f.count, s.total)}
                          {i > 0 && <span className="text-slate-400"> ({pct(f.count, s.funnel[i - 1].count)} de l&apos;étape précédente)</span>}
                        </span>
                      </div>
                      <div className="mt-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-[#050FA0]" style={{ width: `${(f.count / maxFunnel) * 100}%`, opacity: 1 - i * 0.12 }} />
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-slate-600">Non retenues : <span className="font-semibold tabular-nums">{s.rejected}</span> ({pct(s.rejected, s.total)})</p>
              </section>

              <section className="bg-white rounded-2xl border p-5 sm:p-6">
                <h2 className="text-lg font-bold mb-1">Sources des candidatures</h2>
                <p className="text-xs text-slate-500 mb-4">Utilisez le bouton « Partager » de chaque offre : les liens indiquent d&apos;où viennent les candidats.</p>
                {s.sources.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucune candidature sur la période.</p>
                ) : (
                  <ul className="space-y-3">
                    {s.sources.map(([k, v]) => (
                      <li key={k}>
                        <div className="flex items-baseline justify-between text-sm gap-2">
                          <span className="font-semibold text-slate-800">{SOURCES[k] || k}</span>
                          <span className="tabular-nums text-slate-600">{v.n} candidature{v.n > 1 ? "s" : ""} · {v.hired} recruté{v.hired > 1 ? "s" : ""}</span>
                        </div>
                        <div className="mt-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-[#E4220F]" style={{ width: `${(v.n / maxSource) * 100}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className="bg-white rounded-2xl border p-5 sm:p-6 mb-8 overflow-x-auto">
              <h2 className="text-lg font-bold mb-4">Résultats par offre</h2>
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-2 pr-3 font-semibold">Offre</th>
                    <th className="py-2 px-3 font-semibold text-right">Vues</th>
                    <th className="py-2 px-3 font-semibold text-right">Candidatures</th>
                    <th className="py-2 px-3 font-semibold text-right">Entretiens</th>
                    <th className="py-2 px-3 font-semibold text-right">Recrutés</th>
                    <th className="py-2 pl-3 font-semibold text-right">Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {s.perJob.map(({ j, n, interview, hired }) => (
                    <tr key={j.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-3">
                        <span className="font-semibold text-slate-800">{j.title}</span>
                        {!j.is_active && <span className="ml-2 text-xs text-slate-500">(clôturée)</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{j.views_count ?? "—"}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{n}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{interview}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{hired}</td>
                      <td className="py-2.5 pl-3 text-right tabular-nums">{j.recruitment_cost ? gnf(Number(j.recruitment_cost)) : <Link to={`/company/jobs/${j.id}/edit`} className="text-[#050FA0] font-semibold hover:underline">Ajouter</Link>}</td>
                    </tr>
                  ))}
                  {s.perJob.length === 0 && (
                    <tr><td colSpan={6} className="py-6 text-center text-slate-500">Aucune offre sur la période.</td></tr>
                  )}
                </tbody>
              </table>
            </section>

            <section className="bg-white rounded-2xl border p-5 sm:p-6">
              <h2 className="text-lg font-bold mb-1">Entretiens par recruteur</h2>
              <p className="text-xs text-slate-500 mb-4">Selon le nom indiqué dans « Recruteur(s) présent(s) » lors de la planification.</p>
              {s.recruiters.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun entretien sur la période.</p>
              ) : (
                <ul className="divide-y">
                  {s.recruiters.map(([name, v]) => (
                    <li key={name} className="py-2.5 flex flex-wrap justify-between gap-2 text-sm">
                      <span className="font-semibold text-slate-800">{name}</span>
                      <span className="tabular-nums text-slate-600">{v.done} réalisé{v.done > 1 ? "s" : ""} · {v.planned} planifié{v.planned > 1 ? "s" : ""}{v.cancelled ? ` · ${v.cancelled} annulé${v.cancelled > 1 ? "s" : ""}` : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="mt-6 text-xs text-slate-500 flex gap-1.5"><Info className="h-3.5 w-3.5 shrink-0 mt-0.5" /> Les chiffres portent sur les candidatures reçues pendant la période choisie.</p>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
