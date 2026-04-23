import type { Profile, CustomerOrderSummary, UserRole } from "../types/database.types";
/**
 * Admin: list all customers with their aggregated order statistics.
 * Used on: Customer History - Admin / Refined screens.
 * Powered by the `customer_order_summary` DB view.
 */
export declare function getCustomers(options?: {
    search?: string;
    city?: string;
    country?: string;
    is_active?: boolean;
    sort_by?: "created_at" | "lifetime_value" | "total_orders" | "last_order_date";
    sort_asc?: boolean;
    limit?: number;
    offset?: number;
}): Promise<{
    data: CustomerOrderSummary[];
    count: number;
}>;
/**
 * Admin: get full detail of a single customer including their profile + stats.
 */
export declare function getCustomerDetail(customerId: string): Promise<{
    profile: Profile;
    summary: CustomerOrderSummary;
}>;
/**
 * Admin: update a customer's profile (any field, including status and notes).
 */
export declare function updateCustomer(customerId: string, updates: {
    full_name?: string;
    company_name?: string;
    phone?: string;
    country?: string;
    city?: string;
    address?: string;
    tax_id?: string;
    is_active?: boolean;
    notes?: string;
}): Promise<Profile>;
/**
 * Admin: change a user's role (e.g., promote a customer to admin).
 */
export declare function setCustomerRole(customerId: string, role: UserRole): Promise<void>;
/**
 * Admin: deactivate a customer (is_active = false). Does NOT delete.
 */
export declare function deactivateCustomer(customerId: string): Promise<void>;
/**
 * Admin: reactivate a previously deactivated customer.
 */
export declare function reactivateCustomer(customerId: string): Promise<void>;
/**
 * Admin: get all admin staff profiles.
 * Useful for "assign to" dropdowns in quotes and orders.
 */
export declare function getAdminUsers(): Promise<Profile[]>;
/**
 * Admin: search customers for autocomplete (e.g., in Create Order form).
 */
export declare function searchCustomers(query: string, limit?: number): Promise<Profile[]>;
//# sourceMappingURL=customers.d.ts.map