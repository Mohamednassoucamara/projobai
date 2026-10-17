import AppLogo, { LOGO_IMG_CLASS } from "./AppLogo";

interface LogoProps {
  className?: string;
  showText?: boolean;
  variant?: "light" | "dark";
}

export function Logo({ className = LOGO_IMG_CLASS, variant = "light" }: LogoProps) {
  return <AppLogo to="" className={className} variant={variant} />;
}
