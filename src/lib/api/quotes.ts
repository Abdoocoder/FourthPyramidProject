// =============================================================================
// FOURTH PYRAMID — QUOTES API
// Screens: Request a Quote - Desktop, Create New Order (quote origin)
// =============================================================================

import { supabase, FUNCTIONS_URL, getAuthHeader } from "../supabase";
import type { Quote, QuoteStatus, SubmitQuoteInput } from "../types/database.types";

// ─── Submit a Quote (public + authenticated) ──────────────────────────────────

/**
 * Submit a new quote request.
 * Routes through the `process-quote` Edge Function which also sends emails.
 * Works for both logged-in customers and anonymous visitors.
 */
export async function submitQuote(input: SubmitQuoteInput): Promise<{ quote_id: string; quote_number: string }> {
  const headers = await getAuthHeader();  // will be empty for anonymous

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
export async function getMyQuotes(options: {
  status?: QuoteStatus;
  limit?:  number;
  offset?: number;
} = {}): Promise<{ data: Quote[]; count: number }> {
  let query = (supabase
    .from("quotes") as any)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (options.status) query = query.eq("status", options.status);

  if (options.limit !== undefined) {
    const from = options.offset ?? 0;
    query = query.range(from, from + options.limit - 1);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

/**
 * Customer: accept or reject a quoted price.
 */
export async function respondToQuote(
  quoteId: string,
  response: "accepted" | "rejected"
): Promise<void> {
  const { error } = await (supabase
    .from("quotes") as any)
    .update({ status: response })
    .eq("id", quoteId)
    .eq("status", "quoted");  // Can only respond to quotes that have been priced

  if (error) throw error;
}

// ─── Admin: Manage Quotes ─────────────────────────────────────────────────────

/**
 * Admin: list all quotes with filtering.
 */
export async function adminGetQuotes(options: {
  status?:      QuoteStatus;
  assigned_to?: string;
  search?:      string;
  date_from?:   string;
  date_to?:     string;
  limit?:       number;
  offset?:      number;
} = {}): Promise<{ data: Quote[]; count: number }> {
  let query = (supabase
    .from("quotes") as any)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (options.status)      query = query.eq("status", options.status);
  if (options.assigned_to) query = query.eq("assigned_to", options.assigned_to);
  if (options.date_from)   query = query.gte("created_at", options.date_from);
  if (options.date_to)     query = query.lte("created_at", options.date_to);
  if (options.search) {
    query = query.or(
      `quote_number.ilike.%${options.search}%,contact_name.ilike.%${options.search}%,contact_email.ilike.%${options.search}%,company_name.ilike.%${options.search}%`
    );
  }
  if (options.limit !== undefined) {
    const from = options.offset ?? 0;
    query = query.range(from, from + options.limit - 1);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

/**
 * Admin: get a single quote by ID.
 */
export async function adminGetQuote(quoteId: string): Promise<Quote> {
  const { data, error } = await (supabase
    .from("quotes") as any)
    .select("*")
    .eq("id", quoteId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Admin: update quote status, add a price, or assign to a team member.
 */
export async function adminUpdateQuote(
  quoteId: string,
  updates: {
    status?:          QuoteStatus;
    quoted_amount?:   number;
    quoted_currency?: string;
    valid_until?:     string;
    admin_response?:  string;
    assigned_to?:     string;
    notes?:           string;
  }
): Promise<Quote> {
  const { data, error } = await (supabase
    .from("quotes") as any)
    .update(updates)
    .eq("id", quoteId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Admin: send a price back to the customer.
 * Sets status to 'quoted' and records the amount.
 */
export async function sendQuotePrice(
  quoteId: string,
  amount: number,
  options: {
    currency?:      string;
    validUntil?:    string;
    adminResponse?: string;
  } = {}
): Promise<Quote> {
  return adminUpdateQuote(quoteId, {
    status:          "quoted",
    quoted_amount:   amount,
    quoted_currency: options.currency     ?? "EGP",
    valid_until:     options.validUntil   ?? undefined,
    admin_response:  options.adminResponse ?? undefined,
  });
}

/**
 * Admin: convert an accepted quote into a formal order.
 * Calls the `order-notification` Edge Function with action = 'convert_quote'.
 */
export async function convertQuoteToOrder(quoteId: string): Promise<string> {
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
  return result.order_id as string;
}

/**
 * Admin: assign a quote to a sales team member.
 */
export async function assignQuote(quoteId: string, adminUserId: string): Promise<void> {
  const { error } = await (supabase
    .from("quotes") as any)
    .update({ status: "under_review", assigned_to: adminUserId })
    .eq("id", quoteId);

  if (error) throw error;
}

/**
 * Admin: get quote pipeline counts grouped by status.
 */
export async function getQuoteStatusCounts(): Promise<Record<QuoteStatus, number>> {
  const { data, error } = await (supabase
    .from("quotes") as any)
    .select("status");

  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const status = (row as any).status;
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts as Record<QuoteStatus, number>;
}
