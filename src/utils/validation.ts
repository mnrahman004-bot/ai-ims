import { z } from "zod";
import DOMPurify from "dompurify";

// ── Sanitization ──
export const sanitize = (input: string): string =>
  DOMPurify.sanitize(input.trim(), { ALLOWED_TAGS: [] });

// ── Auth Schemas ──
export const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Password must contain only letters and numbers"),
});

export const signupSchema = z
  .object({
    displayName: z.string().trim().min(1, "Display name is required").max(100),
    email: z.string().trim().email("Please enter a valid email address"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .regex(/^[a-zA-Z0-9]+$/, "Password must contain only letters and numbers"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ── Product Schema ──
export const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(200),
  category: z.string().trim().min(1, "Category is required").max(100),
  price: z.coerce.number().positive("Price must be greater than 0"),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative"),
  low_stock_threshold: z.coerce.number().int().min(0, "Threshold cannot be negative"),
  supplier_id: z.string().optional(),
});

// ── Supplier Schema ──
export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(200),
  contact_person: z.string().max(200).optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
});

// ── Sale Schema ──
export const saleSchema = z.object({
  product_id: z.string().uuid("Please select a product"),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
});

// ── Inventory Update Schema ──
export const inventoryUpdateSchema = z.object({
  product_id: z.string().uuid("Please select a product"),
  change_type: z.enum(["addition", "reduction", "adjustment"]),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
  notes: z.string().max(500).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type InventoryUpdateInput = z.infer<typeof inventoryUpdateSchema>;
