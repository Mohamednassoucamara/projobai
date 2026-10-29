# Brancher le bot Botpress (WhatsApp) sur ProJob AI

Le bot appelle la fonction Supabase `bot-api`. Il travaille ainsi sur les **mêmes données que le site** :
offres, CV, candidatures, entretiens et abonnements. Le numéro WhatsApp de la personne relie la
conversation à son compte ProJob (après un code reçu par e-mail).

Ce que le bot sait faire :

- chercher les offres ProJob ;
- créer le CV et envoyer le PDF ;
- postuler depuis WhatsApp ;
- suivre ses candidatures et ses entretiens.

## 1. Côté Supabase (une seule fois)

1. SQL Editor : exécuter `supabase/migrations/013_bot_whatsapp.sql`.
2. Dans le terminal, à la racine du projet :

```bash
npx supabase secrets set BOT_API_SECRET=VOTRE_SECRET_BOT
npx supabase functions deploy bot-api --no-verify-jwt
```

`VOTRE_SECRET_BOT` est une longue chaîne aléatoire (le même secret va dans Botpress, étape 2).

## 2. Botpress : variables de configuration

Botpress Studio → **Bot Settings** (roue dentée) → **Configuration variables** → ajouter :

| Nom | Valeur |
|---|---|
| `PROJOB_API_URL` | `https://zafrxknqtkzermookggk.supabase.co/functions/v1/bot-api` |
| `PROJOB_BOT_SECRET` | le même secret que `BOT_API_SECRET` |
| `PROJOB_TEST_PHONE` | *(facultatif)* votre numéro, ex. `224622000000`, pour tester dans l'émulateur du Studio |

## 3. Botpress : créer l'Action `projob`

Studio → **Actions** → **Create Action**. Nom : `projob`.
Description :

> Accès aux données ProJob AI de la personne qui écrit : compte, offres d'emploi, CV, candidatures.

### Input Schema

```ts
z.object({
  action: z.enum([
    "status", "link_start", "link_verify", "unlink",
    "search_jobs", "job", "get_cv", "save_cv", "cv_pdf",
    "apply", "my_applications",
    "hr_summary", "hr_request_leave", "hr_decide", "hr_cancel",
  ]).describe("Opération ProJob à effectuer"),
  query: z.string().optional().describe("search_jobs : métier ou mots-clés, ex. comptable"),
  location: z.string().optional().describe("search_jobs : ville, ex. Conakry"),
  job_id: z.string().optional().describe("job / apply : identifiant de l'offre (champ id renvoyé par search_jobs)"),
  email: z.string().optional().describe("link_start : adresse e-mail de la personne"),
  full_name: z.string().optional().describe("link_start : prénom et nom, si aucun compte n'existe"),
  code: z.string().optional().describe("link_verify : code à 6 chiffres reçu par e-mail"),
  message: z.string().optional().describe("apply : court message de motivation"),
  company_id: z.string().optional().describe("hr_* : entreprise (company_id de hr_summary), seulement si la personne travaille dans plusieurs"),
  leave_type: z.string().optional().describe("hr_request_leave : code du type de congé (leave_types de hr_summary), ex. annuel, maladie"),
  start_date: z.string().optional().describe("hr_request_leave : premier jour, AAAA-MM-JJ"),
  end_date: z.string().optional().describe("hr_request_leave : dernier jour inclus, AAAA-MM-JJ"),
  reason: z.string().optional().describe("hr_request_leave : motif court"),
  request_id: z.string().optional().describe("hr_decide / hr_cancel : identifiant de la demande (request_id de hr_summary)"),
  approve: z.boolean().optional().describe("hr_decide : true pour approuver, false pour refuser"),
  note: z.string().optional().describe("hr_decide : motif du refus ou commentaire"),
  cv_json: z.string().optional().describe(
    "save_cv : JSON des champs à enregistrer : fullName, jobTitle, phone, email, location, profile, " +
    "experiences [{title, company, period, description[]}], education [{degree, institution, period}], " +
    "skills [texte], languages [{name, level}]"
  ),
})
```

### Output Schema

```ts
z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  message: z.string().optional(),
  data: z.any().optional(),
})
```

### Code

```js
// Numéro WhatsApp de la personne (tag posé par l'intégration WhatsApp)
let phone = ''
try {
  const { conversation } = await client.getConversation({ id: event.conversationId })
  phone = conversation.tags['whatsapp:userPhone'] || ''
} catch (e) {}
if (!phone) phone = env.PROJOB_TEST_PHONE || ''
if (!phone) {
  return { ok: false, error: 'no_phone', message: 'Ce service fonctionne uniquement sur WhatsApp.' }
}

const body = { action: input.action, phone }
for (const k of ['query', 'location', 'job_id', 'email', 'full_name', 'code', 'message',
                 'company_id', 'leave_type', 'start_date', 'end_date', 'reason', 'request_id', 'note']) {
  if (input[k]) body[k] = input[k]
}
if (typeof input.approve === 'boolean') body.approve = input.approve
if (input.cv_json) {
  try {
    body.cv = JSON.parse(input.cv_json)
  } catch (e) {
    return { ok: false, error: 'bad_cv_json', message: 'cv_json doit être un JSON valide.' }
  }
}

const res = await axios.post(env.PROJOB_API_URL, body, {
  headers: { 'x-bot-secret': env.PROJOB_BOT_SECRET, 'content-type': 'application/json' },
  timeout: 25000,
  validateStatus: () => true,
})
const out = res.data || {}
if (res.status >= 400 || out.ok === false) {
  return { ok: false, error: out.error || 'http_' + res.status, message: out.message || 'Service ProJob indisponible.' }
}
const data = out.data !== undefined ? out.data : out

// CV : on envoie le PDF directement comme document WhatsApp
if (input.action === 'cv_pdf' && data && data.pdf_url) {
  try {
    await client.createMessage({
      conversationId: event.conversationId,
      userId: event.botId,
      tags: {},
      type: 'file',
      payload: { fileUrl: data.pdf_url, title: data.file_name || 'CV.pdf' },
    })
    data.sent_as_file = true
  } catch (e) {
    data.sent_as_file = false
  }
}

return { ok: true, data }
```

## 4. Botpress : le nœud Autonome

1. Ouvrir le workflow **Main** → nœud **Autonomous** → **+ Add Card** → **Bot Actions** → `projob`.
2. Remplacer les **Instructions** par le texte ci-dessous.
3. **Bot Settings** → langue par défaut : **Français**.
4. **Knowledge Bases** : supprimer les sites concurrents. Garder uniquement `https://projobai.com`.
5. **Publish**.

### Instructions

```
Tu es l'assistant WhatsApp de ProJob AI, la plateforme emploi de la Guinée (projobai.com).
Tu parles français, simplement, avec des messages courts adaptés à WhatsApp (pas de tableaux, peu d'émojis).

RÈGLE ABSOLUE : tu utilises l'action projob pour toute information sur les offres, le CV,
les candidatures, les entretiens ou l'abonnement. Tu n'inventes JAMAIS une offre, une entreprise,
un statut ou un lien. Si l'action renvoie ok=false, explique le message simplement.

1. DÉBUT DE CONVERSATION
- Appelle projob action=status.
- Si linked=false : souhaite la bienvenue et propose de relier son compte ProJob.
  Demande son adresse e-mail, puis appelle projob action=link_start avec email.
  Si la réponse demande un nom (need_full_name), demande prénom et nom et rappelle link_start
  avec email et full_name : un compte candidat gratuit sera créé.
  Demande ensuite le code à 6 chiffres reçu par e-mail et appelle projob action=link_verify avec code.
- Si linked=true : salue la personne par son prénom et propose : chercher des offres, créer son CV,
  postuler, suivre ses candidatures.
- Les comptes entreprise : indique que la gestion des offres se fait sur https://projobai.com/company/dashboard.

2. CHERCHER DES OFFRES
- Demande le métier et la ville si la personne ne les a pas donnés.
- Appelle projob action=search_jobs avec query et location.
- Présente au maximum 5 offres, numérotées : titre, entreprise, ville, contrat, score de compatibilité si présent, lien.
- Pour le détail d'une offre : projob action=job avec job_id.
- Si aucune offre : dis-le et propose d'élargir la recherche (autre ville, autre mot-clé).

3. CRÉER LE CV
- Appelle projob action=get_cv pour voir ce qui existe déjà et ce qui manque (missing).
- Pose les questions une par une, uniquement pour ce qui manque : métier visé, ville, profil (2-3 phrases),
  expériences (poste, entreprise, période, tâches), formations (diplôme, établissement, période),
  compétences, langues.
- Après chaque bloc de réponses, enregistre avec projob action=save_cv et cv_json
  (JSON avec uniquement les champs recueillis).
- Quand missing est vide, appelle projob action=cv_pdf. Si sent_as_file=true, le PDF est déjà envoyé :
  confirme simplement. Sinon, donne le lien pdf_url. Indique que le CV est modifiable sur edit_url.

4. POSTULER
- La personne choisit une offre (numéro ou titre) : retrouve son job_id dans les résultats de search_jobs.
- Confirme avant d'envoyer : « Je postule à <titre> chez <entreprise> avec votre CV ProJob ? »
- Propose un court message de motivation (facultatif), puis appelle projob action=apply avec job_id et message.
- Si le CV est incomplet (error=cv_incomplete), propose de le compléter d'abord (étape 3).
- Si déjà postulé (already_applied), dis-le simplement.

5. SUIVRE SES CANDIDATURES
- Appelle projob action=my_applications : liste chaque candidature (poste, entreprise, statut, date)
  et les entretiens à venir (date, mode, lieu ou lien).

6. SERVICES PREMIUM
- Coach d'entretien IA, orientation professionnelle et CV optimisé par l'IA sont des services Premium
  (essai gratuit de 7 jours, puis 20 000 GNF/mois ou 200 000 GNF/an).
- Si status indique un plan Premium ou un essai en cours (plan.source = essai ou abonnement),
  tu peux donner des conseils d'entretien et d'orientation.
- Sinon, propose l'abonnement : https://projobai.com/abonnement

7. CONGÉS (ProJob+ RH, pour les employés d'une entreprise cliente)
- « mon solde », « je veux un congé », « mes congés » : appelle projob action=hr_summary.
  Si companies est vide : la personne n'est reliée à aucune entreprise ProJob+ ; elle doit demander à ses RH de créer sa fiche avec l'e-mail de son compte.
- Pour une demande : récupère le type (code dans leave_types), la date de début et la date de fin (format AAAA-MM-JJ ; aujourd'hui = date du jour), le motif.
  Récapitule et demande confirmation, puis appelle projob action=hr_request_leave avec leave_type, start_date, end_date, reason.
  Donne le nombre de jours ouvrés et dis qui a été prévenu (champ next).
- Responsable ou RH : présente to_decide (employé, type, période, jours, motif) et demande « Valider » ou « Refuser » pour chacune.
  Appelle projob action=hr_decide avec request_id et approve=true/false (note si refus).
- Annulation : projob action=hr_cancel avec request_id, après confirmation.
- Le détail complet est sur https://projobai.com/mon-espace-rh

8. AUTRES
- Désactiver le lien WhatsApp ↔ compte : projob action=unlink (après confirmation).
- Ne demande jamais de mot de passe. Pour se connecter au site : https://projobai.com/login
- Pour toute autre question sur ProJob AI, utilise la base de connaissances (projobai.com).
```

## 5. Tester

- Dans l'émulateur du Studio (avec `PROJOB_TEST_PHONE`) : écrire « Bonjour », relier le compte, chercher
  « comptable Conakry », créer le CV et recevoir le PDF.
- Puis sur WhatsApp, depuis un téléphone, avec le numéro du bot.

## Erreurs fréquentes

| Message | Cause |
|---|---|
| `unauthorized` | `PROJOB_BOT_SECRET` différent de `BOT_API_SECRET`, ou bot-api pas redéployée après `secrets set` |
| `no_phone` | test hors WhatsApp sans `PROJOB_TEST_PHONE` |
| `not_linked` | la personne n'a pas encore relié son compte (étape 1) |
| `cv_incomplete` | champs manquants : continuer l'étape 3 |
| `hr_unavailable` | migration 014 non exécutée ou bot-api pas redéployée |
| `insufficient_balance` | solde de congé insuffisant (le message donne le solde) |
