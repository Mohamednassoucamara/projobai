import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Experience {
  title: string;
  company: string;
  period: string;
  description: string[];
}

interface Education {
  degree: string;
  institution: string;
  period: string;
}

interface CVData {
  fullName: string;
  jobTitle: string;
  phone: string;
  email: string;
  location: string;
  profile: string;
  experiences: Experience[];
  education: Education[];
  skills: string[];
  languages: { name: string; level: string; percentage: number }[];
}

interface CVDataContextType {
  cvData: CVData;
  updateCVData: (data: Partial<CVData>) => void;
  resetCVData: () => void;
}

const defaultCVData: CVData = {
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

const CVDataContext = createContext<CVDataContextType | undefined>(undefined);

export function CVDataProvider({ children }: { children: ReactNode }) {
  const [cvData, setCVData] = useState<CVData>(defaultCVData);

  // Charger les données depuis localStorage au montage
  useEffect(() => {
    const savedData = localStorage.getItem("cvData");
    if (savedData) {
      try {
        setCVData(JSON.parse(savedData));
      } catch (error) {
        console.error("Error loading CV data:", error);
      }
    }
  }, []);

  // Sauvegarder les données dans localStorage à chaque modification
  useEffect(() => {
    localStorage.setItem("cvData", JSON.stringify(cvData));
  }, [cvData]);

  const updateCVData = (data: Partial<CVData>) => {
    setCVData((prev) => ({ ...prev, ...data }));
  };

  const resetCVData = () => {
    setCVData(defaultCVData);
    localStorage.removeItem("cvData");
  };

  return (
    <CVDataContext.Provider value={{ cvData, updateCVData, resetCVData }}>
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
