import { Link } from "react-router";
import logoImage from "../../assets/logo.png";

/** Classes sûres pour le logo horizontal (évite le débordement mobile). */
export const LOGO_IMG_CLASS =
  "brand-logo h-9 w-auto max-w-[9.5rem] sm:h-11 sm:max-w-[11rem] md:h-12 md:max-w-[13rem] object-contain object-left shrink-0";

type AppLogoProps = {
  to?: string;
  className?: string;
};

export default function AppLogo({ to = "/", className = LOGO_IMG_CLASS }: AppLogoProps) {
  const image = (
    <img
      src={logoImage}
      alt="ProJob AI"
      className={className}
      width={260}
      height={86}
      decoding="async"
    />
  );

  if (!to) return image;

  return (
    <Link to={to} className="inline-flex shrink-0 min-w-0">
      {image}
    </Link>
  );
}
