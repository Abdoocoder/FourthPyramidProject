// =============================================================================
// FOURTH PYRAMID — API BARREL EXPORT
// Single import point for all API functions and types.
//
// Usage:
//   import { signIn, getProducts, placeOrder } from "@/lib/api";
// =============================================================================
// Client
export { supabase, FUNCTIONS_URL, getAuthHeader } from "./supabase";
// API Modules
export * from "./api/auth";
export * from "./api/products";
export * from "./api/orders";
export * from "./api/quotes";
export * from "./api/customers";
export * from "./api/analytics";
export * from "./api/contact";
//# sourceMappingURL=index.js.map