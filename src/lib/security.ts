// ─── Validation ──────────────────────────────────────────────────────────────

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim()) && email.length <= 254;
}

export function validatePassword(password: string): { valid: boolean; error: string } {
  if (password.length < 8)
    return { valid: false, error: "Le mot de passe doit contenir au moins 8 caractères." };
  if (!/[A-Z]/.test(password))
    return { valid: false, error: "Le mot de passe doit contenir au moins une majuscule." };
  if (!/[0-9]/.test(password))
    return { valid: false, error: "Le mot de passe doit contenir au moins un chiffre." };
  return { valid: true, error: "" };
}

// Strip HTML tags to prevent XSS when storing user text in DB
export function sanitizeText(value: string, maxLength = 5000): string {
  return value
    .replace(/<[^>]*>/g, "")           // strip HTML tags
    .replace(/javascript:/gi, "")      // kill JS protocol
    .slice(0, maxLength);
}

// Ensure redirect is same-origin (prevent open-redirect attacks)
export function safeRedirectUrl(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = new URL(decoded, window.location.origin);
    if (parsed.origin !== window.location.origin) return fallback;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}

// ─── Rate limiter (frontend, stored in sessionStorage) ───────────────────────

const RATE_LIMIT_KEY = "login_attempts";
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
}

export function recordLoginAttempt(): void {
  const now = Date.now();
  const raw = sessionStorage.getItem(RATE_LIMIT_KEY);
  let record: RateLimitRecord = raw ? JSON.parse(raw) : { attempts: 0, firstAttemptAt: now };

  if (now - record.firstAttemptAt > WINDOW_MS) {
    // Window expired – reset
    record = { attempts: 1, firstAttemptAt: now };
  } else {
    record.attempts += 1;
  }
  sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(record));
}

export function isRateLimited(): boolean {
  const raw = sessionStorage.getItem(RATE_LIMIT_KEY);
  if (!raw) return false;
  const record: RateLimitRecord = JSON.parse(raw);
  const now = Date.now();
  if (now - record.firstAttemptAt > WINDOW_MS) {
    sessionStorage.removeItem(RATE_LIMIT_KEY);
    return false;
  }
  return record.attempts >= MAX_ATTEMPTS;
}

export function rateLimitSecondsRemaining(): number {
  const raw = sessionStorage.getItem(RATE_LIMIT_KEY);
  if (!raw) return 0;
  const record: RateLimitRecord = JSON.parse(raw);
  const elapsed = Date.now() - record.firstAttemptAt;
  return Math.max(0, Math.ceil((WINDOW_MS - elapsed) / 1000));
}

export function resetRateLimit(): void {
  sessionStorage.removeItem(RATE_LIMIT_KEY);
}

// ─── File upload validation ───────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ["application/pdf"];
const MAX_FILE_SIZE_MB = 10;

export function validateUploadedFile(file: File): { valid: boolean; error: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type))
    return { valid: false, error: "Seuls les fichiers PDF sont acceptés." };
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024)
    return { valid: false, error: `Le fichier ne doit pas dépasser ${MAX_FILE_SIZE_MB} Mo.` };
  return { valid: true, error: "" };
}
