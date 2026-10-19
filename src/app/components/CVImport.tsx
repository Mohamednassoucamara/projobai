import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { FileUp, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { useCVData, type CVData } from "../contexts/CVDataContext";
import { extractCVText, heuristicParse, normalizeImported, importSummary, ImportError } from "../../lib/cvImport";
import { aiService } from "../../services/ai.service";

type Phase = "idle" | "reading" | "review" | "error";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

/** Importer un CV existant (PDF ou Word) et remplir automatiquement le CV ProJob. */
export default function CVImport({
  variant = "card",
  redirectTo,
  onApplied,
}: {
  variant?: "card" | "banner";
  redirectTo?: string;
  /** Reçoit les champs modifiés (pour rafraîchir un formulaire déjà ouvert). */
  onApplied?: (patch: Partial<CVData>) => void;
}) {
  const { cvData, updateCVData } = useCVData();
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [found, setFound] = useState<Partial<CVData> | null>(null);
  const [byAi, setByAi] = useState(false);
  const [fileName, setFileName] = useState("");

  const hasExisting = Boolean(cvData.fullName || cvData.experiences.length || cvData.skills.length);

  const onFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setPhase("reading");
    setError("");
    try {
      const text = await extractCVText(file);
      let parsed: Partial<CVData>;
      try {
        parsed = normalizeImported((await aiService.parseCV(text)) as Record<string, unknown>);
        setByAi(true);
        if (!importSummary(parsed).length) throw new Error("vide");
      } catch {
        parsed = normalizeImported(heuristicParse(text) as Record<string, unknown>);
        setByAi(false);
      }
      if (!importSummary(parsed).length) throw new ImportError("Aucune information reconnue dans ce fichier. Remplissez votre CV avec l'assistant.");
      setFound(parsed);
      setPhase("review");
    } catch (e) {
      setError(e instanceof ImportError ? e.message : "Le fichier n'a pas pu être lu.");
      setPhase("error");
    } finally {
      if (input.current) input.current.value = "";
    }
  };

  const apply = (mode: "replace" | "complete") => {
    if (!found) return;
    let applied: Partial<CVData>;
    if (mode === "replace") {
      applied = {
        ...found,
        experiences: found.experiences || [],
        education: found.education || [],
        skills: found.skills || [],
        languages: found.languages || [],
      };
      updateCVData(applied);
    } else {
      const patch: Partial<CVData> = {};
      for (const k of ["fullName", "jobTitle", "phone", "email", "location", "profile"] as const) {
        if (!cvData[k] && found[k]) patch[k] = found[k];
      }
      const addNew = <T,>(cur: T[], extra: T[] | undefined, key: (x: T) => string) => {
        const seen = new Set(cur.map(key));
        return [...cur, ...(extra || []).filter((x) => !seen.has(key(x)))];
      };
      patch.experiences = addNew(cvData.experiences, found.experiences, (e) => norm(`${e.title} ${e.company}`));
      patch.education = addNew(cvData.education, found.education, (e) => norm(e.degree));
      patch.skills = addNew(cvData.skills, found.skills, norm).slice(0, 25);
      patch.languages = addNew(cvData.languages, found.languages, (l) => norm(l.name));
      updateCVData(patch);
      applied = patch;
    }
    onApplied?.(applied);
    setPhase("idle");
    setFound(null);
    if (redirectTo) navigate(redirectTo, { state: { imported: true } });
  };

  const picker = (
    <input
      ref={input}
      type="file"
      accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      className="sr-only"
      onChange={(e) => onFile(e.target.files?.[0])}
      aria-label="Choisir le fichier de votre CV"
    />
  );

  return (
    <div className={variant === "banner" ? "rounded-2xl border-2 border-dashed border-[#050FA0]/30 bg-[#050FA0]/[0.03] p-4 sm:p-5" : "bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-lg"}>
      {picker}
      {phase === "review" && found ? (
        <div>
          <p className="font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" /> CV lu : {fileName}
          </p>
          <p className="text-sm text-slate-700 mt-1">Trouvé : {importSummary(found).join(", ")}.</p>
          {found.fullName && <p className="text-sm text-slate-600 mt-1">{found.fullName}{found.jobTitle ? ` — ${found.jobTitle}` : ""}</p>}
          {!byAi && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
              Lecture simple (assistant IA indisponible) : vérifiez chaque rubrique après l&apos;import.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {hasExisting ? (
              <>
                <button type="button" onClick={() => apply("complete")} className="px-4 py-2.5 rounded-xl bg-[#050FA0] text-white text-sm font-bold hover:bg-[#060C6E]">
                  Compléter mon CV actuel
                </button>
                <button type="button" onClick={() => apply("replace")} className="px-4 py-2.5 rounded-xl border-2 border-slate-300 text-sm font-bold text-slate-700 hover:border-[#050FA0]">
                  Remplacer mon CV
                </button>
              </>
            ) : (
              <button type="button" onClick={() => apply("replace")} className="px-4 py-2.5 rounded-xl bg-[#050FA0] text-white text-sm font-bold hover:bg-[#060C6E]">
                Utiliser ces informations
              </button>
            )}
            <button type="button" onClick={() => { setPhase("idle"); setFound(null); }} className="inline-flex items-center gap-1 px-3 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900">
              <X className="h-4 w-4" /> Annuler
            </button>
          </div>
          {hasExisting && <p className="text-xs text-slate-500 mt-2">« Compléter » garde ce que vous avez déjà saisi et ajoute seulement ce qui manque.</p>}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <span className="h-12 w-12 rounded-2xl bg-[#050FA0]/10 text-[#050FA0] flex items-center justify-center shrink-0">
            {phase === "reading" ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileUp className="h-6 w-6" />}
          </span>
          <div className="flex-1">
            <p className="font-bold text-slate-900">Vous avez déjà un CV ?</p>
            <p className="text-sm text-slate-600">
              {phase === "reading" ? `Lecture de ${fileName}…` : "Importez-le (PDF ou Word) : vos informations sont reprises automatiquement, vous n'avez plus qu'à vérifier."}
            </p>
            {phase === "error" && (
              <p role="alert" className="mt-2 text-sm text-red-700 flex gap-1.5"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {error}</p>
            )}
          </div>
          <button
            type="button"
            disabled={phase === "reading"}
            onClick={() => input.current?.click()}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#050FA0] text-white text-sm font-bold hover:bg-[#060C6E] disabled:opacity-60"
          >
            <FileUp className="h-4 w-4" /> Importer mon CV
          </button>
        </div>
      )}
    </div>
  );
}
