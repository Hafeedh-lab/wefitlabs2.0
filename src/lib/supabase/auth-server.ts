/**
 * Supabase Auth Server
 * Server-side authentication utilities for Route Handlers and Server Components
 */

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export const createServerClient = () => {
  const cookieStore = cookies();
  return createServerComponentClient<Database>({ cookies: () => cookieStore });
};

export type SupabaseServerClient = ReturnType<typeof createServerClient>;
