import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Plus, Users, Briefcase, Star, LogOut, Home, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import CompanyApplicationItem, { type CompanyApplicationData } from "../components/CompanyApplicationItem";
import { motion } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { companyService } from "../../services/supabase.service";
import { supabase } from "../../lib/supabase";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";

export default function DashboardCompany() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [applicationsByJob, setApplicationsByJob] = useState<Record<string, CompanyApplicationData[]>>({});
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ activeJobs: 0, totalApplications: 0, favorites: 0, hired: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const [jobsData, applicationsData] = await Promise.all([
          companyService.getJobs(authUser.id),
          companyService.getApplications(authUser.id),
        ]);

        if (jobsData && jobsData.length > 0) {
          setJobs(jobsData);
          const activeJobs = jobsData.filter((j: any) => j.is_active).length;
          const totalApps = jobsData.reduce((sum: number, j: any) => sum + (j.applications_count || 0), 0);
          setStats({ activeJobs, totalApplications: totalApps, favorites: 0, hired: 0 });
        }

        const grouped: Record<string, CompanyApplicationData[]> = {};
        for (const app of (applicationsData || []) as (CompanyApplicationData & { job_id: string })[]) {
          if (!grouped[app.job_id]) grouped[app.job_id] = [];
          grouped[app.job_id].push(app);
        }
        setApplicationsByJob(grouped);
      } catch {
        // Keep default stats
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const displayStats = [
    { value: isLoading ? "..." : String(stats.activeJobs || jobs.filter(j => j.is_active).length), label: "Offres actives", color: "from-[#003087] to-[#0047b3]", icon: Briefcase },
    { value: isLoading ? "..." : String(stats.totalApplications), label: "Candidatures reçues", color: "from-[#E31E24] to-[#ff3333]", icon: Users },
    { value: isLoading ? "..." : String(stats.favorites), label: "Profils favoris", color: "from-[#003087] to-[#0047b3]", icon: Star },
    { value: isLoading ? "..." : String(stats.hired), label: "Postes pourvus", color: "from-green-500 to-green-600", icon: Star },
  ];

  const activeJobs = jobs.filter(j => j.is_active);

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
      <div className="border-b bg-white/90 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center hover:scale-105 transition-transform">
              <img src={logoImage} alt="ProJob AI" className="h-12 w-auto" />
            </Link>
            <Link
              to="/"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-[#003087] hover:bg-gradient-to-r hover:from-[#003087] hover:to-[#0047b3] hover:text-white transition-all border-2 border-[#003087]"
            >
              <Home className="h-4 w-4" />
              <span>Accueil</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#E31E24] to-[#ff3333] flex items-center justify-center font-bold text-white text-sm shadow-lg">
                {user?.name.split(" ").map(n => n[0]).join("").toUpperCase()}
              </div>
              <span className="font-semibold text-sm text-slate-800">{user?.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-[#E31E24] transition-all border border-transparent hover:border-red-200"
            >
              <LogOut className="h-4 w-4" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-5xl font-bold mb-12">
            <span className="text-[#003087]">Tableau de bord</span>{" "}
            <span className="text-[#E31E24]">Entreprise</span>
          </h1>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-5 mb-12">
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
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Link
              to="/company/post-job"
              className="group p-10 rounded-3xl bg-gradient-to-br from-[#E31E24] to-[#ff3333] text-white hover:shadow-2xl hover:shadow-[#E31E24]/40 hover:scale-105 transition-all relative overflow-hidden"
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

            <div className="p-12 rounded-3xl bg-white border-2 border-slate-200">
              <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Candidatures reçues</h2>
              <p className="text-slate-600">Gérez les candidats intéressés</p>
              <div className="mt-6 text-sm">
                <span className="inline-flex items-center justify-center h-6 px-3 rounded-full bg-red-100 text-red-600 font-medium">
                  {stats.totalApplications} candidature{stats.totalApplications > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <Link
              to="/company/search-profiles"
              className="p-12 rounded-3xl bg-white border-2 border-slate-200 hover:border-[#003087] transition-all"
            >
              <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                <Star className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Rechercher des profils</h2>
              <p className="text-slate-600">Trouvez les candidats idéaux</p>
            </Link>
          </div>

          {/* Active Jobs */}
          <div className="bg-white rounded-3xl p-8 border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Vos offres et candidatures</h2>
              <Link to="/company/post-job" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#003087] text-white text-sm font-semibold hover:bg-[#0047b3] transition-colors">
                <Plus className="h-4 w-4" />
                Nouvelle offre
              </Link>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#003087]" />
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.slice(0, 10).map((offer: any, i: number) => {
                  const applications = applicationsByJob[offer.id] || [];
                  const count = applications.length || offer.applications_count || 0;
                  const isExpanded = expandedJobs.has(offer.id);

                  return (
                    <div key={offer.id || i} className="rounded-2xl border-2 border-slate-100 overflow-hidden hover:border-[#003087]/30 transition-all">
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
                          <ChevronUp className="h-5 w-5 text-[#003087] shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-[#003087] shrink-0" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="px-6 pb-6 border-t border-slate-100">
                          {applications.length === 0 ? (
                            <p className="text-slate-500 text-sm py-4">Aucune candidature pour cette offre.</p>
                          ) : (
                            <ul className="space-y-3 pt-4">
                              {applications.map((app) => (
                                <CompanyApplicationItem key={app.id} app={app} />
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
