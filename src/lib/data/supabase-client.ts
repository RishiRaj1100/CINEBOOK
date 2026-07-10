// ============================================================
// lib/data/supabase-client.ts
// Single factory for Supabase clients — no scattered createClient() calls
// ============================================================

import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton browser client (safe to call multiple times)
let _browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (!_browserClient) {
    _browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return _browserClient;
}

// Server client factory — new instance per request (reads cookies)
export async function getSupabaseServerClient() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

// Service role client — server-side only, bypasses RLS
export function getSupabaseServiceClient() {
  return createClient<Database>(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
