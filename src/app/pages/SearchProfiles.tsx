import { useEffect, useMemo, useState } from "react";
import { Search, Star, MapPin, Briefcase, Loader2, Users } from "lucide-react";
import { motion } from "motion/react";
import Footer from "../components/Footer";
import AppNavHeader from "../components/AppNavHeader";
import { supabase, getCurrentUserId } from "../../lib/supabase";
import { companyService } from "../../services/supabase.service";
import { matchJob, matchTone } from "../../lib/matching";

type Candidate = {
  id: string;
  full_name: string;
  job_title: string | null;
  location: string | null;
  profile_summary: string | null;
  skills: string[] | null;
  experience_count: number;
};

const CITIES = ["Conakry", "Kindia", "Boké", "Kamsar", "Mamou", "Labé", "Kankan", "Siguiri", "N'Zérékoré", "Faranah"];

export default function SearchProfiles() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [city, setCity] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobId, setJobId] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 350);
    return () => window.clearTimeout(t);
  }, [query]);

  // Offres de l'entreprise (pour classer les profils) et favoris
  useEffect(() => {
    (async () => {
      const id = await getCurrentUserId();
      if (!id) return;
      setCompanyId(id);
      try {
        const data = await companyService.getJobs(id);
        const active = (data || []).filter((j: any) => j.is_active);
        setJobs(active);
        if (active[0]) setJobId(active[0].id);
      } catch {
        setJobs([]);
      }
      const { data: favs } = await supabase.from("favorite_candidates").select("candidate_id").eq("company_id", id);
      setFavorites(new Set((favs || []).map((f) => f.candidate_id)));
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    supabase
      .rpc("search_candidates", { p_query: debounced || null, p_location: city || null, p_limit: 60 })
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          setError(
            /search_candidates|function/i.test(err.message)
              ? "La CVthèque n'est pas encore activée : appliquez la migration 009 dans Supabase."
              : "Les profils n'ont pas pu être chargés. Vérifiez votre connexion.",
          );
          setCandidates([]);
        } else {
          setCandidates((data || []) as Candidate[]);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [debounced, city]);

  const selectedJob = jobs.find((j) => j.id === jobId);
  const rows = useMemo(() => {
    const list = candidates
      .filter((c) => !onlyFavorites || favorites.has(c.id))
      .map((c) => ({
        c,
        match: selectedJob
          ? matchJob(selectedJob, { jobTitle: c.job_title || "", location: c.location || "", skills: c.skills || [], profile: c.profile_summary || "" })
          : null,
      }));
    if (selectedJob) list.sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0));
    return list;
  }, [candidates, selectedJob, favorites, onlyFavorites]);

  const toggleFavorite = async (candidateId: string) => {
    if (!companyId) return;
    const isFav = favorites.has(candidateId);
    const next = new Set(favorites);
    if (isFav) next.delete(candidateId); else next.add(candidateId);
    setFavorites(next);
    const { error: err } = isFav
      ? await supabase.from("favorite_candidates").delete().eq("company_id", companyId).eq("candidate_id", candidateId)
      : await supabase.from("favorite_candidates").insert({ company_id: companyId, candidate_id: candidateId });
    if (err) setFavorites(favorites);
  };

  const selectCls = "w-full px-3 py-2.5 rounded-lg border-2 border-slate-200 focus:border-[#003087] outline-none text-sm bg-white";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppNavHeader backTo="/company/dashboard" backLabel="Retour au tableau de bord" />

      <div className="page-container py-8 sm:py-12 flex-1">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="page-title mb-2">CVthèque</h1>
          <p className="page-subtitle mb-8">Candidats qui ont choisi d&apos;être visibles par les recruteurs. Leurs coordonnées restent privées tant qu&apos;ils n&apos;ont pas postulé à une de vos offres.</p>

          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <label htmlFor="profile-search" className="sr-only">Rechercher</label>
              <input
                id="profile-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher par poste, compétence ou nom…"
                className="w-full pl-12 pr-4 py-3 rounded-full border-2 border-slate-200 focus:border-[#003087] outline-none transition-colors bg-white"
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-6 border lg:sticky lg:top-24 space-y-5">
                <h3 className="font-bold">Filtres</h3>
                <div>
                  <label htmlFor="profile-job" className="block text-sm font-medium mb-2">Classer pour l&apos;offre</label>
                  <select id="profile-job" value={jobId} onChange={(e) => setJobId(e.target.value)} className={selectCls}>
                    <option value="">Aucune (plus récents)</option>
                    {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
                  </select>
                  {jobs.length === 0 && <p className="text-xs text-slate-500 mt-1">Publiez une offre pour classer les profils par compatibilité.</p>}
                </div>
                <div>
                  <label htmlFor="profile-city" className="block text-sm font-medium mb-2">Ville</label>
                  <select id="profile-city" value={city} onChange={(e) => setCity(e.target.value)} className={selectCls}>
                    <option value="">Toutes</option>
                    {CITIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={onlyFavorites} onChange={(e) => setOnlyFavorites(e.target.checked)} className="h-4 w-4 accent-[#003087]" />
                  Seulement mes favoris ({favorites.size})
                </label>
              </div>
            </div>

            <div className="lg:col-span-3">
              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#003087]" /></div>
              ) : error ? (
                <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6 text-amber-900">{error}</div>
              ) : rows.length === 0 ? (
                <div className="text-center py-16 text-slate-500 bg-white rounded-2xl border-2 border-dashed">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-slate-700">Aucun profil ne correspond</p>
                  <p className="text-sm mt-1">Élargissez la recherche. De nouveaux candidats rendent leur profil visible chaque semaine.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600"><span className="font-bold text-[#003087]">{rows.length}</span> profil{rows.length > 1 ? "s" : ""}</p>
                  {rows.map(({ c, match }, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i, 8) * 0.04 }}
                      className="bg-white rounded-2xl p-5 sm:p-6 border hover:border-[#003087] transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#003087] to-[#0047b3] text-white flex items-center justify-center font-bold text-xl shrink-0">
                          {(c.full_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-lg font-bold break-words">{c.full_name}</h3>
                              <p className="text-slate-700 break-words">{c.job_title || "Poste non précisé"}</p>
                            </div>
                            {match && (
                              <div className={`shrink-0 text-center rounded-xl border px-3 py-1.5 ${matchTone(match.score).cls}`}>
                                <div className="text-lg font-bold tabular-nums">{match.score}%</div>
                                <div className="text-[11px] font-semibold">{matchTone(match.score).label}</div>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 mt-2">
                            {c.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{c.location}</span>}
                            <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" />{c.experience_count} expérience{c.experience_count > 1 ? "s" : ""}</span>
                          </div>
                          {c.profile_summary && <p className="text-sm text-slate-700 mt-3 line-clamp-3">{c.profile_summary}</p>}
                          {(c.skills || []).length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {(c.skills || []).slice(0, 8).map((s) => (
                                <span key={s} className={`px-2.5 py-1 rounded-full text-xs font-medium ${match?.matched.some((m) => m.toLowerCase() === s.toLowerCase()) ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{s}</span>
                              ))}
                            </div>
                          )}
                          <div className="mt-4">
                            <button
                              type="button"
                              onClick={() => toggleFavorite(c.id)}
                              aria-pressed={favorites.has(c.id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold border transition-colors ${favorites.has(c.id) ? "bg-amber-50 border-amber-300 text-amber-800" : "border-slate-300 text-slate-700 hover:border-[#003087]"}`}
                            >
                              <Star className={`h-4 w-4 ${favorites.has(c.id) ? "fill-amber-400 text-amber-500" : ""}`} />
                              {favorites.has(c.id) ? "Dans mes favoris" : "Ajouter aux favoris"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
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
