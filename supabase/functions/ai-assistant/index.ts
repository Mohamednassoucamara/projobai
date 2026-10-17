// Edge Function « ai-assistant » : toutes les fonctions IA de ProJob AI.
// La clé de l'API Claude reste côté serveur (secret Supabase ANTHROPIC_API_KEY).
//
// Déploiement :
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase secrets set AI_MODEL=claude-haiku-5-5        (optionnel)
//   supabase functions deploy ai-assistant
//
// Le JWT Supabase est vérifié par la passerelle (verify_jwt = true par défaut) :
// seuls les utilisateurs connectés peuvent appeler l'IA.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = Deno.env.get("AI_MODEL") || "claude-haiku-5-5";
const MAX_INPUT_CHARS = 24_000;

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ||
  "https://projobai.netlify.app,http://localhost:5173,http://localhost:4173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function corsHeaders(origin: string | null): HeadersInit {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const CONTEXT = `Tu es l'assistant de ProJob AI, plateforme d'employabilité dédiée au marché de l'emploi en Guinée (Conakry et régions : Kindia, Boké, Kamsar, Labé, Mamou, Kankan, Siguiri, N'Zérékoré).
Tu connais les attentes des recruteurs guinéens : secteurs miniers, BTP, banques, ONG et organisations internationales, télécoms, administration, commerce.
Tu écris en français professionnel, clair et simple. Tu n'inventes jamais d'employeur, de diplôme, de date ou de chiffre qui ne figure pas dans les données fournies.`;

type Action = "improve_cv" | "cover_letter" | "interview_questions" | "interview_feedback" | "interview_summary";

function clip(value: unknown): string {
  return JSON.stringify(value ?? null).slice(0, MAX_INPUT_CHARS);
}

function buildPrompt(action: Action, p: Record<string, unknown>): { prompt: string; maxTokens: number } {
  switch (action) {
    case "improve_cv":
      return {
        maxTokens: 1500,
        prompt: `Améliore ce CV pour le poste visé, selon les attentes des recruteurs en Guinée.
Règles : verbes d'action au début des missions, 3 missions maximum par expérience, garde le même nombre d'expériences dans le même ordre, n'invente rien.
Réponds uniquement avec un objet JSON :
{"profile":"résumé de 3 à 4 phrases","experiences":[{"description":["mission 1","mission 2"]}],"skills":["8 compétences maximum, les plus pertinentes"],"tips":["2 conseils concrets pour renforcer ce CV"]}

CV : ${clip(p.cv)}`,
      };
    case "cover_letter":
      return {
        maxTokens: 1400,
        prompt: `Rédige une lettre de motivation pour cette candidature.
Format : coordonnées du candidat, destinataire, lieu et date, objet, formule d'appel, 3 paragraphes (accroche liée à l'entreprise ; expérience et compétences prouvées par le CV ; motivation et disponibilité), formule de politesse, signature.
Ton : ${String(p.tone || "professionnel")}. Longueur : 250 à 330 mots. Date : ${String(p.date || "")}.
Réponds uniquement avec un objet JSON : {"letter":"texte brut de la lettre, sauts de ligne avec \\n"}

Candidature : ${clip(p.form)}
CV : ${clip(p.cv)}`,
      };
    case "interview_questions":
      return {
        maxTokens: 1200,
        prompt: `Prépare 5 questions d'entretien d'embauche réalistes pour un recruteur guinéen.
Poste : ${String(p.position || "non précisé")}. Catégorie : ${String(p.category || "général")}. Niveau : ${String(p.level || "débutant")}.
Mélange : présentation et motivation, compétence technique, mise en situation, connaissance du secteur en Guinée, projection.
Réponds uniquement avec un objet JSON :
{"questions":[{"question":"...","tips":"conseil de 1 phrase pour bien répondre","difficulty":"facile|moyen|difficile"}]}
${p.cv ? `Profil du candidat : ${clip(p.cv)}` : ""}`,
      };
    case "interview_feedback":
      return {
        maxTokens: 900,
        prompt: `Tu es un recruteur exigeant et bienveillant. Évalue la réponse du candidat.
Poste : ${String(p.position || "non précisé")}. Catégorie : ${String(p.category || "général")}.
Question : ${String(p.question || "").slice(0, 600)}
Réponse du candidat : ${String(p.answer || "").slice(0, 4000)}
Barème sur 10 : pertinence (3), exemples concrets et résultats (3), structure et clarté (2), adéquation au contexte guinéen et au poste (2). Une réponse vide ou hors sujet vaut 0 à 2.
Réponds uniquement avec un objet JSON :
{"score":0,"strengths":["1 ou 2 points forts"],"improvements":["1 ou 2 points à améliorer"],"betterAnswer":"exemple de meilleure réponse en 3 à 4 phrases, à la première personne"}`,
      };
    case "interview_summary":
      return {
        maxTokens: 700,
        prompt: `Fais le bilan de cet entretien simulé pour le poste ${String(p.position || "")}.
Questions, réponses et notes : ${clip(p.items)}
Réponds uniquement avec un objet JSON :
{"summary":"bilan en 2 phrases","advice":["3 conseils concrets et numérotables"]}`,
      };
  }
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) {
      try {
        return JSON.parse(fence[1]);
      } catch { /* continue */ }
    }
    const start = trimmed.search(/[{[]/);
    const end = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("invalid_json");
  }
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ai_not_configured" }, 503, origin);

  let body: { action?: Action; payload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_body" }, 400, origin);
  }
  const allowed: Action[] = ["improve_cv", "cover_letter", "interview_questions", "interview_feedback", "interview_summary"];
  if (!body.action || !allowed.includes(body.action)) return json({ error: "unknown_action" }, 400, origin);

  const { prompt, maxTokens } = buildPrompt(body.action, body.payload || {});

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system: CONTEXT,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("anthropic_error", res.status, detail.slice(0, 500));
      return json({ error: res.status === 429 ? "rate_limited" : "upstream_error" }, res.status === 429 ? 429 : 502, origin);
    }
    const data = await res.json();
    const text = (data.content || [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");
    return json({ result: extractJson(text) }, 200, origin);
  } catch (e) {
    console.error("ai_assistant_failure", e instanceof Error ? e.message : e);
    return json({ error: "upstream_error" }, 502, origin);
  }
});
