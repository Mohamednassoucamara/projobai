// Client Supabase pour ProJob AI
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

// Construire l'URL Supabase à partir du projectId
const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseAnonKey = publicAnonKey;

// Créer le client Supabase avec le typage de la base de données
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persister la session dans le localStorage
    persistSession: true,

    // Rafraîchir automatiquement le token
    autoRefreshToken: true,

    // Détecter la session dans l'URL (pour les liens de confirmation email)
    detectSessionInUrl: true,

    // Redirection après confirmation email (optionnel)
    // redirectTo: window.location.origin,
  },

  // Options globales pour les requêtes
  global: {
    headers: {
      'x-application-name': 'ProJob AI',
    },
  },

  // Configuration du realtime (optionnel)
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper pour gérer les erreurs Supabase
export function handleSupabaseError(error: any): string {
  if (!error) return 'Une erreur inconnue est survenue';

  // Erreurs d'authentification
  if (error.message?.includes('Invalid login credentials')) {
    return 'Email ou mot de passe incorrect';
  }
  if (error.message?.includes('Email not confirmed')) {
    return 'Veuillez confirmer votre email avant de vous connecter';
  }
  if (error.message?.includes('User already registered')) {
    return 'Un compte existe déjà avec cet email';
  }

  // Erreurs de validation
  if (error.message?.includes('duplicate key')) {
    return 'Cette entrée existe déjà';
  }
  if (error.message?.includes('violates foreign key')) {
    return 'Référence invalide';
  }

  // Erreurs RLS (Row Level Security)
  if (error.message?.includes('new row violates row-level security')) {
    return 'Vous n\'avez pas les permissions nécessaires';
  }

  // Erreur générique
  return error.message || 'Une erreur est survenue';
}

// Helper pour vérifier si l'utilisateur est connecté
export async function isAuthenticated(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

// Helper pour récupérer l'ID de l'utilisateur connecté
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

// Écouter les changements d'état d'authentification
export function onAuthStateChange(callback: (authenticated: boolean, userId: string | null) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    const authenticated = !!session;
    const userId = session?.user?.id || null;

    // Log les événements d'auth en développement
    if (import.meta.env.DEV) {
      console.log('Auth state changed:', event, { authenticated, userId });
    }

    callback(authenticated, userId);
  });
}

// Export par défaut du client
export default supabase;
