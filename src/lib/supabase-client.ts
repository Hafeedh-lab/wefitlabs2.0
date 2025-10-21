import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
    'Please create a .env.local file with your Supabase credentials. ' +
    'See .env.example for reference.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
    'Please create a .env.local file with your Supabase credentials. ' +
    'See .env.example for reference.'
  );
}

let browserClient: SupabaseClient<Database> | null = null;

export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (browserClient) return browserClient;
  if (typeof window === 'undefined') {
    throw new Error('Supabase browser client cannot be used on the server');
  }
  browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
  return browserClient;
};

export const supabaseClient = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const client = getSupabaseClient();
    // @ts-expect-error dynamic proxy
    return client[prop];
  }
});
