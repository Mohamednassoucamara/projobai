# 🚀 Guide de Migration - ProJob AI

## ✅ Supabase connecté !

Votre projet Supabase est maintenant connecté. Il ne reste plus qu'à créer les tables de la base de données.

## 📋 Étapes à suivre

### Étape 1 : Accéder au Dashboard Supabase

1. Allez sur [https://app.supabase.com](https://app.supabase.com)
2. Sélectionnez votre projet : **zafrxknqtkzermookggk**
3. Cliquez sur **SQL Editor** dans le menu de gauche

### Étape 2 : Créer les tables de la base de données

1. Dans SQL Editor, cliquez sur **"New query"**
2. Ouvrez le fichier `supabase/migrations/001_initial_schema.sql`
3. **Copiez TOUT le contenu** du fichier
4. **Collez-le** dans l'éditeur SQL
5. Cliquez sur **"Run"** (ou Ctrl+Enter)
6. Attendez que l'exécution se termine (cela peut prendre 10-20 secondes)

✅ Vous devriez voir un message de succès : "Success. No rows returned"

### Étape 3 : Configurer le stockage de fichiers

1. Toujours dans SQL Editor, créez une **nouvelle query**
2. Ouvrez le fichier `supabase/storage.sql`
3. **Copiez tout le contenu**
4. **Collez-le** dans l'éditeur SQL
5. Cliquez sur **"Run"**

✅ Vous devriez voir les buckets créés

### Étape 4 : Vérifier que tout fonctionne

1. Allez dans **Table Editor** (menu de gauche)
2. Vous devriez voir **15 tables** :
   - ✅ profiles
   - ✅ candidate_profiles
   - ✅ company_profiles
   - ✅ experiences
   - ✅ education
   - ✅ skills
   - ✅ languages
   - ✅ jobs
   - ✅ job_skills
   - ✅ applications
   - ✅ cvs
   - ✅ cover_letters
   - ✅ interview_sessions
   - ✅ interview_answers
   - ✅ favorite_jobs
   - ✅ favorite_candidates
   - ✅ notifications

3. Allez dans **Storage** (menu de gauche)
4. Vous devriez voir **4 buckets** :
   - ✅ avatars
   - ✅ cvs
   - ✅ company-logos
   - ✅ application-documents

### Étape 5 : (Optionnel) Ajouter des données de test

Si vous voulez des données de test pour développer :

1. Dans SQL Editor, créez une **nouvelle query**
2. Ouvrez le fichier `supabase/seed.sql`
3. **Décommentez** les données que vous voulez (supprimez les `/*` et `*/`)
4. **Important** : Remplacez les UUIDs par de vrais IDs d'utilisateurs
5. Pour créer des utilisateurs de test :
   - Allez dans **Authentication** > **Users**
   - Cliquez sur **"Add user"**
   - Créez quelques utilisateurs
   - Notez leurs UUIDs
   - Utilisez ces UUIDs dans le fichier seed.sql
6. Exécutez la query

## 🎉 C'est terminé !

Votre backend Supabase est maintenant **entièrement configuré** et prêt à l'emploi !

## 🔍 Comment tester

### Test 1 : Créer un compte

1. Dans votre application, essayez de créer un nouveau compte
2. Allez dans Supabase Dashboard > **Authentication** > **Users**
3. Vous devriez voir le nouvel utilisateur !
4. Allez dans **Table Editor** > **profiles**
5. Vous devriez voir le profil créé !

### Test 2 : Vérifier les données

```sql
-- Dans SQL Editor, exécutez :
SELECT COUNT(*) as total_tables 
FROM information_schema.tables 
WHERE table_schema = 'public';
-- Résultat attendu : 15

SELECT COUNT(*) as total_buckets 
FROM storage.buckets;
-- Résultat attendu : 4
```

## ❓ Problèmes courants

### Erreur : "relation already exists"
- **Cause** : Les tables existent déjà
- **Solution** : C'est normal si vous relancez le script. Ignorez l'erreur.

### Erreur : "permission denied"
- **Cause** : Problème de permissions
- **Solution** : Vérifiez que vous êtes bien connecté en tant que propriétaire du projet

### Les tables n'apparaissent pas
- **Cause** : Le script n'a pas été exécuté complètement
- **Solution** : Vérifiez les logs d'erreur dans SQL Editor et relancez

## 📚 Prochaines étapes

Une fois les migrations exécutées, l'application ProJob AI utilisera automatiquement Supabase pour :

- ✅ **Authentification** : Créer et gérer les comptes utilisateurs
- ✅ **Profils** : Stocker les profils candidats et entreprises
- ✅ **CV** : Sauvegarder expériences, formations, compétences
- ✅ **Emplois** : Publier et gérer les offres d'emploi
- ✅ **Candidatures** : Suivre toutes les candidatures
- ✅ **Fichiers** : Upload de CV PDF, photos de profil, logos

## 🔗 Liens utiles

- **Dashboard Supabase** : https://app.supabase.com/project/zafrxknqtkzermookggk
- **Documentation** : https://supabase.com/docs
- **Table Editor** : https://app.supabase.com/project/zafrxknqtkzermookggk/editor
- **SQL Editor** : https://app.supabase.com/project/zafrxknqtkzermookggk/sql
- **Storage** : https://app.supabase.com/project/zafrxknqtkzermookggk/storage/buckets

---

**Besoin d'aide ?** Consultez le fichier `SUPABASE_SETUP.md` pour plus de détails.
