import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cliente admin — usa service_role key, bypasa RLS.
// ⚠️ SOLO usar en API Routes (app/api/), NUNCA en componentes del frontend.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
