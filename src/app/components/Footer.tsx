import { Link } from "react-router";
import { Facebook, Linkedin, Mail } from "lucide-react";
import logoImage from "../../assets/logo.png";
import { useAuth } from "../contexts/AuthContext";

export default function Footer() {
  const { isAuthenticated } = useAuth();
  const phoneNumber = "224622775088";
  const message = "Bonjour ProJob AI, j'aimerais en savoir plus sur vos services";
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      window.location.href = "/login";
    }
  };

  return (
    <footer className="bg-[#003087] text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          <div className="md:col-span-1">
            <Link to="/" className="inline-block mb-6">
              <img src={logoImage} alt="ProJob AI" className="h-12 w-auto" />
            </Link>
            <p className="text-slate-200 leading-relaxed mb-6">
              ProJob AI est votre partenaire intelligent pour réussir votre carrière professionnelle.
              De la création de CV à la préparation d'entretien, nous vous accompagnons à chaque étape
              grâce à l'intelligence artificielle.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Liens rapides</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/cv-assistant" className="text-slate-200 hover:text-white transition-colors">
                  Créer mon CV
                </Link>
              </li>
              <li>
                <Link to="/interview-prep" className="text-slate-200 hover:text-white transition-colors">
                  Préparer mon entretien
                </Link>
              </li>
              <li>
                <Link to="/jobs" className="text-slate-200 hover:text-white transition-colors">
                  Trouver un emploi
                </Link>
              </li>
              <li>
                <Link to="/company/dashboard" className="text-slate-200 hover:text-white transition-colors">
                  Espace entreprise
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-slate-200 hover:text-white transition-colors">
                  Tarification
                </Link>
              </li>
              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleWhatsAppClick}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  <span className="font-bold">Discuter avec notre IA sur WhatsApp</span>
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Contactez-nous</h3>
            <div className="space-y-4">
              <a
                href="mailto:contact@projob.ia"
                className="flex items-center gap-3 text-slate-200 hover:text-white transition-colors group"
              >
                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-[#E31E24] transition-colors">
                  <Mail className="h-5 w-5" />
                </div>
                <span>contact@projob.ia</span>
              </a>

              <div className="pt-4">
                <p className="text-sm text-slate-300 mb-4">Suivez-nous sur les réseaux sociaux</p>
                <div className="flex gap-3">
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#E31E24] transition-all hover:scale-110"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#E31E24] transition-all hover:scale-110"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a
                    href="https://wa.me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#E31E24] transition-all hover:scale-110"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 pt-8">
          <p className="text-center text-slate-300 text-sm">
            © {new Date().getFullYear()} ProJob AI. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
