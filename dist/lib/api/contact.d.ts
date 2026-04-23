import type { ContactMessage, ContactStatus, SubmitContactInput } from "../types/database.types";
/**
 * Submit a contact form message.
 * Routes through the `send-contact-email` Edge Function which:
 *   1. Saves the message to the DB
 *   2. Sends a notification email to admin
 *   3. Sends an acknowledgement email to the customer
 *
 * Works for both anonymous visitors and logged-in customers.
 */
export declare function submitContactForm(input: SubmitContactInput): Promise<{
    id: string;
}>;
/**
 * Admin: list all contact messages with filtering.
 */
export declare function adminGetContactMessages(options?: {
    status?: ContactStatus;
    search?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
}): Promise<{
    data: ContactMessage[];
    count: number;
}>;
/**
 * Admin: get a single contact message by ID.
 */
export declare function adminGetContactMessage(messageId: string): Promise<ContactMessage>;
/**
 * Admin: update the status of a contact message.
 */
export declare function updateContactStatus(messageId: string, status: ContactStatus): Promise<void>;
/**
 * Admin: mark a message as replied (records the reply text and timestamp).
 */
export declare function markContactReplied(messageId: string, replyText: string, repliedBy: string): Promise<void>;
/**
 * Admin: archive a contact message.
 */
export declare function archiveContactMessage(messageId: string): Promise<void>;
/**
 * Admin: get unread (new) message count for dashboard badge.
 */
export declare function getNewMessageCount(): Promise<number>;
//# sourceMappingURL=contact.d.ts.map