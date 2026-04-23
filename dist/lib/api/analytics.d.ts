import type { AnalyticsSnapshot, DashboardSummary } from "../types/database.types";
/**
 * Get the live dashboard KPI summary.
 * Calls `get_dashboard_summary` DB function.
 * Used on: Admin Dashboard Overview / Refined screens.
 */
export declare function getDashboardSummary(): Promise<DashboardSummary>;
/**
 * Get analytics snapshots for a date range.
 * Used for time-series charts on the Reports & Analytics Dashboard.
 */
export declare function getAnalyticsSnapshots(options: {
    date_from: string;
    date_to: string;
}): Promise<AnalyticsSnapshot[]>;
/**
 * Get the latest available analytics snapshot.
 */
export declare function getLatestSnapshot(): Promise<AnalyticsSnapshot | null>;
/**
 * Trigger a manual refresh of the analytics snapshot for a given date.
 * Calls the `order-notification` Edge Function with action = 'refresh_analytics'.
 * @param date - YYYY-MM-DD (defaults to yesterday on the server)
 */
export declare function refreshAnalytics(date?: string): Promise<void>;
/**
 * Calculate total revenue for a period directly from orders (live, not snapshot).
 */
export declare function getLiveRevenue(options?: {
    date_from?: string;
    date_to?: string;
}): Promise<{
    gross_revenue: number;
    net_revenue: number;
    order_count: number;
    avg_order_value: number;
}>;
/**
 * Get top-selling products by revenue for a date range.
 * Used for the "Top Products" chart on the analytics dashboard.
 */
export declare function getTopProducts(options?: {
    date_from?: string;
    date_to?: string;
    limit?: number;
}): Promise<{
    product_id: string;
    sku: string;
    name_en: string;
    name_ar: string;
    qty_sold: number;
    revenue: number;
}[]>;
/**
 * Get monthly order counts and revenue for the past N months.
 * Used for line/bar charts on the analytics dashboard.
 */
export declare function getMonthlyTrends(months?: number): Promise<{
    month: string;
    order_count: number;
    revenue: number;
}[]>;
/**
 * Get new customer signups per month for a given period.
 */
export declare function getCustomerGrowth(months?: number): Promise<{
    month: string;
    new_customers: number;
}[]>;
//# sourceMappingURL=analytics.d.ts.map