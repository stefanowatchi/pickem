import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only client that bypasses database rules. Used only to save odds.
// The import above makes the build fail if a Client Component imports this.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
