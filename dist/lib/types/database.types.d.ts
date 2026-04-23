export type Json = string | number | boolean | null | {
    [key: string]: Json | undefined;
} | Json[];
export type UserRole = "admin" | "customer";
export type OrderStatus = "pending" | "confirmed" | "in_production" | "quality_check" | "shipped" | "delivered" | "cancelled" | "on_hold";
export type QuoteStatus = "submitted" | "under_review" | "quoted" | "accepted" | "rejected" | "converted";
export type ContactStatus = "new" | "in_progress" | "resolved" | "archived";
export type ProductUnit = "kg" | "ton" | "piece" | "meter" | "roll" | "bag" | "box";
export type PaymentTerms = "prepaid" | "net_30" | "net_60" | "net_90" | "on_delivery" | "lc";
export interface ProductWithImage {
    id: string;
    sku: string;
    name_ar: string;
    name_en: string;
    slug: string;
    base_price: number | null;
    price_on_request: boolean;
    unit_type: ProductUnit;
    min_order_quantity: number;
    is_in_stock: boolean;
    is_featured: boolean;
    specifications: Json;
    primary_image_url: string | null;
    primary_image_path: string | null;
    primary_image_alt_ar: string | null;
    primary_image_alt_en: string | null;
    category_name_ar: string | null;
    category_name_en: string | null;
    category_slug: string | null;
    category_icon: string | null;
    created_at: string;
}
export interface OrderWithCustomer {
    id: string;
    order_number: string;
    customer_id: string;
    status: OrderStatus;
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    shipping_amount: number;
    total_amount: number;
    currency: string;
    payment_terms: PaymentTerms;
    payment_reference: string | null;
    paid_at: string | null;
    shipping_address: Json | null;
    delivery_date_est: string | null;
    delivered_at: string | null;
    tracking_code: string | null;
    notes: string | null;
    admin_notes: string | null;
    quote_id: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    customer_name: string | null;
    company_name: string | null;
    customer_phone: string | null;
    customer_email: string | null;
    country: string | null;
    city: string | null;
    items: any;
}
export interface CustomerOrderSummary {
    customer_id: string;
    full_name: string | null;
    company_name: string | null;
    customer_email: string | null;
    phone: string | null;
    city: string | null;
    country: string | null;
    customer_since: string;
    total_orders: number;
    lifetime_value: number;
    last_order_date: string | null;
    delivered_orders: number;
    cancelled_orders: number;
    active_orders: number;
}
export interface DashboardSummary {
    orders: {
        total: number;
        pending: number;
        in_production: number;
        shipped: number;
        delivered: number;
        cancelled: number;
        this_month: number;
    };
    revenue: {
        total: number;
        this_month: number;
        last_month: number;
    };
    customers: number;
    products: number;
    pending_quotes: number;
    new_messages: number;
}
export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    role: UserRole;
                    full_name: string | null;
                    company_name: string | null;
                    phone: string | null;
                    country: string | null;
                    city: string | null;
                    address: string | null;
                    tax_id: string | null;
                    preferred_language: string | null;
                    avatar_url: string | null;
                    is_active: boolean;
                    notes: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    role?: UserRole;
                    full_name?: string | null;
                    company_name?: string | null;
                    phone?: string | null;
                    country?: string | null;
                    city?: string | null;
                    address?: string | null;
                    tax_id?: string | null;
                    preferred_language?: string | null;
                    avatar_url?: string | null;
                    is_active?: boolean;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    role?: UserRole;
                    full_name?: string | null;
                    company_name?: string | null;
                    phone?: string | null;
                    country?: string | null;
                    city?: string | null;
                    address?: string | null;
                    tax_id?: string | null;
                    preferred_language?: string | null;
                    avatar_url?: string | null;
                    is_active?: boolean;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            categories: {
                Row: {
                    id: number;
                    name_ar: string;
                    name_en: string;
                    slug: string;
                    description: string | null;
                    icon: string | null;
                    sort_order: number;
                    is_active: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: number;
                    name_ar: string;
                    name_en: string;
                    slug: string;
                    description?: string | null;
                    icon?: string | null;
                    sort_order?: number;
                    is_active?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: number;
                    name_ar?: string;
                    name_en?: string;
                    slug?: string;
                    description?: string | null;
                    icon?: string | null;
                    sort_order?: number;
                    is_active?: boolean;
                    created_at?: string;
                };
                Relationships: [];
            };
            products: {
                Row: {
                    id: string;
                    category_id: number | null;
                    sku: string;
                    name_ar: string;
                    name_en: string;
                    slug: string;
                    description_ar: string | null;
                    description_en: string | null;
                    specifications: Json;
                    base_price: number | null;
                    price_on_request: boolean;
                    currency: string;
                    unit_type: ProductUnit;
                    min_order_quantity: number;
                    stock_quantity: number;
                    is_in_stock: boolean;
                    is_active: boolean;
                    is_featured: boolean;
                    sort_order: number;
                    tags: string[] | null;
                    created_by: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    category_id?: number | null;
                    sku: string;
                    name_ar: string;
                    name_en: string;
                    slug: string;
                    description_ar?: string | null;
                    description_en?: string | null;
                    specifications?: Json;
                    base_price?: number | null;
                    price_on_request?: boolean;
                    currency?: string;
                    unit_type: ProductUnit;
                    min_order_quantity?: number;
                    stock_quantity?: number;
                    is_in_stock?: boolean;
                    is_active?: boolean;
                    is_featured?: boolean;
                    sort_order?: number;
                    tags?: string[] | null;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    category_id?: number | null;
                    sku?: string;
                    name_ar?: string;
                    name_en?: string;
                    slug?: string;
                    description_ar?: string | null;
                    description_en?: string | null;
                    specifications?: Json;
                    base_price?: number | null;
                    price_on_request?: boolean;
                    currency?: string;
                    unit_type?: ProductUnit;
                    min_order_quantity?: number;
                    stock_quantity?: number;
                    is_in_stock?: boolean;
                    is_active?: boolean;
                    is_featured?: boolean;
                    sort_order?: number;
                    tags?: string[] | null;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            product_images: {
                Row: {
                    id: string;
                    product_id: string;
                    storage_path: string;
                    url: string;
                    alt_ar: string | null;
                    alt_en: string | null;
                    is_primary: boolean;
                    sort_order: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    product_id: string;
                    storage_path: string;
                    url: string;
                    alt_ar?: string | null;
                    alt_en?: string | null;
                    is_primary?: boolean;
                    sort_order?: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    product_id?: string;
                    storage_path?: string;
                    url?: string;
                    alt_ar?: string | null;
                    alt_en?: string | null;
                    is_primary?: boolean;
                    sort_order?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            orders: {
                Row: {
                    id: string;
                    order_number: string;
                    customer_id: string;
                    status: OrderStatus;
                    subtotal: number;
                    discount_amount: number;
                    tax_amount: number;
                    shipping_amount: number;
                    total_amount: number;
                    currency: string;
                    payment_terms: PaymentTerms;
                    payment_reference: string | null;
                    paid_at: string | null;
                    shipping_address: Json | null;
                    delivery_date_est: string | null;
                    delivered_at: string | null;
                    tracking_code: string | null;
                    notes: string | null;
                    admin_notes: string | null;
                    quote_id: string | null;
                    created_by: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    order_number?: string;
                    customer_id: string;
                    status?: OrderStatus;
                    subtotal?: number;
                    discount_amount?: number;
                    tax_amount?: number;
                    shipping_amount?: number;
                    total_amount?: number;
                    currency?: string;
                    payment_terms?: PaymentTerms;
                    payment_reference?: string | null;
                    paid_at?: string | null;
                    shipping_address?: Json | null;
                    delivery_date_est?: string | null;
                    delivered_at?: string | null;
                    tracking_code?: string | null;
                    notes?: string | null;
                    admin_notes?: string | null;
                    quote_id?: string | null;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    order_number?: string;
                    customer_id?: string;
                    status?: OrderStatus;
                    subtotal?: number;
                    discount_amount?: number;
                    tax_amount?: number;
                    shipping_amount?: number;
                    total_amount?: number;
                    currency?: string;
                    payment_terms?: PaymentTerms;
                    payment_reference?: string | null;
                    paid_at?: string | null;
                    shipping_address?: Json | null;
                    delivery_date_est?: string | null;
                    delivered_at?: string | null;
                    tracking_code?: string | null;
                    notes?: string | null;
                    admin_notes?: string | null;
                    quote_id?: string | null;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            order_items: {
                Row: {
                    id: string;
                    order_id: string;
                    product_id: string | null;
                    product_sku: string;
                    product_name_ar: string;
                    product_name_en: string;
                    unit_type: ProductUnit;
                    quantity: number;
                    unit_price: number;
                    discount_percent: number;
                    line_total: number;
                    custom_specs: Json | null;
                    notes: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    order_id: string;
                    product_id?: string | null;
                    product_sku: string;
                    product_name_ar: string;
                    product_name_en: string;
                    unit_type: ProductUnit;
                    quantity: number;
                    unit_price: number;
                    discount_percent?: number;
                    line_total: number;
                    custom_specs?: Json | null;
                    notes?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    order_id?: string;
                    product_id?: string | null;
                    product_sku?: string;
                    product_name_ar?: string;
                    product_name_en?: string;
                    unit_type?: ProductUnit;
                    quantity?: number;
                    unit_price?: number;
                    discount_percent?: number;
                    line_total?: number;
                    custom_specs?: Json | null;
                    notes?: string | null;
                    created_at?: string;
                };
                Relationships: [];
            };
            order_status_history: {
                Row: {
                    id: string;
                    order_id: string;
                    from_status: OrderStatus | null;
                    to_status: OrderStatus;
                    changed_by: string | null;
                    note: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    order_id: string;
                    from_status?: OrderStatus | null;
                    to_status: OrderStatus;
                    changed_by?: string | null;
                    note?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    order_id?: string;
                    from_status?: OrderStatus | null;
                    to_status?: OrderStatus;
                    changed_by?: string | null;
                    note?: string | null;
                    created_at?: string;
                };
                Relationships: [];
            };
            quotes: {
                Row: {
                    id: string;
                    quote_number: string;
                    customer_id: string | null;
                    contact_name: string | null;
                    contact_email: string | null;
                    contact_phone: string | null;
                    company_name: string | null;
                    status: QuoteStatus;
                    description: string;
                    items: Json;
                    quoted_amount: number | null;
                    quoted_currency: string | null;
                    valid_until: string | null;
                    admin_response: string | null;
                    converted_order_id: string | null;
                    assigned_to: string | null;
                    notes: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    quote_number?: string;
                    customer_id?: string | null;
                    contact_name?: string | null;
                    contact_email?: string | null;
                    contact_phone?: string | null;
                    company_name?: string | null;
                    status?: QuoteStatus;
                    description: string;
                    items: Json;
                    quoted_amount?: number | null;
                    quoted_currency?: string | null;
                    valid_until?: string | null;
                    admin_response?: string | null;
                    converted_order_id?: string | null;
                    assigned_to?: string | null;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    quote_number?: string;
                    customer_id?: string | null;
                    contact_name?: string | null;
                    contact_email?: string | null;
                    contact_phone?: string | null;
                    company_name?: string | null;
                    status?: QuoteStatus;
                    description?: string;
                    items?: Json;
                    quoted_amount?: number | null;
                    quoted_currency?: string | null;
                    valid_until?: string | null;
                    admin_response?: string | null;
                    converted_order_id?: string | null;
                    assigned_to?: string | null;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            contact_messages: {
                Row: {
                    id: string;
                    full_name: string;
                    email: string;
                    phone: string | null;
                    company: string | null;
                    subject: string;
                    message: string;
                    status: ContactStatus;
                    replied_at: string | null;
                    replied_by: string | null;
                    reply_text: string | null;
                    customer_id: string | null;
                    ip_address: string | null;
                    user_agent: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    full_name: string;
                    email: string;
                    phone?: string | null;
                    company?: string | null;
                    subject: string;
                    message: string;
                    status?: ContactStatus;
                    replied_at?: string | null;
                    replied_by?: string | null;
                    reply_text?: string | null;
                    customer_id?: string | null;
                    ip_address?: string | null;
                    user_agent?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    full_name?: string;
                    email?: string;
                    phone?: string | null;
                    company?: string | null;
                    subject?: string;
                    message?: string;
                    status?: ContactStatus;
                    replied_at?: string | null;
                    replied_by?: string | null;
                    reply_text?: string | null;
                    customer_id?: string | null;
                    ip_address?: string | null;
                    user_agent?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            analytics_snapshots: {
                Row: {
                    id: string;
                    snapshot_date: string;
                    total_orders: number;
                    new_orders: number;
                    delivered_orders: number;
                    cancelled_orders: number;
                    gross_revenue: number;
                    net_revenue: number;
                    new_customers: number;
                    active_customers: number;
                    top_products: Json;
                    total_quotes: number;
                    converted_quotes: number;
                    total_messages: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    snapshot_date: string;
                    total_orders?: number;
                    new_orders?: number;
                    delivered_orders?: number;
                    cancelled_orders?: number;
                    gross_revenue?: number;
                    net_revenue?: number;
                    new_customers?: number;
                    active_customers?: number;
                    top_products?: Json;
                    total_quotes?: number;
                    converted_quotes?: number;
                    total_messages?: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    snapshot_date?: string;
                    total_orders?: number;
                    new_orders?: number;
                    delivered_orders?: number;
                    cancelled_orders?: number;
                    gross_revenue?: number;
                    net_revenue?: number;
                    new_customers?: number;
                    active_customers?: number;
                    top_products?: Json;
                    total_quotes?: number;
                    converted_quotes?: number;
                    total_messages?: number;
                    created_at?: string;
                };
                Relationships: [];
            };
        };
        Views: {
            products_with_primary_image: {
                Row: ProductWithImage;
                Relationships: [];
            };
            orders_with_customer: {
                Row: OrderWithCustomer;
                Relationships: [];
            };
            customer_order_summary: {
                Row: CustomerOrderSummary;
                Relationships: [];
            };
        };
        Functions: {
            search_products: {
                Args: {
                    p_query: string | null;
                    p_category_id: number | null;
                    p_min_price: number | null;
                    p_max_price: number | null;
                    p_in_stock_only: boolean;
                    p_limit: number;
                    p_offset: number;
                };
                Returns: ProductWithImage[];
            };
            get_dashboard_summary: {
                Args: Record<PropertyKey, never>;
                Returns: DashboardSummary;
            };
            refresh_daily_analytics: {
                Args: {
                    p_date?: string;
                };
                Returns: undefined;
            };
            convert_quote_to_order: {
                Args: {
                    p_quote_id: string;
                    p_admin_id: string;
                };
                Returns: string;
            };
            is_admin: {
                Args: Record<PropertyKey, never>;
                Returns: boolean;
            };
        };
        Enums: {
            user_role: UserRole;
            order_status: OrderStatus;
            quote_status: QuoteStatus;
            contact_status: ContactStatus;
            product_unit: ProductUnit;
            payment_terms: PaymentTerms;
        };
    };
}
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderStatusHistory = Database["public"]["Tables"]["order_status_history"]["Row"];
export type Quote = Database["public"]["Tables"]["quotes"]["Row"];
export type ContactMessage = Database["public"]["Tables"]["contact_messages"]["Row"];
export type AnalyticsSnapshot = Database["public"]["Tables"]["analytics_snapshots"]["Row"];
export interface UpsertProductInput {
    category_id?: number | null;
    sku: string;
    name_ar: string;
    name_en: string;
    slug: string;
    description_ar?: string | null;
    description_en?: string | null;
    specifications?: Json;
    base_price?: number | null;
    price_on_request?: boolean;
    currency?: string;
    unit_type: ProductUnit;
    min_order_quantity: number;
    stock_quantity: number;
    is_in_stock?: boolean;
    is_active?: boolean;
    is_featured?: boolean;
    sort_order?: number;
    tags?: string[] | null;
}
export interface ProductSearchParams {
    query?: string;
    category_id?: number;
    min_price?: number;
    max_price?: number;
    in_stock_only?: boolean;
    limit?: number;
    offset?: number;
}
export interface CreateOrderInput {
    items: {
        product_id: string;
        quantity: number;
        unit_price?: number;
        discount_percent?: number;
        custom_specs?: Json;
        notes?: string;
    }[];
    payment_terms?: PaymentTerms;
    shipping_address?: Json;
    notes?: string;
}
export interface SubmitQuoteInput {
    contact_name: string;
    contact_email: string;
    contact_phone?: string;
    company_name?: string;
    description: string;
    items: {
        name_en: string;
        qty: number;
        unit?: string;
        specs?: string;
    }[];
}
export interface SubmitContactInput {
    full_name: string;
    email: string;
    phone?: string;
    company?: string;
    subject: string;
    message: string;
}
//# sourceMappingURL=database.types.d.ts.map