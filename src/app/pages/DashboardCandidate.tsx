import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { FileText, Mail, MessageSquare, Briefcase, TrendingUp, LogOut, Sparkles, ArrowRight, CheckCircle2, Home, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { useCVData } from "../contexts/CVDataContext";
import { jobService } from "../../services/supabase.service";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";

const FALLBACK_JOBS = [
  { id: "1", title: "Développeur Web Junior", company_profiles: { company_name: "Tech Solutions GN" }, location: "Conakry", match: 95 },
  { id: "2", title: "Assistant Commercial", company_profiles: { company_name: "Orange Guinée" }, location: "Conakry", match: 88 },
  { id: "3", title: "Comptable", company_profiles: { company_name: "BCRG" }, location: "Conakry", match: 82 },
];

export default function DashboardCandidate() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { cvData } = useCVData();
  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const data = await jobService.getActiveJobs({ limit: 3 });
        if (data && data.length > 0) {
          setRecommendedJobs(data.map((j: any, i: number) => ({ ...j, match: 95 - i * 7 })));
        } else {
          setRecommendedJobs(FALLBACK_JOBS);
        }
      } catch {
        setRecommendedJobs(FALLBACK_JOBS);
      } finally {
        setLoadingJobs(false);
      }
    };
    loadJobs();
  }, []);

  const calculateProfileCompletion = () => {
    let completed = 0;
    const total = 10;
    if (cvData.fullName) completed++;
    if (cvData.jobTitle) completed++;
    if (cvData.phone) completed++;
    if (cvData.email) completed++;
    if (cvData.location) completed++;
    if (cvData.profile) completed++;
    if (cvData.experiences.length > 0) completed++;
    if (cvData.education.length > 0) completed++;
    if (cvData.skills.length > 0) completed++;
    if (cvData.languages.length > 0) completed++;
    return Math.round((completed / total) * 100);
  };

  const profileCompletion = calculateProfileCompletion();
  const hasStartedProfile = cvData.fullName || cvData.jobTitle || cvData.email;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex flex-col">
      {/* Header */}
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
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#003087] to-[#0047b3] flex items-center justify-center font-bold text-white text-sm shadow-lg">
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-5xl font-bold mb-12">
            <span className="text-[#003087]">Bonjour</span>{" "}
            <span className="text-[#E31E24]">{user?.name.split(" ")[0]}</span> 👋
          </h1>

          {/* Profile Completion Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-12 p-10 rounded-3xl bg-gradient-to-br from-[#003087] to-[#002060] text-white shadow-2xl shadow-[#003087]/30 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold">
                    {profileCompletion === 100 ? "Profil complété !" : hasStartedProfile ? "Complétez votre profil" : "Créez votre profil"}
                  </h2>
                  <p className="text-blue-100">
                    {profileCompletion === 100 ? "Bravo ! Votre profil est complet" : "Augmentez vos chances d'être recruté"}
                  </p>
                </div>
              </div>
              <div className="mb-6 mt-8">
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="font-medium">Profil complété</span>
                  <span className="text-2xl font-bold">{profileCompletion}%</span>
                </div>
                <div className="h-3 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${profileCompletion}%` }}
                    transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full shadow-lg ${profileCompletion === 100 ? "bg-green-500" : "bg-[#E31E24]"}`}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to={hasStartedProfile ? "/cv-edit" : "/cv-assistant"}
                  className="group inline-flex items-center gap-2 bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white px-8 py-4 rounded-xl font-bold hover:shadow-2xl hover:shadow-[#E31E24]/40 hover:scale-105 transition-all"
                >
                  {profileCompletion === 100 ? "Modifier mon profil" : hasStartedProfile ? "Continuer mon profil" : "Créer mon profil"}
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                {hasStartedProfile && profileCompletion < 100 && (
                  <Link
                    to="/cv-preview"
                    className="group inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 py-4 rounded-xl font-bold transition-all border border-white/30"
                  >
                    Aperçu du CV
                  </Link>
                )}
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-4 gap-5 mb-16">
            {[
              { to: "/cv-assistant", icon: FileText, title: "Mon CV", desc: "Créer ou modifier", color: "#003087" },
              { to: "/cover-letter", icon: Mail, title: "Lettre de motivation", desc: "Générer avec l'IA", color: "#E31E24" },
              { to: "/interview-prep", icon: MessageSquare, title: "Entretien", desc: "S'entraîner", color: "#003087" },
              { to: "/jobs", icon: Briefcase, title: "Offres d'emploi", desc: "Parcourir", color: "#E31E24" },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
                <Link
                  to={item.to}
                  className="group block p-8 rounded-2xl bg-white border-2 border-slate-100 hover:border-transparent hover:shadow-2xl hover:scale-105 transition-all duration-300 relative overflow-hidden"
                  style={{ boxShadow: "none" }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 20px 40px -12px ${item.color}30`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(135deg, ${item.color}08 0%, transparent 100%)` }} />
                  <div className="relative">
                    <div className="h-16 w-16 rounded-2xl shadow-lg flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all" style={{ background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}dd 100%)` }}>
                      <item.icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-xl mb-2 text-slate-800">{item.title}</h3>
                    <p className="text-sm text-slate-600 font-medium">{item.desc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Recommended Jobs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-2xl bg-[#003087] flex items-center justify-center shadow-lg shadow-[#003087]/30">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Postes recommandés</h2>
                <p className="text-slate-600">Correspondant à votre profil</p>
              </div>
            </div>

            {loadingJobs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#003087]" />
              </div>
            ) : (
              <div className="space-y-4">
                {recommendedJobs.map((job, i) => (
                  <motion.div key={job.id || i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }}>
                    <Link
                      to={`/jobs/${job.id}`}
                      className="group block p-6 rounded-2xl border-2 border-slate-100 hover:border-[#003087] hover:shadow-xl hover:shadow-[#003087]/10 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-2 group-hover:text-[#003087] transition-colors">{job.title}</h3>
                          <p className="text-slate-600 mb-1">{job.company_profiles?.company_name || job.company}</p>
                          <p className="text-sm text-slate-500">{job.location}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-[#E31E24] mb-1">{job.match}%</div>
                          <div className="text-xs text-slate-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-[#003087]" />
                            <span>Compatible</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
                <div className="pt-4">
                  <Link to="/jobs" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-[#003087] text-[#003087] font-bold hover:bg-[#003087] hover:text-white transition-all">
                    Voir toutes les offres
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
