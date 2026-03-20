// lib/supabase.ts
// Browser client that stores auth tokens in cookies (required for SSR middleware)

import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
}

// Singleton client for browser — uses cookies so middleware can read the session
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
