# 🚀 Démarrage Rapide - ProJob AI avec Supabase

## ✅ Configuration terminée !

Votre application ProJob AI est maintenant **connectée à Supabase** !

## 📦 Ce qui a été configuré automatiquement

- ✅ Client Supabase installé et configuré
- ✅ Variables d'environnement créées (`.env.local`)
- ✅ Services métier prêts à l'emploi
- ✅ Types TypeScript générés
- ✅ Migrations SQL préparées

## 🎯 Prochaine étape : Créer les tables

**⚠️ IMPORTANT** : Vous devez maintenant créer les tables dans Supabase.

### Procédure rapide (5 minutes) :

1. **Ouvrez** [Supabase Dashboard](https://app.supabase.com/project/zafrxknqtkzermookggk)

2. **Cliquez sur** "SQL Editor" dans le menu de gauche

3. **Exécutez la migration principale** :
   - Nouvelle query
   - Copiez tout le contenu de `supabase/migrations/001_initial_schema.sql`
   - Collez et cliquez sur "Run"
   - Attendez 10-20 secondes

4. **Exécutez la migration du storage** :
   - Nouvelle query
   - Copiez tout le contenu de `supabase/storage.sql`
   - Collez et cliquez sur "Run"

5. **Vérifiez** :
   - Table Editor → Vous devriez voir 15 tables
   - Storage → Vous devriez voir 4 buckets

📖 **Guide détaillé** : Consultez `MIGRATIONS_GUIDE.md` pour les instructions complètes.

## 🧪 Test rapide

Une fois les migrations exécutées, testez votre configuration :

```typescript
// Dans la console du navigateur ou un composant de test
import { supabase } from './src/lib/supabase';

// Test de connexion
const test = async () => {
  const { data, error } = await supabase.from('profiles').select('count');
  console.log('Supabase connecté:', !error);
};

test();
```

## 📁 Structure des fichiers créés

```
/workspaces/default/code/
├── .env.local                          # Variables d'environnement ✅
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql      # À exécuter dans Supabase
│   ├── storage.sql                     # À exécuter dans Supabase
│   ├── seed.sql                        # Données de test (optionnel)
│   └── README.md                       # Documentation
├── src/
│   ├── lib/
│   │   └── supabase.ts                 # Client Supabase ✅
│   ├── services/
│   │   └── supabase.service.ts         # Services métier ✅
│   └── types/
│       └── database.types.ts           # Types TypeScript ✅
├── utils/supabase/
│   └── info.tsx                        # Info projet (auto-généré) ✅
├── MIGRATIONS_GUIDE.md                 # Guide de migration
├── SUPABASE_SETUP.md                   # Guide complet
└── BACKEND_SUMMARY.md                  # Résumé du backend
```

## 🔧 Services disponibles

Une fois les migrations exécutées, vous aurez accès à :

### AuthService
```typescript
import { authService } from './src/services/supabase.service';

// Créer un compte
await authService.signUp(email, password, fullName, 'candidate');

// Se connecter
await authService.signIn(email, password);

// Récupérer l'utilisateur
const user = await authService.getCurrentUser();
```

### CandidateService
```typescript
import { candidateService } from './src/services/supabase.service';

// Récupérer le profil complet
const profile = await candidateService.getProfile(candidateId);

// Ajouter une expérience
await candidateService.addExperience({
  candidate_id: userId,
  title: 'Développeur',
  company: 'Tech Corp',
  start_date: '2020-01-01',
  description: ['Développement web']
});
```

### JobService
```typescript
import { jobService } from './src/services/supabase.service';

// Récupérer les offres actives
const jobs = await jobService.getActiveJobs({
  location: 'Conakry',
  limit: 20
});

// Rechercher
const results = await jobService.searchJobs('développeur');
```

### StorageService
```typescript
import { storageService } from './src/services/supabase.service';

// Upload un avatar
const avatarUrl = await storageService.uploadAvatar(userId, file);

// Upload un CV
const cvUrl = await storageService.uploadCV(userId, pdfFile);
```

## 🔄 Intégrer dans l'application existante

Pour remplacer le localStorage par Supabase dans `AuthContext` :

```typescript
// Dans src/app/contexts/AuthContext.tsx
import { authService } from '../services/supabase.service';

const login = async (email: string, password: string, type: 'candidate' | 'company') => {
  const result = await authService.signIn(email, password);
  
  if (result.success) {
    // Récupérer le profil
    const profile = await authService.getCurrentProfile();
    setUser({
      name: profile.full_name,
      email: profile.email,
      type: profile.user_type,
    });
    return true;
  }
  return false;
};
```

## 📊 Tables disponibles

Après migration, vous aurez accès à :

| Table | Description |
|-------|-------------|
| `profiles` | Profils utilisateurs de base |
| `candidate_profiles` | Profils détaillés candidats |
| `company_profiles` | Profils entreprises |
| `experiences` | Expériences professionnelles |
| `education` | Formations |
| `skills` | Compétences |
| `languages` | Langues |
| `jobs` | Offres d'emploi |
| `applications` | Candidatures |
| `cvs` | CV sauvegardés |
| `cover_letters` | Lettres de motivation |
| `interview_sessions` | Sessions d'entretien |
| `notifications` | Notifications |
| `favorite_jobs` | Favoris candidats |
| `favorite_candidates` | Favoris entreprises |

## 🎨 Fonctionnalités prêtes

Toutes ces fonctionnalités sont **prêtes à l'emploi** une fois les migrations exécutées :

- ✅ Authentification sécurisée (inscription, connexion, session)
- ✅ Profils utilisateurs (candidats et entreprises)
- ✅ Création et gestion de CV complets
- ✅ Publication d'offres d'emploi
- ✅ Système de candidatures
- ✅ Upload de fichiers (PDF, images)
- ✅ Notifications en temps réel
- ✅ Recherche et filtres avancés
- ✅ Favoris et recommandations
- ✅ Historique d'entretiens

## 🚨 Important

⚠️ **N'oubliez pas** : Les migrations SQL doivent être exécutées dans Supabase pour que l'application fonctionne.

Sans les migrations, vous verrez des erreurs type :
- "relation 'profiles' does not exist"
- "Failed to fetch"

## 📞 Support

- **Problème avec les migrations** → Consultez `MIGRATIONS_GUIDE.md`
- **Questions techniques** → Consultez `SUPABASE_SETUP.md`
- **Architecture backend** → Consultez `BACKEND_SUMMARY.md`
- **Documentation Supabase** → https://supabase.com/docs

---

**Prêt ?** Allez dans Supabase et exécutez les migrations ! 🚀
