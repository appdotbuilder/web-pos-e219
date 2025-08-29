import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const staffRoleEnum = pgEnum('staff_role', ['admin', 'cashier', 'manager']);
export const printerTypeEnum = pgEnum('printer_type', ['thermal', 'laser', 'inkjet']);
export const discountTypeEnum = pgEnum('discount_type', ['percentage', 'fixed']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'card', 'digital_wallet']);
export const saleStatusEnum = pgEnum('sale_status', ['pending', 'completed', 'cancelled', 'refunded']);

// Categories table
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Products table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  category_id: integer('category_id').notNull(),
  stock_quantity: integer('stock_quantity').notNull().default(0),
  sku: text('sku'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Staff table
export const staffTable = pgTable('staff', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: staffRoleEnum('role').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Printers table
export const printersTable = pgTable('printers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  ip_address: text('ip_address').notNull(),
  port: integer('port').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  printer_type: printerTypeEnum('printer_type').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Taxes table
export const taxesTable = pgTable('taxes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  rate: numeric('rate', { precision: 5, scale: 2 }).notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Discounts table
export const discountsTable = pgTable('discounts', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: discountTypeEnum('type').notNull(),
  value: numeric('value', { precision: 10, scale: 2 }).notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Sales table
export const salesTable = pgTable('sales', {
  id: serial('id').primaryKey(),
  staff_id: integer('staff_id').notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  tax_amount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  discount_amount: numeric('discount_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  payment_method: paymentMethodEnum('payment_method').notNull(),
  status: saleStatusEnum('status').notNull().default('pending'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Sale Items table
export const saleItemsTable = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  sale_id: integer('sale_id').notNull(),
  product_id: integer('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const categoriesRelations = relations(categoriesTable, ({ many }) => ({
  products: many(productsTable)
}));

export const productsRelations = relations(productsTable, ({ one, many }) => ({
  category: one(categoriesTable, {
    fields: [productsTable.category_id],
    references: [categoriesTable.id]
  }),
  sale_items: many(saleItemsTable)
}));

export const staffRelations = relations(staffTable, ({ many }) => ({
  sales: many(salesTable)
}));

export const salesRelations = relations(salesTable, ({ one, many }) => ({
  staff: one(staffTable, {
    fields: [salesTable.staff_id],
    references: [staffTable.id]
  }),
  sale_items: many(saleItemsTable)
}));

export const saleItemsRelations = relations(saleItemsTable, ({ one }) => ({
  sale: one(salesTable, {
    fields: [saleItemsTable.sale_id],
    references: [salesTable.id]
  }),
  product: one(productsTable, {
    fields: [saleItemsTable.product_id],
    references: [productsTable.id]
  })
}));

// TypeScript types for the table schemas
export type Category = typeof categoriesTable.$inferSelect;
export type NewCategory = typeof categoriesTable.$inferInsert;
export type Product = typeof productsTable.$inferSelect;
export type NewProduct = typeof productsTable.$inferInsert;
export type Staff = typeof staffTable.$inferSelect;
export type NewStaff = typeof staffTable.$inferInsert;
export type Printer = typeof printersTable.$inferSelect;
export type NewPrinter = typeof printersTable.$inferInsert;
export type Tax = typeof taxesTable.$inferSelect;
export type NewTax = typeof taxesTable.$inferInsert;
export type Discount = typeof discountsTable.$inferSelect;
export type NewDiscount = typeof discountsTable.$inferInsert;
export type Sale = typeof salesTable.$inferSelect;
export type NewSale = typeof salesTable.$inferInsert;
export type SaleItem = typeof saleItemsTable.$inferSelect;
export type NewSaleItem = typeof saleItemsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  categories: categoriesTable,
  products: productsTable,
  staff: staffTable,
  printers: printersTable,
  taxes: taxesTable,
  discounts: discountsTable,
  sales: salesTable,
  sale_items: saleItemsTable
};