// Edge Function « bot-api » : l'API que le bot Botpress (WhatsApp) appelle pour agir
// sur ProJob AI comme le site : relier un numéro à un compte, chercher les vraies offres,
// enregistrer le CV, envoyer le CV en PDF, postuler et suivre ses candidatures.
//
// Sécurité : chaque appel doit porter l'en-tête  x-bot-secret: <BOT_API_SECRET>.
// Le numéro WhatsApp est fourni par Botpress (il est vérifié par WhatsApp) ; un numéro n'est
// relié à un compte qu'après un code envoyé par e-mail au titulaire du compte.
//
// Secrets : BOT_API_SECRET (obligatoire), RESEND_API_KEY + NOTIFY_FROM (codes par e-mail), SITE_URL.
// Déploiement : supabase functions deploy bot-api --no-verify-jwt

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { buildCvPdf } from "../_shared/cv/cvPdf.ts";
import type { CVData } from "../_shared/cv/types.ts";
import { matchJob, hasMatchableCV } from "../_shared/matching.ts";

const SITE = (Deno.env.get("SITE_URL") || "https://projobai.com").replace(/\/$/, "");
const FROM = Deno.env.get("NOTIFY_FROM") || "ProJob AI <notifications@projobai.com>";
const CODE_TTL_MIN = 15;

const STATUS_FR: Record<string, string> = {
  pending: "Reçue", reviewed: "Consultée", shortlisted: "Présélectionnée",
  interview: "Entretien", accepted: "Retenue", rejected: "Non retenue",
};

type Body = Record<string, unknown> & { action?: string; phone?: string };
class BotError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

function safeEqual(a: string, b: string) {
  if (!a || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Numéro au format international sans « + » (Guinée par défaut). */
export function normPhone(raw: unknown) {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9 && d.startsWith("6")) d = "224" + d;
  return d.length >= 8 && d.length <= 15 ? d : "";
}

async function sha256(s: string) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return Array.from(h, (b) => b.toString(16).padStart(2, "0")).join("");
}

const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const arr = (v: unknown) => (Array.isArray(v) ? v : []);

const EMPTY_CV: CVData = {
  fullName: "", jobTitle: "", phone: "", email: "", location: "", profile: "",
  experiences: [], education: [], skills: [], languages: [],
  theme: "#1F3A5F", photo: "", motif: "aucun", letterTemplate: "moderne", orientation: null,
};

function normalizeCv(raw: unknown): CVData {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return { ...EMPTY_CV, ...o } as CVData;
}

function cvMissing(cv: CVData) {
  const m: string[] = [];
  if (!cv.fullName) m.push("nom complet");
  if (!cv.jobTitle) m.push("poste recherché");
  if (!cv.phone && !cv.email) m.push("téléphone ou e-mail");
  if (!cv.experiences.length && !cv.education.length) m.push("au moins une expérience ou une formation");
  if (!cv.skills.length) m.push("compétences");
  return m;
}

const LEVELS: Record<string, number> = { "langue maternelle": 100, courant: 85, "intermédiaire": 60, intermediaire: 60, notions: 35 };

/** Fusionne ce que le bot a recueilli dans le CV existant (les listes fournies remplacent les anciennes). */
function mergeCv(cur: CVData, patch: Record<string, unknown>): CVData {
  const next: CVData = { ...cur };
  for (const k of ["fullName", "jobTitle", "phone", "email", "location", "profile"] as const) {
    const v = str(patch[k], k === "profile" ? 1500 : 150);
    if (v) next[k] = v;
  }
  if (Array.isArray(patch.experiences)) {
    next.experiences = arr(patch.experiences).slice(0, 10).map((e) => {
      const x = (e || {}) as Record<string, unknown>;
      const d = Array.isArray(x.description) ? x.description : String(x.description || "").split(/\n|;/);
      return { title: str(x.title, 120), company: str(x.company, 120), period: str(x.period, 60), description: d.map((t) => str(t, 300)).filter(Boolean).slice(0, 5) };
    }).filter((e) => e.title || e.company);
  }
  if (Array.isArray(patch.education)) {
    next.education = arr(patch.education).slice(0, 8).map((e) => {
      const x = (e || {}) as Record<string, unknown>;
      return { degree: str(x.degree, 150), institution: str(x.institution, 150), period: str(x.period, 60) };
    }).filter((e) => e.degree || e.institution);
  }
  if (Array.isArray(patch.skills)) {
    next.skills = [...new Set(arr(patch.skills).map((s) => str(s, 60)).filter(Boolean))].slice(0, 20);
  }
  if (Array.isArray(patch.languages)) {
    next.languages = arr(patch.languages).slice(0, 8).map((l) => {
      const x = (typeof l === "string" ? { name: l } : l || {}) as Record<string, unknown>;
      const level = str(x.level, 40) || "Intermédiaire";
      return { name: str(x.name, 40), level, percentage: LEVELS[level.toLowerCase()] ?? 60 };
    }).filter((l) => l.name);
  }
  return next;
}

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new BotError("email_not_configured", "L'envoi d'e-mails n'est pas configuré.", 503);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text, reply_to: "contact@pjob.nassouba.com" }),
  });
  if (!res.ok) throw new BotError("email_failed", "L'e-mail n'a pas pu être envoyé. Vérifiez l'adresse.", 502);
}

const emailBox = (title: string, body: string) => `<!doctype html><html lang="fr"><body style="margin:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#050FA0;padding:16px 26px;color:#ffffff;font-size:20px;font-weight:bold"><a href="${SITE}" style="text-decoration:none;color:#ffffff"><img src="${SITE}/email/projob-logo.png" width="180" height="55" alt="ProJob AI" style="display:block;border:0;outline:none;width:180px;height:55px;color:#ffffff;font-size:20px;font-weight:bold"></a></td></tr>
<tr><td style="padding:26px"><h1 style="margin:0 0 12px;font-size:20px;color:#050FA0">${title}</h1>${body}</td></tr>
<tr><td style="padding:14px 26px;background:#f8fafc;color:#64748b;font-size:12px">Nassouba Technologie · Conakry · contact@pjob.nassouba.com</td></tr>
</table></td></tr></table></body></html>`;

// ---------------------------------------------------------------------------

async function linkedUser(db: SupabaseClient, phone: string) {
  if (!phone) return null;
  const { data: link } = await db.from("bot_links").select("user_id").eq("phone", phone).maybeSingle();
  if (!link) return null;
  const { data: profile } = await db.from("profiles").select("id, user_type, full_name, email, phone").eq("id", link.user_id).maybeSingle();
  if (!profile) return null;
  db.from("bot_links").update({ last_seen_at: new Date().toISOString() }).eq("phone", phone).then(() => undefined);
  return profile as { id: string; user_type: "candidate" | "company"; full_name: string; email: string; phone: string | null };
}

async function requireCandidate(db: SupabaseClient, phone: string) {
  const u = await linkedUser(db, phone);
  if (!u) throw new BotError("not_linked", "Ce numéro n'est pas encore relié à un compte ProJob. Demandez son e-mail pour le relier (link_start).", 401);
  if (u.user_type !== "candidate") throw new BotError("not_candidate", "Ce compte est un compte entreprise : cette action est réservée aux candidats.", 403);
  return u;
}

async function loadCv(db: SupabaseClient, userId: string) {
  const { data } = await db.from("cvs").select("id, content").eq("candidate_id", userId).eq("is_default", true).maybeSingle();
  return { id: data?.id as string | undefined, cv: normalizeCv(data?.content) };
}

async function makePdf(db: SupabaseClient, userId: string, cv: CVData, bucket: "cvs" | "application-documents", path: string) {
  const pdf = await buildCvPdf(cv);
  const bytes = new Uint8Array(pdf.output("arraybuffer"));
  const { error } = await db.storage.from(bucket).upload(path, bytes, { contentType: "application/pdf", upsert: true });
  if (error) throw new BotError("storage_error", "Le PDF n'a pas pu être enregistré.", 500);
  return path;
}

async function plan(db: SupabaseClient, userId: string) {
  const { data } = await db.rpc("user_plan", { p_user: userId });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  const { data: p } = await db.from("plans").select("name, features").eq("id", row.plan_id).maybeSingle();
  return { plan_id: row.plan_id, name: p?.name ?? row.plan_id, source: row.source, ends_at: row.ends_at, premium_features: p?.features ?? [] };
}

// ---------------------------------------------------------------------------

const handlers: Record<string, (db: SupabaseClient, b: Body, phone: string) => Promise<unknown>> = {
  /** Qui écrit ? Compte relié, formule, CV complet ou non. */
  async status(db, _b, phone) {
    const u = await linkedUser(db, phone);
    if (!u) return { linked: false, next_step: "Proposer de relier son compte ProJob (ou d'en créer un) avec son adresse e-mail." };
    const out: Record<string, unknown> = { linked: true, name: u.full_name, account_type: u.user_type === "company" ? "entreprise" : "candidat", plan: await plan(db, u.id).catch(() => null) };
    if (u.user_type === "candidate") {
      const { cv } = await loadCv(db, u.id);
      out.cv_missing = cvMissing({ ...cv, fullName: cv.fullName || u.full_name, email: cv.email || u.email });
      const { count } = await db.from("applications").select("id", { count: "exact", head: true }).eq("candidate_id", u.id);
      out.applications_count = count ?? 0;
    }
    return out;
  },

  /** Étape 1 : envoyer un code à l'e-mail (compte existant, ou création d'un compte candidat). */
  async link_start(db, b, phone) {
    if (!phone) throw new BotError("no_phone", "Numéro WhatsApp manquant.");
    const email = str(b.email, 200).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new BotError("invalid_email", "Adresse e-mail invalide.");
    const { data: profile } = await db.from("profiles").select("id, full_name").ilike("email", email.replace(/[%_\\]/g, "\\$&")).maybeSingle();
    const fullName = str(b.full_name, 120);
    if (!profile && fullName.split(/\s+/).length < 2) {
      throw new BotError("need_full_name", "Aucun compte avec cet e-mail : demandez le prénom et le nom pour créer un compte candidat.");
    }
    const { data: prev } = await db.from("bot_codes").select("created_at").eq("phone", phone).maybeSingle();
    if (prev && Date.now() - new Date(prev.created_at).getTime() < 60_000) throw new BotError("wait", "Un code vient d'être envoyé. Patientez une minute avant d'en demander un autre.", 429);

    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
    await db.from("bot_codes").upsert({
      phone, email, full_name: fullName || null, code_hash: await sha256(`${phone}:${code}`), attempts: 0,
      expires_at: new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString(), created_at: new Date().toISOString(),
    });
    await sendEmail(email, `Votre code ProJob AI : ${code}`,
      emailBox("Votre code de vérification", `<p style="font-size:15px;line-height:1.6">Pour relier votre WhatsApp à votre compte ProJob AI, envoyez ce code au bot :</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#E4220F;margin:18px 0">${code}</p><p style="font-size:13px;color:#64748b">Valable ${CODE_TTL_MIN} minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>`),
      `Votre code ProJob AI : ${code} (valable ${CODE_TTL_MIN} minutes).`);
    return { sent: true, new_account: !profile, message: `Code envoyé à ${email.replace(/^(.).*(@.*)$/, "$1•••$2")}. Demander à l'utilisateur de recopier le code à 6 chiffres.` };
  },

  /** Étape 2 : vérifier le code ; relier le numéro (et créer le compte si besoin). */
  async link_verify(db, b, phone) {
    const code = String(b.code ?? "").replace(/\D/g, "");
    const { data: row } = await db.from("bot_codes").select("*").eq("phone", phone).maybeSingle();
    if (!row) throw new BotError("no_code", "Aucun code en attente : recommencez avec link_start.");
    if (new Date(row.expires_at).getTime() < Date.now()) throw new BotError("expired", "Code expiré : demandez un nouveau code.");
    if (row.attempts >= 5) throw new BotError("too_many_attempts", "Trop d'essais : demandez un nouveau code.", 429);
    if (!safeEqual(await sha256(`${phone}:${code}`), row.code_hash)) {
      await db.from("bot_codes").update({ attempts: row.attempts + 1 }).eq("phone", phone);
      throw new BotError("wrong_code", "Code incorrect.");
    }

    let { data: profile } = await db.from("profiles").select("id, user_type, full_name").ilike("email", row.email.replace(/[%_\\]/g, "\\$&")).maybeSingle();
    let created = false;
    if (!profile) {
      const password = crypto.randomUUID() + "Aa1!";
      const { data: au, error } = await db.auth.admin.createUser({
        email: row.email, password, email_confirm: true,
        user_metadata: { full_name: row.full_name, user_type: "candidate" },
      });
      if (error || !au.user) throw new BotError("signup_failed", "Le compte n'a pas pu être créé : " + (error?.message || "erreur inconnue"), 500);
      await db.from("profiles").insert({ id: au.user.id, user_type: "candidate", full_name: row.full_name, email: row.email, phone: "+" + phone });
      await db.from("candidate_profiles").insert({ id: au.user.id });
      profile = { id: au.user.id, user_type: "candidate", full_name: row.full_name };
      created = true;
      // Lien pour choisir un mot de passe et se connecter au site
      const { data: link } = await db.auth.admin.generateLink({ type: "recovery", email: row.email, options: { redirectTo: `${SITE}/login` } });
      const url = link?.properties?.action_link;
      if (url) {
        await sendEmail(row.email, "Bienvenue sur ProJob AI",
          emailBox(`Bienvenue ${row.full_name?.split(" ")[0] || ""} !`, `<p style="font-size:15px;line-height:1.6">Votre compte ProJob AI a été créé depuis WhatsApp. Pour vous connecter aussi sur le site, choisissez votre mot de passe :</p><p style="margin:22px 0"><a href="${url}" style="background:#E4220F;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px">Choisir mon mot de passe</a></p>`),
          `Votre compte ProJob AI a été créé. Choisissez votre mot de passe : ${url}`).catch(() => undefined);
      }
    }
    await db.from("bot_links").upsert({ phone, user_id: profile.id, last_seen_at: new Date().toISOString() });
    await db.from("bot_codes").delete().eq("phone", phone);
    return { linked: true, account_created: created, name: profile.full_name, account_type: profile.user_type === "company" ? "entreprise" : "candidat" };
  },

  async unlink(db, _b, phone) {
    await db.from("bot_links").delete().eq("phone", phone);
    return { unlinked: true };
  },

  /** Offres ProJob en ligne, classées selon le CV si le compte est relié. */
  async search_jobs(db, b, phone) {
    const q = str(b.query, 80).replace(/[%,()]/g, " ");
    const loc = str(b.location, 60).replace(/[%,()]/g, " ");
    let req = db.from("jobs")
      .select("id, title, location, job_type, experience_level, education_level, salary_min, salary_max, description, requirements, published_at, company_profiles(company_name), job_skills(skill_name)")
      .eq("is_active", true).order("published_at", { ascending: false }).limit(60);
    if (q) req = req.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    if (loc) req = req.ilike("location", `%${loc}%`);
    const { data, error } = await req;
    if (error) throw new BotError("db_error", error.message, 500);

    const u = await linkedUser(db, phone);
    const cv = u?.user_type === "candidate" ? (await loadCv(db, u.id)).cv : null;
    const canScore = cv && hasMatchableCV(cv);
    const list = (data || []).map((j: Record<string, any>) => ({ j, m: canScore ? matchJob(j, cv!) : null }));
    if (canScore) list.sort((a, b2) => (b2.m!.score - a.m!.score));
    const max = Math.min(Number(b.limit) || 5, 8);
    return {
      total: list.length,
      jobs: list.slice(0, max).map(({ j, m }) => ({
        job_id: j.id,
        title: j.title,
        company: j.company_profiles?.company_name || "Entreprise",
        location: j.location,
        contract: j.job_type,
        salary: j.salary_min || j.salary_max ? `${j.salary_min ? Number(j.salary_min).toLocaleString("fr-FR") : "?"} – ${j.salary_max ? Number(j.salary_max).toLocaleString("fr-FR") : "?"} GNF` : null,
        match_percent: m?.score ?? null,
        missing_skills: m?.missing?.slice(0, 4) ?? [],
        url: `${SITE}/jobs/${j.id}?source=whatsapp`,
      })),
      hint: canScore ? "Offres classées selon le CV de l'utilisateur." : "Relier le compte et compléter le CV permet de classer les offres selon le profil.",
    };
  },

  async job(db, b) {
    const { data: j } = await db.from("jobs")
      .select("id, title, location, job_type, experience_level, education_level, salary_min, salary_max, description, requirements, responsibilities, expires_at, is_active, company_profiles(company_name, sector), job_skills(skill_name)")
      .eq("id", str(b.job_id, 40)).maybeSingle();
    if (!j || !j.is_active) throw new BotError("job_not_found", "Offre introuvable ou clôturée.", 404);
    return {
      job_id: j.id, title: j.title, company: (j as any).company_profiles?.company_name, sector: (j as any).company_profiles?.sector,
      location: j.location, contract: j.job_type, experience: j.experience_level, education: j.education_level,
      skills: ((j as any).job_skills || []).map((s: { skill_name: string }) => s.skill_name),
      description: String(j.description || "").slice(0, 1500), deadline: j.expires_at, url: `${SITE}/jobs/${j.id}?source=whatsapp`,
    };
  },

  async get_cv(db, _b, phone) {
    const u = await requireCandidate(db, phone);
    const { cv } = await loadCv(db, u.id);
    const { photo: _p, orientation: _o, letterTemplate: _l, ...rest } = cv;
    return { cv: rest, missing: cvMissing(cv) };
  },

  /** Enregistre dans le compte ce que le bot a recueilli (visible aussi sur le site). */
  async save_cv(db, b, phone) {
    const u = await requireCandidate(db, phone);
    const { id, cv } = await loadCv(db, u.id);
    const next = mergeCv(cv, (b.cv || {}) as Record<string, unknown>);
    if (!next.phone) next.phone = "+" + phone;
    if (!next.email) next.email = u.email;
    if (!next.fullName) next.fullName = u.full_name;
    if (id) {
      await db.from("cvs").update({ content: next, title: next.jobTitle || "Mon CV", updated_at: new Date().toISOString() }).eq("id", id);
    } else {
      await db.from("cvs").insert({ candidate_id: u.id, title: next.jobTitle || "Mon CV", content: next, is_default: true });
    }
    return { saved: true, missing: cvMissing(next) };
  },

  /** Génère le CV en PDF (même modèle que le site) et renvoie un lien valable 7 jours. */
  async cv_pdf(db, _b, phone) {
    const u = await requireCandidate(db, phone);
    const { cv } = await loadCv(db, u.id);
    const missing = cvMissing(cv);
    if (missing.length) throw new BotError("cv_incomplete", `CV incomplet : il manque ${missing.join(", ")}.`);
    const path = await makePdf(db, u.id, cv, "cvs", `${u.id}/whatsapp/CV-${Date.now()}.pdf`);
    const { data } = await db.storage.from("cvs").createSignedUrl(path, 7 * 86400);
    const name = (cv.fullName || "CV").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_");
    return { pdf_url: data?.signedUrl, file_name: `CV_${name}.pdf`, expires_in_days: 7, edit_url: `${SITE}/cv-edit` };
  },

  /** Postule avec le CV ProJob (PDF généré) : l'entreprise et le candidat sont notifiés. */
  async apply(db, b, phone) {
    const u = await requireCandidate(db, phone);
    const jobId = str(b.job_id, 40);
    const { data: job } = await db.from("jobs").select("id, title, is_active, company_profiles(company_name)").eq("id", jobId).maybeSingle();
    if (!job || !job.is_active) throw new BotError("job_not_found", "Offre introuvable ou clôturée.", 404);
    const { data: already } = await db.from("applications").select("id").eq("job_id", jobId).eq("candidate_id", u.id).maybeSingle();
    if (already) throw new BotError("already_applied", "L'utilisateur a déjà postulé à cette offre.", 409);
    const { cv } = await loadCv(db, u.id);
    const missing = cvMissing(cv);
    if (missing.length) throw new BotError("cv_incomplete", `Avant de postuler, compléter le CV : il manque ${missing.join(", ")}.`);
    const path = await makePdf(db, u.id, cv, "application-documents", `${u.id}/${jobId}/cv-${Date.now()}.pdf`);
    const { error } = await db.from("applications").insert({
      job_id: jobId, candidate_id: u.id, status: "pending", cv_url: path, source: "whatsapp",
      motivation_message: str(b.message, 1000) || null,
    });
    if (error) throw new BotError("apply_failed", "La candidature n'a pas pu être envoyée : " + error.message, 500);
    return { applied: true, job: job.title, company: (job as any).company_profiles?.company_name, track_url: `${SITE}/dashboard#mes-candidatures` };
  },

  async my_applications(db, _b, phone) {
    const u = await requireCandidate(db, phone);
    const { data } = await db.from("applications")
      .select("id, status, applied_at, jobs(title, location, company_profiles(company_name))")
      .eq("candidate_id", u.id).order("applied_at", { ascending: false }).limit(10);
    const { data: ivs } = await db.from("interviews")
      .select("scheduled_at, mode, location, meeting_url, status, applications(jobs(title, company_profiles(company_name)))")
      .eq("candidate_id", u.id).eq("status", "planned").gte("scheduled_at", new Date().toISOString()).order("scheduled_at");
    const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { timeZone: "Africa/Conakry", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
    return {
      applications: (data || []).map((a: Record<string, any>) => ({
        job: a.jobs?.title, company: a.jobs?.company_profiles?.company_name, status: STATUS_FR[a.status] || a.status,
        applied_on: new Date(a.applied_at).toLocaleDateString("fr-FR"),
      })),
      upcoming_interviews: (ivs || []).map((i: Record<string, any>) => ({
        job: i.applications?.jobs?.title, company: i.applications?.jobs?.company_profiles?.company_name,
        when: when(i.scheduled_at), mode: i.mode === "visio" ? "Visioconférence" : i.mode === "telephone" ? "Téléphone" : "Présentiel",
        place: i.mode === "presentiel" ? i.location : i.meeting_url,
      })),
      dashboard_url: `${SITE}/dashboard`,
    };
  },
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const secret = Deno.env.get("BOT_API_SECRET") || "";
  if (!secret || !safeEqual(req.headers.get("x-bot-secret") || "", secret)) return json({ error: "unauthorized" }, 401);

  let body: Body;
  try { body = await req.json(); } catch { return json({ ok: false, error: "invalid_body" }, 400); }
  const handler = handlers[String(body.action || "")];
  if (!handler) return json({ ok: false, error: "unknown_action", actions: Object.keys(handlers) }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  try {
    const data = await handler(db, body, normPhone(body.phone));
    return json({ ok: true, ...(data as object) });
  } catch (e) {
    if (e instanceof BotError) return json({ ok: false, error: e.code, message: e.message }, e.status);
    console.error("bot_api", body.action, e instanceof Error ? e.stack : e);
    return json({ ok: false, error: "server_error", message: "Erreur interne. Réessayez plus tard." }, 500);
  }
});
