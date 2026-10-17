import { Link } from "react-router";
import logoLight from "../../assets/projob-logo.png";
import logoDark from "../../assets/projob-logo-dark.png";

/** Taille du logo dans les en-têtes : lisible sur mobile, sans déborder. */
export const LOGO_IMG_CLASS = "brand-logo h-10 w-auto sm:h-12 object-contain object-left shrink-0";

type AppLogoProps = {
  to?: string;
  className?: string;
  /** "dark" : version pour fonds foncés (pied de page, bandeaux). */
  variant?: "light" | "dark";
};

export default function AppLogo({ to = "/", className = LOGO_IMG_CLASS, variant = "light" }: AppLogoProps) {
  const image = (
    <img
      src={variant === "dark" ? logoDark : logoLight}
      alt="ProJob AI, par Nassouba"
      className={className}
      width={900}
      height={296}
      decoding="async"
    />
  );

  if (!to) return image;

  return (
    <Link to={to} className="inline-flex shrink-0 min-w-0 rounded-lg" aria-label="ProJob AI, accueil">
      {image}
    </Link>
  );
}
