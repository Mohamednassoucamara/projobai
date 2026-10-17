import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { MapPin, Briefcase, GraduationCap, Calendar, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import Footer from "../components/Footer";
import AppNavHeader from "../components/AppNavHeader";
import ApplicationModal from "../components/ApplicationModal";
import { useAuth } from "../contexts/AuthContext";
import { jobService } from "../../services/supabase.service";
import { useCVData } from "../contexts/CVDataContext";
import { matchJob, matchTone, hasMatchableCV } from "../../lib/matching";


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
  const { isAuthenticated, user } = useAuth();
  const { cvData } = useCVData();
  const navigate = useNavigate();

  useEffect(() => {
    const loadJob = async () => {
      if (!id) { setNotFound(true); setIsLoading(false); return; }
      try {
        const data = await jobService.getJobById(id);
        if (data) setJob(data);
        else setNotFound(true);
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };
    loadJob();
  }, [id]);

  const handleApplyClick = () => {
    if (!isAuthenticated) {
      navigate(`/login?type=candidate&from=${encodeURIComponent(`/jobs/${id}`)}`);
      return;
    }
    if (user?.type === "company") {
      navigate("/company/dashboard");
      return;
    }
    const isValidJobId = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isValidJobId) return;
    setIsApplicationModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#050FA0]" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-[#E4220F] mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Offre introuvable</h2>
          <Link to="/jobs" className="text-[#050FA0] font-semibold hover:underline">Retour aux offres</Link>
        </div>
      </div>
    );
  }

  const companyName = job.company_profiles?.company_name || "Entreprise";
  const skills = job.job_skills?.map((s: any) => s.skill_name) || [];
  const salary = formatSalary(job.salary_min, job.salary_max);
  const descParagraphs = (job.description || "").split("\n").filter(Boolean);
  const match = user?.type === "candidate" && hasMatchableCV(cvData) ? matchJob(job, cvData) : null;
  const letterLink = `/cover-letter?${new URLSearchParams({
    company: companyName,
    position: job.title || "",
    sector: job.company_profiles?.sector || "",
  }).toString()}`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppNavHeader backTo="/jobs" backLabel="Retour aux offres" maxWidth="5xl" />

      <div className="page-container-narrow py-8 sm:py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border mb-6">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 break-words">{job.title}</h1>
            <p className="text-xl sm:text-2xl text-slate-700 mb-6 break-words">{companyName}</p>

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

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleApplyClick}
                className="flex-1 bg-gradient-to-r from-[#E4220F] to-[#F92813] text-white px-6 py-3.5 sm:py-4 rounded-xl font-bold hover:shadow-xl hover:shadow-[#E4220F]/40 sm:hover:scale-[1.02] transition-all"
              >
                Postuler maintenant
              </button>
              <Link
                to={user?.type === "candidate" ? letterLink : "/cv-edit"}
                className="flex-1 flex items-center justify-center gap-2 border-2 border-[#050FA0] text-[#050FA0] px-6 py-3.5 sm:py-4 rounded-xl font-bold hover:bg-[#050FA0] hover:text-white transition-all text-center"
              >
                <Sparkles className="h-5 w-5" />
                Préparer ma lettre pour cette offre
              </Link>
            </div>

            {match && (
              <div className={`mt-6 rounded-2xl border-2 p-4 sm:p-5 ${matchTone(match.score).cls}`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="font-bold">Compatibilité avec votre CV : <span className="tabular-nums">{match.score}%</span> · {matchTone(match.score).label}</p>
                  <Link to="/cv-edit" className="text-sm font-bold underline">Mettre à jour mon CV</Link>
                </div>
                {match.matched.length > 0 && (
                  <p className="text-sm mt-2"><span className="font-semibold">Vous avez :</span> {match.matched.join(", ")}</p>
                )}
                {match.missing.length > 0 && (
                  <p className="text-sm mt-1"><span className="font-semibold">À mettre en avant ou à acquérir :</span> {match.missing.slice(0, 6).join(", ")}</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
              <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border">
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
                      <li key={i} className="flex gap-3"><span className="text-[#E4220F]">•</span><span>{r}</span></li>
                    ))}
                  </ul>
                </div>
              )}

              {skills.length > 0 && (
                <div className="bg-white rounded-3xl p-8 border">
                  <h2 className="text-2xl font-bold mb-4">Compétences requises</h2>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill: string) => (
                      <span key={skill} className="px-4 py-2 bg-[#050FA0]/10 text-[#050FA0] rounded-full font-medium">
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
                      <li key={i} className="flex gap-3"><span className="text-[#E4220F]">•</span><span>{r}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="lg:col-span-1 order-1 lg:order-2">
              <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border lg:sticky lg:top-24">
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
                      <span className="font-medium text-[#E4220F]">
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
                    className="mt-4 block text-center text-sm text-[#050FA0] font-semibold hover:underline"
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

      {id && (
        <ApplicationModal
          isOpen={isApplicationModalOpen}
          onClose={() => setIsApplicationModalOpen(false)}
          jobId={id}
          jobTitle={job.title}
          companyName={companyName}
        />
      )}
    </div>
  );
}
