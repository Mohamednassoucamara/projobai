import { Link, useNavigate } from "react-router";
import { Home, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import logoImage from "../../assets/logo.png";

export default function DashboardHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?";

  const isCompany = user?.type === "company";

  return (
    <header className="border-b bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
      <div className="page-container py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link to="/" className="flex items-center shrink-0 hover:scale-105 transition-transform">
              <img src={logoImage} alt="ProJob AI" className="h-10 w-auto sm:h-12" />
            </Link>
            <Link
              to="/"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold text-[#003087] hover:bg-gradient-to-r hover:from-[#003087] hover:to-[#0047b3] hover:text-white transition-all border-2 border-[#003087]"
            >
              <Home className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Accueil</span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-5 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 max-w-[140px] sm:max-w-none">
              <div
                className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br flex items-center justify-center font-bold text-white text-xs sm:text-sm shadow-lg shrink-0 ${
                  isCompany ? "from-[#E31E24] to-[#ff3333]" : "from-[#003087] to-[#0047b3]"
                }`}
              >
                {initials}
              </div>
              <span className="font-semibold text-xs sm:text-sm text-slate-800 truncate hidden md:inline">
                {user?.name}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-[#E31E24] transition-all border border-transparent hover:border-red-200"
              aria-label="Déconnexion"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
