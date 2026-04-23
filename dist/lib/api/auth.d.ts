import type { Profile, UserRole } from "../types/database.types";
export interface SignUpData {
    email: string;
    password: string;
    full_name: string;
    company_name?: string;
    phone?: string;
    preferred_language?: "ar" | "en";
}
export interface SignInData {
    email: string;
    password: string;
}
export interface UpdateProfileData {
    full_name?: string;
    company_name?: string;
    phone?: string;
    country?: string;
    city?: string;
    address?: string;
    tax_id?: string;
    preferred_language?: "ar" | "en";
    avatar_url?: string;
}
/**
 * Register a new customer account.
 * A profile row is created automatically by the `handle_new_user` DB trigger.
 */
export declare function signUp(data: SignUpData): Promise<{
    user: import("@supabase/auth-js").User | null;
    session: import("@supabase/auth-js").Session | null;
}>;
export declare function signIn({ email, password }: SignInData): Promise<{
    user: import("@supabase/auth-js").User;
    session: import("@supabase/auth-js").Session;
    weakPassword?: import("@supabase/auth-js").WeakPassword;
}>;
export declare function signOut(): Promise<void>;
export declare function requestPasswordReset(email: string, redirectTo?: string): Promise<void>;
export declare function updatePassword(newPassword: string): Promise<void>;
export declare function getSession(): Promise<import("@supabase/auth-js").Session | null>;
export declare function getCurrentUser(): Promise<import("@supabase/auth-js").User | null>;
/**
 * Get the profile of the currently logged-in user.
 */
export declare function getMyProfile(): Promise<Profile>;
/**
 * Update the current user's profile fields.
 */
export declare function updateMyProfile(updates: UpdateProfileData): Promise<Profile>;
/**
 * Upload a new avatar image and update the profile avatar_url.
 * @param file - The image file to upload
 */
export declare function updateAvatar(file: File): Promise<string>;
/**
 * Admin-only: Get a specific user's profile by ID.
 */
export declare function getProfileById(userId: string): Promise<Profile>;
/**
 * Admin-only: Update any user's profile (including role changes).
 */
export declare function adminUpdateProfile(userId: string, updates: Partial<Profile>): Promise<Profile>;
/**
 * Admin-only: Set a user's role.
 */
export declare function setUserRole(userId: string, role: UserRole): Promise<void>;
/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export declare function onAuthStateChange(callback: (event: string, session: any) => void): () => void;
//# sourceMappingURL=auth.d.ts.map