import { useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { Download, Edit, ArrowLeft, Sparkles, CheckCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import AppLogo from "../components/AppLogo";
import Footer from "../components/Footer";
import { useCVData } from "../contexts/CVDataContext";
import { generateCvPdf } from "../../lib/cvPdf";
import CVPhotoField from "../components/CVPhotoField";
import { safeAccent, tint, rgbToHex, initials } from "../../lib/cvTheme";
import { ColorPicker, MotifPicker } from "../components/DocumentStyle";
import { motifDataUrl } from "../../lib/motifs";

/** Unités de l'aperçu : 1 mm de la feuille A4 = largeur du conteneur / 210. */
const mm = (n: number) => `calc(${n} * 100cqw / 210)`;
const pt = (n: number) => mm(n * 0.3528);

function CVSheet() {
  const { cvData } = useCVData();
  const accentRgb = safeAccent(cvData.theme);
  const accent = rgbToHex(accentRgb);
  const accentSoft = rgbToHex(tint(accentRgb, 0.86));
  const sideMuted = rgbToHex(tint(accentRgb, 0.72));
  const sideRule = rgbToHex(tint(accentRgb, 0.4));
  const barTrack = rgbToHex(tint(accentRgb, 0.28));
  const ini = initials(cvData.fullName);
  const exps = cvData.experiences.filter((e) => e.title.trim() || e.company.trim());
  const edus = cvData.education.filter((e) => e.degree.trim() || e.institution.trim());
  const langs = cvData.languages.filter((l) => l.name.trim());

  const sideHeading: CSSProperties = {
    fontSize: pt(8.5), fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
    borderBottom: `${mm(0.35)} solid ${sideRule}`, paddingBottom: mm(1.6), marginBottom: mm(3.2),
  };
  const mainHeading: CSSProperties = {
    display: "flex", alignItems: "center", gap: mm(3), color: accent, fontSize: pt(10.5),
    fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: mm(3),
  };
  const Rule = () => <span style={{ flex: 1, height: mm(0.3), background: "#DEE3EB" }} />;
  const Placeholder = ({ children }: { children: string }) => (
    <p style={{ fontSize: pt(9.4), color: "#9AA3B2", fontStyle: "italic" }}>{children}</p>
  );

  return (
    <div style={{ containerType: "inline-size" }} className="w-full">
      <div
        className="bg-white shadow-2xl shadow-slate-300/60 rounded-sm overflow-hidden"
        style={{ display: "grid", gridTemplateColumns: `${mm(68)} 1fr`, minHeight: mm(297), fontFamily: "Helvetica, Arial, sans-serif", color: "#1B2333", lineHeight: 1.38 }}
      >
        {/* Colonne latérale */}
        <aside style={{ backgroundColor: accent, backgroundImage: motifDataUrl(cvData.motif, 68, 62, rgbToHex(tint(accentRgb, 0.16))), backgroundRepeat: "no-repeat", backgroundSize: `100% ${mm(62)}`, color: "#fff", padding: `${mm(20)} ${mm(9)}` }}>
          {cvData.photo ? (
            <img
              src={cvData.photo}
              alt=""
              style={{ width: mm(34), height: mm(34), borderRadius: "50%", objectFit: "cover", display: "block", margin: `0 auto ${mm(9)}`, border: `${mm(1)} solid #fff` }}
            />
          ) : ini ? (
            <div style={{ width: mm(30), height: mm(30), borderRadius: "50%", margin: `0 auto ${mm(10)}`, display: "grid", placeItems: "center", background: rgbToHex(tint(accentRgb, 0.18)), border: `${mm(0.6)} solid ${rgbToHex(tint(accentRgb, 0.45))}`, fontSize: pt(20), fontWeight: 700 }}>
              {ini}
            </div>
          ) : null}
          {(cvData.phone || cvData.email || cvData.location) && (
            <section style={{ marginBottom: mm(7) }}>
              <h3 style={sideHeading}>Contact</h3>
              {[["Téléphone", cvData.phone], ["E-mail", cvData.email], ["Ville", cvData.location]].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} style={{ marginBottom: mm(2.6) }}>
                  <div style={{ fontSize: pt(7.2), color: sideMuted }}>{k}</div>
                  <div style={{ fontSize: k === "E-mail" ? pt(7.6) : pt(9), overflowWrap: "anywhere" }}>{v}</div>
                </div>
              ))}
            </section>
          )}
          {cvData.skills.length > 0 && (
            <section style={{ marginBottom: mm(7) }}>
              <h3 style={sideHeading}>Compétences</h3>
              {cvData.skills.slice(0, 16).map((s, i) => (
                <div key={i} style={{ display: "flex", gap: mm(2.4), alignItems: "baseline", fontSize: pt(9), marginBottom: mm(1.6) }}>
                  <span style={{ width: mm(1.6), height: mm(1.6), background: rgbToHex(tint(accentRgb, 0.55)), flexShrink: 0, transform: `translateY(${mm(-0.3)})` }} />
                  <span>{s}</span>
                </div>
              ))}
            </section>
          )}
          {langs.length > 0 && (
            <section>
              <h3 style={sideHeading}>Langues</h3>
              {langs.slice(0, 7).map((l, i) => (
                <div key={i} style={{ marginBottom: mm(4) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: mm(2) }}>
                    <span style={{ fontSize: pt(9), fontWeight: 700 }}>{l.name}</span>
                    <span style={{ fontSize: pt(7.5), color: sideMuted }}>{l.level}</span>
                  </div>
                  <div style={{ height: mm(1.6), background: barTrack, borderRadius: mm(1), marginTop: mm(1) }}>
                    <div style={{ height: "100%", width: `${Math.max(8, Math.min(100, l.percentage || 50))}%`, background: "#fff", borderRadius: mm(1) }} />
                  </div>
                </div>
              ))}
            </section>
          )}
        </aside>

        {/* Colonne principale */}
        <main style={{ padding: `${mm(17)} ${mm(13)} ${mm(16)} ${mm(11)}`, minWidth: 0 }}>
          <h2 style={{ fontSize: pt(24), fontWeight: 700, lineHeight: 1.12, overflowWrap: "anywhere" }}>
            {cvData.fullName || <span style={{ color: "#9AA3B2" }}>Votre nom</span>}
          </h2>
          <p style={{ fontSize: pt(12.5), color: accent, marginTop: mm(1) }}>{cvData.jobTitle || "Poste visé"}</p>
          <div style={{ width: mm(16), height: mm(1.1), background: accent, margin: `${mm(3)} 0 ${mm(8)}` }} />

          <section style={{ marginBottom: mm(6) }}>
            <h3 style={mainHeading}>Profil<Rule /></h3>
            {cvData.profile ? <p style={{ fontSize: pt(9.8) }}>{cvData.profile}</p> : <Placeholder>Ajoutez un résumé de 3 à 4 phrases.</Placeholder>}
          </section>

          <section style={{ marginBottom: mm(5) }}>
            <h3 style={mainHeading}>Expérience professionnelle<Rule /></h3>
            {exps.length === 0 && <Placeholder>Ajoutez vos emplois, stages ou bénévolat.</Placeholder>}
            {exps.map((e, i) => (
              <div key={i} style={{ marginBottom: mm(4.5) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: mm(3) }}>
                  <strong style={{ fontSize: pt(10.8) }}>{e.title}</strong>
                  {e.period && <span style={{ fontSize: pt(8.8), color: accent, background: accentSoft, padding: `${mm(0.4)} ${mm(1.8)}`, borderRadius: mm(1.2), whiteSpace: "nowrap" }}>{e.period}</span>}
                </div>
                {e.company && <div style={{ fontSize: pt(9.3), fontStyle: "italic", color: "#606A7A" }}>{e.company}</div>}
                {e.description.filter((d) => d.trim()).length > 0 && (
                  <ul style={{ marginTop: mm(1), paddingLeft: mm(4.5), listStyle: "none" }}>
                    {e.description.filter((d) => d.trim()).map((d, k) => (
                      <li key={k} style={{ fontSize: pt(9.6), position: "relative" }}>
                        <span style={{ position: "absolute", left: mm(-3.9), top: "0.55em", width: mm(1.3), height: mm(1.3), borderRadius: "50%", background: accent }} />
                        {d}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>

          <section>
            <h3 style={mainHeading}>Formation<Rule /></h3>
            {edus.length === 0 && <Placeholder>Ajoutez vos diplômes.</Placeholder>}
            {edus.map((e, i) => (
              <div key={i} style={{ marginBottom: mm(4) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: mm(3) }}>
                  <strong style={{ fontSize: pt(10.8) }}>{e.degree}</strong>
                  {e.period && <span style={{ fontSize: pt(8.8), color: accent, background: accentSoft, padding: `${mm(0.4)} ${mm(1.8)}`, borderRadius: mm(1.2), whiteSpace: "nowrap" }}>{e.period}</span>}
                </div>
                {e.institution && <div style={{ fontSize: pt(9.3), fontStyle: "italic", color: "#606A7A" }}>{e.institution}</div>}
              </div>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}

export default function CVPreview() {
  const [showSuccess, setShowSuccess] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { cvData } = useCVData();

  const missing = [
    !cvData.fullName && "votre nom",
    !cvData.jobTitle && "le poste visé",
    !(cvData.phone || cvData.email) && "un téléphone ou un e-mail",
  ].filter(Boolean) as string[];

  const handleDownload = async () => {
    if (isGenerating) return;
    if (missing.length) {
      setError(`Ajoutez ${missing.join(", ")} avant de télécharger votre CV.`);
      return;
    }
    setError(null);
    setIsGenerating(true);
    try {
      await generateCvPdf(cvData);
      setShowSuccess(true);
      window.setTimeout(() => setShowSuccess(false), 4000);
    } catch (e) {
      console.error("Erreur génération PDF:", e);
      setError("Le PDF n'a pas pu être créé. Réessayez ; si le problème continue, rechargez la page.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      <header className="border-b bg-white shadow-sm sticky top-0 z-20">
        <div className="page-container py-3 sm:py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 min-w-0">
              <AppLogo />
              <Link to="/dashboard" className="flex items-center gap-2 text-slate-600 hover:text-[#003087] transition-colors min-w-0">
                <ArrowLeft className="h-5 w-5 shrink-0" />
                <span className="font-medium text-sm sm:text-base truncate">Retour au tableau de bord</span>
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <Link
                to="/cv-edit"
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-[#003087] text-[#003087] hover:bg-[#003087] hover:text-white transition-all font-bold"
              >
                <Edit className="h-4 w-4" />
                <span>Modifier</span>
              </Link>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isGenerating}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white hover:shadow-xl hover:shadow-[#E31E24]/40 sm:hover:scale-[1.02] transition-all font-bold disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Création du PDF…</span></> : <><Download className="h-4 w-4" /><span>Télécharger en PDF</span></>}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="page-container py-8 sm:py-12 flex-1">
        {error && (
          <div role="alert" className="mb-6 rounded-2xl border-2 border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span>{error}</span>
            {missing.length > 0 && <Link to="/cv-edit" className="font-bold text-[#003087] hover:underline shrink-0">Compléter mon CV</Link>}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 min-w-0">
            <div className="lg:hidden mb-6 space-y-4">
              <div className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-lg"><CVPhotoField compact /></div>
              <ColorPicker />
              <MotifPicker />
            </div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <CVSheet />
            </motion.div>
          </div>

          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-28">
            <div className="hidden lg:block bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-lg"><CVPhotoField compact /></div>
            <div className="hidden lg:block"><ColorPicker /></div>
            <div className="hidden lg:block"><MotifPicker /></div>

            <div className="bg-gradient-to-br from-[#003087] to-[#0047b3] rounded-3xl p-6 sm:p-8 text-white shadow-2xl">
              <div className="flex items-start gap-3 mb-5">
                <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Conseils pour un CV qui convainc</h3>
                  <p className="text-sm text-white/80">Ce que les recruteurs regardent en premier</p>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  "Chiffrez vos résultats : nombre de postes, délais, pourcentages.",
                  "Commencez chaque mission par un verbe d'action : géré, installé, formé.",
                  "Adaptez le poste visé et le profil à chaque offre.",
                  "Restez sur une page si vous avez moins de 5 ans d'expérience.",
                ].map((tip, i) => (
                  <li key={i} className="flex gap-3 items-start text-sm text-white/90">
                    <CheckCircle className="h-5 w-5 text-white/90 shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
              <Link to="/cv-edit" className="mt-6 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white text-[#003087] font-bold hover:bg-white/90 transition-colors">
                <Sparkles className="h-4 w-4" /> Optimiser avec l&apos;IA
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
            role="status"
          >
            <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
              <CheckCircle className="h-7 w-7 shrink-0" />
              <div>
                <p className="font-bold">CV téléchargé</p>
                <p className="text-white/85 text-sm">Le PDF est dans vos téléchargements.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
