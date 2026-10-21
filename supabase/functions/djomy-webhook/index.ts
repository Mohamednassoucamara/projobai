// Edge Function « djomy-webhook » : reçoit les notifications de paiement de Djomy.
// URL à déclarer dans l'espace marchand Djomy :
//   https://<projet>.supabase.co/functions/v1/djomy-webhook
// Chaque requête est authentifiée par l'en-tête X-Webhook-Signature (HMAC du corps avec DJOMY_CLIENT_SECRET).
// Déploiement : supabase functions deploy djomy-webhook --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2";
import { djomyConfigured, mapStatus, paymentStatus, verifyWebhook, type DjomyPayment } from "../_shared/djomy.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });
  const raw = await req.text();
  if (!(await verifyWebhook(raw, req.headers.get("X-Webhook-Signature")))) {
    console.warn("djomy_webhook_bad_signature");
    return new Response(JSON.stringify({ error: "invalid_signature" }), { status: 401 });
  }

  let event: { eventType?: string; data?: { payment?: DjomyPayment } & DjomyPayment; metadata?: Record<string, unknown> };
  try { event = JSON.parse(raw); } catch { return new Response("invalid_json", { status: 400 }); }
  if (!event.eventType?.startsWith("payment.")) return Response.json({ ignored: true });

  // V2 : data.payment ; V1 : données directement dans data
  const p: DjomyPayment = event.data?.payment ?? event.data ?? {};
  const orderId = p.merchantPaymentReference || (event.metadata?.order_id as string | undefined);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  let query = admin.from("payments").select("order_id, status, transaction_id, amount_gnf");
  query = orderId ? query.eq("order_id", orderId) : query.eq("transaction_id", p.transactionId || "");
  const { data: pay } = await query.maybeSingle();
  if (!pay) return Response.json({ ignored: "unknown_payment" });
  if (pay.status === "success") return Response.json({ ok: true, already: true });

  let status = mapStatus(p.status || event.eventType.replace("payment.", ""));
  if (status === "success") {
    // Double vérification auprès de Djomy (statut et montant) avant d'activer
    if (djomyConfigured() && (p.transactionId || pay.transaction_id)) {
      try {
        const check = await paymentStatus((p.transactionId || pay.transaction_id)!);
        status = mapStatus(check.status);
        if (status === "success" && check.paidAmount != null && Number(check.paidAmount) < pay.amount_gnf) status = "failed";
      } catch (e) {
        console.error("djomy_webhook_check", e instanceof Error ? e.message : e);
      }
    }
  }

  if (status === "success") {
    const { error } = await admin.rpc("activate_payment", {
      p_order_id: pay.order_id, p_transaction_id: p.transactionId ?? pay.transaction_id, p_method: p.paymentMethod ?? null, p_raw: event,
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  } else {
    await admin.from("payments").update({ status, transaction_id: p.transactionId ?? pay.transaction_id, raw: event }).eq("order_id", pay.order_id);
  }
  return Response.json({ ok: true, status });
});
