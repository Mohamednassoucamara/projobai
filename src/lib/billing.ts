// Formules Gratuit / Premium, fonctionnalités et paiement Djomy.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typedClient } from "./supabase";

const supabase = typedClient as unknown as SupabaseClient;

export type Audience = "candidate" | "company";
export type Period = "month" | "year";

export type Feature =
  | "ai_cv" | "career_coach" | "interview_coach"
  | "interviews" | "hr_stats" | "share_links" | "ats_history" | "ai_ranking"
  | "sirh" | "payroll";

export const FEATURE_LABELS: Record<Feature, string> = {
  ai_cv: "CV optimisé par l'IA",
  career_coach: "Coaching carrière",
  interview_coach: "Coach d'entretien IA",
  interviews: "Gestion des entretiens",
  hr_stats: "Statistiques RH",
  share_links: "Partage des offres avec suivi des sources",
  ats_history: "Historique et commentaires internes",
  ai_ranking: "Extraction IA des CV et classement des profils",
  sirh: "ProJob+ : gestion RH",
  payroll: "ProJob+ : paie",
};

/** Formule la moins chère qui débloque la fonctionnalité. */
export function planForFeature(feature: Feature, plans: Plan[] = DEFAULT_PLANS): Plan | undefined {
  return plans
    .filter((p) => p.price_month_gnf > 0 && p.features.includes(feature))
    .sort((a, b) => a.rank - b.rank)[0];
}

export interface Plan {
  id: string;
  audience: Audience;
  name: string;
  tagline: string | null;
  price_month_gnf: number;
  price_year_gnf: number;
  perks: string[];
  features: Feature[];
  rank: number;
}

export interface Entitlements {
  plan_id: string;
  plan_name: string;
  audience: Audience;
  source: "abonnement" | "essai" | "gratuit";
  ends_at: string | null;
  features: Feature[];
}

/** Valeurs affichées si la table plans n'est pas encore créée (migration 012). */
export const DEFAULT_PLANS: Plan[] = [
  {
    id: "candidat_gratuit", audience: "candidate", name: "Gratuit", tagline: "Pour commencer votre recherche",
    price_month_gnf: 0, price_year_gnf: 0, rank: 0, features: [],
    perks: ["Création de CV professionnel (PDF, photo, couleurs)", "Lettre de motivation", "Import de votre CV existant", "Toutes les offres d'emploi et candidatures", "Score de compatibilité avec chaque offre", "Suivi de vos candidatures et convocations"],
  },
  {
    id: "candidat_premium", audience: "candidate", name: "Premium", tagline: "Pour décrocher le poste",
    price_month_gnf: 20000, price_year_gnf: 200000, rank: 10, features: ["ai_cv", "career_coach", "interview_coach"],
    perks: ["Tout le Gratuit", "CV optimisé par l'IA", "CV adapté à chaque offre", "Coaching carrière (orientation professionnelle)", "Coach d'entretien IA avec notes et conseils"],
  },
  {
    id: "entreprise_gratuit", audience: "company", name: "Gratuit", tagline: "Pour publier vos offres",
    price_month_gnf: 0, price_year_gnf: 0, rank: 0, features: [],
    perks: ["Publication d'offres d'emploi", "Réception et suivi des candidatures", "Étapes du recrutement et notifications aux candidats", "CVthèque"],
  },
  {
    id: "entreprise_premium", audience: "company", name: "Premium", tagline: "Pour recruter mieux et plus vite",
    price_month_gnf: 50000, price_year_gnf: 500000, rank: 10, features: ["interviews", "hr_stats", "share_links", "ats_history", "ai_ranking"],
    perks: ["Tout le Gratuit", "IA : extraction des CV et classement des meilleurs profils", "Entretiens : planification, agenda, évaluation", "Statistiques RH", "Partage des offres (WhatsApp, Facebook, LinkedIn…) avec suivi des sources", "Historique et commentaires internes"],
  },
  {
    id: "entreprise_plus", audience: "company", name: "ProJob+", tagline: "Recrutement et gestion RH dans un seul outil",
    price_month_gnf: 150000, price_year_gnf: 1500000, rank: 20, features: ["interviews", "hr_stats", "share_links", "ats_history", "ai_ranking", "sirh", "payroll"],
    perks: ["Tout le Premium", "Dossiers employés et contrats", "Organigramme par service", "Congés et absences avec validation en deux niveaux", "Espace employé et demandes par WhatsApp", "Embauche en un clic depuis une candidature", "Paie : bulletins, CNSS, retenue sur salaire, états mensuels", "Jusqu'à 10 employés inclus (au-delà : nous contacter)"],
  },
];

export const gnf = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/ | /g, " ")} GNF`;

export async function fetchPlans(): Promise<Plan[]> {
  const { data, error } = await supabase.from("plans").select("*").eq("is_public", true).order("rank");
  if (error || !data?.length) return DEFAULT_PLANS;
  return data as Plan[];
}

/** null = migration 012 absente : tout reste accessible. */
export async function fetchEntitlements(): Promise<Entitlements | null> {
  const { data, error } = await supabase.rpc("my_entitlements");
  if (error || !data) return null;
  return data as Entitlements;
}

export type PaymentRow = {
  id: string; order_id: string; plan_id: string; period: Period; amount_gnf: number;
  status: string; payment_method: string | null; created_at: string; paid_at: string | null;
};

export async function fetchPayments(): Promise<PaymentRow[]> {
  const { data } = await supabase
    .from("payments")
    .select("id, order_id, plan_id, period, amount_gnf, status, payment_method, created_at, paid_at")
    .order("created_at", { ascending: false })
    .limit(20);
  return (data || []) as PaymentRow[];
}

export class PaymentError extends Error {}

const PAY_ERRORS: Record<string, string> = {
  payment_not_configured: "Le paiement en ligne n'est pas encore activé. Contactez-nous à contact@pjob.nassouba.com pour activer votre abonnement.",
  invalid_phone: "Numéro invalide. Indiquez votre numéro Orange Money ou MTN (ex. : 622 00 00 00).",
  invalid_plan: "Cette formule n'est pas disponible pour votre type de compte.",
  payment_provider_error: "Djomy n'a pas pu démarrer le paiement. Réessayez dans quelques instants.",
  not_authenticated: "Votre session a expiré : reconnectez-vous.",
};

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("djomy-payment", { body });
  if (error) {
    let code = "";
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") code = (await ctx.json())?.error || "";
    } catch { /* corps illisible */ }
    if (!code && /Failed to send|not found|404/i.test(String(error.message))) code = "payment_not_configured";
    throw new PaymentError(PAY_ERRORS[code] || "Le paiement n'a pas pu démarrer. Vérifiez votre connexion et réessayez.");
  }
  return data as T;
}

export function startCheckout(planId: string, period: Period, phone: string) {
  return invoke<{ url: string; order_id: string }>({ action: "checkout", plan_id: planId, period, phone });
}

export function checkPayment(orderId: string) {
  return invoke<{ status: string; plan_id: string; period: Period; amount_gnf: number }>({ action: "status", order_id: orderId });
}

export function daysLeft(iso: string | null) {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}
