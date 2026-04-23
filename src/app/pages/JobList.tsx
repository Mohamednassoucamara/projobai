import { Link } from "react-router";
import { Search, MapPin, Briefcase, GraduationCap, Calendar, ArrowLeft, Sparkles, TrendingUp, Filter, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useState, useEffect } from "react";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";
import { jobService } from "../../services/supabase.service";

const FALLBACK_JOBS = [
  { id: "1", title: "Développeur Web Full Stack", company_profiles: { company_name: "Tech Solutions GN" }, location: "Conakry", education_level: "Licence", job_type: "CDI", published_at: new Date(Date.now() - 2 * 86400000).toISOString(), salary_min: 800000, salary_max: 1200000, is_active: true, featured: true },
  { id: "2", title: "Assistant Commercial", company_profiles: { company_name: "Orange Guinée" }, location: "Conakry", education_level: "Bac+2", job_type: "CDD", published_at: new Date(Date.now() - 3 * 86400000).toISOString(), salary_min: 600000, salary_max: 900000, is_active: true, featured: false },
  { id: "3", title: "Comptable", company_profiles: { company_name: "BCRG" }, location: "Conakry", education_level: "Master", job_type: "CDI", published_at: new Date(Date.now() - 5 * 86400000).toISOString(), salary_min: 1000000, salary_max: 1500000, is_active: true, featured: true },
  { id: "4", title: "Ingénieur Réseau", company_profiles: { company_name: "MTN Guinée" }, location: "Conakry", education_level: "Licence", job_type: "CDI", published_at: new Date(Date.now() - 7 * 86400000).toISOString(), salary_min: 1200000, salary_max: 1800000, is_active: true, featured: false },
  { id: "5", title: "Chef de Projet Digital", company_profiles: { company_name: "Agence Digitale" }, location: "Conakry", education_level: "Master", job_type: "CDI", published_at: new Date(Date.now() - 7 * 86400000).toISOString(), salary_min: 1500000, salary_max: 2000000, is_active: true, featured: false },
];

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
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ location: "", job_type: "", education_level: "" });

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const data = await jobService.getActiveJobs({ limit: 50 });
        setJobs(data && data.length > 0 ? data : FALLBACK_JOBS);
      } catch {
        setJobs(FALLBACK_JOBS);
      } finally {
        setIsLoading(false);
      }
    };
    loadJobs();
  }, []);

  const filtered = jobs.filter((job) => {
    const name = job.company_profiles?.company_name || "";
    const matchSearch = !search || job.title.toLowerCase().includes(search.toLowerCase()) || name.toLowerCase().includes(search.toLowerCase());
    const matchLocation = !filters.location || job.location?.toLowerCase().includes(filters.location.toLowerCase());
    const matchType = !filters.job_type || job.job_type === filters.job_type;
    const matchEdu = !filters.education_level || job.education_level === filters.education_level;
    return matchSearch && matchLocation && matchType && matchEdu;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-slate-600 hover:text-[#003087] transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Retour au tableau de bord</span>
          </Link>
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src={logoImage} alt="ProJob AI" className="h-12 w-auto" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-12">
            <h1 className="text-5xl font-bold mb-3">
              <span className="text-[#003087]">Découvrez</span>{" "}
              <span className="text-[#E31E24]">votre prochain emploi</span>
            </h1>
            <p className="text-xl text-slate-600">Les meilleures offres disponibles en Guinée</p>
          </div>

          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-[#003087]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un poste, une entreprise, un secteur..."
                className="w-full pl-16 pr-6 py-5 rounded-2xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all text-lg shadow-sm"
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-6 border-2 border-slate-100 shadow-lg sticky top-6">
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

            <div className="lg:col-span-3">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-slate-600">
                  {isLoading ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Chargement...</span>
                  ) : (
                    <><span className="font-bold text-[#003087]">{filtered.length} offre{filtered.length > 1 ? "s" : ""}</span> correspondent à votre recherche</>
                  )}
                </p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-[#003087]" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">Aucune offre ne correspond à vos critères</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {filtered.map((job, i) => {
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
                        <div className={`relative bg-white rounded-2xl p-8 border-2 ${job.featured ? "border-[#E31E24] shadow-xl shadow-[#E31E24]/10" : "border-slate-100 hover:border-[#003087]"} transition-all hover:shadow-xl`}>
                          {job.featured && (
                            <div className="absolute -top-3 left-6 bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg">
                              <Sparkles className="h-4 w-4" />
                              Offre Premium
                            </div>
                          )}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#003087] to-[#0047b3] flex items-center justify-center text-white font-bold text-xl shadow-lg">
                                  {companyName.charAt(0)}
                                </div>
                                <div>
                                  <h3 className="text-2xl font-bold text-[#003087] group-hover:text-[#E31E24] transition-colors">{job.title}</h3>
                                  <p className="text-lg text-slate-700 font-medium">{companyName}</p>
                                </div>
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
