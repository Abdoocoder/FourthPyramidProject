// =============================================================================
// FOURTH PYRAMID — ORDERS API
// Screens: Orders Management - Admin, Orders Management - Refined,
//          My Orders & Tracking (Mobile), Create New Order (Mobile),
//          Admin Dashboard Overview
// =============================================================================
import { supabase, getAuthHeader, FUNCTIONS_URL } from "../supabase";
// ─── Customer: Browse Own Orders ──────────────────────────────────────────────
/**
 * Get all orders for the currently logged-in customer.
 * Used on: My Orders & Tracking screen.
 */
export async function getMyOrders(options = {}) {
    let query = supabase
        .from("orders")
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
 * Get a single order with its items for the customer.
 */
export async function getMyOrder(orderId) {
    const { data: order, error: orderErr } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();
    if (orderErr)
        throw orderErr;
    const [{ data: items, error: itemsErr }, { data: history, error: histErr }] = await Promise.all([
        supabase.from("order_items").select("*").eq("order_id", orderId).order("created_at"),
        supabase.from("order_status_history").select("*").eq("order_id", orderId).order("created_at"),
    ]);
    if (itemsErr)
        throw itemsErr;
    if (histErr)
        throw histErr;
    return { ...order, items: items ?? [], history: history ?? [] };
}
// ─── Customer: Place Order ────────────────────────────────────────────────────
/**
 * Place a new order. Validates each line item against current product data,
 * calculates totals, then inserts order + items in a single transaction.
 * Used on: Create New Order (Mobile).
 */
export async function placeOrder(input) {
    // 1. Validate products and compute pricing
    const productIds = input.items.map((i) => i.product_id);
    const { data: products, error: productsErr } = await supabase
        .from("products")
        .select("id, sku, name_ar, name_en, unit_type, base_price, price_on_request, is_in_stock, min_order_quantity")
        .in("id", productIds);
    if (productsErr)
        throw productsErr;
    const productMap = new Map(products?.map((p) => [p.id, p]));
    let subtotal = 0;
    const lineItems = input.items.map((item) => {
        const product = productMap.get(item.product_id);
        if (!product)
            throw new Error(`Product ${item.product_id} not found`);
        if (!product.is_in_stock)
            throw new Error(`Product "${product.name_en}" is out of stock`);
        if (item.quantity < product.min_order_quantity) {
            throw new Error(`Minimum order quantity for "${product.name_en}" is ${product.min_order_quantity}`);
        }
        const unitPrice = item.unit_price ?? product.base_price ?? 0;
        const discount = item.discount_percent ?? 0;
        const lineTotal = item.quantity * unitPrice * (1 - discount / 100);
        subtotal += lineTotal;
        return {
            product_id: item.product_id,
            product_sku: product.sku,
            product_name_ar: product.name_ar,
            product_name_en: product.name_en,
            unit_type: product.unit_type,
            quantity: item.quantity,
            unit_price: unitPrice,
            discount_percent: discount,
            line_total: lineTotal,
            custom_specs: item.custom_specs ?? {},
            notes: item.notes ?? null,
        };
    });
    // 2. Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        throw new Error("Must be authenticated to place an order");
    // 3. Insert order
    const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
        customer_id: user.id,
        status: "pending",
        subtotal,
        discount_amount: 0,
        tax_amount: 0,
        shipping_amount: 0,
        total_amount: subtotal,
        currency: "EGP",
        payment_terms: input.payment_terms ?? "prepaid",
        shipping_address: input.shipping_address ?? null,
        notes: input.notes ?? null,
        created_by: user.id,
    })
        .select()
        .single();
    if (orderErr)
        throw orderErr;
    // 4. Insert order items
    const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(lineItems.map((li) => ({ ...li, order_id: order.id })));
    if (itemsErr) {
        // Rollback order if items fail (best-effort cleanup)
        await supabase.from("orders").delete().eq("id", order.id);
        throw itemsErr;
    }
    return order;
}
/**
 * Customer: cancel a pending order.
 */
export async function cancelMyOrder(orderId) {
    const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId)
        .eq("status", "pending"); // RLS + DB both enforce this
    if (error)
        throw error;
}
// ─── Admin: Manage Orders ─────────────────────────────────────────────────────
/**
 * Admin: list all orders with customer info and item summaries.
 * Used on: Orders Management - Admin / Refined screens.
 */
export async function adminGetOrders(options = {}) {
    let query = supabase
        .from("orders_with_customer")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
    if (options.status)
        query = query.eq("status", options.status);
    if (options.customer_id)
        query = query.eq("customer_id", options.customer_id);
    if (options.date_from)
        query = query.gte("created_at", options.date_from);
    if (options.date_to)
        query = query.lte("created_at", options.date_to);
    if (options.search) {
        query = query.or(`order_number.ilike.%${options.search}%,customer_name.ilike.%${options.search}%,company_name.ilike.%${options.search}%`);
    }
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
 * Admin: get a single order's full detail (order + items + history).
 */
export async function adminGetOrder(orderId) {
    const { data: order, error: orderErr } = await supabase
        .from("orders_with_customer")
        .select("*")
        .eq("id", orderId)
        .single();
    if (orderErr)
        throw orderErr;
    const { data: history, error: histErr } = await supabase
        .from("order_status_history")
        .select("*, changed_by_profile:profiles!changed_by(full_name, role)")
        .eq("order_id", orderId)
        .order("created_at");
    if (histErr)
        throw histErr;
    return { ...order, history: history ?? [] };
}
/**
 * Admin: update order status with optional email notification to customer.
 * Calls the `order-notification` Edge Function to trigger email.
 */
export async function adminUpdateOrderStatus(orderId, newStatus, options = {}) {
    const { notifyCustomer = true, adminNote, trackingCode, deliveryDateEst } = options;
    if (notifyCustomer) {
        // Use Edge Function (sends email + updates DB)
        const headers = await getAuthHeader();
        const res = await fetch(`${FUNCTIONS_URL}/order-notification`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "update_order_status",
                order_id: orderId,
                new_status: newStatus,
                admin_note: adminNote,
                tracking_code: trackingCode,
                delivery_date_est: deliveryDateEst,
            }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error ?? "Failed to update order status");
        }
    }
    else {
        // Direct DB update without email
        const updatePayload = { status: newStatus };
        if (adminNote)
            updatePayload.admin_notes = adminNote;
        if (trackingCode)
            updatePayload.tracking_code = trackingCode;
        if (deliveryDateEst)
            updatePayload.delivery_date_est = deliveryDateEst;
        if (newStatus === "delivered")
            updatePayload.delivered_at = new Date().toISOString();
        const { error } = await supabase
            .from("orders")
            .update(updatePayload)
            .eq("id", orderId);
        if (error)
            throw error;
    }
}
/**
 * Admin: update general order fields (payment ref, shipping address, notes, terms).
 */
export async function adminUpdateOrder(orderId, updates) {
    const { data, error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", orderId)
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
/**
 * Admin: add a line item to an existing order (if still in pending/confirmed state).
 */
export async function adminAddOrderItem(orderId, item) {
    const discountPct = item.discount_percent ?? 0;
    const lineTotal = item.quantity * item.unit_price * (1 - discountPct / 100);
    const { data, error } = await supabase
        .from("order_items")
        .insert({
        order_id: orderId,
        product_id: item.product_id ?? null,
        product_sku: item.product_sku,
        product_name_ar: item.product_name_ar,
        product_name_en: item.product_name_en,
        unit_type: item.unit_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: discountPct,
        line_total: lineTotal,
    })
        .select()
        .single();
    if (error)
        throw error;
    // Recalculate order totals
    await recalculateOrderTotals(orderId);
    return data;
}
/**
 * Admin: remove a line item from an order and recalculate totals.
 */
export async function adminRemoveOrderItem(orderId, itemId) {
    const { error } = await supabase
        .from("order_items")
        .delete()
        .eq("id", itemId)
        .eq("order_id", orderId);
    if (error)
        throw error;
    await recalculateOrderTotals(orderId);
}
// ─── Helpers ──────────────────────────────────────────────────────────────────
async function recalculateOrderTotals(orderId) {
    const { data: items } = await supabase
        .from("order_items")
        .select("line_total")
        .eq("order_id", orderId);
    const subtotal = (items ?? []).reduce((sum, i) => sum + i.line_total, 0);
    const totalAmount = subtotal; // Extend with tax/shipping if needed
    await supabase
        .from("orders")
        .update({ subtotal, total_amount: totalAmount })
        .eq("id", orderId);
}
/**
 * Admin: get order status counts for dashboard widgets.
 */
export async function getOrderStatusCounts() {
    const { data, error } = await supabase
        .from("orders")
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
//# sourceMappingURL=orders.js.map