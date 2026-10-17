# ProJob AI : activer l'IA et les nouveautés

Ce guide accompagne la branche `feature/ameliorations-plateforme`.

## Ce qui a changé

| Module | Avant | Maintenant |
|---|---|---|
| Coach entretien | Note aléatoire (`Math.random`), retours identiques pour tous | Questions adaptées au poste et au CV, note sur 10 argumentée, exemple de meilleure réponse et bilan final par l'IA. Sans IA : questions standard et évaluation déterministe (longueur, chiffres, exemple vécu) |
| Lettre de motivation | Modèle figé | Rédaction par l'IA à partir du CV et de l'offre ; le modèle reste en secours. Export PDF réel (plus d'impression navigateur) |
| CV | Éditeur sans expériences, formations ni langues ; perdu à la fermeture de l'onglet | Éditeur complet, enregistrement automatique dans la table `cvs`, bouton « Optimiser avec l'IA » (avec annulation), choix d'être visible dans la CVthèque |
| Assistant CV | 7 questions (identité, compétences) | 11 étapes, dont l'expérience, les missions, le diplôme et les langues |
| Offres | Offres fictives (Orange, BCRG, MTN…) affichées si la base est vide | Vraies offres uniquement, avec un message clair si la liste est vide. Score de compatibilité CV ↔ offre, tri par compatibilité, détail des compétences présentes ou manquantes |
| Tableau de bord candidat | « 95 % / 88 % / 82 % » codés en dur | Les 3 offres réellement les plus compatibles |
| Recruteur | Statut des candidatures non modifiable | Boutons Présélectionner, Entretien, Retenir, Refuser (avec confirmation) ; le candidat reçoit une notification |
| Recherche de profils | 4 profils fictifs | CVthèque réelle : seulement les candidats qui ont accepté d'être visibles, sans téléphone ni e-mail. Classement selon une de vos offres, favoris |
| Chatbot Botpress | Bloqué par la politique de sécurité (CSP) | Domaines Botpress autorisés dans `vite.config.ts` et `public/_headers` |

## Mise en service (3 étapes)

### 1. Appliquer la migration SQL
Dans Supabase, ouvrez **SQL Editor** et exécutez `supabase/migrations/009_cvtheque_notifications.sql`. Cette migration ajoute :
- la colonne `candidate_profiles.is_searchable` (visibilité dans la CVthèque, désactivée par défaut) ;
- la fonction `search_candidates` (réservée aux comptes entreprise) ;
- un déclencheur qui notifie le candidat à chaque changement de statut.

### 2. Déployer la fonction IA
La clé de l'API Claude reste côté serveur et n'apparaît jamais dans le navigateur.

```bash
supabase login
supabase link --project-ref zafrxknqtkzermookggk
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...           # clé créée sur console.anthropic.com
supabase secrets set AI_MODEL=claude-haiku-5-5               # optionnel : modèle rapide et économique
supabase secrets set ALLOWED_ORIGINS=https://projobai.netlify.app,http://localhost:5173
supabase functions deploy ai-assistant
```

Seuls les utilisateurs connectés peuvent appeler la fonction : Supabase vérifie leur jeton.

### 3. Redéployer le site
Poussez la branche, puis fusionnez-la dans `main` : Netlify reconstruit le site automatiquement.

## Tant que l'IA n'est pas activée
Toutes les pages fonctionnent. Elles affichent « L'assistant IA n'est pas encore activé » et utilisent la version standard : modèle de lettre, banque de questions, évaluation simplifiée. Rien ne casse.

## Coût indicatif
Une session d'entretien comprend environ 7 appels courts, et une lettre en demande un. Avec un modèle Haiku, cela représente quelques centimes de dollar par candidat actif et par mois. Pour en garder la maîtrise, fixez une limite de dépense mensuelle dans la console Anthropic.

## Fichiers ajoutés ou modifiés
- `supabase/functions/ai-assistant/index.ts` : fonction IA (nouveau)
- `supabase/migrations/009_cvtheque_notifications.sql` : nouveau
- `src/services/ai.service.ts`, `src/lib/matching.ts` : nouveaux
- `src/app/contexts/CVDataContext.tsx` : restauré, puis complété avec la sauvegarde Supabase
- Pages : `CVEdit`, `CVAssistant`, `CoverLetter`, `InterviewPrep`, `JobList`, `JobDetail`, `DashboardCandidate`, `DashboardCompany`, `SearchProfiles`
- `src/app/components/CompanyApplicationItem.tsx`, `src/types/database.types.ts`, `vite.config.ts`, `public/_headers`
