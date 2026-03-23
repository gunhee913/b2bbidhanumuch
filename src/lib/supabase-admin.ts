import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return new Proxy({} as SupabaseClient, {
        get() {
          throw new Error('Supabase client not available at build time');
        },
      });
    }
    _client = createClient(url, key);
  }
  return _client;
}
