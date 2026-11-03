import { createClient } from '@supabase/supabase-js'

/**
 * Service role client: bypasses RLS. Only use it from server actions, after
 * checking that the current user is allowed to perform the operation.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
