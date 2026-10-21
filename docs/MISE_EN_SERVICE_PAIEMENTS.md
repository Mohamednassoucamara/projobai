# Mise en service : abonnements Premium et paiement Djomy

## Formules

| Formule | Prix | Débloque |
|---|---|---|
| Candidat Premium | 20 000 GNF / mois · 200 000 GNF / an | CV optimisé par l'IA, CV adapté à une offre, coaching carrière, coach d'entretien IA |
| Entreprise Premium | 50 000 GNF / mois · 500 000 GNF / an | Extraction IA des CV et classement, entretiens, statistiques RH, partage des offres avec suivi des sources, historique et commentaires |

Chaque nouveau compte a **7 jours d'essai Premium**. Les comptes existants ont leurs 7 jours
à partir de l'exécution de la migration 012. Pas de renouvellement automatique : l'utilisateur
paie un mois ou un an, puis renouvelle (rappel envoyé 3 jours avant la fin).

Prix, textes et fonctionnalités : Supabase → Table Editor → `plans` (aucun code à changer).
Durée de l'essai : table `billing_settings`, colonne `trial_days` (0 = pas d'essai).

## 1. Base de données

Supabase → SQL Editor : exécuter `supabase/migrations/012_abonnements_paiements.sql`.

## 2. Djomy

1. Dans l'espace marchand Djomy, récupérer le **clientId** et le **clientSecret** (espace développeur).
2. Déclarer l'URL des webhooks (version V2) :
   `https://zafrxknqtkzermookggk.supabase.co/functions/v1/djomy-webhook`
3. Enregistrer les secrets :

```bash
npx supabase secrets set DJOMY_CLIENT_ID=votre_client_id
npx supabase secrets set DJOMY_CLIENT_SECRET=votre_client_secret
```

Par défaut, les paiements passent par le **bac à sable** Djomy (`https://sandbox-api.djomy.africa`),
où aucun argent réel n'est débité. Pour encaisser réellement, demander à Djomy l'adresse de
production et l'enregistrer :

```bash
npx supabase secrets set DJOMY_BASE_URL=https://adresse-de-production-fournie-par-djomy
```

## 3. Déployer les fonctions

```bash
npx supabase functions deploy djomy-payment
npx supabase functions deploy djomy-webhook --no-verify-jwt
npx supabase functions deploy ai-assistant
npx supabase functions deploy notify-dispatch --no-verify-jwt
```

## 4. Activer un abonnement à la main (espèces, virement, geste commercial)

Dans le SQL Editor :

```sql
SELECT public.grant_subscription('adresse@exemple.gn', 'entreprise_premium', 'year');
-- formules : candidat_premium, entreprise_premium ; durée : 'month' ou 'year'
```

## Sécurité

- Le Premium n'est activé qu'après confirmation par Djomy : webhook signé (HMAC avec le
  clientSecret) ou vérification du statut auprès de l'API Djomy. L'adresse de retour seule ne suffit pas.
- Les fonctions Premium sont contrôlées côté serveur (base de données et fonction IA),
  pas seulement dans l'interface.
