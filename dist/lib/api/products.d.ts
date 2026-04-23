import type { Product, ProductWithImage, ProductImage, Category, UpsertProductInput, ProductSearchParams } from "../types/database.types";
/** Fetch all active categories (public). */
export declare function getCategories(): Promise<Category[]>;
/** Admin: fetch all categories including inactive. */
export declare function getAllCategories(): Promise<Category[]>;
export declare function createCategory(input: Omit<Category, "id" | "created_at">): Promise<Category>;
export declare function updateCategory(id: number, updates: Partial<Omit<Category, "id" | "created_at">>): Promise<Category>;
/**
 * Full-text + trigram product search.
 * Powered by the `search_products` DB function.
 */
export declare function searchProducts(params?: ProductSearchParams): Promise<ProductWithImage[]>;
/**
 * List products with their primary image (catalog view).
 * Sorted by: featured first, then sort_order.
 */
export declare function getProducts(options?: {
    category_id?: number;
    is_featured?: boolean;
    limit?: number;
    offset?: number;
}): Promise<ProductWithImage[]>;
/** Fetch a single product by slug (for Product Details page). */
export declare function getProductBySlug(slug: string): Promise<ProductWithImage & {
    images: ProductImage[];
}>;
/** Fetch a single product by ID. */
export declare function getProductById(id: string): Promise<ProductWithImage & {
    images: ProductImage[];
}>;
/** Get featured products for the homepage. */
export declare function getFeaturedProducts(limit?: number): Promise<ProductWithImage[]>;
/**
 * Admin: list all products (including inactive) with pagination & filtering.
 */
export declare function adminGetProducts(options?: {
    category_id?: number;
    is_active?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
}): Promise<{
    data: ProductWithImage[];
    count: number;
}>;
/** Admin: create a new product. */
export declare function createProduct(input: UpsertProductInput): Promise<Product>;
/** Admin: update an existing product. */
export declare function updateProduct(id: string, updates: Partial<UpsertProductInput>): Promise<Product>;
/** Admin: soft-delete a product (set is_active = false). */
export declare function deactivateProduct(id: string): Promise<void>;
/** Admin: hard-delete a product (use with caution). */
export declare function deleteProduct(id: string): Promise<void>;
/** Admin: toggle featured status. */
export declare function toggleProductFeatured(id: string, isFeatured: boolean): Promise<void>;
/** Admin: update stock quantity. */
export declare function updateStockQuantity(id: string, stockQuantity: number, isInStock?: boolean): Promise<void>;
/**
 * Upload a product image to Supabase Storage and create an image record.
 * @param productId - The product to attach the image to
 * @param file - The image file
 * @param isPrimary - Whether this should be the primary/hero image
 */
export declare function uploadProductImage(productId: string, file: File, isPrimary?: boolean, altAr?: string, altEn?: string): Promise<ProductImage>;
/** Delete a product image from storage and DB. */
export declare function deleteProductImage(imageId: string): Promise<void>;
/** Set an image as the primary product image. */
export declare function setPrimaryImage(productId: string, imageId: string): Promise<void>;
//# sourceMappingURL=products.d.ts.map