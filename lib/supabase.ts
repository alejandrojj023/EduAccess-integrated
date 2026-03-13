import { createClient, SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton para evitar múltiples instancias en HMR (Next.js dev)
const globalForSupabase = globalThis as unknown as {
  supabase: SupabaseClient | undefined
}

export const supabase =
  globalForSupabase.supabase ??
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  })

if (process.env.NODE_ENV !== "production") {
  globalForSupabase.supabase = supabase
}
