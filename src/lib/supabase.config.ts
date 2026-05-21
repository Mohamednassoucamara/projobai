import { projectId, publicAnonKey } from '../../utils/supabase/info';

const defaultUrl = `https://${projectId}.supabase.co`;

/** URL et clé : variables VITE_* (Netlify/local) ou valeurs du projet Supabase. */
export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim() || defaultUrl;

export const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || publicAnonKey;

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
}
