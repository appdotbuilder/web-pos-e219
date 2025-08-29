import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  categoriesTable, 
  productsTable, 
  staffTable, 
  printersTable, 
  taxesTable, 
  discountsTable, 
  salesTable, 
  saleItemsTable 
} from '../db/schema';
import { createBackup } from '../handlers/create_backup';
import type { 
  CreateCategoryInput, 
  CreateProductInput, 
  CreateStaffInput, 
  CreatePrinterInput, 
  CreateTaxInput, 
  CreateDiscountInput 
} from '../schema';

// Test data
const testCategory: CreateCategoryInput = {
  name: 'Electronics',
  description: 'Electronic devices and accessories'
};

const testStaff: CreateStaffInput = {
  name: 'John Doe',
  email: 'john@example.com',
  role: 'cashier',
  is_active: true
};

const testPrinter: CreatePrinterInput = {
  name: 'Receipt Printer 1',
  ip_address: '192.168.1.100',
  port: 9100,
  is_active: true,
  printer_type: 'thermal'
};

const testTax: CreateTaxInput = {
  name: 'VAT',
  rate: 20.5,
  is_active: true
};

const testDiscount: CreateDiscountInput = {
  name: 'Holiday Sale',
  type: 'percentage',
  value: 15.0,
  is_active: true
};

describe('createBackup', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create backup with empty tables', async () => {
    const backup = await createBackup();

    // Verify backup structure
    expect(backup).toHaveProperty('timestamp');
    expect(backup.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp format
    expect(new Date(backup.timestamp)).toBeInstanceOf(Date);

    // All arrays should be empty
    expect(backup.categories).toEqual([]);
    expect(backup.products).toEqual([]);
    expect(backup.staff).toEqual([]);
    expect(backup.printers).toEqual([]);
    expect(backup.taxes).toEqual([]);
    expect(backup.discounts).toEqual([]);
    expect(backup.sales).toEqual([]);
    expect(backup.sale_items).toEqual([]);
  });

  it('should create backup with all table data', async () => {
    // Create prerequisite data
    const [category] = await db.insert(categoriesTable)
      .values({
        name: testCategory.name,
        description: testCategory.description
      })
      .returning()
      .execute();

    const [staff] = await db.insert(staffTable)
      .values({
        name: testStaff.name,
        email: testStaff.email,
        role: testStaff.role,
        is_active: testStaff.is_active
      })
      .returning()
      .execute();

    const [product] = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '29.99',
        category_id: category.id,
        stock_quantity: 50,
        sku: 'TEST-001'
      })
      .returning()
      .execute();

    await db.insert(printersTable)
      .values({
        name: testPrinter.name,
        ip_address: testPrinter.ip_address,
        port: testPrinter.port,
        is_active: testPrinter.is_active,
        printer_type: testPrinter.printer_type
      })
      .execute();

    await db.insert(taxesTable)
      .values({
        name: testTax.name,
        rate: testTax.rate.toString(),
        is_active: testTax.is_active
      })
      .execute();

    await db.insert(discountsTable)
      .values({
        name: testDiscount.name,
        type: testDiscount.type,
        value: testDiscount.value.toString(),
        is_active: testDiscount.is_active
      })
      .execute();

    const [sale] = await db.insert(salesTable)
      .values({
        staff_id: staff.id,
        subtotal: '25.99',
        tax_amount: '5.20',
        discount_amount: '0.00',
        total_amount: '31.19',
        payment_method: 'card',
        status: 'completed'
      })
      .returning()
      .execute();

    await db.insert(saleItemsTable)
      .values({
        sale_id: sale.id,
        product_id: product.id,
        quantity: 2,
        unit_price: '12.99',
        total_price: '25.98'
      })
      .execute();

    // Create backup
    const backup = await createBackup();

    // Verify all data is included
    expect(backup.categories).toHaveLength(1);
    expect(backup.products).toHaveLength(1);
    expect(backup.staff).toHaveLength(1);
    expect(backup.printers).toHaveLength(1);
    expect(backup.taxes).toHaveLength(1);
    expect(backup.discounts).toHaveLength(1);
    expect(backup.sales).toHaveLength(1);
    expect(backup.sale_items).toHaveLength(1);

    // Verify category data
    expect(backup.categories[0].name).toEqual('Electronics');
    expect(backup.categories[0].description).toEqual('Electronic devices and accessories');
    expect(backup.categories[0].created_at).toBeInstanceOf(Date);

    // Verify product data with numeric conversion
    expect(backup.products[0].name).toEqual('Test Product');
    expect(backup.products[0].price).toEqual(29.99);
    expect(typeof backup.products[0].price).toBe('number');
    expect(backup.products[0].stock_quantity).toEqual(50);
    expect(backup.products[0].category_id).toEqual(category.id);

    // Verify staff data
    expect(backup.staff[0].name).toEqual('John Doe');
    expect(backup.staff[0].email).toEqual('john@example.com');
    expect(backup.staff[0].role).toEqual('cashier');
    expect(backup.staff[0].is_active).toBe(true);

    // Verify printer data
    expect(backup.printers[0].name).toEqual('Receipt Printer 1');
    expect(backup.printers[0].ip_address).toEqual('192.168.1.100');
    expect(backup.printers[0].port).toEqual(9100);

    // Verify tax data with numeric conversion
    expect(backup.taxes[0].name).toEqual('VAT');
    expect(backup.taxes[0].rate).toEqual(20.5);
    expect(typeof backup.taxes[0].rate).toBe('number');

    // Verify discount data with numeric conversion
    expect(backup.discounts[0].name).toEqual('Holiday Sale');
    expect(backup.discounts[0].value).toEqual(15.0);
    expect(typeof backup.discounts[0].value).toBe('number');
    expect(backup.discounts[0].type).toEqual('percentage');

    // Verify sale data with numeric conversions
    expect(backup.sales[0].staff_id).toEqual(staff.id);
    expect(backup.sales[0].subtotal).toEqual(25.99);
    expect(backup.sales[0].tax_amount).toEqual(5.20);
    expect(backup.sales[0].total_amount).toEqual(31.19);
    expect(typeof backup.sales[0].subtotal).toBe('number');
    expect(typeof backup.sales[0].tax_amount).toBe('number');
    expect(typeof backup.sales[0].total_amount).toBe('number');

    // Verify sale item data with numeric conversions
    expect(backup.sale_items[0].sale_id).toEqual(sale.id);
    expect(backup.sale_items[0].product_id).toEqual(product.id);
    expect(backup.sale_items[0].quantity).toEqual(2);
    expect(backup.sale_items[0].unit_price).toEqual(12.99);
    expect(backup.sale_items[0].total_price).toEqual(25.98);
    expect(typeof backup.sale_items[0].unit_price).toBe('number');
    expect(typeof backup.sale_items[0].total_price).toBe('number');
  });

  it('should create backup with multiple records in each table', async () => {
    // Create multiple categories
    await db.insert(categoriesTable)
      .values([
        { name: 'Electronics', description: 'Electronic items' },
        { name: 'Clothing', description: 'Clothing items' },
        { name: 'Books', description: null }
      ])
      .execute();

    // Create multiple staff members
    await db.insert(staffTable)
      .values([
        { name: 'Alice Smith', email: 'alice@example.com', role: 'admin', is_active: true },
        { name: 'Bob Johnson', email: 'bob@example.com', role: 'manager', is_active: false }
      ])
      .execute();

    // Create multiple taxes and discounts
    await db.insert(taxesTable)
      .values([
        { name: 'State Tax', rate: '8.25', is_active: true },
        { name: 'City Tax', rate: '2.50', is_active: false }
      ])
      .execute();

    await db.insert(discountsTable)
      .values([
        { name: 'Student Discount', type: 'percentage', value: '10.0', is_active: true },
        { name: 'Fixed Discount', type: 'fixed', value: '5.00', is_active: false }
      ])
      .execute();

    const backup = await createBackup();

    // Verify correct counts
    expect(backup.categories).toHaveLength(3);
    expect(backup.staff).toHaveLength(2);
    expect(backup.taxes).toHaveLength(2);
    expect(backup.discounts).toHaveLength(2);

    // Verify data integrity for multiple records
    expect(backup.categories.map(c => c.name)).toContain('Electronics');
    expect(backup.categories.map(c => c.name)).toContain('Clothing');
    expect(backup.categories.map(c => c.name)).toContain('Books');

    // Verify numeric conversions for all records
    backup.taxes.forEach(tax => {
      expect(typeof tax.rate).toBe('number');
    });

    backup.discounts.forEach(discount => {
      expect(typeof discount.value).toBe('number');
    });
  });

  it('should handle null values correctly', async () => {
    // Create records with null values
    await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: null
      })
      .execute();

    await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: null,
        price: '19.99',
        category_id: 1,
        stock_quantity: 0,
        sku: null
      })
      .execute();

    const backup = await createBackup();

    expect(backup.categories[0].description).toBeNull();
    expect(backup.products[0].description).toBeNull();
    expect(backup.products[0].sku).toBeNull();
  });

  it('should create backup with valid timestamp format', async () => {
    const beforeBackup = new Date();
    const backup = await createBackup();
    const afterBackup = new Date();

    const backupTime = new Date(backup.timestamp);

    // Timestamp should be between before and after
    expect(backupTime.getTime()).toBeGreaterThanOrEqual(beforeBackup.getTime());
    expect(backupTime.getTime()).toBeLessThanOrEqual(afterBackup.getTime());

    // Verify ISO string format
    expect(backup.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});