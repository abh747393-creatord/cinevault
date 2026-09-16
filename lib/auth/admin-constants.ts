export const ADMIN_EMAIL = 'abh747393@gmail.com';

export function normalizeEmail(email?: string | null): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

export function isAuthorizedAdminEmail(email?: string | null): boolean {
  return normalizeEmail(email) === ADMIN_EMAIL;
}
