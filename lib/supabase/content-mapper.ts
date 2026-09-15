import crypto from 'crypto';

/**
 * Returns a valid deterministic UUID (UUID v4 format based on MD5)
 * for external or non-UUID content IDs (e.g. 'mb-12345' or 'moviebox:12345').
 * If the input is already a valid UUID, returns it unchanged.
 */
export function toDeterministicUuid(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) {
    return id;
  }

  const hash = crypto.createHash('md5').update(`cinevault:${id}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
