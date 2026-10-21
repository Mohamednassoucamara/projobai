// Edge Function « djomy-payment » : démarrer un paiement d'abonnement et en vérifier l'état.
// Appelée par le site avec le jeton de l'utilisateur connecté (verify_jwt = true).
//
// Secrets : DJOMY_CLIENT_ID, DJOMY_CLIENT_SECRET (espace marchand Djomy),
//           DJOMY_BASE_URL (défaut : bac à sable https://sandbox-api.djomy.africa),
//           SITE_URL (défaut : https://projobai.com), ALLOWED_ORIGINS (facultatif).
// Déploiement : supabase functions deploy djomy-payment

import { createClient } from "npm:@supabase/supabase-js@2";
import { createGatewayPayment, djomyConfigured, djomyPhone, mapStatus, paymentStatus } from "../_shared/djomy.ts";

const SITE = (Deno.env.get("SITE_URL") || "https://projobai.com").replace(/\/$/, "");
const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ||
  "https://projobai.com,https://www.projobai.com,https://projobai.netlify.app,http://localhost:5173,http://localhost:4173")
  .split(",").map((s) => s.trim()).filter(Boolean);

function cors(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED.includes(origin) ? origin : ALLOWED[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const auth = req.headers.get("Authorization") || "";
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: "not_authenticated" }, 401);

  let body: { action?: string; plan_id?: string; period?: string; phone?: string; order_id?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }

  // ---------- Démarrer un paiement ----------
  if (body.action === "checkout") {
    const period = body.period === "year" ? "year" : "month";
    const { data: profile } = await admin.from("profiles").select("user_type, full_name").eq("id", user.id).maybeSingle();
    const { data: plan } = await admin.from("plans").select("*").eq("id", body.plan_id || "").maybeSingle();
    if (!plan || !profile || plan.audience !== profile.user_type) return json({ error: "invalid_plan" }, 400);
    const amount = period === "year" ? plan.price_year_gnf : plan.price_month_gnf;
    if (!amount || amount <= 0) return json({ error: "invalid_plan" }, 400);
    const phone = djomyPhone(body.phone || "");
    if (!phone) return json({ error: "invalid_phone" }, 400);
    if (!djomyConfigured()) return json({ error: "payment_not_configured" }, 503);

    const rand = crypto.getRandomValues(new Uint8Array(4));
    const orderId = `PJ-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Array.from(rand, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
    const { error: insErr } = await admin.from("payments").insert({
      order_id: orderId, user_id: user.id, plan_id: plan.id, period, amount_gnf: amount,
    });
    if (insErr) return json({ error: "db_error", detail: insErr.message }, 500);

    try {
      const p = await createGatewayPayment({
        amount,
        payerNumber: phone,
        description: `ProJob AI — ${plan.name} ${period === "year" ? "1 an" : "1 mois"}`,
        reference: orderId,
        returnUrl: `${SITE}/abonnement/retour?order=${orderId}`,
        cancelUrl: `${SITE}/abonnement?annule=${orderId}`,
        metadata: { order_id: orderId, plan_id: plan.id, period },
      });
      const redirect = p.redirectUrl || p.paymentUrl;
      if (!redirect) throw new Error("djomy_no_redirect");
      await admin.from("payments").update({ transaction_id: p.transactionId ?? null, redirect_url: redirect, status: "pending" }).eq("order_id", orderId);
      return json({ url: redirect, order_id: orderId });
    } catch (e) {
      console.error("djomy_checkout", e instanceof Error ? e.message : e);
      await admin.from("payments").update({ status: "failed", raw: { error: String(e).slice(0, 500) } }).eq("order_id", orderId);
      return json({ error: "payment_provider_error" }, 502);
    }
  }

  // ---------- Vérifier un paiement (retour du portail Djomy) ----------
  if (body.action === "status") {
    const { data: pay } = await admin.from("payments")
      .select("order_id, status, transaction_id, plan_id, period, amount_gnf")
      .eq("order_id", body.order_id || "").eq("user_id", user.id).maybeSingle();
    if (!pay) return json({ error: "not_found" }, 404);

    let status = pay.status as string;
    if (!["success", "failed", "cancelled", "timeout"].includes(status) && pay.transaction_id && djomyConfigured()) {
      try {
        const p = await paymentStatus(pay.transaction_id);
        status = mapStatus(p.status);
        if (status === "success") {
          await admin.rpc("activate_payment", { p_order_id: pay.order_id, p_transaction_id: pay.transaction_id, p_method: p.paymentMethod ?? null, p_raw: p });
        } else if (status !== pay.status) {
          await admin.from("payments").update({ status, raw: p }).eq("order_id", pay.order_id);
        }
      } catch (e) {
        console.error("djomy_status", e instanceof Error ? e.message : e);
      }
    }
    return json({ status, plan_id: pay.plan_id, period: pay.period, amount_gnf: pay.amount_gnf });
  }

  return json({ error: "unknown_action" }, 400);
});
