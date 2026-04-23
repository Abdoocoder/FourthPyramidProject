// =============================================================================
// FOURTH PYRAMID — ANALYTICS API  (Admin only)
// Screen: Reports & Analytics Dashboard
// =============================================================================

import { supabase, FUNCTIONS_URL, getAuthHeader } from "../supabase";
import type { AnalyticsSnapshot, DashboardSummary } from "../types/database.types";

// ─── Dashboard Summary ────────────────────────────────────────────────────────

/**
 * Get the live dashboard KPI summary.
 * Calls `get_dashboard_summary` DB function.
 * Used on: Admin Dashboard Overview / Refined screens.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data, error } = await (supabase.rpc as any)("get_dashboard_summary");
  if (error) throw error;
  return data as DashboardSummary;
}

// ─── Daily Snapshots ──────────────────────────────────────────────────────────

/**
 * Get analytics snapshots for a date range.
 * Used for time-series charts on the Reports & Analytics Dashboard.
 */
export async function getAnalyticsSnapshots(options: {
  date_from: string;   // YYYY-MM-DD
  date_to:   string;   // YYYY-MM-DD
}): Promise<AnalyticsSnapshot[]> {
  const { data, error } = await (supabase
    .from("analytics_snapshots") as any)
    .select("*")
    .gte("snapshot_date", options.date_from)
    .lte("snapshot_date", options.date_to)
    .order("snapshot_date", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Get the latest available analytics snapshot.
 */
export async function getLatestSnapshot(): Promise<AnalyticsSnapshot | null> {
  const { data, error } = await (supabase
    .from("analytics_snapshots") as any)
    .select("*")
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Trigger a manual refresh of the analytics snapshot for a given date.
 * Calls the `order-notification` Edge Function with action = 'refresh_analytics'.
 * @param date - YYYY-MM-DD (defaults to yesterday on the server)
 */
export async function refreshAnalytics(date?: string): Promise<void> {
  const headers = await getAuthHeader();

  const res = await fetch(`${FUNCTIONS_URL}/order-notification`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "refresh_analytics", date }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to refresh analytics");
  }
}

// ─── Revenue Analytics ────────────────────────────────────────────────────────

/**
 * Calculate total revenue for a period directly from orders (live, not snapshot).
 */
export async function getLiveRevenue(options: {
  date_from?: string;
  date_to?:   string;
} = {}): Promise<{
  gross_revenue:    number;
  net_revenue:      number;
  order_count:      number;
  avg_order_value:  number;
}> {
  let query = (supabase
    .from("orders") as any)
    .select("subtotal, total_amount")
    .not("status", "eq", "cancelled");

  if (options.date_from) query = query.gte("created_at", options.date_from);
  if (options.date_to)   query = query.lte("created_at", options.date_to);

  const { data, error } = await query;
  if (error) throw error;

  const orders       = data ?? [];
  const grossRevenue = orders.reduce((sum: number, o: any) => sum + (o.subtotal     ?? 0), 0);
  const netRevenue   = orders.reduce((sum: number, o: any) => sum + (o.total_amount ?? 0), 0);

  return {
    gross_revenue:   grossRevenue,
    net_revenue:     netRevenue,
    order_count:     orders.length,
    avg_order_value: orders.length > 0 ? netRevenue / orders.length : 0,
  };
}

// ─── Top Products ─────────────────────────────────────────────────────────────

/**
 * Get top-selling products by revenue for a date range.
 * Used for the "Top Products" chart on the analytics dashboard.
 */
export async function getTopProducts(options: {
  date_from?: string;
  date_to?:   string;
  limit?:     number;
} = {}): Promise<{ product_id: string; sku: string; name_en: string; name_ar: string; qty_sold: number; revenue: number }[]> {
  let query = (supabase
    .from("order_items") as any)
    .select(`
      product_id,
      product_sku,
      product_name_en,
      product_name_ar,
      quantity,
      line_total,
      order:orders!order_id(status, created_at)
    `);

  const { data, error } = await query;
  if (error) throw error;

  // Aggregate client-side (avoids complex SQL in one query)
  const aggregated: Record<string, { product_id: string; sku: string; name_en: string; name_ar: string; qty_sold: number; revenue: number }> = {};

  for (const item of data ?? []) {
    const order = item.order as any;
    if (!order || order.status === "cancelled") continue;
    if (options.date_from && order.created_at < options.date_from) continue;
    if (options.date_to   && order.created_at > options.date_to)   continue;

    const key = item.product_id ?? item.product_sku;
    if (!aggregated[key]) {
      aggregated[key] = {
        product_id: item.product_id ?? "",
        sku:        item.product_sku,
        name_en:    item.product_name_en,
        name_ar:    item.product_name_ar,
        qty_sold:   0,
        revenue:    0,
      };
    }
    aggregated[key].qty_sold += (item as any).quantity;
    aggregated[key].revenue  += (item as any).line_total;
  }

  return Object.values(aggregated)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, options.limit ?? 10);
}

// ─── Order Trends ─────────────────────────────────────────────────────────────

/**
 * Get monthly order counts and revenue for the past N months.
 * Used for line/bar charts on the analytics dashboard.
 */
export async function getMonthlyTrends(months = 12): Promise<{
  month:       string;   // "2026-01"
  order_count: number;
  revenue:     number;
}[]> {
  const dateFrom = new Date();
  dateFrom.setMonth(dateFrom.getMonth() - months);

  const { data, error } = await (supabase
    .from("orders") as any)
    .select("total_amount, created_at, status")
    .gte("created_at", dateFrom.toISOString())
    .not("status", "eq", "cancelled");

  if (error) throw error;

  const grouped: Record<string, { order_count: number; revenue: number }> = {};

  for (const order of data ?? []) {
    const o = order as any;
    const month = o.created_at.substring(0, 7); // "YYYY-MM"
    if (!grouped[month]) grouped[month] = { order_count: 0, revenue: 0 };
    grouped[month].order_count += 1;
    grouped[month].revenue     += o.total_amount ?? 0;
  }

  // Fill in missing months with zeros for continuous charts
  const result = [];
  const cursor = new Date(dateFrom);
  cursor.setDate(1);
  while (cursor <= new Date()) {
    const month = cursor.toISOString().substring(0, 7);
    result.push({
      month,
      order_count: grouped[month]?.order_count ?? 0,
      revenue:     grouped[month]?.revenue     ?? 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return result;
}

// ─── Customer Acquisition ─────────────────────────────────────────────────────

/**
 * Get new customer signups per month for a given period.
 */
export async function getCustomerGrowth(months = 12): Promise<{ month: string; new_customers: number }[]> {
  const dateFrom = new Date();
  dateFrom.setMonth(dateFrom.getMonth() - months);

  const { data, error } = await (supabase
    .from("profiles") as any)
    .select("created_at")
    .eq("role", "customer")
    .gte("created_at", dateFrom.toISOString());

  if (error) throw error;

  const grouped: Record<string, number> = {};
  for (const p of data ?? []) {
    const month = (p as any).created_at.substring(0, 7);
    grouped[month] = (grouped[month] ?? 0) + 1;
  }

  const result = [];
  const cursor = new Date(dateFrom);
  cursor.setDate(1);
  while (cursor <= new Date()) {
    const month = cursor.toISOString().substring(0, 7);
    result.push({ month, new_customers: grouped[month] ?? 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return result;
}
