/**
 * Supabase Auth Client
 * Browser-side authentication utilities
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/database';

export const createBrowserClient = () => {
  return createClientComponentClient<Database>();
};

export type SupabaseClient = ReturnType<typeof createBrowserClient>;
