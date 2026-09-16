import { getBrowserClient } from '@/lib/supabase/client';

/**
 * Authenticated fetch helper for administrative API calls.
 * Automatically injects the Supabase JWT Bearer token into the Authorization header.
 */
export async function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const supabase = getBrowserClient();
  let token: string | undefined;

  if (supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      token = session?.access_token;
    } catch {}
  }

  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
