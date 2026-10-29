# Mise en service : ProJob+ RH (étape 1)

ProJob+ ajoute la gestion RH à l'espace entreprise : dossiers employés, contrats, services,
organigramme, congés et absences avec validation en deux niveaux, espace employé (web et WhatsApp),
embauche en un clic depuis une candidature.

## 1. Base de données

Supabase → SQL Editor : exécuter `supabase/migrations/014_projob_plus_sirh.sql` (après la 013).
Le script peut être relancé sans risque.

Il crée :

- la formule **ProJob+** (`entreprise_plus`, 150 000 GNF/mois, 1 500 000 GNF/an) ; prix et textes
  modifiables dans Table Editor → `plans` ;
- les tables `hr_*` avec leurs règles de sécurité (chaque entreprise ne voit que ses données) ;
- les fonctions de congés, d'embauche et du bot WhatsApp.

L'essai gratuit de 7 jours des entreprises donne désormais accès à ProJob+ (qui inclut le Premium).

## 2. Fonctions et site

```bash
npx supabase functions deploy bot-api --no-verify-jwt
git push origin main
```

Le `git push` publie les nouvelles pages sur projobai.com (Netlify).

## 3. Activer ProJob+ pour un client (paiement hors ligne)

```sql
SELECT public.grant_subscription('email-du-compte-entreprise@exemple.gn', 'entreprise_plus', 'month');
```

## 4. Qui voit quoi

| Rôle | Qui | Accès |
|---|---|---|
| Administrateur | le compte entreprise | tout, y compris l'équipe RH (`/rh`) |
| Gestionnaire RH | compte candidat ajouté dans Paramètres → Équipe RH | tout sauf l'équipe RH (`/rh`) |
| Responsable | employé qui a des personnes sous sa responsabilité | valide les congés de son équipe (`/mon-espace-rh`, WhatsApp) |
| Employé | employé dont la fiche porte l'e-mail de son compte ProJob | son dossier, ses soldes, ses demandes (`/mon-espace-rh`, WhatsApp) |

Un employé est relié à son compte automatiquement si l'e-mail de sa fiche est celui de son compte
candidat ProJob, que le compte existe déjà ou qu'il soit créé plus tard.

## 5. Règles de congés (paramétrables)

- Congé annuel : 2,5 jours ouvrables acquis par mois de service complet (Code du travail
  L/2014/072/CNT, art. 222.8). Taux modifiable dans Paramètres → Types de congé.
- Les jours décomptés sont les jours ouvrés (lundi à vendredi), hors jours fériés.
- Jours fériés à date fixe 2026–2027 préremplis ; les fêtes religieuses s'ajoutent chaque année.
- Reprise des soldes existants : fiche employé → « Ajuster un solde ».

À faire valider par un juriste ou un comptable guinéen avant la commercialisation.

## 6. Bot WhatsApp

Actions ajoutées à `bot-api` : `hr_summary`, `hr_request_leave`, `hr_decide`, `hr_cancel`.
Botpress : voir `docs/BOT_BOTPRESS.md` (schéma de l'action `projob` et section 7 des instructions).
