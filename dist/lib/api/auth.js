// =============================================================================
// FOURTH PYRAMID — AUTH API
// Covers: Login, Signup, Logout, Password Reset, Profile Management
// Screens: Login / Signup (Mobile)
// =============================================================================
import { supabase } from "../supabase";
// ─── Sign Up ──────────────────────────────────────────────────────────────────
/**
 * Register a new customer account.
 * A profile row is created automatically by the `handle_new_user` DB trigger.
 */
export async function signUp(data) {
    const { email, password, full_name, company_name, phone, preferred_language } = data;
    const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name,
                company_name: company_name ?? null,
                phone: phone ?? null,
                preferred_language: preferred_language ?? "ar",
            },
        },
    });
    if (error)
        throw error;
    return authData;
}
// ─── Sign In ──────────────────────────────────────────────────────────────────
export async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error)
        throw error;
    return data;
}
// ─── Sign Out ─────────────────────────────────────────────────────────────────
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error)
        throw error;
}
// ─── Password Reset ───────────────────────────────────────────────────────────
export async function requestPasswordReset(email, redirectTo) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo ?? `${window.location.origin}/reset-password`,
    });
    if (error)
        throw error;
}
export async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error)
        throw error;
}
// ─── Session ──────────────────────────────────────────────────────────────────
export async function getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error)
        throw error;
    return session;
}
export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error)
        throw error;
    return user;
}
// ─── Profile ──────────────────────────────────────────────────────────────────
/**
 * Get the profile of the currently logged-in user.
 */
export async function getMyProfile() {
    const user = await getCurrentUser();
    if (!user)
        throw new Error("Not authenticated");
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
    if (error)
        throw error;
    return { ...data, email: user.email };
}
/**
 * Update the current user's profile fields.
 */
export async function updateMyProfile(updates) {
    const user = await getCurrentUser();
    if (!user)
        throw new Error("Not authenticated");
    const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();
    if (error)
        throw error;
    return { ...data, email: user.email };
}
/**
 * Upload a new avatar image and update the profile avatar_url.
 * @param file - The image file to upload
 */
export async function updateAvatar(file) {
    const user = await getCurrentUser();
    if (!user)
        throw new Error("Not authenticated");
    const ext = file.name.split(".").pop();
    const path = `avatars/${user.id}.${ext}`;
    const { error: uploadError } = await supabase.storage
        .from("product-images") // reusing product-images bucket for simplicity
        .upload(path, file, { upsert: true });
    if (uploadError)
        throw uploadError;
    const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);
    await updateMyProfile({ avatar_url: publicUrl });
    return publicUrl;
}
// ─── Admin: Get Any Profile ───────────────────────────────────────────────────
/**
 * Admin-only: Get a specific user's profile by ID.
 */
export async function getProfileById(userId) {
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
    if (error)
        throw error;
    return data;
}
/**
 * Admin-only: Update any user's profile (including role changes).
 */
export async function adminUpdateProfile(userId, updates) {
    const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
/**
 * Admin-only: Set a user's role.
 */
export async function setUserRole(userId, role) {
    const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", userId);
    if (error)
        throw error;
}
// ─── Auth State Listener ──────────────────────────────────────────────────────
/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return () => subscription.unsubscribe();
}
//# sourceMappingURL=auth.js.map