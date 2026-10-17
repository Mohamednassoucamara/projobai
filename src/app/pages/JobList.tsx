import { Link, useSearchParams } from "react-router";
import { Search, MapPin, Briefcase, GraduationCap, Calendar, Sparkles, TrendingUp, Filter, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useState, useEffect } from "react";
import Footer from "../components/Footer";
import AppNavHeader from "../components/AppNavHeader";
import { jobService } from "../../services/supabase.service";
import { useCVData } from "../contexts/CVDataContext";
import { useAuth } from "../contexts/AuthContext";
import { matchJob, matchTone, hasMatchableCV, norm } from "../../lib/matching";


function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 14) return "Il y a 1 semaine";
  return `Il y a ${Math.floor(days / 7)} semaines`;
}

function formatSalary(min?: number, max?: number) {
  if (!min && !max) return null;
  const fmt = (v: number) => (v / 1000).toFixed(0) + "k";
  if (min && max) return `${fmt(min)} - ${fmt(max)} GNF`;
  if (min) return `À partir de ${fmt(min)} GNF`;
  return `Jusqu'à ${fmt(max!)} GNF`;
}

export default function JobList() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [filters, setFilters] = useState({ location: "", job_type: "", education_level: "" });
  const [loadError, setLoadError] = useState(false);
  const [sortByMatch, setSortByMatch] = useState(true);
  const { cvData } = useCVData();
  const { user } = useAuth();
  const canMatch = user?.type === "candidate" && hasMatchableCV(cvData);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const data = await jobService.getActiveJobs({ limit: 50 });
        setJobs(data || []);
      } catch {
        setJobs([]);
        setLoadError(true);
      } finally {
        setIsLoading(false);
      }
    };
    loadJobs();
  }, []);

  const filtered = jobs.filter((job) => {
    const name = job.company_profiles?.company_name || "";
    // Recherche par mots : une offre correspond si au moins la moitié des mots importants y figurent.
    const hay = norm(`${job.title} ${name} ${job.description || ""} ${(job.job_skills || []).map((s: any) => s.skill_name).join(" ")}`);
    const words = norm(search).split(" ").filter((w) => w.length > 2 && !["les", "des", "une", "pour", "and"].includes(w));
    const matchSearch = !search.trim() || hay.includes(norm(search)) || (words.length > 0 && words.filter((w) => hay.includes(w)).length >= Math.ceil(words.length / 2));
    const matchLocation = !filters.location || job.location?.toLowerCase().includes(filters.location.toLowerCase());
    const matchType = !filters.job_type || job.job_type === filters.job_type;
    const matchEdu = !filters.education_level || job.education_level === filters.education_level;
    return matchSearch && matchLocation && matchType && matchEdu;
  });

  const scored = filtered.map((job) => ({ job, match: canMatch ? matchJob(job, cvData) : null }));
  if (canMatch && sortByMatch) scored.sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      <AppNavHeader backTo="/dashboard" backLabel="Retour au tableau de bord" />

      <div className="page-container py-8 sm:py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-12">
            <h1 className="page-title mb-3">
              <span className="text-[#003087]">Découvrez</span>{" "}
              <span className="text-[#E31E24]">votre prochain emploi</span>
            </h1>
            <p className="page-subtitle">Les meilleures offres disponibles en Guinée</p>
          </div>

          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-[#003087]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un poste, une entreprise, un secteur..."
                className="w-full pl-12 sm:pl-16 pr-4 sm:pr-6 py-4 sm:py-5 rounded-2xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all text-base sm:text-lg shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
            <div className="lg:col-span-1 order-2 lg:order-1">
              <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-slate-100 shadow-lg lg:sticky lg:top-24">
                <div className="flex items-center gap-2 mb-6">
                  <Filter className="h-5 w-5 text-[#003087]" />
                  <h3 className="font-bold text-lg text-[#003087]">Filtres</h3>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">Ville</label>
                    <select
                      value={filters.location}
                      onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/20 outline-none text-sm transition-all"
                    >
                      <option value="">Toutes les villes</option>
                      <option value="Conakry">Conakry</option>
                      <option value="Labé">Labé</option>
                      <option value="Kankan">Kankan</option>
                      <option value="Kindia">Kindia</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">Niveau d'étude</label>
                    <select
                      value={filters.education_level}
                      onChange={(e) => setFilters({ ...filters, education_level: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/20 outline-none text-sm transition-all"
                    >
                      <option value="">Tous les niveaux</option>
                      <option>Bac</option>
                      <option>Bac+2</option>
                      <option>Licence</option>
                      <option>Master</option>
                      <option>Doctorat</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">Type de contrat</label>
                    <select
                      value={filters.job_type}
                      onChange={(e) => setFilters({ ...filters, job_type: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/20 outline-none text-sm transition-all"
                    >
                      <option value="">Tous les contrats</option>
                      <option>CDI</option>
                      <option>CDD</option>
                      <option>Stage</option>
                      <option>Freelance</option>
                    </select>
                  </div>
                  <button
                    onClick={() => { setSearch(""); setFilters({ location: "", job_type: "", education_level: "" }); }}
                    className="w-full border-2 border-slate-200 text-slate-600 px-4 py-3 rounded-xl font-semibold hover:border-[#003087] hover:text-[#003087] transition-colors"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 order-1 lg:order-2">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-slate-600">
                  {isLoading ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Chargement...</span>
                  ) : (
                    <><span className="font-bold text-[#003087]">{filtered.length} offre{filtered.length > 1 ? "s" : ""}</span> correspondent à votre recherche</>
                  )}
                </p>
                {canMatch && !isLoading && filtered.length > 1 && (
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={sortByMatch} onChange={(e) => setSortByMatch(e.target.checked)} className="h-4 w-4 accent-[#003087]" />
                    Trier par compatibilité
                  </label>
                )}
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-[#003087]" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">
                    {loadError
                      ? "Les offres n'ont pas pu être chargées. Vérifiez votre connexion puis rechargez la page."
                      : jobs.length === 0
                        ? "Aucune offre publiée pour le moment. Revenez bientôt : les entreprises publient chaque semaine."
                        : "Aucune offre ne correspond à vos critères"}
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {scored.map(({ job, match }, i) => {
                    const companyName = job.company_profiles?.company_name || "Entreprise";
                    const salary = formatSalary(job.salary_min, job.salary_max);
                    const isNew = (Date.now() - new Date(job.published_at).getTime()) < 3 * 86400000;
                    return (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group"
                      >
                        <div className={`relative bg-white rounded-2xl p-5 sm:p-8 border-2 ${job.featured ? "border-[#E31E24] shadow-xl shadow-[#E31E24]/10" : "border-slate-100 hover:border-[#003087]"} transition-all hover:shadow-xl`}>
                          {job.featured && (
                            <div className="absolute -top-3 left-6 bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg">
                              <Sparkles className="h-4 w-4" />
                              Offre Premium
                            </div>
                          )}
                          <div className="mb-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-3 mb-3">
                                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-gradient-to-br from-[#003087] to-[#0047b3] flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg shrink-0">
                                  {companyName.charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-xl sm:text-2xl font-bold text-[#003087] group-hover:text-[#E31E24] transition-colors break-words">{job.title}</h3>
                                  <p className="text-base sm:text-lg text-slate-700 font-medium break-words">{companyName}</p>
                                </div>
                                {match && (
                                  <div className={`shrink-0 text-center rounded-xl border px-3 py-2 ${matchTone(match.score).cls}`} title={match.matched.length ? `Compétences en commun : ${match.matched.join(", ")}` : "Comparaison avec votre CV"}>
                                    <div className="text-xl font-bold tabular-nums">{match.score}%</div>
                                    <div className="text-[11px] font-semibold leading-tight">{matchTone(match.score).label}</div>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-3 mb-4">
                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full">
                                  <MapPin className="h-4 w-4 text-[#003087]" />
                                  <span className="text-sm font-medium text-slate-700">{job.location}</span>
                                </div>
                                {job.education_level && (
                                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full">
                                    <GraduationCap className="h-4 w-4 text-[#003087]" />
                                    <span className="text-sm font-medium text-slate-700">{job.education_level}</span>
                                  </div>
                                )}
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${job.job_type === "CDI" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                                  <Briefcase className="h-4 w-4" />
                                  <span className="text-sm font-bold">{job.job_type}</span>
                                </div>
                                {isNew && (
                                  <div className="flex items-center gap-2 px-4 py-2 bg-[#E31E24] text-white rounded-full">
                                    <TrendingUp className="h-4 w-4" />
                                    <span className="text-sm font-bold">Nouveau</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Calendar className="h-4 w-4" />
                                  <span className="text-sm">{timeAgo(job.published_at)}</span>
                                </div>
                                {salary && <span className="text-sm font-semibold text-[#003087]">{salary}</span>}
                              </div>
                            </div>
                          </div>
                          <Link
                            to={`/jobs/${job.id}`}
                            className="block mt-4 w-full bg-gradient-to-r from-[#003087] to-[#0047b3] text-white text-center px-6 py-3 rounded-xl font-bold hover:shadow-xl hover:shadow-[#003087]/30 hover:scale-[1.02] transition-all"
                          >
                            Voir l'offre complète
                          </Link>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
