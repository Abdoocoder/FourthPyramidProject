// =============================================================================
// FOURTH PYRAMID — QUOTES API
// Screens: Request a Quote - Desktop, Create New Order (quote origin)
// =============================================================================
import { supabase, FUNCTIONS_URL, getAuthHeader } from "../supabase";
// ─── Submit a Quote (public + authenticated) ──────────────────────────────────
/**
 * Submit a new quote request.
 * Routes through the `process-quote` Edge Function which also sends emails.
 * Works for both logged-in customers and anonymous visitors.
 */
export async function submitQuote(input) {
    const headers = await getAuthHeader(); // will be empty for anonymous
    const res = await fetch(`${FUNCTIONS_URL}/process-quote`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to submit quote request");
    }
    return res.json();
}
// ─── Customer: Browse Own Quotes ─────────────────────────────────────────────
/**
 * Get all quotes for the currently logged-in customer.
 */
export async function getMyQuotes(options = {}) {
    let query = supabase
        .from("quotes")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
    if (options.status)
        query = query.eq("status", options.status);
    if (options.limit !== undefined) {
        const from = options.offset ?? 0;
        query = query.range(from, from + options.limit - 1);
    }
    const { data, error, count } = await query;
    if (error)
        throw error;
    return { data: data ?? [], count: count ?? 0 };
}
/**
 * Customer: accept or reject a quoted price.
 */
export async function respondToQuote(quoteId, response) {
    const { error } = await supabase
        .from("quotes")
        .update({ status: response })
        .eq("id", quoteId)
        .eq("status", "quoted"); // Can only respond to quotes that have been priced
    if (error)
        throw error;
}
// ─── Admin: Manage Quotes ─────────────────────────────────────────────────────
/**
 * Admin: list all quotes with filtering.
 */
export async function adminGetQuotes(options = {}) {
    let query = supabase
        .from("quotes")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
    if (options.status)
        query = query.eq("status", options.status);
    if (options.assigned_to)
        query = query.eq("assigned_to", options.assigned_to);
    if (options.date_from)
        query = query.gte("created_at", options.date_from);
    if (options.date_to)
        query = query.lte("created_at", options.date_to);
    if (options.search) {
        query = query.or(`quote_number.ilike.%${options.search}%,contact_name.ilike.%${options.search}%,contact_email.ilike.%${options.search}%,company_name.ilike.%${options.search}%`);
    }
    if (options.limit !== undefined) {
        const from = options.offset ?? 0;
        query = query.range(from, from + options.limit - 1);
    }
    const { data, error, count } = await query;
    if (error)
        throw error;
    return { data: data ?? [], count: count ?? 0 };
}
/**
 * Admin: get a single quote by ID.
 */
export async function adminGetQuote(quoteId) {
    const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", quoteId)
        .single();
    if (error)
        throw error;
    return data;
}
/**
 * Admin: update quote status, add a price, or assign to a team member.
 */
export async function adminUpdateQuote(quoteId, updates) {
    const { data, error } = await supabase
        .from("quotes")
        .update(updates)
        .eq("id", quoteId)
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
/**
 * Admin: send a price back to the customer.
 * Sets status to 'quoted' and records the amount.
 */
export async function sendQuotePrice(quoteId, amount, options = {}) {
    return adminUpdateQuote(quoteId, {
        status: "quoted",
        quoted_amount: amount,
        quoted_currency: options.currency ?? "EGP",
        valid_until: options.validUntil ?? undefined,
        admin_response: options.adminResponse ?? undefined,
    });
}
/**
 * Admin: convert an accepted quote into a formal order.
 * Calls the `order-notification` Edge Function with action = 'convert_quote'.
 */
export async function convertQuoteToOrder(quoteId) {
    const headers = await getAuthHeader();
    const res = await fetch(`${FUNCTIONS_URL}/order-notification`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "convert_quote", quote_id: quoteId }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to convert quote to order");
    }
    const result = await res.json();
    return result.order_id;
}
/**
 * Admin: assign a quote to a sales team member.
 */
export async function assignQuote(quoteId, adminUserId) {
    const { error } = await supabase
        .from("quotes")
        .update({ status: "under_review", assigned_to: adminUserId })
        .eq("id", quoteId);
    if (error)
        throw error;
}
/**
 * Admin: get quote pipeline counts grouped by status.
 */
export async function getQuoteStatusCounts() {
    const { data, error } = await supabase
        .from("quotes")
        .select("status");
    if (error)
        throw error;
    const counts = {};
    for (const row of data ?? []) {
        const status = row.status;
        counts[status] = (counts[status] ?? 0) + 1;
    }
    return counts;
}
//# sourceMappingURL=quotes.js.map