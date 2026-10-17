import { Link } from "react-router";
import { useEffect, useState } from "react";
import { Plus, Users, Briefcase, Star, Loader2, ChevronDown, ChevronUp } from "lucide-react";
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

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadError("");
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

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

  const activeJobs = jobs.filter(j => j.is_active);

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
              <ul className="space-y-3">
                {allApplications.map((app) => (
                  <CompanyApplicationItem key={app.id} app={app} onStatusChange={handleStatusChange} />
                ))}
              </ul>
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
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#050FA0]" />
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.slice(0, 10).map((offer: any, i: number) => {
                  const applications = applicationsByJob[offer.id] || [];
                  const count = applications.length || offer.applications_count || 0;
                  const isExpanded = expandedJobs.has(offer.id);

                  return (
                    <div key={offer.id || i} className="rounded-2xl border-2 border-slate-100 overflow-hidden hover:border-[#050FA0]/30 transition-all">
                      <button
                        type="button"
                        onClick={() => toggleJobApplications(offer.id)}
                        className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-bold">{offer.title}</h3>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${offer.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                              {offer.is_active ? "Active" : "Inactive"}
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
                      {isExpanded && (
                        <div className="px-6 pb-6 border-t border-slate-100">
                          {applications.length === 0 ? (
                            <p className="text-slate-500 text-sm py-4">Aucune candidature pour cette offre.</p>
                          ) : (
                            <ul className="space-y-3 pt-4">
                              {applications.map((app) => (
                                <CompanyApplicationItem key={app.id} app={app} onStatusChange={handleStatusChange} />
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
