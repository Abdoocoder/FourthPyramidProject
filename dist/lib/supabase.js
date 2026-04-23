// =============================================================================
// FOURTH PYRAMID — SUPABASE CLIENT
// Single shared instance for the entire app.
// =============================================================================
import { createClient } from "@supabase/supabase-js";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnon) {
    throw new Error("[FourthPyramid] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
}
/**
 * The primary Supabase client used across the app.
 * Authenticated via Supabase Auth (JWT stored in localStorage).
 */
export const supabase = createClient(supabaseUrl, supabaseAnon, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: "fp-auth-session",
    },
});
/**
 * Base URL for Edge Functions.
 * Use this when calling Edge Functions manually via fetch
 * (for anonymous submissions like contact / quote).
 */
export const FUNCTIONS_URL = `${supabaseUrl}/functions/v1`;
/**
 * Returns the Authorization header for the currently logged-in user.
 * Used when calling Edge Functions that require authentication.
 */
export async function getAuthHeader() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token)
        return {};
    return { Authorization: `Bearer ${session.access_token}` };
}
//# sourceMappingURL=supabase.js.map