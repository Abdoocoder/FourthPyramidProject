-- =============================================================================
-- FOURTH PYRAMID INDUSTRIAL ECOSYSTEM — DATABASE FUNCTIONS & VIEWS
-- Migration: 003 — Functions, Views, and Stored Procedures
-- =============================================================================

-- =============================================================================
-- VIEWS
-- =============================================================================

-- ─── products_with_primary_image ─────────────────────────────────────────────
-- Joins products with their primary image for list/catalog views
CREATE OR REPLACE VIEW public.products_with_primary_image AS
SELECT
  p.*,
  pi.url          AS primary_image_url,
  pi.storage_path AS primary_image_path,
  pi.alt_ar       AS primary_image_alt_ar,
  pi.alt_en       AS primary_image_alt_en,
  c.name_ar       AS category_name_ar,
  c.name_en       AS category_name_en,
  c.slug          AS category_slug,
  c.icon          AS category_icon
FROM public.products p
LEFT JOIN public.product_images pi
  ON pi.product_id = p.id AND pi.is_primary = TRUE
LEFT JOIN public.categories c
  ON c.id = p.category_id;

-- ─── orders_with_customer ─────────────────────────────────────────────────────
-- Joins orders with customer profile for admin order management
CREATE OR REPLACE VIEW public.orders_with_customer AS
SELECT
  o.*,
  pr.full_name      AS customer_name,
  pr.company_name,
  pr.phone          AS customer_phone,
  pr.email          AS customer_email,
  pr.country,
  pr.city,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id',              oi.id,
        'product_id',      oi.product_id,
        'sku',             oi.product_sku,
        'name_ar',         oi.product_name_ar,
        'name_en',         oi.product_name_en,
        'qty',             oi.quantity,
        'unit',            oi.unit_type,
        'unit_price',      oi.unit_price,
        'discount',        oi.discount_percent,
        'line_total',      oi.line_total
      )
    )
    FROM public.order_items oi WHERE oi.order_id = o.id
  ) AS items
FROM public.orders o
JOIN public.profiles pr ON pr.id = o.customer_id;

-- This view respects RLS on the underlying tables; security left to underlying table policies.

-- ─── customer_order_summary ───────────────────────────────────────────────────
-- For "Customer History" admin screen
CREATE OR REPLACE VIEW public.customer_order_summary AS
SELECT
  pr.id                                        AS customer_id,
  pr.full_name,
  pr.company_name,
  pr.email                                     AS customer_email,
  pr.phone,
  pr.city,
  pr.country,
  pr.created_at                                AS customer_since,
  COUNT(o.id)                                  AS total_orders,
  SUM(o.total_amount)                          AS lifetime_value,
  MAX(o.created_at)                            AS last_order_date,
  COUNT(o.id) FILTER (WHERE o.status = 'delivered') AS delivered_orders,
  COUNT(o.id) FILTER (WHERE o.status = 'cancelled') AS cancelled_orders,
  COUNT(o.id) FILTER (WHERE o.status NOT IN ('delivered','cancelled')) AS active_orders
FROM public.profiles pr
LEFT JOIN public.orders o ON o.customer_id = pr.id
WHERE pr.role = 'customer'
GROUP BY pr.id, pr.full_name, pr.company_name, pr.phone, pr.city, pr.country, pr.created_at;

-- =============================================================================
-- SEARCH FUNCTION  (full-text + trigram on products)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.search_products(
  p_query         TEXT,
  p_category_id   INTEGER DEFAULT NULL,
  p_min_price     NUMERIC DEFAULT NULL,
  p_max_price     NUMERIC DEFAULT NULL,
  p_in_stock_only BOOLEAN DEFAULT FALSE,
  p_limit         INTEGER DEFAULT 20,
  p_offset        INTEGER DEFAULT 0
)
RETURNS TABLE (
  id              UUID,
  sku             TEXT,
  name_ar         TEXT,
  name_en         TEXT,
  slug            TEXT,
  base_price      NUMERIC,
  price_on_request BOOLEAN,
  unit_type       product_unit,
  min_order_quantity NUMERIC,
  is_in_stock     BOOLEAN,
  is_featured     BOOLEAN,
  specifications  JSONB,
  primary_image_url TEXT,
  category_name_ar TEXT,
  category_name_en TEXT,
  relevance       FLOAT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.sku,
    p.name_ar,
    p.name_en,
    p.slug,
    p.base_price,
    p.price_on_request,
    p.unit_type,
    p.min_order_quantity,
    p.is_in_stock,
    p.is_featured,
    p.specifications,
    pi.url,
    c.name_ar,
    c.name_en,
    CASE
      WHEN p_query IS NOT NULL AND p_query <> ''
        THEN ts_rank(p.search_vector, plainto_tsquery('english', p_query))
             + similarity(p.name_en, p_query)
      ELSE 1.0
    END AS relevance
  FROM public.products p
  LEFT JOIN public.product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE
  LEFT JOIN public.categories c ON c.id = p.category_id
  WHERE
    p.is_active = TRUE
    AND (p_query IS NULL OR p_query = ''
         OR p.search_vector @@ plainto_tsquery('english', p_query)
         OR p.name_ar ILIKE '%' || p_query || '%'
         OR p.name_en ILIKE '%' || p_query || '%'
         OR p.sku ILIKE '%' || p_query || '%'
    )
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_min_price IS NULL OR p.base_price >= p_min_price)
    AND (p_max_price IS NULL OR p.base_price <= p_max_price)
    AND (NOT p_in_stock_only OR p.is_in_stock = TRUE)
  ORDER BY relevance DESC, p.is_featured DESC, p.sort_order ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =============================================================================
-- ANALYTICS: DAILY SNAPSHOT REFRESH
-- =============================================================================

CREATE OR REPLACE FUNCTION public.refresh_daily_analytics(p_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_orders     INTEGER;
  v_new_orders       INTEGER;
  v_delivered_orders INTEGER;
  v_cancelled_orders INTEGER;
  v_gross_revenue    NUMERIC;
  v_net_revenue      NUMERIC;
  v_new_customers    INTEGER;
  v_active_customers INTEGER;
  v_top_products     JSONB;
  v_total_quotes     INTEGER;
  v_converted_quotes INTEGER;
  v_total_messages   INTEGER;
BEGIN
  -- Orders for the day
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'pending' OR DATE(created_at) = p_date),
    COUNT(*) FILTER (WHERE status = 'delivered'),
    COUNT(*) FILTER (WHERE status = 'cancelled')
  INTO v_total_orders, v_new_orders, v_delivered_orders, v_cancelled_orders
  FROM public.orders
  WHERE DATE(created_at) <= p_date;

  -- Revenue
  SELECT
    COALESCE(SUM(subtotal), 0),
    COALESCE(SUM(total_amount), 0)
  INTO v_gross_revenue, v_net_revenue
  FROM public.orders
  WHERE DATE(created_at) = p_date AND status NOT IN ('cancelled');

  -- Customers
  SELECT
    COUNT(*) FILTER (WHERE DATE(created_at) = p_date),
    COUNT(DISTINCT customer_id)
  INTO v_new_customers, v_active_customers
  FROM public.profiles p
  LEFT JOIN public.orders o ON o.customer_id = p.id AND DATE(o.created_at) = p_date
  WHERE p.role = 'customer';

  -- Top 10 products by revenue for the day
  SELECT jsonb_agg(top)
  INTO v_top_products
  FROM (
    SELECT
      jsonb_build_object(
        'product_id',   oi.product_id,
        'sku',          oi.product_sku,
        'name_en',      oi.product_name_en,
        'qty_sold',     SUM(oi.quantity),
        'revenue',      SUM(oi.line_total)
      ) AS top
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE DATE(o.created_at) = p_date AND o.status NOT IN ('cancelled')
    GROUP BY oi.product_id, oi.product_sku, oi.product_name_en
    ORDER BY SUM(oi.line_total) DESC
    LIMIT 10
  ) t;

  -- Quotes
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'converted')
  INTO v_total_quotes, v_converted_quotes
  FROM public.quotes
  WHERE DATE(created_at) = p_date;

  -- Contact messages
  SELECT COUNT(*)
  INTO v_total_messages
  FROM public.contact_messages
  WHERE DATE(created_at) = p_date;

  -- Upsert snapshot
  INSERT INTO public.analytics_snapshots (
    snapshot_date, total_orders, new_orders, delivered_orders, cancelled_orders,
    gross_revenue, net_revenue, new_customers, active_customers,
    top_products, total_quotes, converted_quotes, total_messages
  )
  VALUES (
    p_date, v_total_orders, v_new_orders, v_delivered_orders, v_cancelled_orders,
    v_gross_revenue, v_net_revenue, v_new_customers, v_active_customers,
    COALESCE(v_top_products, '[]'::JSONB), v_total_quotes, v_converted_quotes, v_total_messages
  )
  ON CONFLICT (snapshot_date) DO UPDATE SET
    total_orders     = EXCLUDED.total_orders,
    new_orders       = EXCLUDED.new_orders,
    delivered_orders = EXCLUDED.delivered_orders,
    cancelled_orders = EXCLUDED.cancelled_orders,
    gross_revenue    = EXCLUDED.gross_revenue,
    net_revenue      = EXCLUDED.net_revenue,
    new_customers    = EXCLUDED.new_customers,
    active_customers = EXCLUDED.active_customers,
    top_products     = EXCLUDED.top_products,
    total_quotes     = EXCLUDED.total_quotes,
    converted_quotes = EXCLUDED.converted_quotes,
    total_messages   = EXCLUDED.total_messages;
END;
$$;

-- =============================================================================
-- FUNCTION: convert_quote_to_order
-- =============================================================================

CREATE OR REPLACE FUNCTION public.convert_quote_to_order(
  p_quote_id    UUID,
  p_admin_id    UUID
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_quote       public.quotes%ROWTYPE;
  v_order_id    UUID;
  v_item        JSONB;
  v_product     public.products%ROWTYPE;
BEGIN
  -- Fetch and validate quote
  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote % not found', p_quote_id;
  END IF;
  IF v_quote.status <> 'accepted' THEN
    RAISE EXCEPTION 'Quote must be in accepted status to convert. Current: %', v_quote.status;
  END IF;

  -- Create the order
  INSERT INTO public.orders (
    customer_id, status, subtotal, total_amount, currency,
    payment_terms, quote_id, created_by, notes
  )
  VALUES (
    v_quote.customer_id,
    'confirmed',
    COALESCE(v_quote.quoted_amount, 0),
    COALESCE(v_quote.quoted_amount, 0),
    COALESCE(v_quote.quoted_currency, 'EGP'),
    'prepaid',
    p_quote_id,
    p_admin_id,
    'Converted from quote ' || v_quote.quote_number
  )
  RETURNING id INTO v_order_id;

  -- Insert order items from quote items JSONB array
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_quote.items, '[]'::JSONB))
  LOOP
    SELECT * INTO v_product FROM public.products WHERE id = (v_item->>'product_id')::UUID;

    INSERT INTO public.order_items (
      order_id, product_id, product_sku, product_name_ar, product_name_en,
      unit_type, quantity, unit_price, line_total
    )
    VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      COALESCE(v_product.sku, v_item->>'sku', 'CUSTOM'),
      COALESCE(v_product.name_ar, v_item->>'name_ar', v_item->>'name'),
      COALESCE(v_product.name_en, v_item->>'name_en', v_item->>'name'),
      COALESCE(v_product.unit_type, (v_item->>'unit')::product_unit, 'piece'),
      (v_item->>'qty')::NUMERIC,
      COALESCE((v_item->>'unit_price')::NUMERIC, v_product.base_price, 0),
      COALESCE((v_item->>'qty')::NUMERIC * (v_item->>'unit_price')::NUMERIC, 0)
    );
  END LOOP;

  -- Mark quote as converted
  UPDATE public.quotes
  SET status             = 'converted',
      converted_order_id = v_order_id
  WHERE id = p_quote_id;

  RETURN v_order_id;
END;
$$;

-- =============================================================================
-- FUNCTION: get_dashboard_summary  (for admin Home Dashboard)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'orders', jsonb_build_object(
      'total',      COUNT(*),
      'pending',    COUNT(*) FILTER (WHERE status = 'pending'),
      'in_production', COUNT(*) FILTER (WHERE status = 'in_production'),
      'shipped',    COUNT(*) FILTER (WHERE status = 'shipped'),
      'delivered',  COUNT(*) FILTER (WHERE status = 'delivered'),
      'cancelled',  COUNT(*) FILTER (WHERE status = 'cancelled'),
      'this_month', COUNT(*) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()))
    ),
    'revenue', jsonb_build_object(
      'total',      COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('cancelled')), 0),
      'this_month', COALESCE(SUM(total_amount) FILTER (
        WHERE status NOT IN ('cancelled')
          AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
      ), 0),
      'last_month', COALESCE(SUM(total_amount) FILTER (
        WHERE status NOT IN ('cancelled')
          AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')
      ), 0)
    )
  )
  INTO result
  FROM public.orders;

  -- Add customer count
  result := result || jsonb_build_object(
    'customers', (SELECT COUNT(*) FROM public.profiles WHERE role = 'customer' AND is_active = TRUE),
    'products',  (SELECT COUNT(*) FROM public.products WHERE is_active = TRUE),
    'pending_quotes', (SELECT COUNT(*) FROM public.quotes WHERE status IN ('submitted','under_review')),
    'new_messages',   (SELECT COUNT(*) FROM public.contact_messages WHERE status = 'new')
  );

  RETURN result;
END;
$$;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant execute on functions to authenticated users (RLS inside functions handles authorization)
GRANT EXECUTE ON FUNCTION public.search_products TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_quote_to_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_daily_analytics TO authenticated;

-- Grant select on views
GRANT SELECT ON public.products_with_primary_image   TO authenticated, anon;
GRANT SELECT ON public.orders_with_customer           TO authenticated;
GRANT SELECT ON public.customer_order_summary         TO authenticated;
