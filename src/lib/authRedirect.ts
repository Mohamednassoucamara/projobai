/** Espace de l'utilisateur connecté selon son type de compte. */
export function dashboardPath(type?: string | null): string {
  return type === 'company' ? '/company/dashboard' : '/dashboard';
}

/** Redirection après inscription (session active, pas de confirmation email) : directement vers son espace. */
export function redirectAfterSignup(type: 'candidate' | 'company' = 'candidate'): void {
  window.location.replace(dashboardPath(type));
}
