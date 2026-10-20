import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for use in Client Components and browser-side code.
 * Only NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 * (or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY) are used.
 * The service_role key is strictly prohibited in client code.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) must be defined.'
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
