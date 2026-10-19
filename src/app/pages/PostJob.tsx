import { Link, useNavigate, useParams } from "react-router";
import { Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import Footer from "../components/Footer";
import AppNavHeader from "../components/AppNavHeader";
import { supabase } from "../../lib/supabase";
import { sanitizeText } from "../../lib/security";

export default function PostJob() {
  const navigate = useNavigate();
  // Mode modification : /company/jobs/:id/edit
  const { id: editId } = useParams<{ id: string }>();
  const isEdit = Boolean(editId);
  const [loadingJob, setLoadingJob] = useState(isEdit);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    job_type: "CDI",
    experience_level: "Débutant accepté",
    education_level: "Licence",
    skills: "",
    deadline: "",
    salary_min: "",
    salary_max: "",
  });

  // Charger l'offre à modifier (RLS : seule l'entreprise propriétaire la reçoit)
  useEffect(() => {
    if (!editId) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: job, error: err } = await supabase
        .from("jobs")
        .select("*, job_skills(skill_name)")
        .eq("id", editId)
        .eq("company_id", user?.id ?? "")
        .maybeSingle();
      if (err || !job) {
        setError("Cette offre est introuvable ou ne vous appartient pas.");
      } else {
        setForm({
          title: job.title || "",
          description: job.description || "",
          location: job.location || "",
          job_type: job.job_type || "CDI",
          experience_level: job.experience_level || "Débutant accepté",
          education_level: job.education_level || "Licence",
          skills: ((job as { job_skills?: { skill_name: string }[] }).job_skills || []).map((s) => s.skill_name).join(", "),
          deadline: job.expires_at ? String(job.expires_at).slice(0, 10) : "",
          salary_min: job.salary_min != null ? String(Math.round(Number(job.salary_min))) : "",
          salary_max: job.salary_max != null ? String(Math.round(Number(job.salary_max))) : "",
        });
      }
      setLoadingJob(false);
    })();
  }, [editId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.location) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    if (form.title.length > 150) {
      setError("L'intitulé du poste ne peut pas dépasser 150 caractères.");
      return;
    }
    if (form.description.length > 5000) {
      setError("La description ne peut pas dépasser 5 000 caractères.");
      return;
    }
    if (form.salary_min && form.salary_max &&
        parseInt(form.salary_min) > parseInt(form.salary_max)) {
      setError("Le salaire minimum ne peut pas être supérieur au maximum.");
      return;
    }
    if (form.deadline && new Date(form.deadline) <= new Date()) {
      setError("La date limite doit être dans le futur.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Vous devez être connecté pour publier une offre.");
        return;
      }

      const skillsArray = form.skills
        ? form.skills.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      const jobPayload: Record<string, any> = {
        title: sanitizeText(form.title, 150),
        description: sanitizeText(form.description, 5000),
        location: sanitizeText(form.location, 200),
        job_type: form.job_type,
        experience_level: form.experience_level,
        education_level: form.education_level,
        expires_at: form.deadline ? new Date(form.deadline).toISOString() : null,
        salary_min: form.salary_min ? parseInt(form.salary_min) : null,
        salary_max: form.salary_max ? parseInt(form.salary_max) : null,
      };

      let jobId: string;
      if (isEdit && editId) {
        const { data: job, error: jobError } = await supabase
          .from("jobs")
          .update({ ...jobPayload, updated_at: new Date().toISOString() })
          .eq("id", editId)
          .eq("company_id", user.id)
          .select("id")
          .single();
        if (jobError) throw jobError;
        jobId = job.id;
        // Compétences : on remplace l'ancienne liste par la nouvelle
        const { error: delErr } = await supabase.from("job_skills").delete().eq("job_id", jobId);
        if (delErr) throw delErr;
      } else {
        const { data: job, error: jobError } = await supabase
          .from("jobs")
          .insert({ ...jobPayload, company_id: user.id, is_active: true, published_at: new Date().toISOString() })
          .select("id")
          .single();
        if (jobError) throw jobError;
        jobId = job.id;
      }

      if (skillsArray.length > 0) {
        const { error: skillsErr } = await supabase.from("job_skills").insert(
          skillsArray.slice(0, 20).map((skill) => ({ job_id: jobId, skill_name: sanitizeText(skill, 80) }))
        );
        if (skillsErr) console.warn("[ProJob AI] Compétences non enregistrées (migration 010 appliquée ?)", skillsErr);
      }

      setSuccess(true);
      setTimeout(() => navigate("/company/dashboard"), 2000);
    } catch (err: any) {
      setError(err?.message || (isEdit ? "Erreur lors de l'enregistrement. Veuillez réessayer." : "Erreur lors de la publication. Veuillez réessayer."));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-12"
        >
          <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-[#050FA0] mb-3">{isEdit ? "Offre mise à jour !" : "Offre publiée avec succès !"}</h2>
          <p className="text-slate-600">Redirection vers le tableau de bord...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppNavHeader backTo="/company/dashboard" backLabel="Retour au tableau de bord" maxWidth="4xl" />

      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">{isEdit ? "Modifier l'offre d'emploi" : "Publier une offre d'emploi"}</h1>
          <p className="text-base sm:text-lg text-slate-600 mb-8 sm:mb-12">
            {isEdit ? "Les candidatures déjà reçues sont conservées." : "Trouvez le candidat idéal pour votre entreprise"}
          </p>
          {loadingJob && (
            <div className="flex items-center gap-2 text-slate-500 mb-6"><Loader2 className="h-5 w-5 animate-spin" /> Chargement de l'offre…</div>
          )}

          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border">
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block font-medium mb-2">Intitulé du poste *</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Développeur Web Full Stack"
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#050FA0] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block font-medium mb-2">Description du poste *</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={6}
                  placeholder="Décrivez les responsabilités, missions et objectifs du poste..."
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#050FA0] outline-none transition-colors resize-none"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-medium mb-2">Localisation *</label>
                  <input
                    type="text"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="Conakry, Guinée"
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#050FA0] outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-2">Type de contrat</label>
                  <select
                    name="job_type"
                    value={form.job_type}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#050FA0] outline-none transition-colors"
                  >
                    <option>CDI</option>
                    <option>CDD</option>
                    <option>Stage</option>
                    <option>Freelance</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-medium mb-2">Niveau d'étude requis</label>
                  <select
                    name="education_level"
                    value={form.education_level}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#050FA0] outline-none transition-colors"
                  >
                    <option>Bac</option>
                    <option>Bac+2</option>
                    <option>Licence</option>
                    <option>Master</option>
                    <option>Doctorat</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-2">Expérience requise</label>
                  <select
                    name="experience_level"
                    value={form.experience_level}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#050FA0] outline-none transition-colors"
                  >
                    <option>Débutant accepté</option>
                    <option>1-2 ans</option>
                    <option>3-5 ans</option>
                    <option>5+ ans</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-medium mb-2">Salaire min (GNF)</label>
                  <input
                    type="number"
                    name="salary_min"
                    value={form.salary_min}
                    onChange={handleChange}
                    placeholder="800000"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#050FA0] outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-2">Salaire max (GNF)</label>
                  <input
                    type="number"
                    name="salary_max"
                    value={form.salary_max}
                    onChange={handleChange}
                    placeholder="1200000"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#050FA0] outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-2">Compétences requises</label>
                <input
                  type="text"
                  name="skills"
                  value={form.skills}
                  onChange={handleChange}
                  placeholder="React, TypeScript, Node.js..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#050FA0] outline-none transition-colors"
                />
                <p className="text-sm text-slate-500 mt-2">Séparez les compétences par des virgules</p>
              </div>

              <div>
                <label className="block font-medium mb-2">Date limite de candidature</label>
                <input
                  type="date"
                  name="deadline"
                  value={form.deadline}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#050FA0] outline-none transition-colors"
                />
              </div>

              <div className="pt-6 border-t flex gap-3">
                <Link
                  to="/company/dashboard"
                  className="flex-1 text-center px-6 py-3 rounded-full border-2 border-slate-200 font-medium hover:border-[#050FA0] transition-colors"
                >
                  Annuler
                </Link>
                <button
                  type="submit"
                  disabled={isLoading || loadingJob}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#E4220F] to-[#F92813] text-white px-6 py-3 rounded-full font-bold hover:shadow-xl hover:shadow-[#E4220F]/30 transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />{isEdit ? "Enregistrement…" : "Publication..."}</>
                  ) : (
                    isEdit ? "Enregistrer les modifications" : "Publier l'offre"
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
