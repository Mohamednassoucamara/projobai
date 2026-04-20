# ProJob AI - Backend Supabase

## 📋 Vue d'ensemble

Ce répertoire contient la configuration complète du backend Supabase pour ProJob AI, une plateforme de recrutement intelligente propulsée par l'IA.

## 🗄️ Structure de la base de données

### Tables principales

#### 1. Authentification et Profils
- **profiles** - Profils utilisateurs de base (candidats et entreprises)
- **candidate_profiles** - Profils détaillés des candidats
- **company_profiles** - Profils des entreprises

#### 2. CV et Compétences
- **experiences** - Expériences professionnelles des candidats
- **education** - Formations et diplômes
- **skills** - Compétences techniques
- **languages** - Langues parlées et niveaux
- **cvs** - CV générés et sauvegardés
- **cover_letters** - Lettres de motivation

#### 3. Emplois et Candidatures
- **jobs** - Offres d'emploi publiées par les entreprises
- **job_skills** - Compétences requises pour chaque emploi
- **applications** - Candidatures des candidats

#### 4. Préparation d'entretien
- **interview_sessions** - Sessions d'entraînement aux entretiens
- **interview_answers** - Réponses et scores aux questions

#### 5. Interactions
- **favorite_jobs** - Emplois favoris des candidats
- **favorite_candidates** - Candidats favoris des entreprises
- **notifications** - Système de notifications

## 🔒 Sécurité

### Row Level Security (RLS)

Toutes les tables sont protégées par RLS avec des politiques strictes :

- **Candidats** : Accès complet à leurs propres données
- **Entreprises** : Accès à leurs offres et candidatures reçues
- **Lecture publique** : Offres d'emploi actives et profils entreprises

### Politiques de sécurité

```sql
-- Exemple : Les candidats peuvent uniquement voir leurs propres expériences
CREATE POLICY "Candidates can manage their experiences"
  ON experiences FOR ALL
  USING (candidate_id = auth.uid());
```

## 🚀 Fonctionnalités avancées

### 1. Calcul automatique de complétion du profil

```sql
SELECT calculate_profile_completion('user-uuid');
```

Cette fonction calcule le pourcentage de complétion d'un profil candidat basé sur 10 champs.

### 2. Triggers automatiques

- **update_updated_at** : Met à jour automatiquement le champ `updated_at`
- **update_applications_count** : Incrémente/décrémente le compteur de candidatures

### 3. Indexes optimisés

Des index sont créés sur les champs fréquemment interrogés :
- Recherche d'emplois par localisation
- Filtrage par statut de candidature
- Tri par date de publication

## 📦 Stockage de fichiers

### Buckets Supabase Storage

1. **avatars** - Photos de profil des utilisateurs
2. **cvs** - CV au format PDF
3. **company-logos** - Logos des entreprises
4. **application-documents** - Documents de candidature

### Configuration recommandée

```typescript
// Taille maximale : 2MB pour les avatars, 10MB pour les CV
const avatarBucket = {
  name: 'avatars',
  public: true,
  fileSizeLimit: 2097152, // 2MB
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg']
};

const cvBucket = {
  name: 'cvs',
  public: false,
  fileSizeLimit: 10485760, // 10MB
  allowedMimeTypes: ['application/pdf']
};
```

## 🔧 Migration

### Exécuter les migrations

1. **Via Supabase Dashboard** :
   - Allez dans SQL Editor
   - Copiez le contenu de `migrations/001_initial_schema.sql`
   - Exécutez le script

2. **Via Supabase CLI** (recommandé) :
```bash
supabase db push
```

## 📊 Diagramme de relations

```
profiles (auth.users)
├── candidate_profiles
│   ├── experiences
│   ├── education
│   ├── skills
│   ├── languages
│   ├── cvs
│   ├── cover_letters
│   ├── interview_sessions
│   │   └── interview_answers
│   ├── applications
│   └── favorite_jobs
└── company_profiles
    ├── jobs
    │   ├── job_skills
    │   └── applications
    └── favorite_candidates
```

## 🔑 Variables d'environnement

Créez un fichier `.env.local` à la racine du projet :

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 🛠️ API Routes recommandées

### Candidats
- `GET /api/candidates/:id/profile` - Récupérer le profil complet
- `PUT /api/candidates/:id/profile` - Mettre à jour le profil
- `GET /api/candidates/:id/cv` - Récupérer le CV
- `POST /api/candidates/:id/applications` - Postuler à une offre

### Entreprises
- `GET /api/companies/:id/jobs` - Liste des offres
- `POST /api/companies/:id/jobs` - Créer une offre
- `GET /api/companies/:id/applications` - Candidatures reçues
- `PUT /api/applications/:id/status` - Mettre à jour le statut

### Emplois
- `GET /api/jobs` - Liste des offres (avec filtres)
- `GET /api/jobs/:id` - Détails d'une offre
- `POST /api/jobs/:id/view` - Incrémenter les vues

## 📈 Performance

### Recommandations

1. **Pagination** : Utilisez `limit` et `offset` pour les grandes listes
2. **Select spécifique** : Ne sélectionnez que les colonnes nécessaires
3. **Indexes** : Les indexes sont déjà créés sur les champs critiques
4. **Cache** : Utilisez le cache client pour les données statiques

### Exemple de requête optimisée

```typescript
const { data, error } = await supabase
  .from('jobs')
  .select('id, title, company_id, location, job_type, published_at')
  .eq('is_active', true)
  .order('published_at', { ascending: false })
  .limit(20)
  .range(0, 19);
```

## 🧪 Tests

### Données de test

Le fichier de migration contient des exemples de données commentés. Décommentez-les pour les tests locaux.

### Requêtes de test

```sql
-- Vérifier qu'un candidat peut voir son profil
SELECT * FROM candidate_profiles WHERE id = auth.uid();

-- Vérifier qu'une entreprise peut voir ses offres
SELECT * FROM jobs WHERE company_id = auth.uid();

-- Calculer la complétion du profil
SELECT calculate_profile_completion('user-uuid');
```

## 📝 Logs et Monitoring

Activez les logs dans Supabase Dashboard :
- **Query Performance** : Identifiez les requêtes lentes
- **Database Health** : Surveillez l'utilisation
- **Auth Logs** : Suivez les connexions/déconnexions

## 🔄 Backup et Restauration

1. **Backup automatique** : Configuré dans Supabase (quotidien recommandé)
2. **Export manuel** : Via Supabase Dashboard > Database > Backups
3. **Restauration** : Via le même menu

## 📞 Support

Pour les problèmes liés à Supabase :
1. Documentation : https://supabase.com/docs
2. Discord : https://discord.supabase.com
3. GitHub Issues : https://github.com/supabase/supabase/issues

## 🚨 Notes importantes

⚠️ **Make n'est pas destiné à la production** : Cette configuration est pour le développement et les prototypes. Pour une application en production, déployez votre propre infrastructure Supabase.

⚠️ **PII et données sensibles** : Ne collectez pas d'informations personnelles identifiables sensibles via Make. Utilisez votre propre backend sécurisé pour les données critiques.

⚠️ **Limites** : Vérifiez les limites de votre plan Supabase (stockage, bande passante, etc.)
