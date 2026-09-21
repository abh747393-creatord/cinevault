import crypto from 'crypto';

export const MIDNIGHT_COOKIE_NAME = 'cv_midnight_session';
export const MIDNIGHT_SESSION_TTL_SECONDS = 4 * 60 * 60; // 4 hours

const SECRET_KEY =
  process.env.SESSION_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'cinevault-midnight-secure-hmac-salt-8837194';

export interface MidnightSessionPayload {
  v: number; // Passcode version
  d: boolean; // Disclaimer accepted (18+)
  exp: number; // Expiration timestamp
}

/**
 * Sign a payload using HMAC-SHA256.
 */
export function createMidnightSessionToken(version: number, disclaimerAccepted: boolean): string {
  const exp = Math.floor(Date.now() / 1000) + MIDNIGHT_SESSION_TTL_SECONDS;
  const payload: MidnightSessionPayload = {
    v: version,
    d: disclaimerAccepted,
    exp,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verify a session token signature, expiration, and passcode version.
 */
export function verifyMidnightSessionToken(
  token: string | undefined | null,
  currentVersion: number
): { valid: boolean; disclaimerAccepted: boolean } {
  if (!token) {
    return { valid: false, disclaimerAccepted: false };
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false, disclaimerAccepted: false };
    }

    const [payloadB64, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(payloadB64)
      .digest('base64url');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSignature, 'utf8');

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, disclaimerAccepted: false };
    }

    const payload: MidnightSessionPayload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    );

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return { valid: false, disclaimerAccepted: false }; // Expired
    }

    if (payload.v !== currentVersion) {
      return { valid: false, disclaimerAccepted: false }; // Passcode changed/invalidated
    }

    return {
      valid: true,
      disclaimerAccepted: Boolean(payload.d),
    };
  } catch {
    return { valid: false, disclaimerAccepted: false };
  }
}
