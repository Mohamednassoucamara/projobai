import { Link } from "react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight, FileText, Briefcase, MessageSquare, ChevronDown, ChevronUp, Users, Loader2, Mail, Compass,
  Smartphone, Wifi, Wallet, Sparkles, UserPlus, Send, Search, PlusCircle, Inbox, Award, CheckCircle2, Menu, X,
} from "lucide-react";
import { motion } from "motion/react";
import AppLogo from "../components/AppLogo";
import { HeroIllustration, InterviewIllustration, FeedbackIllustration, SuccessIllustration } from "../components/Illustrations";
import Footer from "../components/Footer";
import CompanyApplicationItem, { type CompanyApplicationData } from "../components/CompanyApplicationItem";
import { useAuth } from "../contexts/AuthContext";
import { companyService } from "../../services/supabase.service";
import { supabase } from "../../lib/supabase";

type CompanyApplication = CompanyApplicationData & { job_id: string };

type CompanyJob = {
  id: string;
  title: string;
  is_active: boolean;
  applications_count?: number;
  created_at?: string;
};

function CompanyPublishedOffersSection() {
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [applicationsByJob, setApplicationsByJob] = useState<Record<string, CompanyApplication[]>>({});
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadOffers = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const [jobsData, applicationsData] = await Promise.all([
          companyService.getJobs(authUser.id),
          companyService.getApplications(authUser.id),
        ]);

        const publishedJobs = (jobsData || []) as CompanyJob[];
        setJobs(publishedJobs);

        const grouped: Record<string, CompanyApplication[]> = {};
        for (const app of (applicationsData || []) as CompanyApplication[]) {
          const jobId = app.job_id;
          if (!grouped[jobId]) grouped[jobId] = [];
          grouped[jobId].push(app);
        }
        setApplicationsByJob(grouped);
      } catch {
        setJobs([]);
        setApplicationsByJob({});
      } finally {
        setIsLoading(false);
      }
    };
    loadOffers();
  }, []);

  const toggleJob = (jobId: string) => {
    setExpandedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-[#050FA0]" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 rounded-3xl bg-white border-2 border-dashed border-slate-200">
        <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600 mb-6">Vous n&apos;avez pas encore publié d&apos;offre.</p>
        <Link
          to="/company/post-job"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#E4220F] to-[#F92813] text-white px-8 py-3 rounded-full font-bold hover:shadow-lg transition-all"
        >
          Publier ma première offre
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => {
        const applications = applicationsByJob[job.id] || [];
        const count = applications.length || job.applications_count || 0;
        const isExpanded = expandedJobs.has(job.id);

        return (
          <div key={job.id} className="rounded-2xl bg-white border-2 border-slate-100 overflow-hidden shadow-sm hover:border-[#050FA0]/30 transition-all">
            <button
              type="button"
              onClick={() => toggleJob(job.id)}
              className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-[#050FA0]">{job.title}</h3>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${job.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                    {job.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {count} candidature{count > 1 ? "s" : ""}
                </p>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-6 w-6 text-[#050FA0] shrink-0 ml-4" />
              ) : (
                <ChevronDown className="h-6 w-6 text-[#050FA0] shrink-0 ml-4" />
              )}
            </button>

            {isExpanded && (
              <div className="px-6 pb-6 border-t border-slate-100">
                {applications.length === 0 ? (
                  <p className="text-slate-500 text-sm py-4">Aucune candidature pour cette offre pour le moment.</p>
                ) : (
                  <ul className="space-y-3 pt-4">
                    {applications.map((app) => (
                      <CompanyApplicationItem key={app.id} app={app} />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const SERVICES = [
  { to: "/cv-assistant", icon: FileText, title: "CV professionnel", desc: "Un CV clair aux standards des recruteurs guinéens, optimisé par l'IA et prêt en PDF.", tone: "blue" },
  { to: "/cover-letter", icon: Mail, title: "Lettre de motivation", desc: "Une lettre personnalisée pour chaque offre, assortie à votre CV.", tone: "red" },
  { to: "/interview-prep", icon: MessageSquare, title: "Coach entretien", desc: "Des questions de vrais recruteurs, une note sur 10 et des conseils après chaque réponse.", tone: "blue" },
  { to: "/orientation", icon: Compass, title: "Orientation", desc: "Trois métiers qui vous correspondent sur le marché guinéen, avec un plan d'action.", tone: "red" },
  { to: "/jobs", icon: Briefcase, title: "Offres et matching", desc: "Chaque offre affiche votre taux de compatibilité avec votre CV.", tone: "blue" },
  { to: "/profile-choice", icon: Smartphone, title: "Aussi sur WhatsApp", desc: "Les mêmes services depuis votre téléphone, sans application à installer.", tone: "red" },
] as const;

const STEPS_CANDIDATE = [
  { icon: UserPlus, title: "Créez votre compte", desc: "Gratuit, en moins d'une minute." },
  { icon: FileText, title: "Construisez votre CV", desc: "Guidé question par question, puis optimisé par l'IA." },
  { icon: MessageSquare, title: "Entraînez-vous", desc: "Simulez l'entretien et corrigez vos points faibles." },
  { icon: Send, title: "Postulez", desc: "Aux offres les plus compatibles, en un clic." },
];

const STEPS_COMPANY = [
  { icon: PlusCircle, title: "Publiez votre offre", desc: "En quelques minutes, avec les compétences attendues." },
  { icon: Inbox, title: "Recevez les candidatures", desc: "Classées par compatibilité avec votre offre." },
  { icon: Award, title: "Recrutez", desc: "Présélectionnez, invitez en entretien, le candidat est notifié." },
];

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const isCompany = isAuthenticated && user?.type === "company";
  const dashboardLink = user?.type === "company" ? "/company/dashboard" : "/dashboard";
  const [menuOpen, setMenuOpen] = useState(false);

  const primaryCta = isAuthenticated && user
    ? { to: dashboardLink, label: "Accéder à mon espace" }
    : { to: "/profile-choice", label: "Commencer gratuitement" };

  return (
    <div className="min-h-screen bg-white text-ink">
      {/* En-tête */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="page-container flex items-center justify-between gap-4 py-3">
          <AppLogo />
          <nav className="hidden md:flex items-center gap-7 text-[15px] font-semibold text-slate-600" aria-label="Navigation principale">
            <a href="#services" className="hover:text-brand">Services</a>
            <Link to="/jobs" className="hover:text-brand">Offres d&apos;emploi</Link>
            <a href="#entreprises" className="hover:text-brand">Entreprises</a>
            <Link to="/pricing" className="hover:text-brand">Tarifs</Link>
          </nav>
          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              <Link to={dashboardLink} className="flex items-center gap-2 rounded-full border border-slate-200 py-1.5 pl-1.5 pr-4 hover:border-brand transition-colors">
                <span className={`h-8 w-8 rounded-full grid place-items-center text-xs font-bold text-white ${user.type === "company" ? "bg-accent-red-strong" : "bg-brand"}`}>
                  {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </span>
                <span className="hidden sm:block text-sm font-semibold max-w-[10rem] truncate">{user.name}</span>
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:inline-flex px-4 py-2 text-sm font-bold text-brand hover:text-brand-strong">Se connecter</Link>
                <Link to="/profile-choice" className="inline-flex px-4 py-2.5 rounded-full bg-brand text-white text-sm font-bold hover:bg-brand-strong transition-colors">Créer un compte</Link>
              </>
            )}
            <button type="button" className="md:hidden h-10 w-10 grid place-items-center rounded-full border border-slate-200" aria-expanded={menuOpen} aria-label="Menu" onClick={() => setMenuOpen((o) => !o)}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="md:hidden border-t border-slate-100 bg-white" aria-label="Navigation mobile">
            <div className="page-container py-3 grid gap-1 text-base font-semibold">
              {[["#services", "Services"], ["/jobs", "Offres d'emploi"], ["#entreprises", "Entreprises"], ["/pricing", "Tarifs"], ...(!isAuthenticated ? [["/login", "Se connecter"]] : [])].map(([href, label]) =>
                href.startsWith("#")
                  ? <a key={href} href={href} onClick={() => setMenuOpen(false)} className="px-2 py-3 rounded-lg hover:bg-slate-50">{label}</a>
                  : <Link key={href} to={href} className="px-2 py-3 rounded-lg hover:bg-slate-50">{label}</Link>,
              )}
            </div>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-brand-soft/70 to-white pointer-events-none" aria-hidden="true" />
        <div className="page-container relative grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-6 items-center pt-10 sm:pt-16 pb-14 sm:pb-20">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 rounded-full bg-white border border-brand/15 px-4 py-1.5 text-sm font-semibold text-brand shadow-sm">
              <Sparkles className="h-4 w-4 text-accent-red" /> Coach carrière IA, conçu pour la Guinée
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-[3.6rem] font-bold leading-[1.08] text-ink">
              L&apos;IA qui vous prépare <span className="text-brand">à l&apos;emploi</span>
              <span className="text-accent-red">.</span>
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-slate-600 max-w-xl leading-relaxed">
              CV professionnel, lettre de motivation, entraînement aux entretiens et offres compatibles avec votre profil. En français, sur le web et sur WhatsApp.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to={primaryCta.to} className="group inline-flex items-center justify-center gap-2 rounded-full bg-accent-red-strong px-7 py-4 text-base font-bold text-white shadow-lg shadow-accent-red/25 hover:bg-[#C91D0B] transition-colors">
                {primaryCta.label}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              {isCompany ? (
                <a href="#mes-offres-publiees" className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-brand px-7 py-3.5 text-base font-bold text-brand hover:bg-brand hover:text-white transition-colors">Mes offres publiées</a>
              ) : (
                <Link to="/jobs" className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-brand px-7 py-3.5 text-base font-bold text-brand hover:bg-brand hover:text-white transition-colors">Voir les offres</Link>
              )}
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-600">
              <li className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-brand" /> Web et WhatsApp</li>
              <li className="flex items-center gap-2"><Wallet className="h-4 w-4 text-brand" /> Paiement Orange Money</li>
              <li className="flex items-center gap-2"><Wifi className="h-4 w-4 text-brand" /> Léger, pensé pour la 3G</li>
            </ul>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }} className="mx-auto w-full max-w-[560px]">
            <HeroIllustration className="w-full h-auto" title="Une candidate prépare son CV avec ProJob AI sur son téléphone" />
          </motion.div>
        </div>
      </section>

      {isCompany && (
        <section id="mes-offres-publiees" className="page-container pb-20 scroll-mt-24">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-ink">Mes offres publiées</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Consultez vos annonces et les candidatures reçues pour chaque offre.</p>
          </div>
          <CompanyPublishedOffersSection />
        </section>
      )}

      {/* Services */}
      <section id="services" className="bg-canvas py-16 sm:py-24 scroll-mt-20">
        <div className="page-container">
          <div className="max-w-2xl mb-10 sm:mb-14">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-accent-red">Pour les candidats</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-ink">Tout pour décrocher votre prochain emploi</h2>
            <p className="mt-3 text-lg text-slate-600">De la première ligne du CV jusqu&apos;à l&apos;entretien, ProJob AI vous accompagne à chaque étape.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {SERVICES.map((s) => (
              <Link key={s.title} to={s.to} className="group flex flex-col rounded-2xl bg-white border border-slate-200/80 p-6 sm:p-7 hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5 transition-all">
                <span className={`h-12 w-12 rounded-xl grid place-items-center ${s.tone === "red" ? "bg-accent-red-soft text-accent-red-strong" : "bg-brand-soft text-brand"}`}>
                  <s.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-xl font-bold text-ink">{s.title}</h3>
                <p className="mt-2 text-slate-600 leading-relaxed">{s.desc}</p>
                <span className="mt-auto pt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand">
                  Découvrir <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Préparation */}
      <section className="py-16 sm:py-24">
        <div className="page-container">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-ink">Arrivez préparé, repartez confiant</h2>
            <p className="mt-3 text-lg text-slate-600">Le coach entretien vous fait répéter avec des questions réalistes, puis vous dit précisément quoi améliorer.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { Ill: InterviewIllustration, title: "Des questions réalistes", desc: "Adaptées au poste visé et à votre CV, comme chez un vrai recruteur." },
              { Ill: FeedbackIllustration, title: "Un retour précis", desc: "Une note sur 10, vos points forts et un exemple de meilleure réponse." },
              { Ill: SuccessIllustration, title: "Des progrès visibles", desc: "Un bilan à la fin de chaque séance pour mesurer votre progression." },
            ].map(({ Ill, title, desc }) => (
              <article key={title} className="rounded-2xl overflow-hidden border border-slate-200/80 bg-white">
                <Ill className="w-full h-auto block" />
                <div className="p-6">
                  <h3 className="text-lg font-bold text-ink">{title}</h3>
                  <p className="mt-1.5 text-slate-600">{desc}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/interview-prep" className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 font-bold text-white hover:bg-brand-strong transition-colors">
              Commencer ma préparation <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Entreprises */}
      <section id="entreprises" className="bg-brand-strong text-white py-16 sm:py-24 scroll-mt-20 relative overflow-hidden">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand/60 blur-2xl" aria-hidden="true" />
        <div className="page-container relative grid lg:grid-cols-[1fr_1.3fr] gap-10 items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#FF8A7A]">Pour les entreprises</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold">Recrutez plus vite les bons profils</h2>
            <p className="mt-3 text-lg text-white/80">Publiez vos offres et recevez des candidatures classées par compatibilité. Mines, BTP, banques, ONG : trouvez des candidats préparés.</p>
            <ul className="mt-6 space-y-2.5 text-white/90">
              {["Classement automatique des candidatures", "CVthèque de candidats volontaires", "Le candidat est notifié à chaque étape"].map((t) => (
                <li key={t} className="flex items-center gap-2.5"><CheckCircle2 className="h-5 w-5 text-[#FF8A7A]" /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { to: "/company/post-job", icon: PlusCircle, title: "Publier une offre", desc: "Créez une annonce en quelques minutes", highlight: true },
              { to: "/company/dashboard", icon: Users, title: "Candidatures reçues", desc: "Suivez et triez vos candidats" },
              { to: "/company/search-profiles", icon: Search, title: "Rechercher des profils", desc: "Explorez la CVthèque" },
            ].map((c) => (
              <Link key={c.title} to={c.to} className={`group rounded-2xl p-6 transition-all ${c.highlight ? "bg-accent-red-strong hover:bg-[#C91D0B]" : "bg-white/10 hover:bg-white/15 border border-white/15"}`}>
                <c.icon className="h-7 w-7" />
                <h3 className="mt-4 text-lg font-bold">{c.title}</h3>
                <p className="mt-1 text-sm text-white/80">{c.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ça fonctionne */}
      <section className="py-16 sm:py-24">
        <div className="page-container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-ink">Comment ça fonctionne</h2>
            <p className="mt-3 text-lg text-slate-600">Quelques étapes simples, que vous soyez candidat ou recruteur.</p>
          </div>
          {[
            { label: "Candidats", steps: STEPS_CANDIDATE, accent: "brand" },
            { label: "Entreprises", steps: STEPS_COMPANY, accent: "red" },
          ].map((group) => (
            <div key={group.label} className="mb-10 last:mb-0">
              <h3 className={`mb-5 text-sm font-bold uppercase tracking-[0.14em] ${group.accent === "red" ? "text-accent-red-strong" : "text-brand"}`}>{group.label}</h3>
              <ol className={`grid gap-4 sm:grid-cols-2 ${group.steps.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
                {group.steps.map((st, i) => (
                  <li key={st.title} className="relative rounded-2xl border border-slate-200/80 bg-white p-6">
                    <div className="flex items-center gap-3">
                      <span className={`h-11 w-11 rounded-xl grid place-items-center ${group.accent === "red" ? "bg-accent-red-soft text-accent-red-strong" : "bg-brand-soft text-brand"}`}>
                        <st.icon className="h-5 w-5" />
                      </span>
                      <span className="font-display text-sm font-bold text-slate-400">Étape {i + 1}</span>
                    </div>
                    <h4 className="mt-4 text-lg font-bold text-ink">{st.title}</h4>
                    <p className="mt-1 text-slate-600">{st.desc}</p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* Appel final */}
      <section className="pb-16 sm:pb-24">
        <div className="page-container">
          <div className="rounded-3xl bg-gradient-to-br from-brand to-brand-mid px-6 py-12 sm:px-12 sm:py-14 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">Prêt à décrocher votre prochain poste ?</h2>
              <p className="mt-2 text-white/85 text-lg">Créez votre CV gratuitement et commencez à vous entraîner aujourd&apos;hui.</p>
            </div>
            <Link to={primaryCta.to} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 font-bold text-brand hover:bg-brand-soft transition-colors shrink-0">
              {primaryCta.label} <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
