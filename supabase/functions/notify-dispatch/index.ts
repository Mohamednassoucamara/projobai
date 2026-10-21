// Edge Function « notify-dispatch » : envoie par e-mail et WhatsApp les notifications
// créées dans la base (accusé de réception, changement d'étape, convocation, rappel…).
// Appelée chaque minute par pg_cron (voir supabase/setup_notifications_cron.sql).
//
// Secrets (Supabase → Edge Functions → Secrets) :
//   CRON_SECRET                 mot de passe partagé avec la tâche planifiée (obligatoire)
//   RESEND_API_KEY              clé Resend pour l'e-mail (facultatif)
//   NOTIFY_FROM                 expéditeur (domaine vérifié dans Resend), défaut "ProJob AI <notifications@projobai.com>"
//   NOTIFY_REPLY_TO             adresse de réponse, défaut contact@pjob.nassouba.com
//   WHATSAPP_TOKEN              jeton permanent de l'API WhatsApp Cloud (Meta) (facultatif)
//   WHATSAPP_PHONE_NUMBER_ID    identifiant du numéro WhatsApp Business
//   WHATSAPP_TEMPLATE           nom du modèle approuvé (défaut : projob_notification)
//   WHATSAPP_TEMPLATE_LANG      langue du modèle (défaut : fr)
//   SITE_URL                    défaut : https://projobai.com
//
// Déploiement : supabase functions deploy notify-dispatch --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2";

const SITE = (Deno.env.get("SITE_URL") || "https://projobai.com").replace(/\/$/, "");
const FROM = Deno.env.get("NOTIFY_FROM") || "ProJob AI <notifications@projobai.com>";
const REPLY_TO = Deno.env.get("NOTIFY_REPLY_TO") || "contact@pjob.nassouba.com";
const BATCH = 40;

type Row = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  profiles: { email: string | null; phone: string | null; full_name: string | null; notify_email: boolean; notify_whatsapp: boolean } | null;
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function emailHtml(r: Row, url: string) {
  const first = (r.profiles?.full_name || "").split(" ")[0];
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#050FA0;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:bold">ProJob <span style="color:#FF8A7A">AI</span></td></tr>
<tr><td style="padding:28px">
<p style="margin:0 0 12px;font-size:15px">Bonjour${first ? " " + esc(first) : ""},</p>
<h1 style="margin:0 0 12px;font-size:20px;color:#050FA0">${esc(r.title)}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6">${esc(r.message)}</p>
<a href="${esc(url)}" style="display:inline-block;background:#E4220F;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px">Voir sur ProJob AI</a>
</td></tr>
<tr><td style="padding:16px 28px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.5">
Vous recevez cet e-mail car les notifications par e-mail sont activées sur votre compte ProJob AI. Pour les désactiver : cloche des notifications → réglages.<br>Nassouba Technologie · Conakry · contact@pjob.nassouba.com
</td></tr></table></td></tr></table></body></html>`;
}

async function sendEmail(r: Row, url: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return "non configuré";
  const to = r.profiles?.email;
  if (!to || !r.profiles?.notify_email) return "désactivé";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      reply_to: REPLY_TO,
      subject: `${r.title} — ProJob AI`,
      html: emailHtml(r, url),
      text: `${r.title}\n\n${r.message}\n\n${url}`,
    }),
  });
  return res.ok ? "envoyé" : `erreur ${res.status}: ${(await res.text()).slice(0, 200)}`;
}

/** Numéro au format international sans « + » (Guinée par défaut). */
function waNumber(phone: string | null) {
  const d = String(phone || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 9 && d.startsWith("6")) return "224" + d;
  if (d.startsWith("00")) return d.slice(2);
  return d;
}

// Les paramètres d'un modèle WhatsApp n'acceptent ni retour à la ligne ni tabulation.
const waText = (s: string, max = 900) => s.replace(/[\n\t]+/g, " ").replace(/ {4,}/g, "   ").slice(0, max);

async function sendWhatsApp(r: Row, url: string) {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneId) return "non configuré";
  if (!r.profiles?.notify_whatsapp) return "désactivé";
  const to = waNumber(r.profiles.phone);
  if (to.length < 8) return "numéro manquant";
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: Deno.env.get("WHATSAPP_TEMPLATE") || "projob_notification",
        language: { code: Deno.env.get("WHATSAPP_TEMPLATE_LANG") || "fr" },
        components: [{
          type: "body",
          parameters: [
            { type: "text", text: waText(r.title, 120) },
            { type: "text", text: waText(`${r.message} ${url}`) },
          ],
        }],
      },
    }),
  });
  return res.ok ? "envoyé" : `erreur ${res.status}: ${(await res.text()).slice(0, 200)}`;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // 1. Rappels d'entretien (24 h avant)
  const { data: reminders, error: remErr } = await supabase.rpc("queue_interview_reminders");
  if (remErr) console.error("reminders", remErr.message);
  // Rappels de fin d'abonnement et de fin d'essai (migration 012)
  const { error: subErr } = await supabase.rpc("queue_subscription_reminders");
  if (subErr && !/does not exist|schema cache/i.test(subErr.message)) console.error("subscription_reminders", subErr.message);

  // 2. Notifications pas encore envoyées (moins de 48 h)
  const since = new Date(Date.now() - 48 * 3600_000).toISOString();
  const { data: pending, error } = await supabase
    .from("notifications")
    .select("id")
    .is("dispatched_at", null)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(BATCH);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!pending?.length) return Response.json({ reminders: reminders ?? 0, sent: 0 });

  // Réserver les lignes (évite un double envoi si deux exécutions se chevauchent)
  const { data: claimed, error: claimErr } = await supabase
    .from("notifications")
    .update({ dispatched_at: new Date().toISOString() })
    .in("id", pending.map((p) => p.id))
    .is("dispatched_at", null)
    .select("id, type, title, message, link, profiles(email, phone, full_name, notify_email, notify_whatsapp)");
  if (claimErr) return new Response(JSON.stringify({ error: claimErr.message }), { status: 500 });

  let sent = 0;
  for (const r of (claimed || []) as unknown as Row[]) {
    const url = `${SITE}${r.link && r.link.startsWith("/") ? r.link : "/"}`;
    const [email, whatsapp] = await Promise.all([
      sendEmail(r, url).catch((e) => `erreur: ${e}`),
      sendWhatsApp(r, url).catch((e) => `erreur: ${e}`),
    ]);
    if (email === "envoyé" || whatsapp === "envoyé") sent++;
    await supabase.from("notifications").update({ delivery: { email, whatsapp } }).eq("id", r.id);
  }
  return Response.json({ reminders: reminders ?? 0, processed: claimed?.length ?? 0, sent });
});
