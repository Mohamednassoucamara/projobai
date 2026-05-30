import logoImage from "../../assets/logo.png";
import { LOGO_IMG_CLASS } from "./AppLogo";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className = LOGO_IMG_CLASS, showText = true }: LogoProps) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <img src={logoImage} alt="ProJob AI" className={className} width={260} height={86} />
      {!showText && null}
    </div>
  );
}
