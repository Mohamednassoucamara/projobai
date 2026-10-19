// Accès aux données du suivi des candidatures, des entretiens et des notifications.
// Tables et fonctions créées par la migration 011.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typedClient } from "../lib/supabase";

// Les tables de la migration 011 ne figurent pas dans les types générés : client non typé ici.
const supabase = typedClient as unknown as SupabaseClient;
import type { Interview } from "../lib/ats";

export type ApplicationEvent = {
  id: string;
  application_id: string;
  actor_id: string | null;
  kind: "status" | "comment" | "interview";
  from_status: string | null;
  to_status: string | null;
  comment: string | null;
  created_at: string;
};

export type Evaluation = {
  interview_id: string;
  company_id: string;
  scores: Record<string, number>;
  recommendation: "retenir" | "a_revoir" | "refuser" | null;
  report: string | null;
  updated_at?: string;
};

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

/** Message lisible quand la migration 011 n'a pas encore été appliquée. */
export function atsErrorMessage(err: unknown) {
  const msg = String((err as { message?: string })?.message || err || "");
  if (/application_events|interviews|interview_evaluations|company_applicant_cvs|schema cache|does not exist|notify_/i.test(msg)) {
    return "Cette fonction n'est pas encore activée : appliquez la migration 011 dans Supabase (SQL Editor).";
  }
  return "L'opération n'a pas abouti. Vérifiez votre connexion et réessayez.";
}

async function uid() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

export const atsService = {
  /** CV structuré (compétences, expériences, diplômes) des candidats ayant postulé. */
  async getApplicantCVs(): Promise<Record<string, Record<string, unknown>>> {
    const { data, error } = await supabase.rpc("company_applicant_cvs");
    if (error) throw error;
    const out: Record<string, Record<string, unknown>> = {};
    for (const row of (data || []) as { application_id: string; cv: Record<string, unknown> | null }[]) {
      if (row.cv) out[row.application_id] = row.cv;
    }
    return out;
  },

  async getApplication(id: string) {
    const { data, error } = await supabase
      .from("applications")
      .select(`*, jobs(*, job_skills(skill_name)), candidate_profiles(job_title, location, profiles(full_name, email, phone))`)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getEvents(applicationId: string): Promise<ApplicationEvent[]> {
    const { data, error } = await supabase
      .from("application_events")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []) as ApplicationEvent[];
  },

  /** Étapes de toutes les candidatures (statistiques RH). */
  async getStatusEvents(applicationIds: string[]): Promise<ApplicationEvent[]> {
    if (!applicationIds.length) return [];
    const out: ApplicationEvent[] = [];
    for (let i = 0; i < applicationIds.length; i += 150) {
      const { data, error } = await supabase
        .from("application_events")
        .select("*")
        .eq("kind", "status")
        .in("application_id", applicationIds.slice(i, i + 150));
      if (error) throw error;
      out.push(...((data || []) as ApplicationEvent[]));
    }
    return out;
  },

  async addComment(applicationId: string, comment: string): Promise<ApplicationEvent> {
    const actor = await uid();
    const { data, error } = await supabase
      .from("application_events")
      .insert({ application_id: applicationId, actor_id: actor, kind: "comment", comment })
      .select()
      .single();
    if (error) throw error;
    return data as ApplicationEvent;
  },

  async deleteComment(id: string) {
    const { error } = await supabase.from("application_events").delete().eq("id", id);
    if (error) throw error;
  },

  // ---------- Entretiens ----------

  async interviewsForApplication(applicationId: string): Promise<Interview[]> {
    const { data, error } = await supabase
      .from("interviews")
      .select("*")
      .eq("application_id", applicationId)
      .order("scheduled_at", { ascending: true });
    if (error) throw error;
    return (data || []) as Interview[];
  },

  /** Agenda de l'entreprise, avec le candidat et l'offre. */
  async companyInterviews() {
    const { data, error } = await supabase
      .from("interviews")
      .select(`*, applications(id, jobs(title), candidate_profiles(profiles(full_name, phone, email)))`)
      .order("scheduled_at", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  /** Entretiens du candidat connecté, avec l'offre et l'entreprise. */
  async candidateInterviews() {
    const { data, error } = await supabase
      .from("interviews")
      .select(`*, applications(id, jobs(id, title, company_profiles(company_name)))`)
      .order("scheduled_at", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async createInterview(input: Omit<Interview, "id" | "company_id" | "status" | "created_at">): Promise<Interview> {
    const company = await uid();
    const { data, error } = await supabase
      .from("interviews")
      .insert({ ...input, company_id: company })
      .select()
      .single();
    if (error) throw error;
    return data as Interview;
  },

  async updateInterview(id: string, patch: Partial<Interview>): Promise<Interview> {
    const { data, error } = await supabase.from("interviews").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return data as Interview;
  },

  async getEvaluation(interviewId: string): Promise<Evaluation | null> {
    const { data, error } = await supabase
      .from("interview_evaluations")
      .select("*")
      .eq("interview_id", interviewId)
      .maybeSingle();
    if (error) throw error;
    return data as Evaluation | null;
  },

  async saveEvaluation(ev: Omit<Evaluation, "company_id" | "updated_at">) {
    const company = await uid();
    const { error } = await supabase
      .from("interview_evaluations")
      .upsert({ ...ev, company_id: company, updated_at: new Date().toISOString() }, { onConflict: "interview_id" });
    if (error) throw error;
  },

  // ---------- Notifications ----------

  async notifications(): Promise<NotificationRow[]> {
    const id = await uid();
    if (!id) return [];
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, message, link, is_read, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return (data || []) as NotificationRow[];
  },

  async markRead(ids: string[]) {
    if (!ids.length) return;
    const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    if (error) throw error;
  },

  async getNotifyPrefs() {
    const id = await uid();
    if (!id) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("phone, email, notify_email, notify_whatsapp")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as { phone: string | null; email: string | null; notify_email: boolean; notify_whatsapp: boolean } | null;
  },

  async setNotifyPrefs(patch: { notify_email?: boolean; notify_whatsapp?: boolean; phone?: string }) {
    const id = await uid();
    if (!id) throw new Error("Non connecté");
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) throw error;
  },
};
