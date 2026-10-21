// Client minimal de l'API Djomy (https://developers.djomy.africa).
// Authentification : en-tête X-API-KEY = clientId:HMAC_SHA256(clientId, clientSecret) en hexadécimal,
// plus un jeton Bearer obtenu sur POST /v1/auth.

export const DJOMY_BASE = (Deno.env.get("DJOMY_BASE_URL") || "https://sandbox-api.djomy.africa").replace(/\/$/, "");
const CLIENT_ID = Deno.env.get("DJOMY_CLIENT_ID") || "";
const CLIENT_SECRET = Deno.env.get("DJOMY_CLIENT_SECRET") || "";

export const djomyConfigured = () => Boolean(CLIENT_ID && CLIENT_SECRET);

const enc = new TextEncoder();

export async function hmacHex(message: string | Uint8Array, secret: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const data = typeof message === "string" ? enc.encode(message) : message;
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, data));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Comparaison à temps constant. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Vérifie l'en-tête X-Webhook-Signature (« v1:<hmac> » du corps brut, clé = clientSecret). */
export async function verifyWebhook(rawBody: string, header: string | null) {
  if (!header || !CLIENT_SECRET) return false;
  const received = header.trim().replace(/^v1:/i, "").toLowerCase();
  const expected = await hmacHex(rawBody, CLIENT_SECRET);
  return safeEqual(received, expected);
}

async function apiKey() {
  return `${CLIENT_ID}:${await hmacHex(CLIENT_ID, CLIENT_SECRET)}`;
}

let cached: { token: string; until: number } | null = null;

async function bearer() {
  if (cached && cached.until > Date.now()) return cached.token;
  const res = await fetch(`${DJOMY_BASE}/v1/auth`, {
    method: "POST",
    headers: { "X-API-KEY": await apiKey(), "Content-Type": "application/json" },
    body: "{}",
  });
  const body = await res.json().catch(() => ({}));
  const token = body?.data?.accessToken;
  if (!res.ok || !token) throw new Error(`djomy_auth_${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  const ttl = Number(body?.data?.expiresIn) || 300;
  cached = { token, until: Date.now() + Math.max(30, ttl - 30) * 1000 };
  return token;
}

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(`${DJOMY_BASE}${path}`, {
    ...init,
    headers: {
      "X-API-KEY": await apiKey(),
      Authorization: `Bearer ${await bearer()}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    throw new Error(`djomy_${res.status}: ${JSON.stringify(body?.error || body).slice(0, 300)}`);
  }
  return body?.data ?? body;
}

export type DjomyPayment = {
  transactionId?: string;
  status?: string;            // CREATED, PENDING, SUCCESS, CANCELLED, FAILED, TIMEOUT
  paidAmount?: number;
  paymentMethod?: string;
  merchantPaymentReference?: string;
  redirectUrl?: string;
  paymentUrl?: string;
  currency?: string;
};

/** Paiement avec redirection vers le portail Djomy (Orange Money, MTN MoMo, carte…). */
export function createGatewayPayment(p: {
  amount: number;
  payerNumber: string;
  description: string;
  reference: string;
  returnUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string | number | boolean>;
}): Promise<DjomyPayment> {
  return call("/v1/payments/gateway", {
    method: "POST",
    body: JSON.stringify({
      amount: p.amount,
      countryCode: "GN",
      payerNumber: p.payerNumber,
      description: p.description.slice(0, 255),
      merchantPaymentReference: p.reference,
      returnUrl: p.returnUrl,
      cancelUrl: p.cancelUrl,
      metadata: p.metadata,
    }),
  });
}

export function paymentStatus(transactionId: string): Promise<DjomyPayment> {
  return call(`/v1/payments/${encodeURIComponent(transactionId)}/status`);
}

/** Numéro au format international attendu par Djomy (00224…). */
export function djomyPhone(raw: string) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9 && d.startsWith("6")) d = "224" + d;
  return d.length >= 11 ? "00" + d : "";
}

export function mapStatus(s?: string) {
  switch ((s || "").toUpperCase()) {
    case "SUCCESS": return "success";
    case "FAILED": return "failed";
    case "CANCELLED": return "cancelled";
    case "TIMEOUT": return "timeout";
    case "PENDING":
    case "REDIRECTED": return "pending";
    default: return "created";
  }
}
