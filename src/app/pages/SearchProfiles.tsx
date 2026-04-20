import { Link } from "react-router";
import { Search, ArrowLeft, Star, MapPin, Briefcase } from "lucide-react";
import { motion } from "motion/react";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";

export default function SearchProfiles() {
  const profiles = [
    {
      name: "Mohamed Diallo",
      title: "Développeur Web Full Stack",
      location: "Conakry",
      experience: "2 ans",
      skills: ["React", "Node.js", "TypeScript"],
      match: 95,
    },
    {
      name: "Aissatou Bah",
      title: "Designer UI/UX",
      location: "Conakry",
      experience: "3 ans",
      skills: ["Adobe XD", "Prototyping"],
      match: 88,
    },
    {
      name: "Ibrahim Camara",
      title: "Chef de Projet Digital",
      location: "Conakry",
      experience: "5 ans",
      skills: ["Agile", "Scrum", "Management"],
      match: 82,
    },
    {
      name: "Fatoumata Sylla",
      title: "Développeuse Mobile",
      location: "Conakry",
      experience: "2 ans",
      skills: ["React Native", "Flutter", "iOS"],
      match: 75,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link to="/company/dashboard" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-5 w-5" />
            <span>Retour au tableau de bord</span>
          </Link>
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src={logoImage} alt="ProJob AI" className="h-10 w-auto" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold mb-12">Rechercher des profils</h1>

          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par poste, compétence, secteur..."
                className="w-full pl-12 pr-4 py-3 rounded-full border-2 border-slate-200 focus:border-blue-600 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-6 border sticky top-6">
                <h3 className="font-bold mb-4">Filtres</h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Expérience</label>
                    <select className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 focus:border-blue-600 outline-none text-sm">
                      <option>Tous</option>
                      <option>Débutant</option>
                      <option>1-2 ans</option>
                      <option>3-5 ans</option>
                      <option>5+ ans</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Ville</label>
                    <select className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 focus:border-blue-600 outline-none text-sm">
                      <option>Toutes</option>
                      <option>Conakry</option>
                      <option>Labé</option>
                      <option>Kankan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Niveau d'étude</label>
                    <select className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 focus:border-blue-600 outline-none text-sm">
                      <option>Tous</option>
                      <option>Bac</option>
                      <option>Bac+2</option>
                      <option>Licence</option>
                      <option>Master</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Secteur</label>
                    <select className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 focus:border-blue-600 outline-none text-sm">
                      <option>Tous</option>
                      <option>IT / Tech</option>
                      <option>Design</option>
                      <option>Commercial</option>
                      <option>Finance</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="space-y-4">
                {profiles.map((profile, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-2xl p-6 border-2 border-slate-100 hover:border-blue-600 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-600">
                          {profile.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold mb-1">{profile.name}</h3>
                          <p className="text-slate-700 mb-2">{profile.title}</p>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>{profile.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Briefcase className="h-4 w-4" />
                              <span>{profile.experience}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">{profile.match}%</div>
                          <div className="text-xs text-slate-600">Compatibilité</div>
                        </div>
                        <button className="h-10 w-10 rounded-full border-2 border-slate-200 hover:border-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors">
                          <Star className="h-5 w-5 text-slate-400" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {profile.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    <button className="w-full py-2 rounded-full border-2 border-blue-600 text-blue-600 font-medium hover:bg-blue-50 transition-colors">
                      Voir le profil complet
                    </button>
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
