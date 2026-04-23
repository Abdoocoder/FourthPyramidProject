-- =============================================================================
-- FOURTH PYRAMID — PATCH: customer_order_summary view
-- Migration: 005 — Add is_active to customer_order_summary view
-- =============================================================================

-- Recreate view with is_active column so the API can filter by it
CREATE OR REPLACE VIEW public.customer_order_summary AS
SELECT
  pr.id                                        AS customer_id,
  pr.full_name,
  pr.company_name,
  pr.email                                     AS customer_email,
  pr.phone,
  pr.city,
  pr.country,
  pr.is_active,
  pr.notes                                     AS admin_notes,
  pr.created_at                                AS customer_since,
  COUNT(o.id)                                  AS total_orders,
  COALESCE(SUM(o.total_amount), 0)             AS lifetime_value,
  MAX(o.created_at)                            AS last_order_date,
  COUNT(o.id) FILTER (WHERE o.status = 'delivered')                       AS delivered_orders,
  COUNT(o.id) FILTER (WHERE o.status = 'cancelled')                       AS cancelled_orders,
  COUNT(o.id) FILTER (WHERE o.status NOT IN ('delivered','cancelled'))    AS active_orders
FROM public.profiles pr
LEFT JOIN public.orders o ON o.customer_id = pr.id
WHERE pr.role = 'customer'
GROUP BY
  pr.id, pr.full_name, pr.company_name, pr.email,
  pr.phone, pr.city, pr.country, pr.is_active,
  pr.notes, pr.created_at;

-- Re-grant (view was recreated)
GRANT SELECT ON public.customer_order_summary TO authenticated;
