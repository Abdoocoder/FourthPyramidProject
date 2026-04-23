// =============================================================================
// FOURTH PYRAMID — CONTACT API
// Screen: Contact Us - Desktop
// =============================================================================

import { supabase, FUNCTIONS_URL } from "../supabase";
import type { ContactMessage, ContactStatus, SubmitContactInput } from "../types/database.types";

// ─── Submit Contact Form (public) ─────────────────────────────────────────────

/**
 * Submit a contact form message.
 * Routes through the `send-contact-email` Edge Function which:
 *   1. Saves the message to the DB
 *   2. Sends a notification email to admin
 *   3. Sends an acknowledgement email to the customer
 *
 * Works for both anonymous visitors and logged-in customers.
 */
export async function submitContactForm(input: SubmitContactInput): Promise<{ id: string }> {
  // Get optional auth info if the user is logged in
  let customerId: string | null = null;
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) customerId = session.user.id;

  const res = await fetch(`${FUNCTIONS_URL}/send-contact-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, customer_id: customerId }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to send message");
  }

  return res.json();
}

// ─── Admin: Manage Contact Messages ──────────────────────────────────────────

/**
 * Admin: list all contact messages with filtering.
 */
export async function adminGetContactMessages(options: {
  status?:   ContactStatus;
  search?:   string;
  date_from?: string;
  date_to?:   string;
  limit?:    number;
  offset?:   number;
} = {}): Promise<{ data: ContactMessage[]; count: number }> {
  let query = (supabase
    .from("contact_messages") as any)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (options.status)    query = query.eq("status", options.status);
  if (options.date_from) query = query.gte("created_at", options.date_from);
  if (options.date_to)   query = query.lte("created_at", options.date_to);
  if (options.search) {
    query = query.or(
      `full_name.ilike.%${options.search}%,email.ilike.%${options.search}%,subject.ilike.%${options.search}%`
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
 * Admin: get a single contact message by ID.
 */
export async function adminGetContactMessage(messageId: string): Promise<ContactMessage> {
  const { data, error } = await (supabase
    .from("contact_messages") as any)
    .select("*")
    .eq("id", messageId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Admin: update the status of a contact message.
 */
export async function updateContactStatus(
  messageId: string,
  status: ContactStatus
): Promise<void> {
  const { error } = await (supabase
    .from("contact_messages") as any)
    .update({ status })
    .eq("id", messageId);

  if (error) throw error;
}

/**
 * Admin: mark a message as replied (records the reply text and timestamp).
 */
export async function markContactReplied(
  messageId: string,
  replyText: string,
  repliedBy: string
): Promise<void> {
  const { error } = await (supabase
    .from("contact_messages") as any)
    .update({
      status:     "resolved",
      reply_text: replyText,
      replied_by: repliedBy,
      replied_at: new Date().toISOString(),
    })
    .eq("id", messageId);

  if (error) throw error;
}

/**
 * Admin: archive a contact message.
 */
export async function archiveContactMessage(messageId: string): Promise<void> {
  const { error } = await (supabase
    .from("contact_messages") as any)
    .update({ status: "archived" })
    .eq("id", messageId);

  if (error) throw error;
}

/**
 * Admin: get unread (new) message count for dashboard badge.
 */
export async function getNewMessageCount(): Promise<number> {
  const { count, error } = await (supabase
    .from("contact_messages") as any)
    .select("*", { count: "exact", head: true })
    .eq("status", "new");

  if (error) throw error;
  return count ?? 0;
}
