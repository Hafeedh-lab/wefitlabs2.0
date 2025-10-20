import { createBrowserClient, createServerClient, type SupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not configured.');
}

let browserClient: SupabaseClient<Database> | null = null;

export const getSupabaseClient = () => {
  if (browserClient) return browserClient;
  if (typeof window === 'undefined') {
    throw new Error('Supabase browser client cannot be used on the server');
  }
  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return browserClient;
};

export const supabaseClient = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const client = getSupabaseClient();
    // @ts-expect-error dynamic proxy
    return client[prop];
  }
});

export const createSupabaseServerClient = () => {
  const cookieStore = cookies();
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      }
    }
  });
};
