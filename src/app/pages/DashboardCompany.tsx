import { Link, useNavigate } from "react-router";
import { Plus, Users, Briefcase, Star, LogOut, Home } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";

export default function DashboardCompany() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="border-b bg-white/90 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center hover:scale-105 transition-transform">
              <img src={logoImage} alt="ProJob AI" className="h-12 w-auto" />
            </Link>
            <Link
              to="/"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-[#003087] hover:bg-gradient-to-r hover:from-[#003087] hover:to-[#0047b3] hover:text-white transition-all border-2 border-[#003087]"
            >
              <Home className="h-4 w-4" />
              <span>Accueil</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#E31E24] to-[#ff3333] flex items-center justify-center font-bold text-white text-sm shadow-lg">
                {user?.name.split(" ").map(n => n[0]).join("")}
              </div>
              <span className="font-semibold text-sm text-slate-800">{user?.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-[#E31E24] transition-all border border-transparent hover:border-red-200"
            >
              <LogOut className="h-4 w-4" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-5xl font-bold mb-12">
            <span className="text-[#003087]">Tableau de bord</span> <span className="text-[#E31E24]">Entreprise</span>
          </h1>

          <div className="grid md:grid-cols-4 gap-5 mb-12">
            {[
              { value: "5", label: "Offres actives", color: "from-[#003087] to-[#0047b3]", icon: Briefcase },
              { value: "23", label: "Candidatures reçues", color: "from-[#E31E24] to-[#ff3333]", icon: Users },
              { value: "8", label: "Profils favoris", color: "from-[#003087] to-[#0047b3]", icon: Star },
              { value: "2", label: "Postes pourvus", color: "from-green-500 to-green-600", icon: Star },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="group bg-white rounded-2xl p-6 border-2 border-slate-100 hover:border-transparent hover:shadow-xl transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className={`text-4xl font-bold mb-2 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</div>
                <div className="text-sm font-medium text-slate-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Link
              to="/company/post-job"
              className="group p-10 rounded-3xl bg-gradient-to-br from-[#E31E24] to-[#ff3333] text-white hover:shadow-2xl hover:shadow-[#E31E24]/40 hover:scale-105 transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all">
                  <Plus className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Publier une offre</h2>
                <p className="text-white/90">Créez une nouvelle annonce d'emploi</p>
              </div>
            </Link>

            <div className="p-12 rounded-3xl bg-white border-2 border-slate-200">
              <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Candidatures reçues</h2>
              <p className="text-slate-600">Gérez les candidats intéressés</p>
              <div className="mt-6 text-sm">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-red-600 font-medium">
                  5
                </span>
                <span className="ml-2 text-slate-600">nouvelles candidatures</span>
              </div>
            </div>

            <Link
              to="/company/search-profiles"
              className="p-12 rounded-3xl bg-white border-2 border-slate-200 hover:border-blue-600 transition-all"
            >
              <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                <Star className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Rechercher des profils</h2>
              <p className="text-slate-600">Trouvez les candidats idéaux</p>
            </Link>
          </div>

          <div className="mt-12 bg-white rounded-3xl p-8 border">
            <h2 className="text-2xl font-bold mb-6">Vos offres actives</h2>
            <div className="space-y-4">
              {[
                { title: "Développeur Web Full Stack", applications: 8, views: 45 },
                { title: "Designer UI/UX", applications: 5, views: 32 },
                { title: "Chef de Projet Digital", applications: 10, views: 58 },
              ].map((offer, i) => (
                <div key={i} className="p-6 rounded-2xl border-2 border-slate-100 hover:border-blue-600 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold mb-1">{offer.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span>{offer.applications} candidatures</span>
                        <span>·</span>
                        <span>{offer.views} vues</span>
                      </div>
                    </div>
                    <button className="px-4 py-2 rounded-full border-2 border-slate-200 hover:border-blue-600 text-sm font-medium transition-colors">
                      Voir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
