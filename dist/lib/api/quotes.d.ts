import type { Quote, QuoteStatus, SubmitQuoteInput } from "../types/database.types";
/**
 * Submit a new quote request.
 * Routes through the `process-quote` Edge Function which also sends emails.
 * Works for both logged-in customers and anonymous visitors.
 */
export declare function submitQuote(input: SubmitQuoteInput): Promise<{
    quote_id: string;
    quote_number: string;
}>;
/**
 * Get all quotes for the currently logged-in customer.
 */
export declare function getMyQuotes(options?: {
    status?: QuoteStatus;
    limit?: number;
    offset?: number;
}): Promise<{
    data: Quote[];
    count: number;
}>;
/**
 * Customer: accept or reject a quoted price.
 */
export declare function respondToQuote(quoteId: string, response: "accepted" | "rejected"): Promise<void>;
/**
 * Admin: list all quotes with filtering.
 */
export declare function adminGetQuotes(options?: {
    status?: QuoteStatus;
    assigned_to?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
}): Promise<{
    data: Quote[];
    count: number;
}>;
/**
 * Admin: get a single quote by ID.
 */
export declare function adminGetQuote(quoteId: string): Promise<Quote>;
/**
 * Admin: update quote status, add a price, or assign to a team member.
 */
export declare function adminUpdateQuote(quoteId: string, updates: {
    status?: QuoteStatus;
    quoted_amount?: number;
    quoted_currency?: string;
    valid_until?: string;
    admin_response?: string;
    assigned_to?: string;
    notes?: string;
}): Promise<Quote>;
/**
 * Admin: send a price back to the customer.
 * Sets status to 'quoted' and records the amount.
 */
export declare function sendQuotePrice(quoteId: string, amount: number, options?: {
    currency?: string;
    validUntil?: string;
    adminResponse?: string;
}): Promise<Quote>;
/**
 * Admin: convert an accepted quote into a formal order.
 * Calls the `order-notification` Edge Function with action = 'convert_quote'.
 */
export declare function convertQuoteToOrder(quoteId: string): Promise<string>;
/**
 * Admin: assign a quote to a sales team member.
 */
export declare function assignQuote(quoteId: string, adminUserId: string): Promise<void>;
/**
 * Admin: get quote pipeline counts grouped by status.
 */
export declare function getQuoteStatusCounts(): Promise<Record<QuoteStatus, number>>;
//# sourceMappingURL=quotes.d.ts.map