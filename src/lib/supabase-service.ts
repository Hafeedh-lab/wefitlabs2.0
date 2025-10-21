import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
      'Please create a .env.local file with your Supabase credentials. ' +
      'See .env.example for reference.'
  );
}

if (!serviceRoleKey) {
  throw new Error(
    'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
      'This key is required for server-side Supabase access. ' +
      'Please create a .env.local file with your Supabase credentials. '
  );
}

export const createSupabaseServiceClient = (): SupabaseClient<Database> => {
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
};
