import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function getResolvedSupabaseKeys(): { url: string | undefined; key: string | undefined; isSecretKey: boolean } {
  const url = process.env.SUPABASE_URL;
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  let anonKey = process.env.SUPABASE_ANON_KEY || '';

  // Auto-correct if user swapped the publishable and secret keys in the environment settings
  if (serviceRoleKey.startsWith('sb_publishable') && anonKey.startsWith('sb_secret')) {
    const temp = serviceRoleKey;
    serviceRoleKey = anonKey;
    anonKey = temp;
  }

  // Choose the best key available (prefer secret/service role key for backend operations)
  const key = serviceRoleKey || anonKey || undefined;
  const isSecretKey = Boolean(key && (key.startsWith('sb_secret') || key.includes('service_role')));

  return { url, key, isSecretKey };
}

export function getSupabase(): SupabaseClient | null {
  const { url, key } = getResolvedSupabaseKeys();

  if (!url || !key) {
    return null;
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      console.log('[Supabase] Initialized Supabase client for URL:', url);
    } catch (err) {
      console.error('[Supabase] Initialization error:', err);
      return null;
    }
  }

  return supabaseClient;
}

export interface SupabaseDetailedStatus {
  configured: boolean;
  connected: boolean;
  url?: string;
  tablesExist: boolean;
  missingTables: string[];
  errorMessage?: string;
}

export async function verifySupabaseTables(): Promise<SupabaseDetailedStatus> {
  const { url, key } = getResolvedSupabaseKeys();
  if (!url || !key) {
    return {
      configured: false,
      connected: false,
      tablesExist: false,
      missingTables: ['users', 'orders'],
      errorMessage: 'SUPABASE_URL or SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY is missing.',
    };
  }

  const client = getSupabase();
  if (!client) {
    return {
      configured: true,
      connected: false,
      url,
      tablesExist: false,
      missingTables: ['users', 'orders'],
      errorMessage: 'Failed to initialize Supabase client.',
    };
  }

  const missingTables: string[] = [];
  let userErrorMsg: string | undefined;

  try {
    const { error: userError } = await client.from('users').select('id').limit(1);
    if (userError) {
      if (userError.code === 'PGRST205' || userError.message?.includes('schema cache')) {
        missingTables.push('users');
      } else {
        userErrorMsg = userError.message;
      }
    }
  } catch (err: any) {
    missingTables.push('users');
    userErrorMsg = err?.message;
  }

  try {
    const { error: orderError } = await client.from('orders').select('id').limit(1);
    if (orderError) {
      if (orderError.code === 'PGRST205' || orderError.message?.includes('schema cache')) {
        missingTables.push('orders');
      }
    }
  } catch {
    missingTables.push('orders');
  }

  const tablesExist = missingTables.length === 0;

  return {
    configured: true,
    connected: true,
    url,
    tablesExist,
    missingTables,
    errorMessage: tablesExist ? undefined : (userErrorMsg || 'Tables "users" and "orders" have not been created yet in Supabase SQL Editor.'),
  };
}

export function checkSupabaseStatus(): { configured: boolean; url?: string } {
  const { url, key } = getResolvedSupabaseKeys();
  return {
    configured: Boolean(url && key),
    url: url || undefined,
  };
}
