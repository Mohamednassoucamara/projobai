import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import logoImage from "../../assets/logo.png";

type AppNavHeaderProps = {
  backTo: string;
  backLabel: string;
  logoTo?: string;
  maxWidth?: "4xl" | "5xl" | "6xl" | "7xl";
};

const maxWidthClasses = {
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
};

export default function AppNavHeader({
  backTo,
  backLabel,
  logoTo = "/",
  maxWidth = "7xl",
}: AppNavHeaderProps) {
  return (
    <header className="border-b bg-white shadow-sm sticky top-0 z-20">
      <div className={`mx-auto w-full ${maxWidthClasses[maxWidth]} px-4 sm:px-6 py-3 sm:py-4`}>
        <div className="flex items-center justify-between gap-2 min-w-0">
          <Link
            to={backTo}
            className="flex items-center gap-1.5 sm:gap-2 text-slate-600 hover:text-[#003087] transition-colors min-w-0 flex-1"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" />
            <span className="font-medium text-sm sm:text-base truncate">{backLabel}</span>
          </Link>
          <Link to={logoTo} className="shrink-0 hover:opacity-80 transition-opacity">
            <img src={logoImage} alt="ProJob AI" className="h-9 w-auto sm:h-10 md:h-12" />
          </Link>
        </div>
      </div>
    </header>
  );
}
