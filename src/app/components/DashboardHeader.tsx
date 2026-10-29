import { Link, useNavigate } from "react-router";
import { Home, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import AppLogo from "./AppLogo";
import NotificationBell from "./NotificationBell";
import { Crown } from "lucide-react";
import { usePlan } from "../contexts/PlanContext";
import { daysLeft } from "../../lib/billing";

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
  const { entitlements } = usePlan();
  const left = daysLeft(entitlements?.ends_at ?? null);
  const planLabel = !entitlements
    ? null
    : entitlements.source === "abonnement"
      ? entitlements.plan_name
      : entitlements.source === "essai"
        ? `Essai · ${left} j`
        : "Passer au Premium";

  return (
    <header className="border-b bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
      <div className="page-container py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <AppLogo />
            <Link
              to="/"
              state={{ home: true }}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold text-[#050FA0] hover:bg-gradient-to-r hover:from-[#050FA0] hover:to-[#1A27C2] hover:text-white transition-all border-2 border-[#050FA0]"
            >
              <Home className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Accueil</span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {planLabel && (
              <Link
                to="/abonnement"
                title="Mon abonnement"
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-full text-xs font-bold border-2 transition-colors ${
                  entitlements?.source === "gratuit"
                    ? "border-[#E4220F] text-[#E4220F] hover:bg-[#E4220F] hover:text-white"
                    : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                }`}
              >
                <Crown className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{planLabel}</span>
              </Link>
            )}
            <NotificationBell />
            <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-5 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 max-w-[140px] sm:max-w-none">
              <div
                className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br flex items-center justify-center font-bold text-white text-xs sm:text-sm shadow-lg shrink-0 ${
                  isCompany ? "from-[#E4220F] to-[#F92813]" : "from-[#050FA0] to-[#1A27C2]"
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
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-[#E4220F] transition-all border border-transparent hover:border-red-200"
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
