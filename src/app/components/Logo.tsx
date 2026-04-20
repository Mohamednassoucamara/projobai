import logoImage from "../../assets/logo.png";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className = "h-10", showText = true }: LogoProps) {
  return (
    <div className="flex items-center gap-3">
      <img src={logoImage} alt="ProJob AI" className={className} />
      {!showText && null}
    </div>
  );
}
