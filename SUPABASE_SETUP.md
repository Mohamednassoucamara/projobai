# 🚀 Guide de Configuration Supabase pour ProJob AI

## Étape 1 : Connecter Supabase à Make

1. **Ouvrez la page des paramètres Make** de ce fichier
2. **Connectez votre projet Supabase** :
   - Cliquez sur "Connect Supabase"
   - Entrez votre URL de projet Supabase
   - Entrez votre clé Anon publique
   - Validez la connexion

## Étape 2 : Créer la base de données

### Option A : Via le Dashboard Supabase (Recommandé)

1. Connectez-vous à [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Créez une nouvelle query
5. Copiez-collez le contenu du fichier `supabase/migrations/001_initial_schema.sql`
6. Exécutez la query (cliquez sur "Run")

### Option B : Via Supabase CLI

```bash
# Installez Supabase CLI si ce n'est pas déjà fait
npm install -g supabase

# Connectez-vous à votre projet
supabase link --project-ref your-project-ref

# Appliquez les migrations
supabase db push
```

## Étape 3 : Configurer le stockage de fichiers

1. Dans **SQL Editor**, créez une nouvelle query
2. Copiez-collez le contenu du fichier `supabase/storage.sql`
3. Exécutez la query

## Étape 4 : Configurer l'authentification

### Via le Dashboard

1. Allez dans **Authentication** > **Providers**
2. Activez **Email**
3. Configurez les paramètres :
   - ✅ Enable email confirmations (optionnel)
   - ✅ Enable auto-confirm (pour le développement)

### Paramètres recommandés

```json
{
  "email": {
    "enabled": true,
    "autoConfirm": true,
    "passwordMinLength": 6
  }
}
```

## Étape 5 : Variables d'environnement

### Récupérer vos clés

1. Allez dans **Settings** > **API**
2. Copiez :
   - Project URL
   - anon/public key

### Créer le fichier .env.local

Créez un fichier `.env.local` à la racine du projet :

```env
VITE_SUPABASE_URL=https://votre-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Étape 6 : Installer le client Supabase

```bash
pnpm add @supabase/supabase-js
```

## Étape 7 : Créer le client Supabase

Créez le fichier `src/lib/supabase.ts` :

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
```

## Étape 8 : Intégrer l'authentification

### Mettre à jour AuthContext.tsx

```typescript
import { supabase } from '../lib/supabase';

// Dans la fonction login
const login = async (email: string, password: string, type: 'candidate' | 'company') => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Récupérer le profil utilisateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profile) {
      setUser({
        name: profile.full_name,
        email: profile.email,
        type: profile.user_type,
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
};

// Dans la fonction signup
const signup = async (email: string, password: string, fullName: string, type: 'candidate' | 'company') => {
  try {
    // Créer le compte auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    // Créer le profil
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user!.id,
        user_type: type,
        full_name: fullName,
        email,
      });

    if (profileError) throw profileError;

    // Créer le profil spécifique (candidat ou entreprise)
    if (type === 'candidate') {
      await supabase
        .from('candidate_profiles')
        .insert({ id: authData.user!.id });
    } else {
      await supabase
        .from('company_profiles')
        .insert({
          id: authData.user!.id,
          company_name: fullName,
        });
    }

    return true;
  } catch (error) {
    console.error('Signup error:', error);
    return false;
  }
};
```

## Étape 9 : Intégrer le CVDataContext

```typescript
import { supabase } from '../lib/supabase';

// Sauvegarder le CV
const saveCVToDatabase = async (cvData: CVData) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Sauvegarder les expériences
  if (cvData.experiences.length > 0) {
    await supabase
      .from('experiences')
      .upsert(
        cvData.experiences.map(exp => ({
          candidate_id: user.id,
          ...exp
        }))
      );
  }

  // Sauvegarder les compétences
  if (cvData.skills.length > 0) {
    await supabase
      .from('skills')
      .upsert(
        cvData.skills.map(skill => ({
          candidate_id: user.id,
          skill_name: skill
        }))
      );
  }

  // Mettre à jour le profil candidat
  await supabase
    .from('candidate_profiles')
    .update({
      job_title: cvData.jobTitle,
      location: cvData.location,
      profile_summary: cvData.profile,
    })
    .eq('id', user.id);
};
```

## Étape 10 : Tester la connexion

### Test 1 : Créer un compte

```typescript
// Dans votre composant de test
const testSignup = async () => {
  const result = await signup(
    'test@example.com',
    'password123',
    'Mohamed Diallo',
    'candidate'
  );
  console.log('Signup result:', result);
};
```

### Test 2 : Récupérer des données

```typescript
const testFetchJobs = async () => {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('is_active', true)
    .limit(10);

  console.log('Jobs:', data);
  console.log('Error:', error);
};
```

## 🎯 Prochaines étapes

Une fois Supabase connecté, voici les fonctionnalités à implémenter :

1. ✅ **Authentification** - Remplacer le localStorage par Supabase Auth
2. ✅ **Profils utilisateurs** - Sauvegarder les profils dans la DB
3. ✅ **CV et compétences** - Stocker toutes les données CV
4. ✅ **Offres d'emploi** - Charger depuis la DB au lieu de données statiques
5. ✅ **Candidatures** - Gérer les postulations en DB
6. ✅ **Upload de fichiers** - Stocker les CV PDF dans Supabase Storage
7. ✅ **Notifications** - Système de notifications en temps réel
8. ✅ **Recherche** - Recherche avancée d'emplois et de candidats

## 🔍 Vérification

Pour vérifier que tout fonctionne :

1. **Tables créées** : Allez dans Table Editor, vous devriez voir toutes les tables
2. **Storage configuré** : Allez dans Storage, vous devriez voir les 4 buckets
3. **Auth activé** : Allez dans Authentication, vous devriez pouvoir créer un utilisateur

## ❓ Problèmes courants

### "relation does not exist"
- Vérifiez que la migration a bien été exécutée
- Vérifiez qu'il n'y a pas d'erreurs dans les logs SQL

### "JWT expired"
- Les tokens expirent après 1h
- Le client Supabase rafraîchit automatiquement les tokens

### "Row Level Security policy violation"
- Vérifiez que les politiques RLS sont bien créées
- Vérifiez que l'utilisateur est bien authentifié

## 📚 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Note** : Make n'est pas destiné à collecter des données sensibles ou PII en production. Utilisez votre propre infrastructure Supabase sécurisée pour les applications en production.
