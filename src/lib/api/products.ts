// =============================================================================
// FOURTH PYRAMID — PRODUCTS API
// Screens: Products Catalog (Mobile/Desktop), Product Details (Mobile/Desktop),
//          Products Management - Admin, Products Management - Refined
// =============================================================================

import { supabase } from "../supabase";
import type {
  Product,
  ProductWithImage,
  ProductImage,
  Category,
  UpsertProductInput,
  ProductSearchParams,
} from "../types/database.types";

// ─── Categories ───────────────────────────────────────────────────────────────

/** Fetch all active categories (public). */
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await (supabase
    .from("categories") as any)
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;
  return data;
}

/** Admin: fetch all categories including inactive. */
export async function getAllCategories(): Promise<Category[]> {
  const { data, error } = await (supabase
    .from("categories") as any)
    .select("*")
    .order("sort_order");

  if (error) throw error;
  return data;
}

export async function createCategory(
  input: Omit<Category, "id" | "created_at">
): Promise<Category> {
  const { data, error } = await (supabase
    .from("categories") as any)
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCategory(
  id: number,
  updates: Partial<Omit<Category, "id" | "created_at">>
): Promise<Category> {
  const { data, error } = await (supabase
    .from("categories") as any)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Products — Public Catalog ────────────────────────────────────────────────

/**
 * Full-text + trigram product search.
 * Powered by the `search_products` DB function.
 */
export async function searchProducts(
  params: ProductSearchParams = {}
): Promise<ProductWithImage[]> {
  const { data, error } = await (supabase.rpc as any)("search_products", {
    p_query:         params.query         ?? null,
    p_category_id:   params.category_id   ?? null,
    p_min_price:     params.min_price      ?? null,
    p_max_price:     params.max_price      ?? null,
    p_in_stock_only: params.in_stock_only  ?? false,
    p_limit:         params.limit          ?? 20,
    p_offset:        params.offset         ?? 0,
  });

  if (error) throw error;
  return data as ProductWithImage[];
}

/**
 * List products with their primary image (catalog view).
 * Sorted by: featured first, then sort_order.
 */
export async function getProducts(options: {
  category_id?:  number;
  is_featured?:  boolean;
  limit?:        number;
  offset?:       number;
} = {}): Promise<ProductWithImage[]> {
  let query = (supabase
    .from("products_with_primary_image") as any)
    .select("*")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("sort_order");

  if (options.category_id !== undefined) {
    query = query.eq("category_id", options.category_id);
  }
  if (options.is_featured !== undefined) {
    query = query.eq("is_featured", options.is_featured);
  }
  if (options.limit !== undefined) {
    query = query.limit(options.limit);
  }
  if (options.offset !== undefined) {
    query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as ProductWithImage[];
}

/** Fetch a single product by slug (for Product Details page). */
export async function getProductBySlug(slug: string): Promise<ProductWithImage & { images: ProductImage[] }> {
  const { data: product, error: productErr } = await (supabase
    .from("products_with_primary_image") as any)
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (productErr) throw productErr;

  // Fetch all images for this product
  const { data: images, error: imagesErr } = await (supabase
    .from("product_images") as any)
    .select("*")
    .eq("product_id", product.id)
    .order("sort_order");

  if (imagesErr) throw imagesErr;

  return { ...(product as ProductWithImage), images: images ?? [] };
}

/** Fetch a single product by ID. */
export async function getProductById(id: string): Promise<ProductWithImage & { images: ProductImage[] }> {
  const { data: product, error: productErr } = await (supabase
    .from("products_with_primary_image") as any)
    .select("*")
    .eq("id", id)
    .single();

  if (productErr) throw productErr;

  const { data: images, error: imagesErr } = await (supabase
    .from("product_images") as any)
    .select("*")
    .eq("product_id", id)
    .order("sort_order");

  if (imagesErr) throw imagesErr;

  return { ...(product as ProductWithImage), images: images ?? [] };
}

/** Get featured products for the homepage. */
export async function getFeaturedProducts(limit = 8): Promise<ProductWithImage[]> {
  return getProducts({ is_featured: true, limit });
}

// ─── Products — Admin Management ─────────────────────────────────────────────

/**
 * Admin: list all products (including inactive) with pagination & filtering.
 */
export async function adminGetProducts(options: {
  category_id?:  number;
  is_active?:    boolean;
  search?:       string;
  limit?:        number;
  offset?:       number;
} = {}): Promise<{ data: ProductWithImage[]; count: number }> {
  let query = (supabase
    .from("products_with_primary_image") as any)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (options.category_id !== undefined) {
    query = query.eq("category_id", options.category_id);
  }
  if (options.is_active !== undefined) {
    query = query.eq("is_active", options.is_active);
  }
  if (options.search) {
    query = query.or(
      `name_ar.ilike.%${options.search}%,name_en.ilike.%${options.search}%,sku.ilike.%${options.search}%`
    );
  }
  if (options.limit !== undefined) {
    const from = options.offset ?? 0;
    query = query.range(from, from + options.limit - 1);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data as ProductWithImage[], count: count ?? 0 };
}

/** Admin: create a new product. */
export async function createProduct(input: UpsertProductInput): Promise<Product> {
  const { data, error } = await (supabase
    .from("products") as any)
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Admin: update an existing product. */
export async function updateProduct(
  id: string,
  updates: Partial<UpsertProductInput>
): Promise<Product> {
  const { data, error } = await (supabase
    .from("products") as any)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Admin: soft-delete a product (set is_active = false). */
export async function deactivateProduct(id: string): Promise<void> {
  const { error } = await (supabase
    .from("products") as any)
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw error;
}

/** Admin: hard-delete a product (use with caution). */
export async function deleteProduct(id: string): Promise<void> {
  const { error } = await (supabase
    .from("products") as any)
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/** Admin: toggle featured status. */
export async function toggleProductFeatured(id: string, isFeatured: boolean): Promise<void> {
  const { error } = await (supabase
    .from("products") as any)
    .update({ is_featured: isFeatured })
    .eq("id", id);

  if (error) throw error;
}

/** Admin: update stock quantity. */
export async function updateStockQuantity(
  id: string,
  stockQuantity: number,
  isInStock?: boolean
): Promise<void> {
    const { error } = await (supabase
    .from("products") as any)
    .update({
      stock_quantity: stockQuantity,
      is_in_stock:    isInStock ?? stockQuantity > 0,
    })
    .eq("id", id);

  if (error) throw error;
}

// ─── Product Images ───────────────────────────────────────────────────────────

/**
 * Upload a product image to Supabase Storage and create an image record.
 * @param productId - The product to attach the image to
 * @param file - The image file
 * @param isPrimary - Whether this should be the primary/hero image
 */
export async function uploadProductImage(
  productId: string,
  file: File,
  isPrimary = false,
  altAr?: string,
  altEn?: string
): Promise<ProductImage> {
  const ext       = file.name.split(".").pop();
  const fileName  = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const storagePath = `products/${productId}/${fileName}`;

  // Upload file
  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(storagePath, file);

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from("product-images")
    .getPublicUrl(storagePath);

  // If this is primary, demote existing primary
  if (isPrimary) {
    await (supabase
      .from("product_images") as any)
      .update({ is_primary: false })
      .eq("product_id", productId)
      .eq("is_primary", true);
  }

  // Get current max sort_order
  const { data: existing } = await (supabase
    .from("product_images") as any)
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  // Insert image record
  const { data: image, error: insertError } = await (supabase
    .from("product_images") as any)
    .insert({
      product_id:   productId,
      storage_path: storagePath,
      url:          publicUrl,
      alt_ar:       altAr ?? null,
      alt_en:       altEn ?? null,
      is_primary:   isPrimary,
      sort_order:   nextOrder,
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return image;
}

/** Delete a product image from storage and DB. */
export async function deleteProductImage(imageId: string): Promise<void> {
  const { data: image, error: fetchErr } = await (supabase
    .from("product_images") as any)
    .select("storage_path")
    .eq("id", imageId)
    .single();

  if (fetchErr) throw fetchErr;

  // Remove from storage
  await supabase.storage.from("product-images").remove([image.storage_path]);

  // Remove from DB
  const { error } = await (supabase
    .from("product_images") as any)
    .delete()
    .eq("id", imageId);

  if (error) throw error;
}

/** Set an image as the primary product image. */
export async function setPrimaryImage(productId: string, imageId: string): Promise<void> {
  // Demote all
  await (supabase
    .from("product_images") as any)
    .update({ is_primary: false })
    .eq("product_id", productId);

  // Promote chosen
  const { error } = await (supabase
    .from("product_images") as any)
    .update({ is_primary: true })
    .eq("id", imageId);

  if (error) throw error;
}
