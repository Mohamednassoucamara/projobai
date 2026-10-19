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

type Action =
  | "improve_cv"
  | "cover_letter"
  | "interview_questions"
  | "interview_feedback"
  | "interview_summary"
  | "career_orientation"
  | "career_chat"
  | "parse_cv"
  | "tailor_cv";

type ChatMessage = { role: "user" | "assistant"; content: string };

function clip(value: unknown): string {
  return JSON.stringify(value ?? null).slice(0, MAX_INPUT_CHARS);
}

function buildPrompt(
  action: Action,
  p: Record<string, unknown>,
): { prompt: string; maxTokens: number; messages?: ChatMessage[]; text?: boolean } {
  switch (action) {
    case "career_orientation":
      return {
        maxTokens: 2200,
        prompt: `Tu es conseiller d'orientation professionnelle, spécialiste du marché de l'emploi en Guinée.
Propose 3 métiers réalistes pour ce profil, classés du plus adapté au moins adapté. Tiens compte du niveau d'études, des intérêts, des compétences, de la ville et de la mobilité.
Règles : pas de salaire chiffré, pas de nom d'école ou d'entreprise inventé ; formations décrites par type (ex. « BTS en logistique », « certification CCNA ») ; conseils concrets et faisables avec peu de moyens.
Réponds uniquement avec un objet JSON :
{"summary":"2 phrases qui résument le profil et la logique des pistes",
"careers":[{"title":"métier","match":0-100,"why":"2 à 3 phrases liées au profil","sectors":["secteurs qui recrutent ce métier en Guinée"],"skillsToDevelop":["4 compétences"],"trainings":["2 ou 3 formations ou certifications"],"firstSteps":["Ce mois-ci : ...","D'ici 3 mois : ...","D'ici 6 mois : ..."]}],
"advice":["4 conseils généraux de recherche d'emploi adaptés à ce profil"]}

Profil : ${clip(p.profile)}
${p.cv ? `CV : ${clip(p.cv)}` : ""}`,
      };
    case "career_chat": {
      const history = (Array.isArray(p.messages) ? p.messages : [])
        .filter((m): m is ChatMessage => !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
      while (history.length && history[0].role !== "user") history.shift();
      const intro = `Tu es le conseiller carrière de ProJob AI. Tu réponds en français simple, de façon concrète et bienveillante, en 120 à 220 mots, avec des étapes numérotées quand c'est utile. Tu adaptes tes conseils au marché guinéen. Tu ne promets pas d'emploi, tu ne donnes pas de salaire chiffré et tu n'inventes pas de nom d'entreprise ou d'école. Si la question sort de l'emploi et de la carrière, recentre poliment.
Profil du candidat : ${clip(p.context)}`;
      if (history.length) history[0] = { role: "user", content: `${intro}\n\nQuestion : ${history[0].content}` };
      return { maxTokens: 900, prompt: "", messages: history, text: true };
    }
    case "parse_cv":
      return {
        maxTokens: 3000,
        prompt: `Voici le texte brut d'un CV (extrait d'un PDF ou d'un document Word, la mise en page peut être désordonnée).
Range fidèlement les informations dans la structure ci-dessous. Recopie les informations telles quelles, ne les reformule pas et n'invente rien : laisse vide ("" ou []) ce qui est absent.
Les expériences et formations vont de la plus récente à la plus ancienne. "period" garde les dates du CV (ex. "2019 - 2022", "Mars 2021 - Présent").
Les niveaux de langue sont l'un de : "Langue maternelle", "Courant", "Intermédiaire", "Notions".
Réponds uniquement avec un objet JSON :
{"fullName":"","jobTitle":"","phone":"","email":"","location":"","profile":"","experiences":[{"title":"","company":"","period":"","description":["mission"]}],"education":[{"degree":"","institution":"","period":""}],"skills":["compétence"],"languages":[{"name":"","level":""}]}

Texte du CV :
${String(p.text || "").slice(0, MAX_INPUT_CHARS)}`,
      };
    case "tailor_cv":
      return {
        maxTokens: 1600,
        prompt: `Adapte ce CV à l'offre d'emploi ci-dessous, pour un recruteur en Guinée.
Règles : n'ajoute aucune compétence, expérience ou diplôme que le candidat n'a pas ; reformule seulement pour mettre en avant ce qui correspond à l'offre et reprends les mots-clés de l'offre quand le CV les justifie.
Réponds uniquement avec un objet JSON :
{"profile":"résumé de 3 à 4 phrases ciblé sur ce poste","skills":["les compétences du CV, les plus utiles pour ce poste en premier, 10 maximum"],"experiences":[{"description":["missions reformulées pour ce poste, 3 maximum"]}],"keywords":["mots-clés de l'offre déjà justifiés par le CV"],"advice":["3 conseils concrets pour cette candidature, dont comment combler les compétences manquantes"]}
Garde le même nombre d'expériences dans le même ordre.

Offre : ${clip(p.job)}

CV : ${clip(p.cv)}`,
      };
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
L'en-tête (coordonnées, destinataire, lieu et date) et la signature sont mis en page par la plateforme : ne les écris pas.
Corps attendu : formule d'appel (« Madame, Monsieur, » ou le nom du recruteur), 3 paragraphes (accroche liée à l'entreprise et au poste ; expérience et compétences prouvées par le CV, avec un résultat concret si le CV en donne ; motivation, disponibilité et demande d'entretien), puis la formule de politesse complète.
Ton : ${String(p.tone || "professionnel")}. Longueur du corps : 230 à 320 mots.
Réponds uniquement avec un objet JSON : {"objet":"Candidature au poste de ...","body":"texte brut, paragraphes séparés par \\n\\n"}

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
  const allowed: Action[] = [
    "improve_cv",
    "cover_letter",
    "interview_questions",
    "interview_feedback",
    "interview_summary",
    "career_orientation",
    "career_chat",
    "parse_cv",
    "tailor_cv",
  ];
  if (!body.action || !allowed.includes(body.action)) return json({ error: "unknown_action" }, 400, origin);

  const { prompt, maxTokens, messages, text: wantsText } = buildPrompt(body.action, body.payload || {});
  if (messages && !messages.length) return json({ error: "invalid_body" }, 400, origin);

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
        messages: messages ?? [{ role: "user", content: prompt }],
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
    return json({ result: wantsText ? { reply: text.trim() } : extractJson(text) }, 200, origin);
  } catch (e) {
    console.error("ai_assistant_failure", e instanceof Error ? e.message : e);
    return json({ error: "upstream_error" }, 502, origin);
  }
});
