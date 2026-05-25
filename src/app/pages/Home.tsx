import { Link } from "react-router";
import { useEffect, useState } from "react";
import { ArrowRight, FileText, Briefcase, MessageSquare, Zap, ChevronDown, ChevronUp, Users, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";
import CompanyApplicationItem, { type CompanyApplicationData } from "../components/CompanyApplicationItem";
import { useAuth } from "../contexts/AuthContext";
import { companyService } from "../../services/supabase.service";
import { supabase } from "../../lib/supabase";

type CompanyApplication = CompanyApplicationData & { job_id: string };

type CompanyJob = {
  id: string;
  title: string;
  is_active: boolean;
  applications_count?: number;
  created_at?: string;
};

function CompanyPublishedOffersSection() {
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [applicationsByJob, setApplicationsByJob] = useState<Record<string, CompanyApplication[]>>({});
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadOffers = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const [jobsData, applicationsData] = await Promise.all([
          companyService.getJobs(authUser.id),
          companyService.getApplications(authUser.id),
        ]);

        const publishedJobs = (jobsData || []) as CompanyJob[];
        setJobs(publishedJobs);

        const grouped: Record<string, CompanyApplication[]> = {};
        for (const app of (applicationsData || []) as CompanyApplication[]) {
          const jobId = app.job_id;
          if (!grouped[jobId]) grouped[jobId] = [];
          grouped[jobId].push(app);
        }
        setApplicationsByJob(grouped);
      } catch {
        setJobs([]);
        setApplicationsByJob({});
      } finally {
        setIsLoading(false);
      }
    };
    loadOffers();
  }, []);

  const toggleJob = (jobId: string) => {
    setExpandedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-[#003087]" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 rounded-3xl bg-white border-2 border-dashed border-slate-200">
        <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600 mb-6">Vous n&apos;avez pas encore publié d&apos;offre.</p>
        <Link
          to="/company/post-job"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white px-8 py-3 rounded-full font-bold hover:shadow-lg transition-all"
        >
          Publier ma première offre
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => {
        const applications = applicationsByJob[job.id] || [];
        const count = applications.length || job.applications_count || 0;
        const isExpanded = expandedJobs.has(job.id);

        return (
          <div key={job.id} className="rounded-2xl bg-white border-2 border-slate-100 overflow-hidden shadow-sm hover:border-[#003087]/30 transition-all">
            <button
              type="button"
              onClick={() => toggleJob(job.id)}
              className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-[#003087]">{job.title}</h3>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${job.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                    {job.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {count} candidature{count > 1 ? "s" : ""}
                </p>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-6 w-6 text-[#003087] shrink-0 ml-4" />
              ) : (
                <ChevronDown className="h-6 w-6 text-[#003087] shrink-0 ml-4" />
              )}
            </button>

            {isExpanded && (
              <div className="px-6 pb-6 border-t border-slate-100">
                {applications.length === 0 ? (
                  <p className="text-slate-500 text-sm py-4">Aucune candidature pour cette offre pour le moment.</p>
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
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const isCompany = isAuthenticated && user?.type === "company";
  const dashboardLink = user?.type === "company" ? "/company/dashboard" : "/dashboard";

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-white">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-7xl px-6 py-6"
      >
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={logoImage} alt="ProJob AI" className="h-14 w-auto" />
          </Link>

          {isAuthenticated && user ? (
            <Link
              to={dashboardLink}
              className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-slate-50 to-slate-100 border-2 border-slate-200 hover:border-[#003087] transition-all"
            >
              <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${user.type === "company" ? "from-[#E31E24] to-[#ff3333]" : "from-[#003087] to-[#0047b3]"} flex items-center justify-center font-bold text-white text-sm shadow-lg`}>
                {user.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-slate-800">{user.name}</div>
                <div className="text-xs text-slate-600">{user.type === "company" ? "Entreprise" : "Candidat"}</div>
              </div>
            </Link>
          ) : (
            <Link
              to="/profile-choice"
              className="px-6 py-2.5 rounded-full border-2 border-[#003087] text-[#003087] hover:bg-[#003087] hover:text-white transition-all font-medium"
            >
              Se connecter
            </Link>
          )}
        </div>
      </motion.div>

      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-6 pt-12 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="max-w-5xl mx-auto text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-[#003087]/10 to-[#E31E24]/10 border border-[#003087]/20 font-semibold mb-6"
          >
            <Zap className="h-4 w-4 text-[#E31E24]" />
            <span className="text-sm text-[#003087]">Propulsé par l'Intelligence Artificielle</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            <span className="text-[#003087]">L'IA qui vous prépare à</span>{" "}
            <span className="bg-gradient-to-r from-[#E31E24] to-[#ff3333] bg-clip-text text-transparent">l'emploi</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Créez votre CV, générez votre lettre de motivation et entraînez-vous aux entretiens avec notre assistant intelligent
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            {isAuthenticated && user ? (
              <>
                <Link
                  to={dashboardLink}
                  className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white px-10 py-4 rounded-full text-lg font-bold hover:shadow-2xl hover:shadow-[#E31E24]/40 hover:scale-105 transition-all"
                >
                  Accéder au tableau de bord
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                {isCompany ? (
                  <a
                    href="#mes-offres-publiees"
                    className="inline-flex items-center justify-center gap-2 bg-white border-2 border-[#003087] text-[#003087] px-10 py-4 rounded-full text-lg font-bold hover:bg-[#003087] hover:text-white transition-all"
                  >
                    Voir mes offres publiées
                  </a>
                ) : (
                  <Link
                    to="/jobs"
                    className="inline-flex items-center justify-center gap-2 bg-white border-2 border-[#003087] text-[#003087] px-10 py-4 rounded-full text-lg font-bold hover:bg-[#003087] hover:text-white transition-all"
                  >
                    Voir les offres
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link
                  to="/profile-choice"
                  className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white px-10 py-4 rounded-full text-lg font-bold hover:shadow-2xl hover:shadow-[#E31E24]/40 hover:scale-105 transition-all"
                >
                  Commencer gratuitement
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/jobs"
                  className="inline-flex items-center justify-center gap-2 bg-white border-2 border-[#003087] text-[#003087] px-10 py-4 rounded-full text-lg font-bold hover:bg-[#003087] hover:text-white transition-all"
                >
                  Voir les offres
                </Link>
              </>
            )}
          </motion.div>
        </motion.div>

        {isCompany && (
          <motion.section
            id="mes-offres-publiees"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.7 }}
            className="mb-32 scroll-mt-24"
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                <span className="text-[#003087]">Mes offres</span>{" "}
                <span className="text-[#E31E24]">publiées</span>
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Consultez vos annonces et les candidatures reçues pour chaque offre
              </p>
            </div>
            <CompanyPublishedOffersSection />
          </motion.section>
        )}

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          className="grid md:grid-cols-3 gap-6 mb-32"
        >
          <Link to="/cv-assistant" className="group relative p-10 rounded-3xl bg-white border border-slate-200 hover:border-[#003087] hover:shadow-2xl hover:shadow-[#003087]/10 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#003087]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-[#003087] flex items-center justify-center mb-6 shadow-lg shadow-[#003087]/30 group-hover:scale-110 transition-transform">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-[#003087] transition-colors">Créer mon CV avec l'IA</h3>
              <p className="text-slate-600 leading-relaxed">Assistant intelligent pour un CV professionnel en quelques minutes</p>
            </div>
          </Link>

          <Link to="/interview-prep" className="group relative p-10 rounded-3xl bg-white border border-slate-200 hover:border-[#003087] hover:shadow-2xl hover:shadow-[#003087]/10 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#003087]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-[#003087] flex items-center justify-center mb-6 shadow-lg shadow-[#003087]/30 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-[#003087] transition-colors">Préparer mon entretien</h3>
              <p className="text-slate-600 leading-relaxed">Simulateur d'entretien avec feedback personnalisé</p>
            </div>
          </Link>

          <Link to="/jobs" className="group relative p-10 rounded-3xl bg-white border border-slate-200 hover:border-[#003087] hover:shadow-2xl hover:shadow-[#003087]/10 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#003087]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-[#003087] flex items-center justify-center mb-6 shadow-lg shadow-[#003087]/30 group-hover:scale-110 transition-transform">
                <Briefcase className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-[#003087] transition-colors">Trouver un emploi</h3>
              <p className="text-slate-600 leading-relaxed">Offres adaptées à votre profil et vos compétences</p>
            </div>
          </Link>
        </motion.div>

        {/* Interview Preparation Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7 }}
          className="mb-16"
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              <span className="text-[#003087]">Préparez-vous</span>{" "}
              <span className="text-[#E31E24]">à réussir</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Des milliers de candidats se préparent chaque jour avec notre simulateur d'entretien intelligent
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              className="group relative rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all"
            >
              <img
                src="https://images.unsplash.com/photo-1573496267526-08a69e46a409?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800"
                alt="Professionnelles en entretien"
                className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#003087] via-[#003087]/50 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h3 className="text-xl font-bold mb-2">Entretiens réussis</h3>
                <p className="text-sm text-white/90">Préparez-vous efficacement</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9 }}
              className="group relative rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all"
            >
              <img
                src="https://images.unsplash.com/photo-1758519289636-f4ce8e73c484?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800"
                alt="Professionnels en discussion"
                className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#E31E24] via-[#E31E24]/50 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h3 className="text-xl font-bold mb-2">Feedback personnalisé</h3>
                <p className="text-sm text-white/90">Améliorez vos compétences</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.0 }}
              className="group relative rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all"
            >
              <img
                src="https://images.unsplash.com/photo-1765005204227-bf58bcdd4449?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800"
                alt="Professionnelle confiante"
                className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#003087] via-[#003087]/50 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h3 className="text-xl font-bold mb-2">Confiance garantie</h3>
                <p className="text-sm text-white/90">Réussissez vos entretiens</p>
              </div>
            </motion.div>
          </div>

          <div className="text-center mt-10">
            <Link
              to="/interview-prep"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#003087] to-[#0047b3] text-white px-8 py-3 rounded-full font-bold hover:shadow-xl hover:shadow-[#003087]/30 hover:scale-105 transition-all"
            >
              Commencer ma préparation
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Company Section */}
      <div className="bg-gradient-to-br from-[#003087] to-[#0047b3] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-3 text-white">Espace entreprise</h2>
              <p className="text-lg text-white/80">Recrutez les meilleurs talents avec notre plateforme intelligente</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Link
                to="/company/post-job"
                className="group relative p-8 rounded-2xl bg-gradient-to-br from-[#E31E24] to-[#ff3333] text-white hover:shadow-2xl hover:shadow-[#E31E24]/50 hover:scale-105 transition-all duration-300"
              >
                <div className="text-center">
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-xl bg-white/20 backdrop-blur-sm mb-4 group-hover:scale-110 transition-transform">
                    <div className="text-4xl font-light">+</div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Publier une offre</h3>
                  <p className="text-white/90 text-sm">Créez une nouvelle annonce d'emploi</p>
                </div>
              </Link>

              <Link
                to="/company/dashboard"
                className="group relative p-8 rounded-2xl bg-white hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                <div className="text-center">
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-xl bg-[#003087]/10 mb-4 group-hover:bg-[#003087] group-hover:scale-110 transition-all">
                    <svg className="h-8 w-8 text-[#003087] group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-[#003087]">Candidatures reçues</h3>
                  <p className="text-slate-600 text-sm">Gérez les candidats intéressés</p>
                </div>
              </Link>

              <Link
                to="/company/search-profiles"
                className="group relative p-8 rounded-2xl bg-white hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                <div className="text-center">
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-xl bg-[#003087]/10 mb-4 group-hover:bg-[#003087] group-hover:scale-110 transition-all">
                    <svg className="h-8 w-8 text-[#003087] group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-[#003087]">Rechercher des profils</h3>
                  <p className="text-slate-600 text-sm">Trouvez les candidats idéaux</p>
                </div>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-gradient-to-b from-white to-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.6 }}
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                <span className="text-[#003087]">Comment ça</span>{" "}
                <span className="text-[#E31E24]">fonctionne ?</span>
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                En quelques étapes simples, ProJob AI vous accompagne vers votre réussite professionnelle
              </p>
            </div>

            {/* For Candidates */}
            <div className="mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#003087]/10 text-[#003087] font-bold text-sm mb-8 mx-auto block w-fit">
                Pour les candidats
              </div>
              <div className="grid md:grid-cols-4 gap-6">
                {[
                  {
                    step: "01",
                    title: "Créez votre profil",
                    description: "Inscrivez-vous en quelques secondes",
                    icon: "👤"
                  },
                  {
                    step: "02",
                    title: "Générez votre CV",
                    description: "Notre IA crée votre CV professionnel",
                    icon: "📄"
                  },
                  {
                    step: "03",
                    title: "Préparez-vous",
                    description: "Entraînez-vous aux entretiens avec l'IA",
                    icon: "💬"
                  },
                  {
                    step: "04",
                    title: "Postulez",
                    description: "Trouvez et postulez en un clic",
                    icon: "🎯"
                  }
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 + i * 0.1 }}
                    className="relative bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all group"
                  >
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-[#003087] to-[#0047b3] text-white text-3xl mb-4 shadow-lg group-hover:scale-110 transition-transform">
                        {item.icon}
                      </div>
                      <div className="absolute -top-3 -right-2 w-10 h-10 rounded-full bg-[#E31E24] text-white flex items-center justify-center font-bold text-sm shadow-lg">
                        {item.step}
                      </div>
                      <h4 className="text-lg font-bold mb-2 text-[#003087]">{item.title}</h4>
                      <p className="text-sm text-slate-600">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* For Companies */}
            <div className="bg-gradient-to-br from-[#003087]/5 to-[#E31E24]/5 rounded-2xl p-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E31E24]/10 text-[#E31E24] font-bold text-sm mb-8 mx-auto block w-fit">
                Pour les entreprises
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    step: "01",
                    title: "Publiez vos offres",
                    description: "Créez vos annonces en quelques minutes",
                    icon: "📢"
                  },
                  {
                    step: "02",
                    title: "Recevez des candidatures",
                    description: "Les candidats qualifiés postulent",
                    icon: "📨"
                  },
                  {
                    step: "03",
                    title: "Recrutez",
                    description: "Trouvez votre talent idéal",
                    icon: "⭐"
                  }
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.6 + i * 0.1 }}
                    className="relative bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all group"
                  >
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-[#E31E24] to-[#ff3333] text-white text-3xl mb-4 shadow-lg group-hover:scale-110 transition-transform">
                        {item.icon}
                      </div>
                      <div className="absolute -top-3 -right-2 w-10 h-10 rounded-full bg-[#003087] text-white flex items-center justify-center font-bold text-sm shadow-lg">
                        {item.step}
                      </div>
                      <h4 className="text-lg font-bold mb-2 text-[#003087]">{item.title}</h4>
                      <p className="text-sm text-slate-600">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="text-center mt-12">
              <Link
                to="/profile-choice"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white px-8 py-3 rounded-full font-bold hover:shadow-xl hover:shadow-[#E31E24]/30 hover:scale-105 transition-all"
              >
                Commencer maintenant
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
