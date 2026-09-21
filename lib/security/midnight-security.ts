import crypto from 'crypto';

export const DEFAULT_INITIAL_PASSCODE_HASH =
  'pbkdf2:sha512:100000:7d5a3bef458029c7f4ff3ecbeda913c1:388f8cac8e730bdc46de93fee1f764e2b3487785ffb57da0432acf296e8e82d1f5f3a21d7f1fbace6e78cd6018dac6f9b466ddb07a11560d2d8169a8ea88f5cd';

/**
 * Hash a passcode securely using PBKDF2-HMAC-SHA512 with a 16-byte random salt and 100,000 iterations.
 */
export function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 100000;
  const digest = 'sha512';
  const keyLength = 64;
  const hash = crypto.pbkdf2Sync(passcode, salt, iterations, keyLength, digest).toString('hex');
  return ['pbkdf2', digest, iterations.toString(), salt, hash].join(':');
}

/**
 * Verify a passcode against a stored PBKDF2 hash using timing-safe comparison.
 */
export function verifyPasscode(passcode: string, storedHash: string): boolean {
  try {
    if (!passcode || !storedHash) return false;
    const parts = storedHash.split(':');
    if (parts.length !== 5) return false;

    const [algo, digest, iterStr, salt, expectedHash] = parts;
    if (algo !== 'pbkdf2') return false;

    const iterations = parseInt(iterStr, 10);
    if (isNaN(iterations) || iterations < 10000) return false;

    const actualHash = crypto.pbkdf2Sync(passcode, salt, iterations, 64, digest).toString('hex');

    const actualBuffer = Buffer.from(actualHash, 'hex');
    const expectedBuffer = Buffer.from(expectedHash, 'hex');

    if (actualBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

// In-memory brute-force rate limiter: Max 5 failed attempts per 15 minutes per IP
interface RateLimitRecord {
  failures: number;
  lastAttempt: number;
  blockedUntil: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up stale entries every 30 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    rateLimitMap.forEach((rec, ip) => {
      if (now - rec.lastAttempt > 30 * 60 * 1000) {
        rateLimitMap.delete(ip);
      }
    });
  }, 30 * 60 * 1000).unref?.();
}

export function checkPasscodeRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record) {
    return { allowed: true };
  }

  if (record.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { failures: 0, lastAttempt: now, blockedUntil: 0 };

  // Reset window if last attempt was more than 15 minutes ago
  if (now - record.lastAttempt > 15 * 60 * 1000) {
    record.failures = 1;
  } else {
    record.failures += 1;
  }

  record.lastAttempt = now;

  if (record.failures >= 5) {
    record.blockedUntil = now + 15 * 60 * 1000; // 15-minute lockout
  }

  rateLimitMap.set(ip, record);
}

export function resetFailedAttempts(ip: string): void {
  rateLimitMap.delete(ip);
}
