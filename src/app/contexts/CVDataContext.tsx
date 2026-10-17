import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { supabase } from "../../lib/supabase";

export interface Experience {
  title: string;
  company: string;
  period: string;
  description: string[];
}

export interface Education {
  degree: string;
  institution: string;
  period: string;
}

export interface Language {
  name: string;
  level: string;
  percentage: number;
}

export interface CVData {
  fullName: string;
  jobTitle: string;
  phone: string;
  email: string;
  location: string;
  profile: string;
  experiences: Experience[];
  education: Education[];
  skills: string[];
  languages: Language[];
}

export type SaveStatus = "local" | "loading" | "saving" | "saved" | "error";

interface CVDataContextType {
  cvData: CVData;
  updateCVData: (data: Partial<CVData>) => void;
  resetCVData: () => void;
  /** État de la sauvegarde dans le compte (table cvs). "local" = non connecté. */
  saveStatus: SaveStatus;
  /** Le candidat accepte d'apparaître dans la CVthèque des recruteurs. */
  isSearchable: boolean;
  setSearchable: (value: boolean) => Promise<boolean>;
}

export const defaultCVData: CVData = {
  fullName: "",
  jobTitle: "",
  phone: "",
  email: "",
  location: "",
  profile: "",
  experiences: [],
  education: [],
  skills: [],
  languages: [],
};

const STORAGE_KEY = "cvData";
const CVDataContext = createContext<CVDataContextType | undefined>(undefined);

function normalize(raw: unknown): CVData {
  const d = (raw && typeof raw === "object" ? raw : {}) as Partial<CVData>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    fullName: str(d.fullName),
    jobTitle: str(d.jobTitle),
    phone: str(d.phone),
    email: str(d.email),
    location: str(d.location),
    profile: str(d.profile),
    experiences: Array.isArray(d.experiences)
      ? d.experiences.map((e) => ({
          title: str(e?.title),
          company: str(e?.company),
          period: str(e?.period),
          description: Array.isArray(e?.description) ? e.description.map(str) : [],
        }))
      : [],
    education: Array.isArray(d.education)
      ? d.education.map((e) => ({ degree: str(e?.degree), institution: str(e?.institution), period: str(e?.period) }))
      : [],
    skills: Array.isArray(d.skills) ? d.skills.map(str).filter(Boolean) : [],
    languages: Array.isArray(d.languages)
      ? d.languages.map((l) => ({
          name: str(l?.name),
          level: str(l?.level),
          percentage: typeof l?.percentage === "number" ? Math.max(0, Math.min(100, l.percentage)) : 50,
        }))
      : [],
  };
}

function isEmpty(cv: CVData) {
  return !cv.fullName && !cv.jobTitle && !cv.profile && cv.experiences.length === 0 && cv.skills.length === 0;
}

function readSession(): CVData {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? normalize(JSON.parse(saved)) : defaultCVData;
  } catch {
    return defaultCVData;
  }
}

export function CVDataProvider({ children }: { children: ReactNode }) {
  // sessionStorage : brouillon effacé à la fermeture de l'onglet (cybercafés, ordinateurs partagés).
  const [cvData, setCVData] = useState<CVData>(readSession);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("local");
  const [isSearchable, setIsSearchable] = useState(false);
  const candidateId = useRef<string | null>(null);
  const cvRowId = useRef<string | null>(null);
  const loaded = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const lastSaved = useRef<string>("");

  // Charger le CV du compte à la connexion, le vider à la déconnexion.
  useEffect(() => {
    let cancelled = false;

    const loadFor = async (userId: string, meta: Record<string, unknown> | undefined, email?: string) => {
      if (meta?.user_type && meta.user_type !== "candidate") return;
      candidateId.current = userId;
      loaded.current = false;
      setSaveStatus("loading");
      try {
        const [{ data: cvRow }, { data: cp }] = await Promise.all([
          supabase
            .from("cvs")
            .select("id, content")
            .eq("candidate_id", userId)
            .eq("is_default", true)
            .maybeSingle(),
          supabase.from("candidate_profiles").select("is_searchable").eq("id", userId).maybeSingle(),
        ]);
        if (cancelled) return;
        setIsSearchable(Boolean((cp as { is_searchable?: boolean } | null)?.is_searchable));
        if (cvRow) {
          cvRowId.current = cvRow.id;
          const remote = normalize(cvRow.content);
          lastSaved.current = JSON.stringify(remote);
          setCVData((local) => (isEmpty(remote) && !isEmpty(local) ? local : remote));
        } else {
          setCVData((local) => ({
            ...local,
            fullName: local.fullName || (meta?.full_name as string) || "",
            email: local.email || email || "",
          }));
        }
        setSaveStatus("saved");
      } catch {
        if (!cancelled) setSaveStatus("error");
      } finally {
        loaded.current = true;
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u) loadFor(u.id, u.user_metadata, u.email);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user;
      if (event === "SIGNED_OUT" || !u) {
        candidateId.current = null;
        cvRowId.current = null;
        loaded.current = false;
        lastSaved.current = "";
        setCVData(defaultCVData);
        setIsSearchable(false);
        setSaveStatus("local");
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          /* stockage indisponible */
        }
        return;
      }
      if (event === "SIGNED_IN" && u.id !== candidateId.current) {
        window.setTimeout(() => loadFor(u.id, u.user_metadata, u.email), 0);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Brouillon local + sauvegarde différée dans le compte.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cvData));
    } catch {
      /* stockage indisponible */
    }
    const userId = candidateId.current;
    if (!userId || !loaded.current) return;
    const serialized = JSON.stringify(cvData);
    if (serialized === lastSaved.current) return;

    window.clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = window.setTimeout(async () => {
      try {
        const content = JSON.parse(serialized);
        if (cvRowId.current) {
          const { error } = await supabase
            .from("cvs")
            .update({ content, title: cvData.jobTitle || "Mon CV", updated_at: new Date().toISOString() })
            .eq("id", cvRowId.current);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from("cvs")
            .insert({ candidate_id: userId, title: cvData.jobTitle || "Mon CV", content, is_default: true })
            .select("id")
            .single();
          if (error) throw error;
          cvRowId.current = data.id;
        }
        // Garder le profil candidat à jour (recherche, complétion du profil)
        await supabase
          .from("candidate_profiles")
          .update({
            job_title: cvData.jobTitle || null,
            location: cvData.location || null,
            profile_summary: cvData.profile || null,
          })
          .eq("id", userId);
        lastSaved.current = serialized;
        setSaveStatus("saved");
      } catch (e) {
        console.error("[ProJob AI] Sauvegarde du CV impossible", e);
        setSaveStatus("error");
      }
    }, 1200);
    return () => window.clearTimeout(saveTimer.current);
  }, [cvData]);

  const updateCVData = useCallback((data: Partial<CVData>) => {
    setCVData((prev) => ({ ...prev, ...data }));
  }, []);

  const resetCVData = useCallback(() => {
    setCVData(defaultCVData);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* stockage indisponible */
    }
  }, []);

  const setSearchable = useCallback(async (value: boolean) => {
    const userId = candidateId.current;
    if (!userId) return false;
    const { error } = await supabase.from("candidate_profiles").update({ is_searchable: value }).eq("id", userId);
    if (error) return false;
    setIsSearchable(value);
    return true;
  }, []);

  return (
    <CVDataContext.Provider value={{ cvData, updateCVData, resetCVData, saveStatus, isSearchable, setSearchable }}>
      {children}
    </CVDataContext.Provider>
  );
}

export function useCVData() {
  const context = useContext(CVDataContext);
  if (!context) {
    throw new Error("useCVData must be used within CVDataProvider");
  }
  return context;
}
