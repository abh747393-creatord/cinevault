import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasAdminPrivileges = Boolean(
  supabaseUrl &&
  serviceRoleKey &&
  serviceRoleKey !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' &&
  !serviceRoleKey.startsWith('your-')
);

export function getAdminClient() {
  if (!hasAdminPrivileges) {
    return null;
  }
  return createClient(supabaseUrl!, serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
