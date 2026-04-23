import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Plus, Users, Briefcase, Star, LogOut, Home, Loader2, Eye } from "lucide-react";
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

        const jobsData = await companyService.getJobs(authUser.id);
        if (jobsData && jobsData.length > 0) {
          setJobs(jobsData);
          const activeJobs = jobsData.filter((j: any) => j.is_active).length;
          const totalApps = jobsData.reduce((sum: number, j: any) => sum + (j.applications_count || 0), 0);
          setStats({ activeJobs, totalApplications: totalApps, favorites: 0, hired: 0 });
        }
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

  const activeJobs = jobs.length > 0 ? jobs.filter(j => j.is_active) : [
    { id: "1", title: "Développeur Web Full Stack", applications_count: 8, views_count: 45, is_active: true },
    { id: "2", title: "Designer UI/UX", applications_count: 5, views_count: 32, is_active: true },
    { id: "3", title: "Chef de Projet Digital", applications_count: 10, views_count: 58, is_active: true },
  ];

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
              <h2 className="text-2xl font-bold">Vos offres actives</h2>
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
                {activeJobs.slice(0, 5).map((offer: any, i: number) => (
                  <div key={offer.id || i} className="p-6 rounded-2xl border-2 border-slate-100 hover:border-[#003087] transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold mb-1">{offer.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {offer.applications_count || 0} candidature{(offer.applications_count || 0) > 1 ? "s" : ""}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" />
                            {offer.views_count || 0} vue{(offer.views_count || 0) > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <Link
                        to={`/jobs/${offer.id}`}
                        className="px-4 py-2 rounded-full border-2 border-slate-200 hover:border-[#003087] hover:text-[#003087] text-sm font-medium transition-colors"
                      >
                        Voir
                      </Link>
                    </div>
                  </div>
                ))}
                {activeJobs.length === 0 && (
                  <p className="text-center text-slate-500 py-8">Aucune offre active. Publiez votre première offre !</p>
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
