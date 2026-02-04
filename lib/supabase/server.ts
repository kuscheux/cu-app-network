import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

const emptyResult = { data: null, error: null }
const emptyArrayResult = { data: [], error: null, count: 0 }
const chain = {
  eq: () => chain,
  or: () => chain,
  single: () => Promise.resolve(emptyResult),
  maybeSingle: () => Promise.resolve(emptyResult),
  order: () => chain,
  range: () => Promise.resolve(emptyArrayResult),
  limit: () => chain,
  then: (resolve: (v: typeof emptyArrayResult) => void) => Promise.resolve(emptyArrayResult).then(resolve),
  catch: (fn: (e: unknown) => void) => Promise.resolve(emptyArrayResult).catch(fn),
}

/** Mock server client when env is missing - app runs live with zero env vars (fallback data) */
function mockServerClient() {
  return {
    from: () => ({
      select: () => chain,
      insert: () => Promise.resolve(emptyResult),
      update: () => Promise.resolve(emptyResult),
      delete: () => Promise.resolve(emptyResult),
      eq: () => chain,
      or: () => chain,
      single: () => Promise.resolve(emptyResult),
      maybeSingle: () => Promise.resolve(emptyResult),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
  } as Awaited<ReturnType<typeof createServerClient>>
}

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return mockServerClient()
  }
  const cookieStore = await cookies()
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Ignored in Server Components
        }
      },
    },
  })
}

/** Mock admin client when env is missing - no 300 env vars needed to go live */
function mockAdminClient() {
  return {
    from: () => ({
      select: () => chain,
      insert: () => Promise.resolve(emptyResult),
      update: () => Promise.resolve(emptyResult),
      delete: () => Promise.resolve(emptyResult),
      eq: () => chain,
      or: () => chain,
      single: () => Promise.resolve(emptyResult),
      maybeSingle: () => Promise.resolve(emptyResult),
    }),
  } as ReturnType<typeof createSupabaseClient>
}

/**
 * Create admin client with service role key - bypasses RLS.
 * When env missing, returns mock so app runs with zero env vars.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return mockAdminClient()
  }
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
