import { Link } from "react-router";
import { Search, MapPin, Briefcase, GraduationCap, Calendar, ArrowLeft, Sparkles, TrendingUp, Filter } from "lucide-react";
import { motion } from "motion/react";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";

export default function JobList() {
  const jobs = [
    {
      id: 1,
      title: "Développeur Web Full Stack",
      company: "Tech Solutions GN",
      location: "Conakry",
      level: "Licence",
      contract: "CDI",
      date: "Il y a 2 jours",
      salary: "800k - 1.2M GNF",
      isNew: true,
      featured: true
    },
    {
      id: 2,
      title: "Assistant Commercial",
      company: "Orange Guinée",
      location: "Conakry",
      level: "Bac+2",
      contract: "CDD",
      date: "Il y a 3 jours",
      salary: "600k - 900k GNF",
      isNew: true,
      featured: false
    },
    {
      id: 3,
      title: "Comptable",
      company: "BCRG",
      location: "Conakry",
      level: "Master",
      contract: "CDI",
      date: "Il y a 5 jours",
      salary: "1M - 1.5M GNF",
      isNew: false,
      featured: true
    },
    {
      id: 4,
      title: "Ingénieur Réseau",
      company: "MTN Guinée",
      location: "Conakry",
      level: "Licence",
      contract: "CDI",
      date: "Il y a 1 semaine",
      salary: "1.2M - 1.8M GNF",
      isNew: false,
      featured: false
    },
    {
      id: 5,
      title: "Chef de Projet Digital",
      company: "Agence Digitale",
      location: "Conakry",
      level: "Master",
      contract: "CDI",
      date: "Il y a 1 semaine",
      salary: "1.5M - 2M GNF",
      isNew: false,
      featured: false
    },
  ];

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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-12">
            <h1 className="text-5xl font-bold mb-3">
              <span className="text-[#003087]">Découvrez</span>{" "}
              <span className="text-[#E31E24]">votre prochain emploi</span>
            </h1>
            <p className="text-xl text-slate-600">Plus de 150 offres disponibles en Guinée</p>
          </div>

          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-[#003087]" />
              <input
                type="text"
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
                    <label className="block text-sm font-semibold mb-2 text-slate-700">Secteur</label>
                    <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/20 outline-none text-sm transition-all">
                      <option>Tous les secteurs</option>
                      <option>IT / Tech</option>
                      <option>Commercial</option>
                      <option>Finance</option>
                      <option>Santé</option>
                      <option>Éducation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">Ville</label>
                    <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/20 outline-none text-sm transition-all">
                      <option>Toutes les villes</option>
                      <option>Conakry</option>
                      <option>Labé</option>
                      <option>Kankan</option>
                      <option>Kindia</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">Niveau d'étude</label>
                    <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/20 outline-none text-sm transition-all">
                      <option>Tous les niveaux</option>
                      <option>Bac</option>
                      <option>Bac+2</option>
                      <option>Licence</option>
                      <option>Master</option>
                      <option>Doctorat</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">Type de contrat</label>
                    <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/20 outline-none text-sm transition-all">
                      <option>Tous les contrats</option>
                      <option>CDI</option>
                      <option>CDD</option>
                      <option>Stage</option>
                      <option>Freelance</option>
                    </select>
                  </div>

                  <button className="w-full bg-[#E31E24] text-white px-4 py-3 rounded-xl font-semibold hover:bg-[#c01920] transition-colors shadow-lg shadow-[#E31E24]/30">
                    Appliquer les filtres
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-slate-600">
                  <span className="font-bold text-[#003087]">{jobs.length} offres</span> correspondent à votre recherche
                </p>
                <select className="px-4 py-2 rounded-lg border-2 border-slate-200 focus:border-[#003087] outline-none text-sm">
                  <option>Plus récentes</option>
                  <option>Plus pertinentes</option>
                </select>
              </div>

              <div className="space-y-5">
                {jobs.map((job, i) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group"
                  >
                    <div className={`relative bg-white rounded-2xl p-8 border-2 ${
                      job.featured ? 'border-[#E31E24] shadow-xl shadow-[#E31E24]/10' : 'border-slate-100 hover:border-[#003087]'
                    } transition-all hover:shadow-xl`}>
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
                              {job.company.charAt(0)}
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold text-[#003087] group-hover:text-[#E31E24] transition-colors">{job.title}</h3>
                              <p className="text-lg text-slate-700 font-medium">{job.company}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3 mb-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full">
                              <MapPin className="h-4 w-4 text-[#003087]" />
                              <span className="text-sm font-medium text-slate-700">{job.location}</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full">
                              <GraduationCap className="h-4 w-4 text-[#003087]" />
                              <span className="text-sm font-medium text-slate-700">{job.level}</span>
                            </div>
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                              job.contract === 'CDI' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                              <Briefcase className="h-4 w-4" />
                              <span className="text-sm font-bold">{job.contract}</span>
                            </div>
                            {job.isNew && (
                              <div className="flex items-center gap-2 px-4 py-2 bg-[#E31E24] text-white rounded-full">
                                <TrendingUp className="h-4 w-4" />
                                <span className="text-sm font-bold">Nouveau</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm">{job.date}</span>
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
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
