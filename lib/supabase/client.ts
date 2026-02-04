import { createBrowserClient } from "@supabase/ssr"

/** True if Supabase env vars are set (real DB). False = mock client, credit unions list will be fallback only. */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return Boolean(url && key && url.length > 0 && key.length > 0)
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Return a mock client that won't crash but won't work either
    console.warn("Supabase credentials not configured")
    return {
      from: () => ({
        select: () => ({ data: [], error: null, count: 0 }),
        insert: () => ({ data: null, error: null }),
        update: () => ({ data: null, error: null }),
        delete: () => ({ data: null, error: null }),
      }),
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
      },
    } as any
  }

  return createBrowserClient(url, key)
}
