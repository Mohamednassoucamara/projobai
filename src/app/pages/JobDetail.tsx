import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, MapPin, Briefcase, GraduationCap, Calendar, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";
import ApplicationModal from "../components/ApplicationModal";
import { useAuth } from "../contexts/AuthContext";
import { jobService } from "../../services/supabase.service";

const FALLBACK_JOB = {
  id: "1",
  title: "Développeur Web Full Stack",
  description: "Nous recherchons un Développeur Web Full Stack talentueux pour rejoindre notre équipe technique en pleine expansion. Vous travaillerez sur des projets innovants et contribuerez à la création d'applications web modernes.\n\nEn tant que membre clé de notre équipe, vous serez responsable du développement front-end et back-end de nos solutions digitales, en collaboration étroite avec les designers et les chefs de projet.",
  location: "Conakry, Guinée",
  education_level: "Licence",
  job_type: "CDI",
  experience_level: "2-3 ans",
  published_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  deadline: "2026-04-30",
  salary_min: 800000,
  salary_max: 1200000,
  company_profiles: {
    company_name: "Tech Solutions GN",
    sector: "IT / Tech",
    description: "Tech Solutions GN est une entreprise innovante spécialisée dans le développement de solutions digitales pour les entreprises guinéennes.",
    website: null,
  },
  job_skills: [
    { skill_name: "React" }, { skill_name: "Node.js" }, { skill_name: "TypeScript" },
    { skill_name: "MongoDB" }, { skill_name: "Express" }, { skill_name: "Git" },
  ],
  responsibilities: [
    "Développer et maintenir des applications web performantes",
    "Collaborer avec l'équipe pour définir les spécifications techniques",
    "Assurer la qualité du code et respecter les bonnes pratiques",
    "Participer aux revues de code et aux tests",
  ],
  requirements: [
    "Licence en Informatique ou équivalent",
    "2 ans minimum d'expérience en développement web",
    "Maîtrise du français et bonne connaissance de l'anglais technique",
    "Esprit d'équipe et excellentes capacités de communication",
  ],
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  return `Il y a ${Math.floor(days / 7)} semaine(s)`;
}

function formatSalary(min?: number, max?: number) {
  if (!min && !max) return null;
  const fmt = (v: number) => (v / 1000).toFixed(0) + "k";
  if (min && max) return `${fmt(min)} - ${fmt(max)} GNF`;
  if (min) return `À partir de ${fmt(min)} GNF`;
  return `Jusqu'à ${fmt(max!)} GNF`;
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadJob = async () => {
      if (!id) { setNotFound(true); setIsLoading(false); return; }
      try {
        const data = await jobService.getJobById(id);
        setJob(data || FALLBACK_JOB);
      } catch {
        if (id === "1" || id === "2" || id === "3" || id === "4" || id === "5") {
          setJob(FALLBACK_JOB);
        } else {
          setNotFound(true);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadJob();
  }, [id]);

  const handleApplyClick = () => {
    if (!isAuthenticated) {
      navigate("/login");
    } else {
      setIsApplicationModalOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#003087]" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-[#E31E24] mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Offre introuvable</h2>
          <Link to="/jobs" className="text-[#003087] font-semibold hover:underline">Retour aux offres</Link>
        </div>
      </div>
    );
  }

  const companyName = job.company_profiles?.company_name || "Entreprise";
  const skills = job.job_skills?.map((s: any) => s.skill_name) || [];
  const salary = formatSalary(job.salary_min, job.salary_max);
  const descParagraphs = (job.description || "").split("\n").filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <Link to="/jobs" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-5 w-5" />
            <span>Retour aux offres</span>
          </Link>
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src={logoImage} alt="ProJob AI" className="h-10 w-auto" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-white rounded-3xl p-8 border mb-6">
            <h1 className="text-4xl font-bold mb-3">{job.title}</h1>
            <p className="text-2xl text-slate-700 mb-6">{companyName}</p>

            <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <span>{job.location}</span>
              </div>
              {job.education_level && (
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  <span>{job.education_level} minimum</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                <span>{job.job_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>Publié {timeAgo(job.published_at)}</span>
              </div>
            </div>

            {salary && (
              <div className="mb-6">
                <span className="inline-block px-4 py-2 bg-green-50 text-green-700 rounded-full font-semibold text-sm">{salary}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleApplyClick}
                className="flex-1 bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white px-6 py-4 rounded-xl font-bold hover:shadow-xl hover:shadow-[#E31E24]/40 hover:scale-[1.02] transition-all"
              >
                Postuler maintenant
              </button>
              <Link
                to="/cv-assistant"
                className="flex-1 flex items-center justify-center gap-2 border-2 border-[#003087] text-[#003087] px-6 py-4 rounded-xl font-bold hover:bg-[#003087] hover:text-white transition-all"
              >
                <Sparkles className="h-5 w-5" />
                Adapter mon CV avec l'IA
              </Link>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-8 border">
                <h2 className="text-2xl font-bold mb-4">Description du poste</h2>
                <div className="space-y-4 text-slate-700">
                  {descParagraphs.length > 0
                    ? descParagraphs.map((p: string, i: number) => <p key={i}>{p}</p>)
                    : <p>{job.description}</p>
                  }
                </div>
              </div>

              {(job.responsibilities || []).length > 0 && (
                <div className="bg-white rounded-3xl p-8 border">
                  <h2 className="text-2xl font-bold mb-4">Responsabilités</h2>
                  <ul className="space-y-3 text-slate-700">
                    {job.responsibilities.map((r: string, i: number) => (
                      <li key={i} className="flex gap-3"><span className="text-[#E31E24]">•</span><span>{r}</span></li>
                    ))}
                  </ul>
                </div>
              )}

              {skills.length > 0 && (
                <div className="bg-white rounded-3xl p-8 border">
                  <h2 className="text-2xl font-bold mb-4">Compétences requises</h2>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill: string) => (
                      <span key={skill} className="px-4 py-2 bg-[#003087]/10 text-[#003087] rounded-full font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(job.requirements || []).length > 0 && (
                <div className="bg-white rounded-3xl p-8 border">
                  <h2 className="text-2xl font-bold mb-4">Profil recherché</h2>
                  <ul className="space-y-3 text-slate-700">
                    {job.requirements.map((r: string, i: number) => (
                      <li key={i} className="flex gap-3"><span className="text-[#E31E24]">•</span><span>{r}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl p-6 border sticky top-6">
                <h3 className="font-bold mb-4 text-lg">À propos de l'entreprise</h3>
                {job.company_profiles?.description && (
                  <p className="text-sm text-slate-700 mb-4">{job.company_profiles.description}</p>
                )}
                <div className="space-y-3 text-sm">
                  {job.company_profiles?.sector && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Secteur</span>
                      <span className="font-medium">{job.company_profiles.sector}</span>
                    </div>
                  )}
                  {job.experience_level && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Expérience</span>
                      <span className="font-medium">{job.experience_level}</span>
                    </div>
                  )}
                  {job.deadline && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Date limite</span>
                      <span className="font-medium text-[#E31E24]">
                        {new Date(job.deadline).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  )}
                </div>
                {job.company_profiles?.website && (
                  <a
                    href={job.company_profiles.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 block text-center text-sm text-[#003087] font-semibold hover:underline"
                  >
                    Visiter le site web
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <Footer />

      <ApplicationModal
        isOpen={isApplicationModalOpen}
        onClose={() => setIsApplicationModalOpen(false)}
        jobTitle={job.title}
        companyName={companyName}
      />
    </div>
  );
}
