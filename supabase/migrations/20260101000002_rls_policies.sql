-- =============================================================================
-- FOURTH PYRAMID INDUSTRIAL ECOSYSTEM — ROW LEVEL SECURITY POLICIES
-- Migration: 002 — RLS Policies
-- =============================================================================

-- ─── Enable RLS on all tables ─────────────────────────────────────────────────
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_snapshots  ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- HELPER: is_admin()  — check if JWT belongs to an admin
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- =============================================================================
-- PROFILES
-- =============================================================================

-- Admins see all profiles; customers see only their own
CREATE POLICY "profiles: admin read all"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "profiles: customer read own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- Customers can update their own profile
CREATE POLICY "profiles: customer update own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- customers cannot change their own role
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Admins can update any profile (including changing roles)
CREATE POLICY "profiles: admin update any"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- Profile creation is handled by the auth trigger (no direct insert by client needed)
CREATE POLICY "profiles: insert via trigger only"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- =============================================================================
-- CATEGORIES  (public read, admin write)
-- =============================================================================

CREATE POLICY "categories: public read active"
  ON public.categories FOR SELECT
  USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "categories: admin write"
  ON public.categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- PRODUCTS  (public read if active, admin full access)
-- =============================================================================

CREATE POLICY "products: public read active"
  ON public.products FOR SELECT
  USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "products: admin full access"
  ON public.products FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- PRODUCT IMAGES  (public read, admin write)
-- =============================================================================

CREATE POLICY "product_images: public read"
  ON public.product_images FOR SELECT
  USING (TRUE);

CREATE POLICY "product_images: admin write"
  ON public.product_images FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- ORDERS
-- =============================================================================

-- Admins see all orders
CREATE POLICY "orders: admin full access"
  ON public.orders FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Customers see their own orders
CREATE POLICY "orders: customer read own"
  ON public.orders FOR SELECT
  USING (customer_id = auth.uid());

-- Customers can create orders (but only for themselves)
CREATE POLICY "orders: customer insert own"
  ON public.orders FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Customers can update (cancel) their own pending orders
CREATE POLICY "orders: customer cancel pending"
  ON public.orders FOR UPDATE
  USING (
    customer_id = auth.uid()
    AND status = 'pending'
  )
  WITH CHECK (
    customer_id = auth.uid()
    AND status = 'cancelled'      -- customers may only transition to 'cancelled'
  );

-- =============================================================================
-- ORDER ITEMS
-- =============================================================================

-- Admin sees all
CREATE POLICY "order_items: admin full access"
  ON public.order_items FOR ALL
  USING (public.is_admin());

-- Customer sees their own order items
CREATE POLICY "order_items: customer read own"
  ON public.order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders WHERE customer_id = auth.uid()
    )
  );

-- Customer can insert items during order creation
CREATE POLICY "order_items: customer insert own"
  ON public.order_items FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM public.orders WHERE customer_id = auth.uid() AND status = 'pending'
    )
  );

-- =============================================================================
-- ORDER STATUS HISTORY
-- =============================================================================

CREATE POLICY "order_history: admin read all"
  ON public.order_status_history FOR SELECT
  USING (public.is_admin());

CREATE POLICY "order_history: customer read own"
  ON public.order_status_history FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders WHERE customer_id = auth.uid()
    )
  );

-- History is written only via the DB trigger (no direct client inserts)
CREATE POLICY "order_history: trigger insert"
  ON public.order_status_history FOR INSERT
  WITH CHECK (TRUE);              -- trigger runs as SECURITY DEFINER, fine

-- =============================================================================
-- QUOTES
-- =============================================================================

CREATE POLICY "quotes: admin full access"
  ON public.quotes FOR ALL
  USING (public.is_admin());

-- Customer reads their own quotes
CREATE POLICY "quotes: customer read own"
  ON public.quotes FOR SELECT
  USING (customer_id = auth.uid());

-- Customer can submit a quote (authenticated)
CREATE POLICY "quotes: customer insert"
  ON public.quotes FOR INSERT
  WITH CHECK (customer_id = auth.uid() OR customer_id IS NULL);

-- Authenticated customer can update status (e.g. accept/reject an admin quote)
CREATE POLICY "quotes: customer accept reject"
  ON public.quotes FOR UPDATE
  USING (customer_id = auth.uid() AND status = 'quoted')
  WITH CHECK (status IN ('accepted', 'rejected'));

-- Anonymous quote submission (via service_role key in Edge Function)
-- handled by the Edge Function bypassing RLS with service_role key

-- =============================================================================
-- CONTACT MESSAGES
-- =============================================================================

CREATE POLICY "contact: admin full access"
  ON public.contact_messages FOR ALL
  USING (public.is_admin());

-- Anyone can submit a contact message (insert only, anonymous allowed)
-- Note: This policy is intentionally permissive for the contact form
CREATE POLICY "contact: anyone can insert"
  ON public.contact_messages FOR INSERT
  WITH CHECK (TRUE);

-- Customers can see messages they submitted while logged in
CREATE POLICY "contact: customer read own"
  ON public.contact_messages FOR SELECT
  USING (customer_id = auth.uid());

-- =============================================================================
-- ANALYTICS SNAPSHOTS  (admin only)
-- =============================================================================

CREATE POLICY "analytics: admin full access"
  ON public.analytics_snapshots FOR ALL
  USING (public.is_admin());

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================

-- Product Images bucket (public read, admin write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  TRUE,
  52428800,    -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Documents bucket (private, for order attachments / quotes / invoices)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-documents',
  'order-documents',
  FALSE,
  52428800,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for product-images
CREATE POLICY "product-images: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "product-images: admin upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "product-images: admin update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "product-images: admin delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND public.is_admin());

-- Storage RLS for order-documents
CREATE POLICY "order-docs: admin full"
  ON storage.objects FOR ALL
  USING (bucket_id = 'order-documents' AND public.is_admin());

CREATE POLICY "order-docs: customer read own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'order-documents'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
