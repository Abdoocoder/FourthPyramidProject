// =============================================================================
// FOURTH PYRAMID — CUSTOMERS API  (Admin only)
// Screens: Customer History - Admin, Customer History - Refined
// =============================================================================
import { supabase } from "../supabase";
// ─── Customer List ────────────────────────────────────────────────────────────
/**
 * Admin: list all customers with their aggregated order statistics.
 * Used on: Customer History - Admin / Refined screens.
 * Powered by the `customer_order_summary` DB view.
 */
export async function getCustomers(options = {}) {
    let query = supabase
        .from("customer_order_summary")
        .select("*", { count: "exact" });
    if (options.search) {
        query = query.or(`full_name.ilike.%${options.search}%,company_name.ilike.%${options.search}%,customer_email.ilike.%${options.search}%`);
    }
    if (options.city)
        query = query.eq("city", options.city);
    if (options.country)
        query = query.eq("country", options.country);
    if (options.is_active !== undefined)
        query = query.eq("is_active", options.is_active);
    const sortColumn = options.sort_by ?? "customer_since";
    query = query.order(sortColumn, { ascending: options.sort_asc ?? false });
    if (options.limit !== undefined) {
        const from = options.offset ?? 0;
        query = query.range(from, from + options.limit - 1);
    }
    const { data, error, count } = await query;
    if (error)
        throw error;
    return { data: (data ?? []), count: count ?? 0 };
}
/**
 * Admin: get full detail of a single customer including their profile + stats.
 */
export async function getCustomerDetail(customerId) {
    const [{ data: profile, error: profileErr }, { data: summaryArr, error: summaryErr }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", customerId).single(),
        supabase.from("customer_order_summary").select("*").eq("customer_id", customerId).limit(1),
    ]);
    if (profileErr)
        throw profileErr;
    if (summaryErr)
        throw summaryErr;
    return {
        profile: profile,
        summary: (summaryArr?.[0] ?? null),
    };
}
/**
 * Admin: update a customer's profile (any field, including status and notes).
 */
export async function updateCustomer(customerId, updates) {
    const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", customerId)
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
/**
 * Admin: change a user's role (e.g., promote a customer to admin).
 */
export async function setCustomerRole(customerId, role) {
    const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", customerId);
    if (error)
        throw error;
}
/**
 * Admin: deactivate a customer (is_active = false). Does NOT delete.
 */
export async function deactivateCustomer(customerId) {
    const { error } = await supabase
        .from("profiles")
        .update({ is_active: false })
        .eq("id", customerId);
    if (error)
        throw error;
}
/**
 * Admin: reactivate a previously deactivated customer.
 */
export async function reactivateCustomer(customerId) {
    const { error } = await supabase
        .from("profiles")
        .update({ is_active: true })
        .eq("id", customerId);
    if (error)
        throw error;
}
/**
 * Admin: get all admin staff profiles.
 * Useful for "assign to" dropdowns in quotes and orders.
 */
export async function getAdminUsers() {
    const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, phone, role, avatar_url")
        .eq("role", "admin")
        .eq("is_active", true)
        .order("full_name");
    if (error)
        throw error;
    return data;
}
/**
 * Admin: search customers for autocomplete (e.g., in Create Order form).
 */
export async function searchCustomers(query, limit = 10) {
    const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, phone, city, role")
        .eq("role", "customer")
        .eq("is_active", true)
        .or(`full_name.ilike.%${query}%,company_name.ilike.%${query}%`)
        .limit(limit);
    if (error)
        throw error;
    return data;
}
//# sourceMappingURL=customers.js.map