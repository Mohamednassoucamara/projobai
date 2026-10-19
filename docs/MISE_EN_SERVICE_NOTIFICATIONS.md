# Mise en service : suivi des candidatures, entretiens et notifications

## 1. Base de données (obligatoire)

Dans Supabase → **SQL Editor**, exécuter dans l'ordre (si ce n'est pas déjà fait) :

1. `supabase/migrations/010_job_skills_policies.sql`
2. `supabase/migrations/011_ats_entretiens_notifications.sql`

La migration 011 active : l'historique et les commentaires des candidatures, les entretiens
(planification, évaluation, compte rendu), les sources des candidatures, le budget de recrutement,
le score de compatibilité côté entreprise, l'accusé de réception au candidat, les convocations et
les rappels d'entretien.

Sans les étapes suivantes, les notifications restent visibles **dans la plateforme** (cloche en haut
du tableau de bord) mais ne partent ni par e-mail ni par WhatsApp.

## 2. E-mail (Resend)

1. Créer un compte sur resend.com et ajouter le domaine `pjob.nassouba.com` (Domains → Add domain),
   puis ajouter chez l'hébergeur DNS les enregistrements indiqués (SPF, DKIM).
2. Créer une clé API (API Keys).
3. Dans un terminal, dans le dossier du projet :

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
supabase secrets set NOTIFY_FROM="ProJob AI <contact@pjob.nassouba.com>"
```

## 3. WhatsApp (API WhatsApp Cloud de Meta)

1. Sur developers.facebook.com : créer une application de type « Business », ajouter le produit WhatsApp,
   enregistrer le numéro WhatsApp Business de ProJob AI.
2. Créer un **modèle de message** (WhatsApp Manager → Modèles) :
   - nom : `projob_notification`
   - catégorie : Utilitaire
   - langue : Français
   - corps :
     ```
     {{1}}

     {{2}}

     ProJob AI — Nassouba Technologie
     ```
   Attendre son approbation par Meta (quelques minutes à 24 h).
3. Créer un jeton d'accès permanent (utilisateur système) et noter l'identifiant du numéro (Phone number ID).
4. Enregistrer les secrets :

```bash
supabase secrets set WHATSAPP_TOKEN=EAAG...
supabase secrets set WHATSAPP_PHONE_NUMBER_ID=1234567890
```

Seuls les utilisateurs qui ont coché « Par WhatsApp » dans les réglages de la cloche reçoivent ces messages.

## 4. Envoi automatique (toutes les minutes)

```bash
supabase secrets set CRON_SECRET=un-mot-de-passe-long-et-aleatoire
supabase functions deploy notify-dispatch --no-verify-jwt
supabase functions deploy ai-assistant
```

Puis ouvrir `supabase/setup_notifications_cron.sql`, remplacer `REMPLACER_PAR_CRON_SECRET` par la même
valeur que `CRON_SECRET`, et l'exécuter dans le **SQL Editor**.

Vérification : Supabase → Edge Functions → notify-dispatch → Logs. Le résultat de chaque envoi est aussi
enregistré dans la colonne `delivery` de la table `notifications`.

## 5. Import de CV et adaptation à une offre

Fonctionnent sans configuration (lecture simple). Avec la fonction `ai-assistant` déployée et la clé
`ANTHROPIC_API_KEY`, la lecture des CV et l'adaptation à une offre utilisent l'IA et sont plus précises.
