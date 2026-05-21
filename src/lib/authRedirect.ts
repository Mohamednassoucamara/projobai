/** Redirection full-page (évite les crash React removeChild sur Netlify). */
export function redirectAfterSignup(
  type: 'candidate' | 'company',
  email: string,
  needsEmailConfirmation: boolean,
): void {
  if (needsEmailConfirmation) {
    const params = new URLSearchParams({ type, email });
    window.location.replace(`/signup/confirmation?${params.toString()}`);
    return;
  }
  window.location.replace(
    type === 'company' ? '/company/dashboard' : '/dashboard',
  );
}
