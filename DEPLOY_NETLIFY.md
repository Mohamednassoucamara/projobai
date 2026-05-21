# Déployer ProJob AI sur Netlify avec Supabase

Site de production : **https://projobai.netlify.app**

## 1. Variables d'environnement sur Netlify

Dans [Netlify](https://app.netlify.com) → votre site → **Site configuration** → **Environment variables**, ajoutez :

| Variable | Valeur |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://zafrxknqtkzermookggk.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Clé **anon** ou **publishable** (Settings → API dans Supabase) |
| `VITE_APP_URL` | `https://projobai.netlify.app` |

Puis **Trigger deploy** → **Clear cache and deploy site** (obligatoire après changement de variables Vite).

## 2. Authentification Supabase (URLs autorisées)

Dans [Supabase Dashboard](https://app.supabase.com/project/zafrxknqtkzermookggk/auth/url-configuration) → **Authentication** → **URL Configuration** :

- **Site URL** : `https://projobai.netlify.app`
- **Redirect URLs** (ajoutez chaque ligne) :
  - `https://projobai.netlify.app`
  - `https://projobai.netlify.app/**
  - `http://localhost:5173`
  - `http://localhost:5173/**`

Sans ces URLs, la connexion et les emails de confirmation échoueront en production.

## 3. CORS / API

Le client front appelle directement `*.supabase.co`. Aucune règle CORS supplémentaire n'est requise pour le navigateur si vous utilisez la clé **anon** / **publishable** (pas la `service_role` côté front).

## 4. Vérification

1. Ouvrez https://projobai.netlify.app
2. Créez un compte ou connectez-vous
3. Dans l'onglet **Network** du navigateur, les requêtes doivent aller vers `zafrxknqtkzermookggk.supabase.co` (statut 200 ou 401 selon l'action)

## 5. Développement local

```bash
cp .env.example .env
# Renseignez VITE_SUPABASE_ANON_KEY dans .env
npm install
npm run dev
```
