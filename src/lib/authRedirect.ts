/** Redirection après inscription (session active, pas de confirmation email). */
export function redirectAfterSignup(): void {
  window.location.replace('/');
}
