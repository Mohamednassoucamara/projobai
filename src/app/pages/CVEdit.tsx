import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Plus, X, Save } from "lucide-react";
import { motion } from "motion/react";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";
import { useCVData } from "../contexts/CVDataContext";

export default function CVEdit() {
  const { cvData, updateCVData } = useCVData();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(cvData);

  const handleSave = () => {
    updateCVData(formData);
    navigate("/cv-preview");
  };

  const addExperience = () => {
    setFormData({
      ...formData,
      experiences: [
        ...formData.experiences,
        { title: "", company: "", period: "", description: [""] },
      ],
    });
  };

  const removeExperience = (index: number) => {
    setFormData({
      ...formData,
      experiences: formData.experiences.filter((_, i) => i !== index),
    });
  };

  const updateExperience = (index: number, field: string, value: any) => {
    const updatedExperiences = [...formData.experiences];
    updatedExperiences[index] = { ...updatedExperiences[index], [field]: value };
    setFormData({ ...formData, experiences: updatedExperiences });
  };

  const addEducation = () => {
    setFormData({
      ...formData,
      education: [...formData.education, { degree: "", institution: "", period: "" }],
    });
  };

  const removeEducation = (index: number) => {
    setFormData({
      ...formData,
      education: formData.education.filter((_, i) => i !== index),
    });
  };

  const updateEducation = (index: number, field: string, value: string) => {
    const updatedEducation = [...formData.education];
    updatedEducation[index] = { ...updatedEducation[index], [field]: value };
    setFormData({ ...formData, education: updatedEducation });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <Link to="/cv-preview" className="flex items-center gap-2 text-slate-600 hover:text-[#003087] transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Retour à l'aperçu</span>
          </Link>
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src={logoImage} alt="ProJob AI" className="h-12 w-auto" />
          </Link>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white hover:shadow-xl hover:shadow-[#E31E24]/40 hover:scale-[1.02] transition-all font-bold"
          >
            <Save className="h-4 w-4" />
            <span>Enregistrer</span>
          </button>
        </div>
      </div>

      <div className="flex-1 mx-auto max-w-5xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl border-2 border-slate-100 p-10"
        >
          <h1 className="text-3xl font-bold text-[#003087] mb-8">Modifier vos informations</h1>

          {/* Informations personnelles */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-[#003087] mb-4">Informations personnelles</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nom complet *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all"
                  placeholder="Ex: Mohamed Diallo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Titre professionnel *</label>
                <input
                  type="text"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all"
                  placeholder="Ex: Développeur Web Full Stack"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all"
                  placeholder="+224 XXX XXX XXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all"
                  placeholder="votre.email@example.com"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Localisation</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all"
                  placeholder="Conakry, Guinée"
                />
              </div>
            </div>
          </div>

          {/* Profil */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-[#003087] mb-4">Profil professionnel</h2>
            <textarea
              value={formData.profile}
              onChange={(e) => setFormData({ ...formData, profile: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all resize-none"
              placeholder="Décrivez brièvement votre parcours et vos objectifs professionnels..."
            />
          </div>

          {/* Compétences */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-[#003087] mb-4">Compétences</h2>
            <input
              type="text"
              value={formData.skills.join(", ")}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all"
              placeholder="React, TypeScript, Node.js, MongoDB (séparez par des virgules)"
            />
          </div>

          {/* Bouton Enregistrer bas */}
          <div className="flex justify-end gap-4 pt-8 border-t">
            <Link
              to="/cv-preview"
              className="px-6 py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
            >
              Annuler
            </Link>
            <button
              onClick={handleSave}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white hover:shadow-xl hover:shadow-[#E31E24]/40 hover:scale-[1.02] transition-all font-bold"
            >
              Enregistrer et voir l'aperçu
            </button>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
