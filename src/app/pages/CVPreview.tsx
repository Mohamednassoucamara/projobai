import { useState, useRef } from "react";
import { Link } from "react-router";
import { Download, Edit, ArrowLeft, Sparkles, CheckCircle, Mail, Phone, MapPin, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";
import { useCVData } from "../contexts/CVDataContext";

export default function CVPreview() {
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { cvData } = useCVData();
  const cvRef = useRef<HTMLDivElement | null>(null);

  const displayData = {
    fullName: cvData.fullName || "Votre Nom",
    jobTitle: cvData.jobTitle || "Votre Titre Professionnel",
    phone: cvData.phone || "+224 XXX XXX XXX",
    email: cvData.email || "votre.email@example.com",
    location: cvData.location || "Conakry, Guinée",
    profile: cvData.profile || "Profil professionnel à compléter via l'assistant CV...",
    experiences: cvData.experiences.length > 0 ? cvData.experiences : [
      { title: "Poste à ajouter", company: "Entreprise", period: "Date - Date", description: ["Ajoutez vos expériences via l'assistant CV"] },
    ],
    education: cvData.education.length > 0 ? cvData.education : [
      { degree: "Diplôme", institution: "Établissement", period: "Date - Date" },
    ],
    skills: cvData.skills.length > 0 ? cvData.skills : ["Compétence 1", "Compétence 2", "Compétence 3"],
    languages: cvData.languages.length > 0 ? cvData.languages : [
      { name: "Français", level: "Courant", percentage: 90 },
      { name: "Anglais", level: "Intermédiaire", percentage: 65 },
    ],
  };

  const handleDownload = async () => {
    if (!cvRef.current || isCapturing || isGenerating) return;

    // Phase 1 : désactiver le bouton sans afficher l'overlay
    setIsCapturing(true);

    try {
      const [html2canvas, { default: jsPDF }] = await Promise.all([
        import("html2canvas").then(m => m.default),
        import("jspdf"),
      ]);

      const element = cvRef.current;
      const cvWidth = element.offsetWidth;

      // onclone : avant le rendu html2canvas, on vide le body cloné et on
      // n'y place QUE le div CV → aucun navbar / banner / sidebar /
      // bouton fixed ne peut apparaître dans le PDF.
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (_clonedDoc, clonedElement) => {
          const body = _clonedDoc.body;
          body.style.cssText = "margin:0;padding:0;background:#fff;";
          // Vider entièrement le body
          while (body.firstChild) body.removeChild(body.firstChild);
          // Ne garder que l'élément CV, sans aucun positionnement résiduel
          clonedElement.style.cssText =
            `position:static;margin:0;width:${cvWidth}px;box-shadow:none;`;
          body.appendChild(clonedElement);
        },
      });

      // Phase 2 : afficher l'overlay seulement après la capture
      setIsGenerating(true);

      const imgData = canvas.toDataURL("image/jpeg", 0.98);

      // Format A4 en mm
      const pdfWidth = 210;
      const pdfHeight = 297;

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Calculer les dimensions pour tenir sur A4
      const ratio = pdfWidth / (imgWidth / 2); // scale=2 donc divisé par 2
      const scaledHeight = (imgHeight / 2) * ratio;

      const pdf = new jsPDF({
        orientation: scaledHeight > pdfWidth ? "portrait" : "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      // Si le CV dépasse une page, on pagine
      if (scaledHeight <= pdfHeight) {
        // Centrer verticalement si le contenu est plus court que A4
        const yOffset = scaledHeight < pdfHeight ? (pdfHeight - scaledHeight) / 2 : 0;
        pdf.addImage(imgData, "JPEG", 0, yOffset, pdfWidth, scaledHeight);
      } else {
        // Découper en pages
        let yPos = 0;
        let pageCount = 0;

        while (yPos < scaledHeight) {
          if (pageCount > 0) pdf.addPage();

          // Calculer la portion de l'image à afficher sur cette page
          const sourceY = (yPos / ratio) * 2;
          const sourceH = Math.min((pdfHeight / ratio) * 2, imgHeight - sourceY);

          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = sourceH;

          const ctx = pageCanvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(canvas, 0, -sourceY);
          }

          const pageImg = pageCanvas.toDataURL("image/jpeg", 0.98);
          const pageH = Math.min(pdfHeight, scaledHeight - yPos);
          pdf.addImage(pageImg, "JPEG", 0, 0, pdfWidth, pageH);

          yPos += pdfHeight;
          pageCount++;
        }
      }

      // Métadonnées du PDF
      pdf.setProperties({
        title: `CV - ${displayData.fullName}`,
        subject: "Curriculum Vitae",
        author: displayData.fullName,
        creator: "ProJob AI",
      });

      const filename = `CV_${displayData.fullName.replace(/\s+/g, "_")}_${new Date().getFullYear()}.pdf`;
      pdf.save(filename);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      window.print();
    } finally {
      setIsCapturing(false);
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
              <img src={logoImage} alt="ProJob AI" className="h-12 w-auto" />
            </Link>
            <Link to="/cv-assistant" className="flex items-center gap-2 text-slate-600 hover:text-[#003087] transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Retour à l'assistant</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/cv-edit"
              className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-[#003087] text-[#003087] hover:bg-[#003087] hover:text-white transition-all font-bold"
            >
              <Edit className="h-4 w-4" />
              <span>Modifier</span>
            </Link>
            <button
              onClick={handleDownload}
              disabled={isCapturing || isGenerating}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white hover:shadow-xl hover:shadow-[#E31E24]/40 hover:scale-[1.02] transition-all font-bold disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isCapturing || isGenerating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /><span>Génération...</span></>
              ) : (
                <><Download className="h-4 w-4" /><span>Télécharger PDF</span></>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12 flex-1">
        {!cvData.fullName && (
          <motion.div
            data-pdf-ignore
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-gradient-to-r from-[#003087] to-[#0047b3] rounded-2xl p-6 text-white flex items-center justify-between"
          >
            <div>
              <h3 className="font-bold text-lg mb-1">Complétez votre CV</h3>
              <p className="text-white/80">Utilisez l'assistant IA ou modifiez manuellement vos informations</p>
            </div>
            <div className="flex gap-3">
              <Link to="/cv-assistant" className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors">
                Assistant IA
              </Link>
              <Link to="/cv-edit" className="px-4 py-2 bg-white text-[#003087] rounded-lg font-medium hover:bg-white/90 transition-colors">
                Modifier
              </Link>
            </div>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* CV Preview */}
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {/* Ombre extérieure simulant une feuille A4 */}
              <div className="shadow-2xl shadow-slate-400/30 rounded-2xl overflow-hidden">
                <div
                  ref={cvRef}
                  data-cv-content
                  className="bg-white overflow-hidden"
                  style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}
                >
                  {/* En-tête coloré */}
                  <div className="relative bg-gradient-to-br from-[#003087] via-[#003087] to-[#0047b3] px-10 py-10 text-white overflow-hidden">
                    {/* Décoration géométrique */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 left-1/2 w-32 h-32 bg-[#E31E24]/20 rounded-full translate-y-1/2" />
                    <div className="absolute top-4 right-16 w-16 h-16 bg-white/8 rounded-full" />

                    <div className="relative">
                      {/* Initiales en avatar */}
                      <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 text-3xl font-black mb-5 shadow-lg">
                        {displayData.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <h1 className="text-4xl font-black tracking-tight mb-1">{displayData.fullName}</h1>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="h-1 w-12 bg-[#E31E24] rounded-full" />
                        <p className="text-xl text-white/90 font-semibold">{displayData.jobTitle}</p>
                      </div>
                      <div className="flex flex-wrap gap-5 text-sm text-white/80">
                        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                          <Phone className="h-3.5 w-3.5 text-[#E31E24]" />
                          <span>{displayData.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                          <Mail className="h-3.5 w-3.5 text-[#E31E24]" />
                          <span>{displayData.email}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                          <MapPin className="h-3.5 w-3.5 text-[#E31E24]" />
                          <span>{displayData.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Corps du CV */}
                  <div className="px-10 py-8 space-y-7">

                    {/* Profil */}
                    <section>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-8 w-1.5 bg-[#E31E24] rounded-full" />
                        <h2 className="text-xl font-black text-[#003087] uppercase tracking-widest text-sm">
                          Profil Professionnel
                        </h2>
                      </div>
                      <p className="text-slate-600 leading-relaxed pl-5 border-l border-slate-100">
                        {displayData.profile}
                      </p>
                    </section>

                    <div className="grid md:grid-cols-5 gap-7">
                      {/* Colonne principale (3/5) */}
                      <div className="md:col-span-3 space-y-7">

                        {/* Expériences */}
                        <section>
                          <div className="flex items-center gap-3 mb-5">
                            <div className="h-8 w-1.5 bg-[#E31E24] rounded-full" />
                            <h2 className="text-xl font-black text-[#003087] uppercase tracking-widest text-sm">
                              Expériences
                            </h2>
                          </div>
                          <div className="space-y-5 pl-2">
                            {displayData.experiences.map((exp, i) => (
                              <div key={i} className="relative pl-6">
                                <div className="absolute left-0 top-2 h-3 w-3 rounded-full bg-[#E31E24] ring-2 ring-[#E31E24]/20" />
                                <div className="absolute left-[5px] top-5 bottom-0 w-px bg-slate-200" />
                                <div className="mb-1">
                                  <h3 className="font-bold text-slate-900 text-base">{exp.title}</h3>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[#003087] font-semibold text-sm">{exp.company}</span>
                                    <span className="text-slate-400 text-xs">•</span>
                                    <span className="text-slate-500 text-xs bg-slate-100 px-2 py-0.5 rounded-full">{exp.period}</span>
                                  </div>
                                </div>
                                <ul className="mt-2 space-y-1">
                                  {exp.description.map((d, j) => (
                                    <li key={j} className="flex gap-2 text-sm text-slate-600">
                                      <span className="text-[#E31E24] font-bold mt-0.5">›</span>
                                      <span>{d}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </section>

                        {/* Formation */}
                        <section>
                          <div className="flex items-center gap-3 mb-5">
                            <div className="h-8 w-1.5 bg-[#E31E24] rounded-full" />
                            <h2 className="text-xl font-black text-[#003087] uppercase tracking-widest text-sm">
                              Formation
                            </h2>
                          </div>
                          <div className="space-y-4 pl-2">
                            {displayData.education.map((edu, i) => (
                              <div key={i} className="relative pl-6">
                                <div className="absolute left-0 top-2 h-3 w-3 rounded-full bg-[#003087] ring-2 ring-[#003087]/20" />
                                <h3 className="font-bold text-slate-900 text-base">{edu.degree}</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[#003087] font-semibold text-sm">{edu.institution}</span>
                                  <span className="text-slate-400 text-xs">•</span>
                                  <span className="text-slate-500 text-xs bg-slate-100 px-2 py-0.5 rounded-full">{edu.period}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      </div>

                      {/* Colonne latérale (2/5) */}
                      <div className="md:col-span-2 space-y-7">

                        {/* Compétences */}
                        <section>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="h-6 w-1.5 bg-[#E31E24] rounded-full" />
                            <h2 className="font-black text-[#003087] uppercase tracking-widest text-sm">
                              Compétences
                            </h2>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {displayData.skills.map((skill, i) => (
                              <span
                                key={i}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg"
                                style={{
                                  backgroundColor: i % 2 === 0 ? "#EFF6FF" : "#FFF1F2",
                                  color: i % 2 === 0 ? "#003087" : "#E31E24",
                                  border: `1px solid ${i % 2 === 0 ? "#BFDBFE" : "#FECDD3"}`,
                                }}
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </section>

                        {/* Langues */}
                        <section>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="h-6 w-1.5 bg-[#E31E24] rounded-full" />
                            <h2 className="font-black text-[#003087] uppercase tracking-widest text-sm">
                              Langues
                            </h2>
                          </div>
                          <div className="space-y-4">
                            {displayData.languages.map((lang, i) => (
                              <div key={i}>
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className="font-semibold text-slate-800 text-sm">{lang.name}</span>
                                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{lang.level}</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${lang.percentage}%`,
                                      background: "linear-gradient(90deg, #003087, #E31E24)",
                                    }}
                                  />
                                </div>
                                <div className="text-right mt-0.5">
                                  <span className="text-xs text-slate-400">{lang.percentage}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>

                        {/* Généré par */}
                        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                          <p className="text-xs text-slate-400">Généré avec</p>
                          <p className="text-xs font-bold text-[#003087]">ProJob AI</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Conseils IA */}
          <div data-pdf-ignore className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-[#003087] to-[#0047b3] rounded-3xl p-8 text-white shadow-2xl sticky top-6"
            >
              <div className="flex items-start gap-3 mb-6">
                <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Conseils de l'IA</h3>
                  <p className="text-sm text-white/80">Pour optimiser votre CV</p>
                </div>
              </div>
              <ul className="space-y-4">
                {[
                  "Ajoutez des chiffres concrets à vos réalisations (ex: réduction de 40%)",
                  "Personnalisez votre profil selon le poste visé",
                  "Incluez des liens vers vos projets GitHub ou portfolio",
                  "Utilisez des verbes d'action (développer, optimiser, créer)",
                ].map((tip, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <div className="h-6 w-6 rounded-full bg-[#E31E24] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-white/90 text-sm">{tip}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 p-4 bg-white/10 rounded-2xl">
                <p className="text-sm text-white/80 mb-3">Le PDF généré sera :</p>
                <ul className="space-y-2 text-sm text-white/90">
                  <li className="flex items-center gap-2">
                    <span className="text-[#E31E24]">✓</span> Format A4 standard
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#E31E24]">✓</span> Haute résolution
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#E31E24]">✓</span> Couleurs fidèles
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#E31E24]">✓</span> Prêt à envoyer
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Overlay génération */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-10 text-center shadow-2xl max-w-sm mx-4"
            >
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#003087] to-[#0047b3] flex items-center justify-center mx-auto mb-6 shadow-xl">
                <Loader2 className="h-10 w-10 text-white animate-spin" />
              </div>
              <h3 className="text-2xl font-bold text-[#003087] mb-2">Génération en cours…</h3>
              <p className="text-slate-500">Votre CV PDF est en cours de création en haute qualité</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification succès */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl shadow-green-500/30 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-lg">CV téléchargé !</p>
                <p className="text-white/80 text-sm">Votre PDF a été enregistré sur votre appareil</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
