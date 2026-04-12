import { describe, it, expect } from "vitest";
import { loginSchema, signupSchema, productSchema, supplierSchema, saleSchema, inventoryUpdateSchema, sanitize } from "@/utils/validation";

describe("loginSchema", () => {
  it("accepts valid login", () => {
    expect(() => loginSchema.parse({ email: "a@b.com", password: "Abc123" })).not.toThrow();
  });

  it("rejects invalid email", () => {
    const r = loginSchema.safeParse({ email: "bad", password: "Abc123" });
    expect(r.success).toBe(false);
  });

  it("rejects empty email", () => {
    const r = loginSchema.safeParse({ email: "", password: "Abc123" });
    expect(r.success).toBe(false);
  });

  it("rejects short password", () => {
    const r = loginSchema.safeParse({ email: "a@b.com", password: "Ab1" });
    expect(r.success).toBe(false);
  });

  it("rejects password with special chars", () => {
    const r = loginSchema.safeParse({ email: "a@b.com", password: "Abc123!" });
    expect(r.success).toBe(false);
  });

  it("rejects SQL injection in email", () => {
    const r = loginSchema.safeParse({ email: "' OR 1=1 --", password: "Abc123" });
    expect(r.success).toBe(false);
  });
});

describe("signupSchema", () => {
  const valid = { displayName: "John", email: "j@b.com", password: "Abc123", confirmPassword: "Abc123" };

  it("accepts valid signup", () => {
    expect(() => signupSchema.parse(valid)).not.toThrow();
  });

  it("rejects weak password (too short)", () => {
    const r = signupSchema.safeParse({ ...valid, password: "Ab1", confirmPassword: "Ab1" });
    expect(r.success).toBe(false);
  });

  it("rejects password mismatch", () => {
    const r = signupSchema.safeParse({ ...valid, confirmPassword: "Wrong1" });
    expect(r.success).toBe(false);
  });

  it("rejects empty display name", () => {
    const r = signupSchema.safeParse({ ...valid, displayName: "" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const r = signupSchema.safeParse({ ...valid, email: "notanemail" });
    expect(r.success).toBe(false);
  });

  it("rejects XSS in display name via sanitize", () => {
    const result = sanitize('<script>alert("xss")</script>');
    expect(result).not.toContain("<script>");
  });
});

describe("productSchema", () => {
  const valid = { name: "Widget", category: "General", price: "10", quantity: "5", low_stock_threshold: "2" };

  it("accepts valid product", () => {
    expect(() => productSchema.parse(valid)).not.toThrow();
  });

  it("rejects empty name", () => {
    const r = productSchema.safeParse({ ...valid, name: "" });
    expect(r.success).toBe(false);
  });

  it("rejects negative price", () => {
    const r = productSchema.safeParse({ ...valid, price: "-5" });
    expect(r.success).toBe(false);
  });

  it("rejects zero price", () => {
    const r = productSchema.safeParse({ ...valid, price: "0" });
    expect(r.success).toBe(false);
  });

  it("rejects negative quantity", () => {
    const r = productSchema.safeParse({ ...valid, quantity: "-1" });
    expect(r.success).toBe(false);
  });

  it("accepts zero quantity", () => {
    expect(() => productSchema.parse({ ...valid, quantity: "0" })).not.toThrow();
  });

  it("handles large values", () => {
    expect(() => productSchema.parse({ ...valid, price: "999999999", quantity: "999999" })).not.toThrow();
  });

  it("rejects negative threshold", () => {
    const r = productSchema.safeParse({ ...valid, low_stock_threshold: "-1" });
    expect(r.success).toBe(false);
  });
});

describe("supplierSchema", () => {
  it("accepts valid supplier", () => {
    expect(() => supplierSchema.parse({ name: "Acme Corp" })).not.toThrow();
  });

  it("rejects empty name", () => {
    const r = supplierSchema.safeParse({ name: "" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const r = supplierSchema.safeParse({ name: "Acme", email: "bad" });
    expect(r.success).toBe(false);
  });

  it("accepts empty email string", () => {
    expect(() => supplierSchema.parse({ name: "Acme", email: "" })).not.toThrow();
  });
});

describe("saleSchema", () => {
  it("accepts valid sale", () => {
    expect(() => saleSchema.parse({ product_id: "550e8400-e29b-41d4-a716-446655440000", quantity: "5" })).not.toThrow();
  });

  it("rejects missing product", () => {
    const r = saleSchema.safeParse({ product_id: "", quantity: "5" });
    expect(r.success).toBe(false);
  });

  it("rejects zero quantity", () => {
    const r = saleSchema.safeParse({ product_id: "550e8400-e29b-41d4-a716-446655440000", quantity: "0" });
    expect(r.success).toBe(false);
  });

  it("rejects negative quantity", () => {
    const r = saleSchema.safeParse({ product_id: "550e8400-e29b-41d4-a716-446655440000", quantity: "-3" });
    expect(r.success).toBe(false);
  });
});

describe("inventoryUpdateSchema", () => {
  const valid = { product_id: "550e8400-e29b-41d4-a716-446655440000", change_type: "addition" as const, quantity: "10" };

  it("accepts valid update", () => {
    expect(() => inventoryUpdateSchema.parse(valid)).not.toThrow();
  });

  it("rejects zero quantity", () => {
    const r = inventoryUpdateSchema.safeParse({ ...valid, quantity: "0" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid change type", () => {
    const r = inventoryUpdateSchema.safeParse({ ...valid, change_type: "invalid" });
    expect(r.success).toBe(false);
  });

  it("accepts notes", () => {
    expect(() => inventoryUpdateSchema.parse({ ...valid, notes: "Restocking" })).not.toThrow();
  });
});

describe("sanitize", () => {
  it("strips HTML tags", () => {
    expect(sanitize("<b>bold</b>")).toBe("bold");
  });

  it("strips script tags", () => {
    expect(sanitize('<script>alert(1)</script>')).not.toContain("script");
  });

  it("trims whitespace", () => {
    expect(sanitize("  hello  ")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(sanitize("")).toBe("");
  });
});
