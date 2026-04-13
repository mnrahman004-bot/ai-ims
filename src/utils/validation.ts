import { z } from "zod";
import DOMPurify from "dompurify";

// ── Sanitization ──
export const sanitize = (input: string): string =>
  DOMPurify.sanitize(input.trim(), { ALLOWED_TAGS: [] });

// ── Dummy name patterns ──
const DUMMY_NAMES = /^(test|product\d*|sample|demo|asdf|xxx|foo|bar|baz)$/i;
const DUMMY_SUPPLIER_NAMES = /^(test|supplier\d*|sample|demo|asdf|xxx|foo|bar|company\d*)$/i;

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
  name: z
    .string()
    .trim()
    .min(1, "Product name is required")
    .max(200)
    .refine((v) => !DUMMY_NAMES.test(v), "Please enter a real product name"),
  category: z.string().trim().min(1, "Category is required").max(100),
  price: z.coerce
    .number()
    .positive("Price must be greater than 0")
    .max(99_999_999, "Price exceeds maximum allowed value"),
  quantity: z.coerce
    .number()
    .int()
    .min(0, "Quantity cannot be negative")
    .max(9_999_999, "Quantity exceeds maximum allowed value"),
  low_stock_threshold: z.coerce.number().int().min(0, "Threshold cannot be negative"),
  supplier_id: z.string().optional(),
});

// ── Supplier Schema (all fields mandatory) ──
export const supplierSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Company name is required")
    .max(200)
    .refine((v) => !DUMMY_SUPPLIER_NAMES.test(v), "Please enter a real company name"),
  contact_person: z
    .string()
    .trim()
    .min(1, "Contact person is required")
    .max(200),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .max(20)
    .regex(/^[6-9]\d{9}$/, "Phone must be 10 digits starting with 6, 7, 8, or 9"),
  address: z
    .string()
    .trim()
    .min(10, "Address must be at least 10 characters")
    .max(500),
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
