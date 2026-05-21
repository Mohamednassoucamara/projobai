import { projectId, publicAnonKey } from '../../utils/supabase/info';

const defaultUrl = `https://${projectId}.supabase.co`;

/** Clés autorisées dans le navigateur : anon JWT ou publishable (jamais secret / service_role). */
export function isBrowserSafeSupabaseKey(key: string): boolean {
  const k = key.trim();
  if (!k) return false;
  if (k.startsWith('sb_secret_')) return false;
  if (/service[_-]?role/i.test(k)) return false;

  if (k.startsWith('sb_publishable_')) return true;

  const parts = k.split('.');
  if (parts.length === 3 && k.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.role === 'anon';
    } catch {
      return false;
    }
  }

  return false;
}

function resolveAnonKey(): string {
  const fromEnv = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (fromEnv && isBrowserSafeSupabaseKey(fromEnv)) {
    return fromEnv;
  }
  if (fromEnv) {
    console.warn(
      '[ProJob AI] VITE_SUPABASE_ANON_KEY est une clé secrète ou invalide pour le navigateur. ' +
        'Utilisez la clé « anon » ou « publishable » (Supabase → Settings → API). Clé anon du projet utilisée.',
    );
  }
  return publicAnonKey;
}

/** URL et clé : variables VITE_* (Netlify/local) ou valeurs du projet Supabase. */
export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim() || defaultUrl;

export const supabaseAnonKey = resolveAnonKey();

/** Origine de l'app (local ou production Netlify) pour les redirections Auth. */
export function getAppOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return (
    import.meta.env.VITE_APP_URL?.trim() || 'https://projobai.netlify.app'
  );
}

export function assertSupabaseConfig(): void {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Configuration Supabase manquante. Définissez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (Netlify : Site settings → Environment variables).',
    );
  }
  if (!isBrowserSafeSupabaseKey(supabaseAnonKey)) {
    throw new Error(
      'Clé Supabase invalide pour le navigateur. N’utilisez jamais la clé « secret » ou « service_role » côté front.',
    );
  }
}
