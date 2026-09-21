import { getAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { DEFAULT_INITIAL_PASSCODE_HASH } from './midnight-security';

export interface MidnightSettings {
  enabled: boolean;
  passcodeHash: string;
  passcodeVersion: number;
  updatedAt: string;
  updatedBy: string;
}

// In-memory runtime cache ensuring synchronized state across serverless invocations
let cachedSettings: MidnightSettings = {
  enabled: true,
  passcodeHash: DEFAULT_INITIAL_PASSCODE_HASH,
  passcodeVersion: 1,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

let lastDbFetchTime = 0;
const DB_SYNC_INTERVAL_MS = 10000; // 10 seconds

/**
 * Retrieve current Midnight access settings from database or in-memory store.
 */
export async function getMidnightSettings(): Promise<MidnightSettings> {
  const now = Date.now();

  // If Supabase is available and sync interval elapsed, check database
  if (isSupabaseConfigured && now - lastDbFetchTime > DB_SYNC_INTERVAL_MS) {
    const supabase = getAdminClient();
    if (supabase) {
      try {
        lastDbFetchTime = now;
        const { data, error } = await supabase
          .from('midnight_settings')
          .select('enabled, passcode_hash, passcode_version, updated_at, updated_by')
          .eq('id', 'default')
          .maybeSingle();

        if (!error && data) {
          cachedSettings = {
            enabled: data.enabled ?? true,
            passcodeHash: data.passcode_hash || DEFAULT_INITIAL_PASSCODE_HASH,
            passcodeVersion: data.passcode_version || 1,
            updatedAt: data.updated_at || new Date().toISOString(),
            updatedBy: data.updated_by || 'system',
          };
        } else if (!data && !error) {
          // Initialize default record in DB if empty
          await supabase.from('midnight_settings').insert({
            id: 'default',
            enabled: cachedSettings.enabled,
            passcode_hash: cachedSettings.passcodeHash,
            passcode_version: cachedSettings.passcodeVersion,
            updated_at: cachedSettings.updatedAt,
            updated_by: cachedSettings.updatedBy,
          });
        }
      } catch (err) {
        console.warn('[MidnightStore] Database read error, using cached settings:', err);
      }
    }
  }

  return { ...cachedSettings };
}

/**
 * Update Midnight access settings in memory and persist to database if available.
 */
export async function updateMidnightSettings(
  updates: {
    enabled?: boolean;
    passcodeHash?: string;
  },
  adminEmail: string
): Promise<MidnightSettings> {
  const now = new Date().toISOString();
  let version = cachedSettings.passcodeVersion;

  // Invalidate previous sessions if passcode hash or enabled state changed
  if (updates.passcodeHash && updates.passcodeHash !== cachedSettings.passcodeHash) {
    version += 1;
  }
  if (updates.enabled !== undefined && updates.enabled !== cachedSettings.enabled) {
    version += 1;
  }

  cachedSettings = {
    enabled: updates.enabled !== undefined ? updates.enabled : cachedSettings.enabled,
    passcodeHash: updates.passcodeHash || cachedSettings.passcodeHash,
    passcodeVersion: version,
    updatedAt: now,
    updatedBy: adminEmail,
  };

  if (isSupabaseConfigured) {
    const supabase = getAdminClient();
    if (supabase) {
      try {
        await supabase.from('midnight_settings').upsert({
          id: 'default',
          enabled: cachedSettings.enabled,
          passcode_hash: cachedSettings.passcodeHash,
          passcode_version: cachedSettings.passcodeVersion,
          updated_at: cachedSettings.updatedAt,
          updated_by: cachedSettings.updatedBy,
        });
      } catch (err) {
        console.warn('[MidnightStore] Database write error, changes kept in memory:', err);
      }
    }
  }

  return { ...cachedSettings };
}
