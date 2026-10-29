import { Link } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Users, Briefcase, Star, Loader2, ChevronDown, ChevronUp, Pencil, Trash2, PauseCircle, PlayCircle, AlertTriangle, Eye, CalendarDays, BarChart3, Share2, ArrowDownWideNarrow, Building2 } from "lucide-react";
import { matchJob, MATCH_DISCLAIMER, type MatchResult } from "../../lib/matching";
import { PIPELINE } from "../../lib/ats";
import { atsService } from "../../services/ats.service";
import ShareJobMenu from "../components/ShareJobMenu";
import { PremiumBadge, PremiumUpsell } from "../components/PremiumGate";
import { usePlan } from "../contexts/PlanContext";
import CompanyApplicationItem, { type CompanyApplicationData } from "../components/CompanyApplicationItem";
import DashboardHeader from "../components/DashboardHeader";
import { motion } from "motion/react";
import { companyService } from "../../services/supabase.service";
import { supabase } from "../../lib/supabase";
import Footer from "../components/Footer";

export default function DashboardCompany() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [allApplications, setAllApplications] = useState<CompanyApplicationData[]>([]);
  const [applicationsByJob, setApplicationsByJob] = useState<Record<string, CompanyApplicationData[]>>({});
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ activeJobs: 0, totalApplications: 0, favorites: 0, hired: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busyJob, setBusyJob] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [applicantCVs, setApplicantCVs] = useState<Record<string, Record<string, unknown>> | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"score" | "date">("score");
  const [shareJob, setShareJob] = useState<string | null>(null);
  const { can } = usePlan();

  const flash = (ok: boolean, text: string) => {
    setActionMsg({ ok, text });
    window.setTimeout(() => setActionMsg(null), 4000);
  };

  // Clôturer / republier : l'offre disparaît (ou réapparaît) pour les candidats, les candidatures restent.
  const toggleActive = async (offer: { id: string; is_active: boolean; title: string }) => {
    setBusyJob(offer.id);
    const next = !offer.is_active;
    const { error } = await supabase.from("jobs").update({ is_active: next }).eq("id", offer.id);
    setBusyJob(null);
    if (error) return flash(false, "La modification n'a pas pu être enregistrée. Réessayez.");
    setJobs((list) => list.map((j) => (j.id === offer.id ? { ...j, is_active: next } : j)));
    setStats((st) => ({ ...st, activeJobs: st.activeJobs + (next ? 1 : -1) }));
    flash(true, next ? `« ${offer.title} » est de nouveau visible par les candidats.` : `« ${offer.title} » est clôturée : elle n'est plus visible par les candidats.`);
  };

  // Suppression définitive : l'offre et ses candidatures sont effacées.
  const deleteOffer = async (offer: { id: string; title: string; is_active: boolean }) => {
    setBusyJob(offer.id);
    const { error } = await supabase.from("jobs").delete().eq("id", offer.id);
    setBusyJob(null);
    setConfirmDelete(null);
    if (error) return flash(false, "L'offre n'a pas pu être supprimée. Réessayez.");
    const removedApps = (applicationsByJob[offer.id] || []).length;
    setJobs((list) => list.filter((j) => j.id !== offer.id));
    setAllApplications((list) => list.filter((a) => (a as { job_id?: string }).job_id !== offer.id));
    setApplicationsByJob((m) => { const n = { ...m }; delete n[offer.id]; return n; });
    setStats((st) => ({ ...st, activeJobs: st.activeJobs - (offer.is_active ? 1 : 0), totalApplications: Math.max(0, st.totalApplications - removedApps) }));
    flash(true, `« ${offer.title} » a été supprimée.`);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadError("");
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        // CV structurés des candidats (migration 011) : sans eux, pas de score, mais le reste fonctionne.
        // Formule gratuite : pas de classement IA (PREMIUM_REQUIRED) → aucun score affiché
        atsService.getApplicantCVs().then(setApplicantCVs, (e) => setApplicantCVs(/PREMIUM_REQUIRED/.test(String(e?.message)) ? null : {}));

        const [jobsData, applicationsData, favCount] = await Promise.all([
          companyService.getJobs(authUser.id),
          companyService.getApplications(authUser.id),
          supabase
            .from("favorite_candidates")
            .select("id", { count: "exact", head: true })
            .eq("company_id", authUser.id)
            .then((r) => r.count || 0, () => 0),
        ]);

        const publishedJobs = jobsData || [];
        setJobs(publishedJobs);

        const apps = (applicationsData || []) as (CompanyApplicationData & { job_id: string })[];
        setAllApplications(apps);

        const grouped: Record<string, CompanyApplicationData[]> = {};
        for (const app of apps) {
          if (!app.job_id) continue;
          if (!grouped[app.job_id]) grouped[app.job_id] = [];
          grouped[app.job_id].push(app);
        }
        setApplicationsByJob(grouped);

        const activeJobs = publishedJobs.filter((j: { is_active?: boolean }) => j.is_active).length;
        setStats({
          activeJobs,
          totalApplications: apps.length,
          favorites: favCount,
          hired: apps.filter((a) => a.status === "accepted").length,
        });

        const jobsWithApps = Object.keys(grouped);
        if (jobsWithApps.length > 0) {
          setExpandedJobs(new Set(jobsWithApps));
        }
      } catch (err) {
        console.error("Dashboard company load error:", err);
        setLoadError("Impossible de charger les candidatures. Vérifiez que la migration 008 est appliquée sur Supabase.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const displayStats = [
    { value: isLoading ? "..." : String(stats.activeJobs || jobs.filter(j => j.is_active).length), label: "Offres actives", color: "from-[#050FA0] to-[#1A27C2]", icon: Briefcase },
    { value: isLoading ? "..." : String(stats.totalApplications), label: "Candidatures reçues", color: "from-[#E4220F] to-[#F92813]", icon: Users },
    { value: isLoading ? "..." : String(stats.favorites), label: "Profils favoris", color: "from-[#050FA0] to-[#1A27C2]", icon: Star },
    { value: isLoading ? "..." : String(stats.hired), label: "Postes pourvus", color: "from-green-500 to-green-600", icon: Star },
  ];

  // Score de compatibilité de chaque candidature avec son offre.
  const matches = useMemo(() => {
    const out: Record<string, MatchResult | null> = {};
    if (!applicantCVs) return out;
    const byId = new Map(jobs.map((j) => [j.id, j]));
    for (const app of allApplications) {
      const job = byId.get((app as { job_id?: string }).job_id || "");
      const cv = applicantCVs[app.id] as Parameters<typeof matchJob>[1] | undefined;
      out[app.id] = job && cv && (cv.skills?.length || cv.jobTitle) ? matchJob(job, cv) : null;
    }
    return out;
  }, [applicantCVs, jobs, allApplications]);

  const rankList = (list: CompanyApplicationData[]) =>
    [...list].sort((a, b) =>
      sortBy === "score"
        ? (matches[b.id]?.score ?? -1) - (matches[a.id]?.score ?? -1) || +new Date(b.applied_at) - +new Date(a.applied_at)
        : +new Date(b.applied_at) - +new Date(a.applied_at),
    );

  const stageCounts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    for (const a of allApplications) {
      if (jobFilter !== "all" && (a as { job_id?: string }).job_id !== jobFilter) continue;
      c.all++;
      c[a.status] = (c[a.status] || 0) + 1;
    }
    return c;
  }, [allApplications, jobFilter]);

  const visibleApplications = rankList(
    allApplications.filter(
      (a) => (stageFilter === "all" || a.status === stageFilter) && (jobFilter === "all" || (a as { job_id?: string }).job_id === jobFilter),
    ),
  );

  // Garder les compteurs et les deux listes cohérents après un changement de statut.
  const handleStatusChange = (id: string, status: string) => {
    setAllApplications((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, status } : a));
      setStats((st) => ({ ...st, hired: next.filter((a) => a.status === "accepted").length }));
      return next;
    });
    setApplicationsByJob((prev) => {
      const out: Record<string, CompanyApplicationData[]> = {};
      for (const [k, list] of Object.entries(prev)) out[k] = list.map((a) => (a.id === id ? { ...a, status } : a));
      return out;
    });
  };

  const toggleJobApplications = (jobId: string) => {
    setExpandedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardHeader />

      <div className="page-container py-8 sm:py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="page-title mb-8 sm:mb-12">
            <span className="text-[#050FA0]">Tableau de bord</span>{" "}
            <span className="text-[#E4220F]">Entreprise</span>
          </h1>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-10 sm:mb-12">
            {displayStats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="group bg-white rounded-2xl p-6 border-2 border-slate-100 hover:border-transparent hover:shadow-xl transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className={`text-4xl font-bold mb-2 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                  {isLoading ? <Loader2 className="h-8 w-8 animate-spin text-slate-400" /> : stat.value}
                </div>
                <div className="text-sm font-medium text-slate-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-12">
            <Link
              to="/company/post-job"
              className="group p-8 sm:p-10 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#E4220F] to-[#F92813] text-white hover:shadow-2xl hover:shadow-[#E4220F]/40 sm:hover:scale-105 transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all">
                  <Plus className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Publier une offre</h2>
                <p className="text-white/90">Créez une nouvelle annonce d'emploi</p>
              </div>
            </Link>

            <a
              href="#candidatures-recues"
              className="block p-8 sm:p-12 rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 hover:border-[#E4220F]/40 hover:shadow-lg transition-all"
            >
              <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Candidatures reçues</h2>
              <p className="text-slate-600">Gérez les candidats intéressés</p>
              <div className="mt-6 text-sm">
                <span className="inline-flex items-center justify-center h-6 px-3 rounded-full bg-red-100 text-red-600 font-medium">
                  {isLoading ? "…" : stats.totalApplications} candidature{stats.totalApplications !== 1 ? "s" : ""}
                </span>
              </div>
            </a>

            <Link
              to="/company/search-profiles"
              className="p-8 sm:p-12 rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 hover:border-[#050FA0] transition-all"
            >
              <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                <Star className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Rechercher des profils</h2>
              <p className="text-slate-600">Trouvez les candidats idéaux</p>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 -mt-4 mb-10 sm:mb-12">
            <Link to="/rh" className="flex items-center gap-4 p-5 sm:p-6 rounded-2xl bg-white border-2 border-[#E4220F]/30 hover:border-[#E4220F] transition-colors sm:col-span-2 lg:col-span-1">
              <span className="h-12 w-12 rounded-xl bg-[#E4220F]/10 text-[#E4220F] flex items-center justify-center shrink-0"><Building2 className="h-6 w-6" /></span>
              <span>
                <span className="flex items-center gap-2 text-lg font-bold">ProJob+ RH {!can("sirh") && <span className="inline-flex items-center rounded-full bg-[#E4220F]/10 text-[#E4220F] px-2 py-0.5 text-[11px] font-bold">Nouveau</span>}</span>
                <span className="block text-sm text-slate-600">Employés, contrats, congés</span>
              </span>
            </Link>
            <Link to="/company/interviews" className="flex items-center gap-4 p-5 sm:p-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-violet-400 transition-colors">
              <span className="h-12 w-12 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0"><CalendarDays className="h-6 w-6" /></span>
              <span>
                <span className="flex items-center gap-2 text-lg font-bold">Agenda des entretiens {!can("interviews") && <PremiumBadge />}</span>
                <span className="block text-sm text-slate-600">Planification, liens visio, évaluations</span>
              </span>
            </Link>
            <Link to="/company/stats" className="flex items-center gap-4 p-5 sm:p-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-[#050FA0] transition-colors">
              <span className="h-12 w-12 rounded-xl bg-[#050FA0]/10 text-[#050FA0] flex items-center justify-center shrink-0"><BarChart3 className="h-6 w-6" /></span>
              <span>
                <span className="flex items-center gap-2 text-lg font-bold">Statistiques RH {!can("hr_stats") && <PremiumBadge />}</span>
                <span className="block text-sm text-slate-600">Conversion, délais, coûts, sources</span>
              </span>
            </Link>
          </div>

          {/* Candidatures reçues — liste complète */}
          <div
            id="candidatures-recues"
            className="mb-10 sm:mb-12 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#E4220F] to-[#F92813] flex items-center justify-center shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Candidatures reçues</h2>
                <p className="text-slate-600 text-sm">Profils des candidats ayant postulé à vos offres</p>
              </div>
            </div>

            {loadError && (
              <p className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">{loadError}</p>
            )}

            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-[#050FA0]" />
              </div>
            ) : allApplications.length === 0 ? (
              <div className="text-center py-10 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">Aucune candidature pour le moment</p>
                <p className="text-sm text-slate-500 mt-1">
                  Les candidatures apparaîtront ici dès qu&apos;un candidat postule à l&apos;une de vos offres.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col lg:flex-row lg:items-end gap-3 mb-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Étape</p>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par étape">
                      {[{ status: "all", short: "Toutes" }, ...PIPELINE, { status: "rejected", short: "Non retenues" }].map((st) => {
                        const on = stageFilter === st.status;
                        return (
                          <button
                            key={st.status}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setStageFilter(st.status)}
                            className={`px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors ${on ? "bg-[#050FA0] border-[#050FA0] text-white" : "bg-white border-slate-200 text-slate-700 hover:border-[#050FA0]"}`}
                          >
                            {st.short} <span className={`tabular-nums ${on ? "text-white/80" : "text-slate-500"}`}>{stageCounts[st.status] || 0}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <label className="text-sm">
                      <span className="block font-semibold text-slate-700 mb-1">Offre</span>
                      <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} className="px-3 py-2 rounded-lg border-2 border-slate-200 bg-white text-sm max-w-[13rem]">
                        <option value="all">Toutes les offres</option>
                        {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 mb-1"><ArrowDownWideNarrow className="h-4 w-4" /> Classer par</span>
                      <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "score" | "date")} className="px-3 py-2 rounded-lg border-2 border-slate-200 bg-white text-sm">
                        <option value="score">Pertinence</option>
                        <option value="date">Date</option>
                      </select>
                    </label>
                  </div>
                </div>
                {!can("ai_ranking") ? (
                  <div className="mb-4"><PremiumUpsell feature="ai_ranking" compact description="l'IA lit les CV et classe automatiquement les meilleurs profils pour chaque offre" /></div>
                ) : sortBy === "score" && (
                  <p className="mb-4 text-xs text-slate-500">{MATCH_DISCLAIMER}</p>
                )}
                {visibleApplications.length === 0 ? (
                  <p className="text-center text-slate-500 py-8 rounded-xl bg-slate-50 border border-dashed border-slate-200">Aucune candidature à cette étape.</p>
                ) : (
                  <ul className="space-y-3">
                    {visibleApplications.map((app, i) => (
                      <CompanyApplicationItem
                        key={app.id}
                        app={app}
                        onStatusChange={handleStatusChange}
                        match={applicantCVs ? matches[app.id] ?? null : undefined}
                        rank={sortBy === "score" && matches[app.id] ? i + 1 : undefined}
                      />
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {/* Active Jobs */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold">Vos offres et candidatures</h2>
              <Link to="/company/post-job" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#050FA0] text-white text-sm font-semibold hover:bg-[#1A27C2] transition-colors">
                <Plus className="h-4 w-4" />
                Nouvelle offre
              </Link>
            </div>
            {actionMsg && (
              <div role="status" className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium border-2 ${actionMsg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-red-50 border-red-200 text-red-800"}`}>
                {actionMsg.text}
              </div>
            )}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#050FA0]" />
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((offer: any, i: number) => {
                  const applications = applicationsByJob[offer.id] || [];
                  const count = applications.length || offer.applications_count || 0;
                  const isExpanded = expandedJobs.has(offer.id);

                  return (
                    <div key={offer.id || i} className="rounded-2xl border-2 border-slate-100 overflow-hidden hover:border-[#050FA0]/30 transition-all">
                      <button
                        type="button"
                        onClick={() => toggleJobApplications(offer.id)}
                        aria-expanded={isExpanded}
                        className="w-full px-6 pt-6 pb-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-bold">{offer.title}</h3>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${offer.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                              {offer.is_active ? "En ligne" : "Clôturée"}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {count} candidature{count > 1 ? "s" : ""}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-[#050FA0] shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-[#050FA0] shrink-0" />
                        )}
                      </button>

                      {/* Actions sur l'offre */}
                      <div className="px-6 pb-5 flex flex-wrap gap-2">
                        <Link to={`/company/jobs/${offer.id}/edit`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:border-[#050FA0] hover:text-[#050FA0]">
                          <Pencil className="h-4 w-4" /> Modifier
                        </Link>
                        <button type="button" disabled={busyJob === offer.id} onClick={() => toggleActive(offer)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:border-[#050FA0] hover:text-[#050FA0] disabled:opacity-50">
                          {busyJob === offer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : offer.is_active ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                          {offer.is_active ? "Clôturer" : "Remettre en ligne"}
                        </button>
                        {offer.is_active && (
                          <Link to={`/jobs/${offer.id}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:border-[#050FA0] hover:text-[#050FA0]">
                            <Eye className="h-4 w-4" /> Voir l&apos;annonce
                          </Link>
                        )}
                        {offer.is_active && (
                          <button type="button" onClick={() => setShareJob(shareJob === offer.id ? null : offer.id)} aria-expanded={shareJob === offer.id} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:border-[#050FA0] hover:text-[#050FA0]">
                            <Share2 className="h-4 w-4" /> Partager {!can("share_links") && <PremiumBadge />}
                          </button>
                        )}
                        <button type="button" disabled={busyJob === offer.id} onClick={() => setConfirmDelete(offer.id)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 sm:ml-auto">
                          <Trash2 className="h-4 w-4" /> Supprimer
                        </button>
                      </div>

                      {shareJob === offer.id && (can("share_links")
                        ? <ShareJobMenu jobId={offer.id} title={offer.title} />
                        : <div className="mx-6 mb-5"><PremiumUpsell feature="share_links" compact description="partagez l'offre sur WhatsApp, Facebook ou LinkedIn et voyez d'où viennent vos candidats" /></div>)}

                      {confirmDelete === offer.id && (
                        <div role="alertdialog" aria-labelledby={`del-${offer.id}`} className="mx-6 mb-5 rounded-xl border-2 border-red-200 bg-red-50 p-4">
                          <p id={`del-${offer.id}`} className="flex items-start gap-2 font-semibold text-red-900">
                            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                            Supprimer définitivement « {offer.title} » ?
                          </p>
                          <p className="mt-1 text-sm text-red-800">
                            {count > 0
                              ? `Les ${count} candidature${count > 1 ? "s" : ""} reçue${count > 1 ? "s" : ""} seront aussi effacée${count > 1 ? "s" : ""}, sans retour possible. Pour simplement arrêter de recevoir des candidatures, choisissez plutôt « Clôturer ».`
                              : "Cette action est définitive."}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button type="button" onClick={() => deleteOffer(offer)} disabled={busyJob === offer.id} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60">
                              {busyJob === offer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Oui, supprimer
                            </button>
                            {offer.is_active && count > 0 && (
                              <button type="button" onClick={() => { setConfirmDelete(null); void toggleActive(offer); }} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:border-[#050FA0]">
                                Clôturer à la place
                              </button>
                            )}
                            <button type="button" onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:text-slate-900">
                              Annuler
                            </button>
                          </div>
                        </div>
                      )}

                      {isExpanded && (
                        <div className="px-6 pb-6 border-t border-slate-100">
                          {applications.length === 0 ? (
                            <p className="text-slate-500 text-sm py-4">Aucune candidature pour cette offre.</p>
                          ) : (
                            <ul className="space-y-3 pt-4">
                              {rankList(applications).map((app, i) => (
                                <CompanyApplicationItem
                                  key={app.id}
                                  app={app}
                                  onStatusChange={handleStatusChange}
                                  match={applicantCVs ? matches[app.id] ?? null : undefined}
                                  rank={sortBy === "score" && matches[app.id] ? i + 1 : undefined}
                                />
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {jobs.length === 0 && (
                  <p className="text-center text-slate-500 py-8">Aucune offre publiée. Publiez votre première offre !</p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
