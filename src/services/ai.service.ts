// Appels IA de ProJob AI, via l'Edge Function Supabase « ai-assistant ».
// Si la fonction n'est pas déployée ou si l'IA est indisponible, chaque appel
// lève AiUnavailableError : les pages utilisent alors leur version hors IA.

import { supabase } from "../lib/supabase";

export class AiUnavailableError extends Error {
  constructor(public reason: string) {
    super(reason);
    this.name = "AiUnavailableError";
  }
}

export interface CVForAi {
  fullName?: string;
  jobTitle?: string;
  location?: string;
  profile?: string;
  experiences?: { title: string; company: string; period: string; description: string[] }[];
  education?: { degree: string; institution: string; period: string }[];
  skills?: string[];
  languages?: { name: string; level: string }[];
}

let disabledUntil = 0;

async function call<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  if (Date.now() < disabledUntil) throw new AiUnavailableError("ai_not_configured");
  const { data, error } = await supabase.functions.invoke("ai-assistant", {
    body: { action, payload },
  });
  if (error) {
    let reason = "upstream_error";
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        reason = body?.error || reason;
      }
    } catch {
      /* corps illisible */
    }
    // Fonction absente ou clé non configurée : inutile de réessayer pendant 5 min.
    if (reason === "ai_not_configured" || /not found|404|Failed to send/i.test(String(error.message))) {
      disabledUntil = Date.now() + 5 * 60_000;
      reason = "ai_not_configured";
    }
    throw new AiUnavailableError(reason);
  }
  if (!data || typeof data !== "object" || !("result" in data)) {
    throw new AiUnavailableError("invalid_response");
  }
  return (data as { result: T }).result;
}

export function aiErrorMessage(e: unknown): string {
  const reason = e instanceof AiUnavailableError ? e.reason : "upstream_error";
  switch (reason) {
    case "ai_not_configured":
      return "L'assistant IA n'est pas encore activé. La version standard a été utilisée.";
    case "rate_limited":
      return "Trop de demandes à l'IA pour le moment. Réessayez dans une minute.";
    default:
      return "L'IA est momentanément indisponible. La version standard a été utilisée.";
  }
}

const cvPayload = (cv: CVForAi) => ({
  fullName: cv.fullName,
  jobTitle: cv.jobTitle,
  location: cv.location,
  profile: cv.profile,
  experiences: cv.experiences,
  education: cv.education,
  skills: cv.skills,
  languages: cv.languages?.map((l) => ({ name: l.name, level: l.level })),
});

export const aiService = {
  improveCV(cv: CVForAi) {
    return call<{
      profile?: string;
      experiences?: { description?: string[] }[];
      skills?: string[];
      tips?: string[];
    }>("improve_cv", { cv: cvPayload(cv) });
  },

  coverLetter(cv: CVForAi, form: Record<string, string>, tone: string) {
    return call<{ letter?: string }>("cover_letter", {
      cv: cvPayload(cv),
      form,
      tone,
      date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
    });
  },

  interviewQuestions(category: string, position: string, level: string, cv?: CVForAi) {
    return call<{ questions?: { question: string; tips: string; difficulty?: string }[] }>(
      "interview_questions",
      { category, position, level, cv: cv ? { jobTitle: cv.jobTitle, skills: cv.skills, profile: cv.profile } : undefined },
    );
  },

  interviewFeedback(params: { question: string; answer: string; category: string; position: string }) {
    return call<{ score?: number; strengths?: string[]; improvements?: string[]; betterAnswer?: string }>(
      "interview_feedback",
      params,
    );
  },

  interviewSummary(position: string, items: { question: string; answer: string; score: number }[]) {
    return call<{ summary?: string; advice?: string[] }>("interview_summary", { position, items });
  },

  careerOrientation(profile: Record<string, unknown>, cv?: CVForAi) {
    return call<unknown>("career_orientation", { profile, cv: cv ? cvPayload(cv) : undefined });
  },

  /** Range le texte brut d'un CV importé dans la structure ProJob. */
  parseCV(text: string) {
    return call<Partial<CVForAi> & { phone?: string; email?: string }>("parse_cv", { text: text.slice(0, 24_000) });
  },

  /** Propose une version du CV ciblée sur une offre, sans rien inventer. */
  tailorCV(cv: CVForAi, job: Record<string, unknown>) {
    return call<{ profile?: string; skills?: string[]; experiences?: { description?: string[] }[]; keywords?: string[]; advice?: string[] }>(
      "tailor_cv",
      { cv: cvPayload(cv), job },
    );
  },

  careerChat(messages: { role: "user" | "assistant"; content: string }[], context: Record<string, unknown>) {
    return call<{ reply?: string }>("career_chat", { messages, context });
  },
};
