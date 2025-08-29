import { z } from 'zod';

// Category schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

// Product schema
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  category_id: z.number(),
  stock_quantity: z.number().int(),
  sku: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

// Staff schema
export const staffSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'cashier', 'manager']),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Staff = z.infer<typeof staffSchema>;

// Printer schema
export const printerSchema = z.object({
  id: z.number(),
  name: z.string(),
  ip_address: z.string(),
  port: z.number().int(),
  is_active: z.boolean(),
  printer_type: z.enum(['thermal', 'laser', 'inkjet']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Printer = z.infer<typeof printerSchema>;

// Tax schema
export const taxSchema = z.object({
  id: z.number(),
  name: z.string(),
  rate: z.number(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Tax = z.infer<typeof taxSchema>;

// Discount schema
export const discountSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(['percentage', 'fixed']),
  value: z.number(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Discount = z.infer<typeof discountSchema>;

// Sale schema
export const saleSchema = z.object({
  id: z.number(),
  staff_id: z.number(),
  subtotal: z.number(),
  tax_amount: z.number(),
  discount_amount: z.number(),
  total_amount: z.number(),
  payment_method: z.enum(['cash', 'card', 'digital_wallet']),
  status: z.enum(['pending', 'completed', 'cancelled', 'refunded']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Sale = z.infer<typeof saleSchema>;

// Sale Item schema
export const saleItemSchema = z.object({
  id: z.number(),
  sale_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int(),
  unit_price: z.number(),
  total_price: z.number(),
  created_at: z.coerce.date()
});

export type SaleItem = z.infer<typeof saleItemSchema>;

// Input schemas for creating entities
export const createCategoryInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional()
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const createProductInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price: z.number().positive(),
  category_id: z.number(),
  stock_quantity: z.number().int().nonnegative(),
  sku: z.string().nullable().optional()
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const createStaffInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'cashier', 'manager']),
  is_active: z.boolean().optional()
});

export type CreateStaffInput = z.infer<typeof createStaffInputSchema>;

export const createPrinterInputSchema = z.object({
  name: z.string().min(1),
  ip_address: z.string(),
  port: z.number().int().positive(),
  is_active: z.boolean().optional(),
  printer_type: z.enum(['thermal', 'laser', 'inkjet'])
});

export type CreatePrinterInput = z.infer<typeof createPrinterInputSchema>;

export const createTaxInputSchema = z.object({
  name: z.string().min(1),
  rate: z.number().min(0).max(100),
  is_active: z.boolean().optional()
});

export type CreateTaxInput = z.infer<typeof createTaxInputSchema>;

export const createDiscountInputSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().positive(),
  is_active: z.boolean().optional()
});

export type CreateDiscountInput = z.infer<typeof createDiscountInputSchema>;

export const createSaleInputSchema = z.object({
  staff_id: z.number(),
  items: z.array(z.object({
    product_id: z.number(),
    quantity: z.number().int().positive(),
    unit_price: z.number().positive()
  })),
  tax_id: z.number().optional(),
  discount_id: z.number().optional(),
  payment_method: z.enum(['cash', 'card', 'digital_wallet'])
});

export type CreateSaleInput = z.infer<typeof createSaleInputSchema>;

// Update schemas
export const updateCategoryInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional()
});

export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;

export const updateProductInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  price: z.number().positive().optional(),
  category_id: z.number().optional(),
  stock_quantity: z.number().int().nonnegative().optional(),
  sku: z.string().nullable().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

export const updateStaffInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'cashier', 'manager']).optional(),
  is_active: z.boolean().optional()
});

export type UpdateStaffInput = z.infer<typeof updateStaffInputSchema>;

export const updateStockInputSchema = z.object({
  product_id: z.number(),
  quantity_change: z.number().int(),
  operation: z.enum(['add', 'subtract', 'set'])
});

export type UpdateStockInput = z.infer<typeof updateStockInputSchema>;

// Sales report schema
export const salesReportQuerySchema = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  staff_id: z.number().optional(),
  category_id: z.number().optional()
});

export type SalesReportQuery = z.infer<typeof salesReportQuerySchema>;

export const salesReportSchema = z.object({
  total_sales: z.number(),
  total_transactions: z.number(),
  average_transaction: z.number(),
  top_products: z.array(z.object({
    product_id: z.number(),
    product_name: z.string(),
    quantity_sold: z.number(),
    total_revenue: z.number()
  })),
  daily_breakdown: z.array(z.object({
    date: z.string(),
    sales_count: z.number(),
    total_amount: z.number()
  }))
});

export type SalesReport = z.infer<typeof salesReportSchema>;

// Backup/Restore schemas
export const backupDataSchema = z.object({
  timestamp: z.string(),
  categories: z.array(categorySchema),
  products: z.array(productSchema),
  staff: z.array(staffSchema),
  printers: z.array(printerSchema),
  taxes: z.array(taxSchema),
  discounts: z.array(discountSchema),
  sales: z.array(saleSchema),
  sale_items: z.array(saleItemSchema)
});

export type BackupData = z.infer<typeof backupDataSchema>;