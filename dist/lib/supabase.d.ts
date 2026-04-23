import type { Database } from "./types/database.types";
/**
 * The primary Supabase client used across the app.
 * Authenticated via Supabase Auth (JWT stored in localStorage).
 */
export declare const supabase: import("@supabase/supabase-js").SupabaseClient<Database, "public", "public", never, {
    PostgrestVersion: "12";
}>;
/**
 * Base URL for Edge Functions.
 * Use this when calling Edge Functions manually via fetch
 * (for anonymous submissions like contact / quote).
 */
export declare const FUNCTIONS_URL: string;
/**
 * Returns the Authorization header for the currently logged-in user.
 * Used when calling Edge Functions that require authentication.
 */
export declare function getAuthHeader(): Promise<Record<string, string>>;
//# sourceMappingURL=supabase.d.ts.map