-- =============================================================================
-- FOURTH PYRAMID INDUSTRIAL ECOSYSTEM — DATABASE SCHEMA
-- Migration: 001 — Core Schema
-- =============================================================================

-- ─── Enable Extensions ───────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- for fuzzy text search on products
CREATE EXTENSION IF NOT EXISTS "unaccent";        -- for accent-insensitive search (Arabic/English)

-- =============================================================================
-- ENUMS
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'customer');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM (
      'pending',
      'confirmed',
      'in_production',
      'quality_check',
      'shipped',
      'delivered',
      'cancelled',
      'on_hold'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_status') THEN
    CREATE TYPE quote_status AS ENUM (
      'submitted',
      'under_review',
      'quoted',
      'accepted',
      'rejected',
      'converted'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_status') THEN
    CREATE TYPE contact_status AS ENUM ('new', 'in_progress', 'resolved', 'archived');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_unit') THEN
    CREATE TYPE product_unit AS ENUM ('kg', 'ton', 'piece', 'meter', 'roll', 'bag', 'box');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_terms') THEN
    CREATE TYPE payment_terms AS ENUM ('prepaid', 'net_30', 'net_60', 'net_90', 'on_delivery', 'lc');
  END IF;
END $$;

-- =============================================================================
-- PROFILES  (extends auth.users)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                user_role NOT NULL DEFAULT 'customer',
  full_name           TEXT,
  company_name        TEXT,
  email               TEXT,
  phone               TEXT,
  country             TEXT DEFAULT 'Egypt',
  city                TEXT,
  address             TEXT,
  tax_id              TEXT,                        -- commercial registration / tax number
  preferred_language  TEXT DEFAULT 'ar',           -- 'ar' | 'en'
  avatar_url          TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  notes               TEXT,                        -- admin notes about this customer
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Extended user data linked to Supabase Auth. Holds both admin and customer profiles.';

-- =============================================================================
-- PRODUCT CATEGORIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id           SERIAL PRIMARY KEY,
  name_ar      TEXT NOT NULL,
  name_en      TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  description  TEXT,
  icon         TEXT,                -- icon name / svg path
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.categories IS 'Product categories (e.g. Pipes, Fittings, Sheets, Bags)';

-- =============================================================================
-- PRODUCTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.products (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id         INTEGER REFERENCES public.categories(id) ON DELETE SET NULL,
  sku                 TEXT NOT NULL UNIQUE,
  name_ar             TEXT NOT NULL,
  name_en             TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  description_ar      TEXT,
  description_en      TEXT,
  -- Technical Specifications (JSONB for flexibility across product types)
  specifications      JSONB DEFAULT '{}',          -- e.g. {"diameter": "110mm", "thickness": "4mm", "material": "HDPE"}
  -- Pricing
  base_price          NUMERIC(12, 2),              -- base price per unit_type (can be null for quote-only)
  price_on_request    BOOLEAN NOT NULL DEFAULT FALSE,
  currency            TEXT NOT NULL DEFAULT 'EGP',
  unit_type           product_unit NOT NULL DEFAULT 'piece',
  min_order_quantity  NUMERIC(10, 2) NOT NULL DEFAULT 1,
  -- Inventory
  stock_quantity      NUMERIC(10, 2) NOT NULL DEFAULT 0,
  is_in_stock         BOOLEAN NOT NULL DEFAULT TRUE,
  -- Display
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured         BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  -- Metadata
  tags                TEXT[] DEFAULT '{}',
  created_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Full-text search vector (Arabic + English)
  search_vector       TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name_en, '') || ' ' || coalesce(description_en, ''))
  ) STORED
);

COMMENT ON TABLE public.products IS 'Plastic products catalogue. Specs stored as flexible JSONB.';
COMMENT ON COLUMN public.products.specifications IS 'Flexible key-value specs: diameter, thickness, color, material, pressure-rating, etc.';

-- =============================================================================
-- PRODUCT IMAGES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.product_images (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id   UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,                      -- Supabase Storage path
  url          TEXT NOT NULL,                      -- public URL
  alt_ar       TEXT,
  alt_en       TEXT,
  is_primary   BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.product_images IS 'Product image gallery. Primary image flagged separately.';

-- =============================================================================
-- ORDERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number        TEXT NOT NULL UNIQUE,        -- human-readable: FP-2026-00001
  customer_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status              order_status NOT NULL DEFAULT 'pending',
  -- Pricing snapshot at time of order
  subtotal            NUMERIC(14, 2) NOT NULL DEFAULT 0,
  discount_amount     NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_amount          NUMERIC(14, 2) NOT NULL DEFAULT 0,
  shipping_amount     NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency            TEXT NOT NULL DEFAULT 'EGP',
  -- Payment
  payment_terms       payment_terms NOT NULL DEFAULT 'prepaid',
  payment_reference   TEXT,
  paid_at             TIMESTAMPTZ,
  -- Shipping
  shipping_address    JSONB,                       -- {"street", "city", "governorate", "country", "postal_code"}
  delivery_date_est   DATE,
  delivered_at        TIMESTAMPTZ,
  tracking_code       TEXT,
  -- Metadata
  notes               TEXT,                        -- customer notes
  admin_notes         TEXT,                        -- internal admin notes
  quote_id            UUID,                        -- if originated from a quote (FK set below)
  created_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.orders IS 'Customer purchase orders. Tracks full lifecycle from pending to delivered.';

-- =============================================================================
-- ORDER ITEMS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.order_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id          UUID REFERENCES public.products(id) ON DELETE SET NULL,
  -- Snapshot of product data at time of order (immutable record)
  product_sku         TEXT NOT NULL,
  product_name_ar     TEXT NOT NULL,
  product_name_en     TEXT NOT NULL,
  unit_type           product_unit NOT NULL,
  -- Quantities & Pricing
  quantity            NUMERIC(10, 2) NOT NULL,
  unit_price          NUMERIC(12, 2) NOT NULL,
  discount_percent    NUMERIC(5, 2) NOT NULL DEFAULT 0,
  line_total          NUMERIC(14, 2) NOT NULL,     -- calculated: quantity * unit_price * (1 - discount/100)
  -- Optional custom spec for this line (override product default)
  custom_specs        JSONB DEFAULT '{}',
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.order_items IS 'Individual product lines within an order. Product data snapshotted for immutability.';

-- =============================================================================
-- ORDER STATUS HISTORY (audit log)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.order_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status   order_status NOT NULL,
  changed_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.order_status_history IS 'Full audit trail of every order status change.';

-- =============================================================================
-- QUOTES (Request a Quote)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.quotes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_number      TEXT NOT NULL UNIQUE,          -- FP-Q-2026-00001
  customer_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- If submitted by a non-registered user:
  contact_name      TEXT,
  contact_email     TEXT,
  contact_phone     TEXT,
  company_name      TEXT,
  -- Quote details
  status            quote_status NOT NULL DEFAULT 'submitted',
  description       TEXT NOT NULL,                 -- what they need
  items             JSONB DEFAULT '[]',             -- [{product_id, name, qty, unit, notes}]
  -- Admin response
  quoted_amount     NUMERIC(14, 2),
  quoted_currency   TEXT DEFAULT 'EGP',
  valid_until       DATE,
  admin_response    TEXT,
  -- Conversion
  converted_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  -- Metadata
  assigned_to       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.quotes IS 'Quote requests from customers (registered or anonymous). Can be converted to orders.';

-- Add FK from orders back to quotes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_quote_id') THEN
    ALTER TABLE public.orders ADD CONSTRAINT fk_orders_quote_id
      FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- CONTACT MESSAGES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Sender info
  full_name    TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  company      TEXT,
  subject      TEXT NOT NULL,
  message      TEXT NOT NULL,
  -- Status tracking
  status       contact_status NOT NULL DEFAULT 'new',
  replied_at   TIMESTAMPTZ,
  replied_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reply_text   TEXT,
  -- Customer link (if logged in)
  customer_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Metadata
  ip_address   TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.contact_messages IS 'Inbound contact form submissions from the Contact Us page.';

-- =============================================================================
-- ANALYTICS SNAPSHOTS  (materialized daily rollup for the Reports dashboard)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_date    DATE NOT NULL UNIQUE,
  -- Orders
  total_orders     INTEGER NOT NULL DEFAULT 0,
  new_orders       INTEGER NOT NULL DEFAULT 0,
  delivered_orders INTEGER NOT NULL DEFAULT 0,
  cancelled_orders INTEGER NOT NULL DEFAULT 0,
  -- Revenue
  gross_revenue    NUMERIC(18, 2) NOT NULL DEFAULT 0,
  net_revenue      NUMERIC(18, 2) NOT NULL DEFAULT 0,
  -- Customers
  new_customers    INTEGER NOT NULL DEFAULT 0,
  active_customers INTEGER NOT NULL DEFAULT 0,
  -- Products
  top_products     JSONB DEFAULT '[]',             -- [{product_id, name, qty_sold, revenue}]
  -- Quotes
  total_quotes     INTEGER NOT NULL DEFAULT 0,
  converted_quotes INTEGER NOT NULL DEFAULT 0,
  -- Messages
  total_messages   INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.analytics_snapshots IS 'Pre-aggregated daily analytics for the Reports & Analytics Dashboard screen.';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role         ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_company      ON public.profiles(company_name);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_category     ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku          ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_active       ON public.products(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_featured     ON public.products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_search       ON public.products USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_products_tags         ON public.products USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_products_specs        ON public.products USING GIN(specifications);

-- Product Images
CREATE INDEX idx_product_images_product ON public.product_images(product_id);
CREATE INDEX idx_product_images_primary ON public.product_images(product_id, is_primary) WHERE is_primary = TRUE;

-- Orders
CREATE INDEX idx_orders_customer       ON public.orders(customer_id);
CREATE INDEX idx_orders_status         ON public.orders(status);
CREATE INDEX idx_orders_created        ON public.orders(created_at DESC);
CREATE INDEX idx_orders_number         ON public.orders(order_number);

-- Order Items
CREATE INDEX idx_order_items_order     ON public.order_items(order_id);
CREATE INDEX idx_order_items_product   ON public.order_items(product_id);

-- Order History
CREATE INDEX idx_order_history_order   ON public.order_status_history(order_id);
CREATE INDEX idx_order_history_date    ON public.order_status_history(created_at DESC);

-- Quotes
CREATE INDEX idx_quotes_customer       ON public.quotes(customer_id);
CREATE INDEX idx_quotes_status         ON public.quotes(status);
CREATE INDEX idx_quotes_created        ON public.quotes(created_at DESC);

-- Contact
CREATE INDEX idx_contact_status        ON public.contact_messages(status);
CREATE INDEX idx_contact_created       ON public.contact_messages(created_at DESC);

-- Analytics
CREATE INDEX idx_analytics_date        ON public.analytics_snapshots(snapshot_date DESC);

-- =============================================================================
-- AUTO-UPDATED updated_at TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_contact_updated_at
  BEFORE UPDATE ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, preferred_language)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'preferred_language', 'ar')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- ORDER NUMBER GENERATOR
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.quote_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'FP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('public.order_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := 'FP-Q-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('public.quote_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

CREATE TRIGGER trg_quote_number
  BEFORE INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.generate_quote_number();

-- =============================================================================
-- ORDER STATUS HISTORY TRIGGER  (auto-log every status change)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_history(order_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_status_history
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();
