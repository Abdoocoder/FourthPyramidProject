import type { Order, OrderWithCustomer, OrderItem, OrderStatusHistory, OrderStatus, CreateOrderInput, PaymentTerms } from "../types/database.types";
/**
 * Get all orders for the currently logged-in customer.
 * Used on: My Orders & Tracking screen.
 */
export declare function getMyOrders(options?: {
    status?: OrderStatus;
    limit?: number;
    offset?: number;
}): Promise<{
    data: Order[];
    count: number;
}>;
/**
 * Get a single order with its items for the customer.
 */
export declare function getMyOrder(orderId: string): Promise<Order & {
    items: OrderItem[];
    history: OrderStatusHistory[];
}>;
/**
 * Place a new order. Validates each line item against current product data,
 * calculates totals, then inserts order + items in a single transaction.
 * Used on: Create New Order (Mobile).
 */
export declare function placeOrder(input: CreateOrderInput): Promise<Order>;
/**
 * Customer: cancel a pending order.
 */
export declare function cancelMyOrder(orderId: string): Promise<void>;
/**
 * Admin: list all orders with customer info and item summaries.
 * Used on: Orders Management - Admin / Refined screens.
 */
export declare function adminGetOrders(options?: {
    status?: OrderStatus;
    customer_id?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
}): Promise<{
    data: OrderWithCustomer[];
    count: number;
}>;
/**
 * Admin: get a single order's full detail (order + items + history).
 */
export declare function adminGetOrder(orderId: string): Promise<OrderWithCustomer & {
    history: OrderStatusHistory[];
}>;
/**
 * Admin: update order status with optional email notification to customer.
 * Calls the `order-notification` Edge Function to trigger email.
 */
export declare function adminUpdateOrderStatus(orderId: string, newStatus: OrderStatus, options?: {
    adminNote?: string;
    trackingCode?: string;
    deliveryDateEst?: string;
    notifyCustomer?: boolean;
}): Promise<void>;
/**
 * Admin: update general order fields (payment ref, shipping address, notes, terms).
 */
export declare function adminUpdateOrder(orderId: string, updates: {
    payment_terms?: PaymentTerms;
    payment_reference?: string;
    paid_at?: string;
    shipping_address?: Record<string, any>;
    delivery_date_est?: string;
    admin_notes?: string;
    notes?: string;
}): Promise<Order>;
/**
 * Admin: add a line item to an existing order (if still in pending/confirmed state).
 */
export declare function adminAddOrderItem(orderId: string, item: {
    product_id?: string;
    product_sku: string;
    product_name_ar: string;
    product_name_en: string;
    unit_type: string;
    quantity: number;
    unit_price: number;
    discount_percent?: number;
}): Promise<OrderItem>;
/**
 * Admin: remove a line item from an order and recalculate totals.
 */
export declare function adminRemoveOrderItem(orderId: string, itemId: string): Promise<void>;
/**
 * Admin: get order status counts for dashboard widgets.
 */
export declare function getOrderStatusCounts(): Promise<Record<OrderStatus, number>>;
//# sourceMappingURL=orders.d.ts.map