# Fourth Pyramid Industrial Ecosystem — Backend

Full Supabase backend for the **Fourth Pyramid Plastic Industries Co.** platform, reverse-engineered from 20 Stitch MCP UI screens.

---

## Architecture Overview

```
FourthPyramid/
├── supabase/
│   ├── config.toml                          # Supabase local dev config
│   ├── migrations/
│   │   ├── 20260101000001_schema.sql        # Tables, enums, triggers, sequences
│   │   ├── 20260101000002_rls_policies.sql  # Row Level Security + Storage buckets
│   │   ├── 20260101000003_functions.sql     # Views, stored procedures, RPC functions
│   │   └── 20260101000004_seed.sql          # Demo categories & products
│   └── functions/
│       ├── send-contact-email/              # Contact form → email
│       ├── process-quote/                   # Quote submission → email
│       └── order-notification/             # Order status updates + analytics
│
└── src/lib/
    ├── supabase.ts                          # Supabase client singleton
    ├── index.ts                             # Barrel export
    ├── types/
    │   └── database.types.ts               # TypeScript types for DB schema
    └── api/
        ├── auth.ts                          # Auth + profile management
        ├── products.ts                      # Catalog, admin CRUD, image uploads
        ├── orders.ts                        # Order placement and management
        ├── quotes.ts                        # Quote request flow
        ├── customers.ts                     # Customer management (admin)
        ├── analytics.ts                     # Dashboard KPIs and reports
        └── contact.ts                       # Contact form
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `profiles` | Extended user data (admin / customer roles) linked to `auth.users` |
| `categories` | Product categories (Pipes, Fittings, Bags, etc.) |
| `products` | Product catalogue with flexible JSONB specs |
| `product_images` | Multi-image gallery per product (Storage-backed) |
| `orders` | Customer purchase orders (full lifecycle) |
| `order_items` | Line items within each order (immutable snapshot) |
| `order_status_history` | Full audit trail of every status change |
| `quotes` | Quote requests (anonymous or authenticated) |
| `contact_messages` | Contact form submissions |
| `analytics_snapshots` | Pre-aggregated daily KPI snapshots |

---

## Key Design Decisions

### Role System
- Two roles: `admin` and `customer`
- Role stored in `profiles.role` (default: `customer`)
- Checked via the `is_admin()` SQL function used throughout RLS policies
- Promote users to admin: `UPDATE profiles SET role = 'admin' WHERE id = '<uuid>';`

### Row Level Security
All tables have RLS enabled. The full access matrix:

| Resource | Public (anon) | Customer | Admin |
|---|---|---|---|
| Categories | Read active | Read active | Full |
| Products | Read active | Read active | Full |
| Product Images | Read | Read | Full |
| Orders | — | Own orders | All orders |
| Order Items | — | Own orders | All |
| Quotes | — | Own quotes | All |
| Contact Messages | Insert | Insert + read own | Full |
| Analytics | — | — | Full |
| Profiles | — | Own profile | All profiles |

### Order Numbering
Orders auto-generate human-readable numbers: `FP-2026-00001`
Quotes auto-generate: `FP-Q-2026-00001`

### Edge Functions

| Function | Trigger | Description |
|---|---|---|
| `send-contact-email` | Contact form POST | Saves message, notifies admin, confirms to customer |
| `process-quote` | Quote form POST | Saves quote, notifies sales team, confirms to customer |
| `order-notification` | Admin action | Dispatches `update_order_status`, `convert_quote`, `refresh_analytics` |

Email provider: **Resend** (swap `sendEmail()` to use any provider)

### Storage Buckets

| Bucket | Access | Max Size | Types |
|---|---|---|---|
| `product-images` | Public read, admin write | 50MB | jpg, png, webp, gif, svg |
| `order-documents` | Private (owner + admin) | 50MB | pdf, jpg, png |

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment
```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

### 3. Start local Supabase
```bash
npx supabase start
```

### 4. Run migrations + seed
```bash
npm run db:reset
```

### 5. Promote yourself to admin
```sql
-- Run in Supabase SQL Editor or local psql
UPDATE public.profiles SET role = 'admin' WHERE id = '<your-user-id>';
```

### 6. Set Edge Function secrets
```bash
npx supabase secrets set RESEND_API_KEY=re_xxxx
npx supabase secrets set ADMIN_EMAIL=info@yourcompany.com
npx supabase secrets set FROM_EMAIL=noreply@yourcompany.com
```

### 7. Serve Edge Functions locally
```bash
npm run functions:serve
```

### 8. Regenerate TypeScript types (after schema changes)
```bash
npm run types:gen
```

---

## API Usage Examples

```typescript
import {
  signIn, getMyProfile,
  getProducts, searchProducts, getProductBySlug,
  placeOrder, getMyOrders, cancelMyOrder,
  submitQuote, getMyQuotes,
  getDashboardSummary, getMonthlyTrends,
  submitContactForm,
} from "@/lib";

// Auth
await signIn({ email: "user@example.com", password: "..." });
const profile = await getMyProfile();

// Products catalog
const featured   = await getProducts({ is_featured: true, limit: 8 });
const results    = await searchProducts({ query: "HDPE", category_id: 1 });
const product    = await getProductBySlug("hdpe-pipe-110mm-pn6");

// Orders
const order = await placeOrder({
  items: [{ product_id: "...", quantity: 100, unit_price: 285 }],
  notes: "Urgent delivery needed",
});
const { data: orders } = await getMyOrders({ status: "shipped" });

// Quotes (works anonymously too)
await submitQuote({
  contact_email: "buyer@company.com",
  contact_name:  "Ahmed Hassan",
  description:   "Need 5 tons of HDPE PE80 granules",
  items: [{ name_en: "HDPE Granules PE80", qty: 5, unit: "ton" }],
});

// Admin dashboard
const summary = await getDashboardSummary();
const trends  = await getMonthlyTrends(6);

// Contact form
await submitContactForm({
  full_name: "Sara Ali",
  email:     "sara@example.com",
  subject:   "Product inquiry",
  message:   "I'd like to learn more about your irrigation products.",
});
```

---

## Deployment (Production)

```bash
# Link to your Supabase project
npx supabase link --project-ref <your-project-ref>

# Push all migrations to production
npm run db:push

# Deploy all Edge Functions
npm run functions:deploy
```

---

## Screen → API Mapping

| Stitch Screen | API Functions Used |
|---|---|
| Login / Signup | `signIn`, `signUp`, `requestPasswordReset` |
| Home Dashboard (Mobile) | `getMyOrders`, `getMyQuotes`, `getMyProfile` |
| Products Catalog (Mobile/Desktop) | `getProducts`, `searchProducts`, `getCategories` |
| Product Details (Mobile/Desktop) | `getProductBySlug`, `getProductById` |
| Create New Order | `placeOrder`, `searchProducts` |
| My Orders & Tracking | `getMyOrders`, `getMyOrder`, `cancelMyOrder` |
| Request a Quote | `submitQuote` |
| Contact Us | `submitContactForm` |
| Admin Dashboard Overview | `getDashboardSummary`, `getOrderStatusCounts` |
| Products Management - Admin | `adminGetProducts`, `createProduct`, `updateProduct`, `uploadProductImage` |
| Orders Management - Admin | `adminGetOrders`, `adminUpdateOrderStatus`, `adminGetOrder` |
| Customer History - Admin | `getCustomers`, `getCustomerDetail`, `updateCustomer` |
| Reports & Analytics Dashboard | `getDashboardSummary`, `getAnalyticsSnapshots`, `getTopProducts`, `getMonthlyTrends` |
