import { useState } from "react";
import { X, Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { validateUploadedFile } from "../../lib/security";

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle: string;
  companyName: string;
}

export default function ApplicationModal({
  isOpen,
  onClose,
  jobTitle,
  companyName,
}: ApplicationModalProps) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cvFile) {
      setFileError("Veuillez joindre votre CV (PDF).");
      return;
    }
    setFileError("");
    setStep("success");
    setTimeout(() => {
      onClose();
      setStep("form");
      setCvFile(null);
      setCoverLetterFile(null);
    }, 3000);
  };

  const handleCvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateUploadedFile(file);
    if (!check.valid) { setFileError(check.error); e.target.value = ""; return; }
    setFileError("");
    setCvFile(file);
  };

  const handleCoverLetterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateUploadedFile(file);
    if (!check.valid) { setFileError(check.error); e.target.value = ""; return; }
    setFileError("");
    setCoverLetterFile(file);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {step === "form" ? (
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold text-[#003087]">
                        Postuler
                      </h2>
                      <p className="text-slate-600 mt-1">
                        {jobTitle} - {companyName}
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      className="h-10 w-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                    >
                      <X className="h-5 w-5 text-slate-600" />
                    </button>
                  </div>

                  {fileError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 mb-4">
                      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      <p className="text-sm text-red-800 font-medium">{fileError}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-[#003087] mb-3">
                        Nom complet *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={100}
                        placeholder="Votre nom et prénom"
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#003087] mb-3">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        maxLength={254}
                        placeholder="votre.email@exemple.com"
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#003087] mb-3">
                        Téléphone *
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={20}
                        placeholder="+224 XXX XX XX XX"
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#003087] mb-3">
                        CV (PDF) *
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf"
                          required
                          onChange={handleCvChange}
                          className="hidden"
                          id="cv-upload"
                        />
                        <label
                          htmlFor="cv-upload"
                          className="flex items-center gap-3 w-full px-4 py-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#003087] cursor-pointer transition-all bg-slate-50 hover:bg-[#003087]/5"
                        >
                          <Upload className="h-5 w-5 text-[#003087]" />
                          <span className="text-slate-600">
                            {cvFile ? cvFile.name : "Télécharger votre CV"}
                          </span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#003087] mb-3">
                        Lettre de motivation (PDF) - Optionnel
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleCoverLetterChange}
                          className="hidden"
                          id="cover-letter-upload"
                        />
                        <label
                          htmlFor="cover-letter-upload"
                          className="flex items-center gap-3 w-full px-4 py-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#003087] cursor-pointer transition-all bg-slate-50 hover:bg-[#003087]/5"
                        >
                          <FileText className="h-5 w-5 text-[#003087]" />
                          <span className="text-slate-600">
                            {coverLetterFile
                              ? coverLetterFile.name
                              : "Télécharger votre lettre de motivation"}
                          </span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#003087] mb-3">
                        Message de motivation
                      </label>
                      <textarea
                        rows={4}
                        maxLength={1000}
                        placeholder="Expliquez pourquoi vous êtes le candidat idéal pour ce poste..."
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#003087] focus:ring-4 focus:ring-[#003087]/10 outline-none transition-all resize-none"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-6 py-4 rounded-xl border-2 border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white font-bold hover:shadow-xl hover:shadow-[#E31E24]/40 hover:scale-[1.02] transition-all"
                      >
                        Envoyer ma candidature
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 mb-6 shadow-lg"
                  >
                    <CheckCircle className="h-10 w-10 text-white" />
                  </motion.div>
                  <h3 className="text-3xl font-bold text-[#003087] mb-3">
                    Candidature envoyée !
                  </h3>
                  <p className="text-xl text-slate-600 mb-2">
                    Votre candidature a été transmise avec succès.
                  </p>
                  <p className="text-slate-500">
                    L'entreprise vous contactera si votre profil correspond.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
