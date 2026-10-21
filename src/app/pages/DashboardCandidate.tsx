import { Link } from "react-router";
import { useEffect, useState } from "react";
import { FileText, Mail, MessageSquare, Briefcase, TrendingUp, Sparkles, ArrowRight, CheckCircle2, Loader2, ClipboardList, Compass } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { useCVData } from "../contexts/CVDataContext";
import { jobService, candidateService } from "../../services/supabase.service";
import { getCurrentUserId } from "../../lib/supabase";
import { matchJob, hasMatchableCV } from "../../lib/matching";
import DashboardHeader from "../components/DashboardHeader";
import Footer from "../components/Footer";
import CandidateInterviews from "../components/CandidateInterviews";
import { PremiumBadge } from "../components/PremiumGate";
import { usePlan } from "../contexts/PlanContext";
import CandidateApplicationItem, { type CandidateApplicationData } from "../components/CandidateApplicationItem";


export default function DashboardCandidate() {
  const { user } = useAuth();
  const { cvData } = useCVData();
  const { can } = usePlan();
  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [myApplications, setMyApplications] = useState<CandidateApplicationData[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(true);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const data = await jobService.getActiveJobs({ limit: 40 });
        setRecommendedJobs(data || []);
      } catch {
        setRecommendedJobs([]);
      } finally {
        setLoadingJobs(false);
      }
    };
    loadJobs();
  }, []);

  // Recommandations : les 3 offres les plus compatibles avec le CV.
  const matchable = hasMatchableCV(cvData);
  const topJobs = recommendedJobs
    .map((j: any) => ({ ...j, match: matchable ? matchJob(j, cvData).score : null }))
    .sort((a: any, b: any) => (b.match ?? 0) - (a.match ?? 0))
    .slice(0, 3);

  useEffect(() => {
    const loadApplications = async () => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          setMyApplications([]);
          return;
        }
        const data = await candidateService.getApplications(userId);
        setMyApplications((data || []) as CandidateApplicationData[]);
      } catch {
        setMyApplications([]);
      } finally {
        setLoadingApplications(false);
      }
    };
    loadApplications();
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
      <DashboardHeader />

      <div className="page-container py-8 sm:py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="page-title mb-8 sm:mb-12">
            <span className="text-[#050FA0]">Bonjour</span>{" "}
            <span className="text-[#E4220F]">{user?.name.split(" ")[0]}</span>
          </h1>

          {/* Profile Completion Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-12 p-10 rounded-3xl bg-gradient-to-br from-[#050FA0] to-[#060C6E] text-white shadow-2xl shadow-[#050FA0]/30 relative overflow-hidden"
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
                    className={`h-full rounded-full shadow-lg ${profileCompletion === 100 ? "bg-green-500" : "bg-[#E4220F]"}`}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  to={hasStartedProfile ? "/cv-edit" : "/cv-assistant"}
                  className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#E4220F] to-[#F92813] text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold hover:shadow-2xl hover:shadow-[#E4220F]/40 sm:hover:scale-105 transition-all text-center"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 mb-12 sm:mb-16">
            {[
              { to: "/cv-assistant", icon: FileText, title: "Mon CV", desc: "Créer ou modifier", color: "#050FA0" },
              { to: "/cover-letter", icon: Mail, title: "Lettre de motivation", desc: "Générer avec l'IA", color: "#E4220F" },
              { to: "/interview-prep", icon: MessageSquare, title: "Entretien", desc: "S'entraîner", color: "#050FA0", feature: "interview_coach" as const },
              { to: "/orientation", icon: Compass, title: "Orientation", desc: "Trouver ma voie", color: "#0F6E5A", feature: "career_coach" as const },
              { to: "/jobs", icon: Briefcase, title: "Offres d'emploi", desc: "Parcourir", color: "#E4220F" },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
                <Link
                  to={item.to}
                  className="group block h-full p-6 rounded-2xl bg-white border-2 border-slate-100 hover:border-transparent hover:shadow-2xl sm:hover:scale-105 transition-all duration-300 relative overflow-hidden"
                  style={{ boxShadow: "none" }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 20px 40px -12px ${item.color}30`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(135deg, ${item.color}08 0%, transparent 100%)` }} />
                  <div className="relative">
                    <div className="h-16 w-16 rounded-2xl shadow-lg flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all" style={{ background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}dd 100%)` }}>
                      <item.icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-xl mb-2 text-slate-800 flex items-center gap-2 flex-wrap">{item.title} {"feature" in item && item.feature && !can(item.feature) && <PremiumBadge />}</h3>
                    <p className="text-sm text-slate-600 font-medium">{item.desc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <CandidateInterviews />

          {/* Mes candidatures */}
          <motion.div
            id="mes-candidatures"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-12 sm:mb-16 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-xl shadow-slate-200/50"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-2xl bg-[#E4220F] flex items-center justify-center shadow-lg shadow-[#E4220F]/30">
                <ClipboardList className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold">Mes candidatures</h2>
                <p className="text-slate-600">Suivez l'état de vos postulations</p>
              </div>
            </div>

            {loadingApplications ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#050FA0]" />
              </div>
            ) : myApplications.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-medium mb-2">Aucune candidature pour le moment</p>
                <p className="text-sm text-slate-500 mb-6">Parcourez les offres et postulez pour suivre vos candidatures ici.</p>
                <Link
                  to="/jobs"
                  className="inline-flex items-center gap-2 bg-[#050FA0] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#060C6E] transition-colors"
                >
                  Voir les offres
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <ul className="space-y-4">
                {myApplications.map((app) => (
                  <CandidateApplicationItem key={app.id} app={app} />
                ))}
              </ul>
            )}
          </motion.div>

          {/* Recommended Jobs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-xl shadow-slate-200/50"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-2xl bg-[#050FA0] flex items-center justify-center shadow-lg shadow-[#050FA0]/30">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold">Postes recommandés</h2>
                <p className="text-slate-600">Correspondant à votre profil</p>
              </div>
            </div>

            {loadingJobs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#050FA0]" />
              </div>
            ) : (
              <div className="space-y-4">
                {topJobs.length === 0 && (
                  <p className="text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
                    Aucune offre publiée pour le moment. Complétez votre CV : nous vous montrerons ici les offres les plus compatibles dès leur publication.
                  </p>
                )}
                {!matchable && topJobs.length > 0 && (
                  <p className="text-sm text-slate-600 rounded-xl bg-slate-50 p-3">
                    Ajoutez vos compétences dans votre CV pour voir votre taux de compatibilité avec chaque offre.
                  </p>
                )}
                {topJobs.map((job, i) => (
                  <motion.div key={job.id || i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }}>
                    <Link
                      to={`/jobs/${job.id}`}
                      className="group block p-6 rounded-2xl border-2 border-slate-100 hover:border-[#050FA0] hover:shadow-xl hover:shadow-[#050FA0]/10 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-2 group-hover:text-[#050FA0] transition-colors">{job.title}</h3>
                          <p className="text-slate-600 mb-1">{job.company_profiles?.company_name || job.company}</p>
                          <p className="text-sm text-slate-500">{job.location}</p>
                        </div>
                        {job.match !== null && (
                          <div className="text-right">
                            <div className="text-3xl font-bold text-[#E4220F] mb-1 tabular-nums">{job.match}%</div>
                            <div className="text-xs text-slate-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-[#050FA0]" />
                              <span>{job.match >= 70 ? "Très compatible" : job.match >= 45 ? "Compatible" : "Peu compatible"}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
                <div className="pt-4">
                  <Link to="/jobs" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-[#050FA0] text-[#050FA0] font-bold hover:bg-[#050FA0] hover:text-white transition-all">
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
