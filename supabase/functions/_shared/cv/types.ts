// Structure du CV ProJob (identique à CVData côté site, sans dépendance React).
export interface Experience { title: string; company: string; period: string; description: string[] }
export interface Education { degree: string; institution: string; period: string }
export interface Language { name: string; level: string; percentage: number }
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
  theme: string;
  photo: string;
  motif: "aucun" | "points" | "lignes" | "losanges" | "vagues";
  letterTemplate: "moderne" | "classique" | "elegant";
  orientation: unknown;
}
