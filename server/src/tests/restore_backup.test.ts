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
import { type BackupData } from '../schema';
import { restoreBackup } from '../handlers/restore_backup';
import { eq } from 'drizzle-orm';

// Complete test backup data with all required fields
const testBackupData: BackupData = {
  timestamp: '2024-01-15T10:00:00Z',
  categories: [
    {
      id: 1,
      name: 'Electronics',
      description: 'Electronic devices and accessories',
      created_at: new Date('2024-01-01T09:00:00Z'),
      updated_at: new Date('2024-01-01T09:00:00Z')
    },
    {
      id: 2,
      name: 'Books',
      description: null,
      created_at: new Date('2024-01-02T09:00:00Z'),
      updated_at: new Date('2024-01-02T09:00:00Z')
    }
  ],
  products: [
    {
      id: 1,
      name: 'Wireless Headphones',
      description: 'High-quality bluetooth headphones',
      price: 99.99,
      category_id: 1,
      stock_quantity: 50,
      sku: 'WH-001',
      created_at: new Date('2024-01-03T09:00:00Z'),
      updated_at: new Date('2024-01-03T09:00:00Z')
    },
    {
      id: 2,
      name: 'Programming Book',
      description: null,
      price: 39.99,
      category_id: 2,
      stock_quantity: 25,
      sku: null,
      created_at: new Date('2024-01-04T09:00:00Z'),
      updated_at: new Date('2024-01-04T09:00:00Z')
    }
  ],
  staff: [
    {
      id: 1,
      name: 'John Manager',
      email: 'john@store.com',
      role: 'manager',
      is_active: true,
      created_at: new Date('2024-01-01T08:00:00Z'),
      updated_at: new Date('2024-01-01T08:00:00Z')
    },
    {
      id: 2,
      name: 'Jane Cashier',
      email: 'jane@store.com',
      role: 'cashier',
      is_active: true,
      created_at: new Date('2024-01-02T08:00:00Z'),
      updated_at: new Date('2024-01-02T08:00:00Z')
    }
  ],
  printers: [
    {
      id: 1,
      name: 'Receipt Printer 1',
      ip_address: '192.168.1.100',
      port: 9100,
      is_active: true,
      printer_type: 'thermal',
      created_at: new Date('2024-01-01T07:00:00Z'),
      updated_at: new Date('2024-01-01T07:00:00Z')
    }
  ],
  taxes: [
    {
      id: 1,
      name: 'Sales Tax',
      rate: 8.5,
      is_active: true,
      created_at: new Date('2024-01-01T06:00:00Z'),
      updated_at: new Date('2024-01-01T06:00:00Z')
    }
  ],
  discounts: [
    {
      id: 1,
      name: 'Holiday Special',
      type: 'percentage',
      value: 15.0,
      is_active: true,
      created_at: new Date('2024-01-01T05:00:00Z'),
      updated_at: new Date('2024-01-01T05:00:00Z')
    }
  ],
  sales: [
    {
      id: 1,
      staff_id: 1,
      subtotal: 99.99,
      tax_amount: 8.50,
      discount_amount: 0.00,
      total_amount: 108.49,
      payment_method: 'card',
      status: 'completed',
      created_at: new Date('2024-01-10T14:30:00Z'),
      updated_at: new Date('2024-01-10T14:30:00Z')
    }
  ],
  sale_items: [
    {
      id: 1,
      sale_id: 1,
      product_id: 1,
      quantity: 1,
      unit_price: 99.99,
      total_price: 99.99,
      created_at: new Date('2024-01-10T14:30:00Z')
    }
  ]
};

describe('restoreBackup', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should restore complete backup successfully', async () => {
    const result = await restoreBackup(testBackupData);

    expect(result.success).toBe(true);
    expect(result.message).toContain('Backup restored successfully');
    expect(result.message).toContain('11 records imported');
    expect(result.message).toContain('2024-01-15T10:00:00Z');
  });

  it('should restore all categories correctly', async () => {
    await restoreBackup(testBackupData);

    const categories = await db.select().from(categoriesTable).execute();
    
    expect(categories).toHaveLength(2);
    
    const electronics = categories.find(c => c.name === 'Electronics');
    expect(electronics).toBeDefined();
    expect(electronics?.description).toBe('Electronic devices and accessories');
    expect(electronics?.id).toBe(1);
    
    const books = categories.find(c => c.name === 'Books');
    expect(books).toBeDefined();
    expect(books?.description).toBe(null);
    expect(books?.id).toBe(2);
  });

  it('should restore all products with correct numeric conversions', async () => {
    await restoreBackup(testBackupData);

    const products = await db.select().from(productsTable).execute();
    
    expect(products).toHaveLength(2);
    
    const headphones = products.find(p => p.name === 'Wireless Headphones');
    expect(headphones).toBeDefined();
    expect(typeof headphones?.price).toBe('string'); // Stored as string in DB
    expect(parseFloat(headphones?.price || '0')).toBe(99.99);
    expect(headphones?.category_id).toBe(1);
    expect(headphones?.stock_quantity).toBe(50);
    expect(headphones?.sku).toBe('WH-001');
    
    const book = products.find(p => p.name === 'Programming Book');
    expect(book).toBeDefined();
    expect(parseFloat(book?.price || '0')).toBe(39.99);
    expect(book?.category_id).toBe(2);
    expect(book?.sku).toBe(null);
  });

  it('should restore all staff correctly', async () => {
    await restoreBackup(testBackupData);

    const staff = await db.select().from(staffTable).execute();
    
    expect(staff).toHaveLength(2);
    
    const manager = staff.find(s => s.role === 'manager');
    expect(manager).toBeDefined();
    expect(manager?.name).toBe('John Manager');
    expect(manager?.email).toBe('john@store.com');
    expect(manager?.is_active).toBe(true);
    
    const cashier = staff.find(s => s.role === 'cashier');
    expect(cashier).toBeDefined();
    expect(cashier?.name).toBe('Jane Cashier');
    expect(cashier?.email).toBe('jane@store.com');
  });

  it('should restore sales and sale items with proper foreign key relationships', async () => {
    await restoreBackup(testBackupData);

    const sales = await db.select().from(salesTable).execute();
    const saleItems = await db.select().from(saleItemsTable).execute();
    
    expect(sales).toHaveLength(1);
    expect(saleItems).toHaveLength(1);
    
    const sale = sales[0];
    expect(sale.staff_id).toBe(1);
    expect(parseFloat(sale.subtotal)).toBe(99.99);
    expect(parseFloat(sale.tax_amount)).toBe(8.50);
    expect(parseFloat(sale.total_amount)).toBe(108.49);
    expect(sale.payment_method).toBe('card');
    expect(sale.status).toBe('completed');
    
    const saleItem = saleItems[0];
    expect(saleItem.sale_id).toBe(1);
    expect(saleItem.product_id).toBe(1);
    expect(saleItem.quantity).toBe(1);
    expect(parseFloat(saleItem.unit_price)).toBe(99.99);
    expect(parseFloat(saleItem.total_price)).toBe(99.99);
  });

  it('should clear existing data before restoration', async () => {
    // First, create some initial data
    await db.insert(categoriesTable).values({
      name: 'Old Category',
      description: 'This should be deleted'
    });

    await db.insert(staffTable).values({
      name: 'Old Staff',
      email: 'old@test.com',
      role: 'admin'
    });

    // Verify initial data exists
    const initialCategories = await db.select().from(categoriesTable).execute();
    const initialStaff = await db.select().from(staffTable).execute();
    expect(initialCategories).toHaveLength(1);
    expect(initialStaff).toHaveLength(1);

    // Restore backup
    await restoreBackup(testBackupData);

    // Verify old data is gone and only backup data remains
    const finalCategories = await db.select().from(categoriesTable).execute();
    const finalStaff = await db.select().from(staffTable).execute();
    
    expect(finalCategories).toHaveLength(2);
    expect(finalStaff).toHaveLength(2);
    expect(finalCategories.find(c => c.name === 'Old Category')).toBeUndefined();
    expect(finalStaff.find(s => s.name === 'Old Staff')).toBeUndefined();
  });

  it('should handle empty backup data gracefully', async () => {
    const emptyBackup: BackupData = {
      timestamp: '2024-01-15T10:00:00Z',
      categories: [],
      products: [],
      staff: [],
      printers: [],
      taxes: [],
      discounts: [],
      sales: [],
      sale_items: []
    };

    const result = await restoreBackup(emptyBackup);

    expect(result.success).toBe(true);
    expect(result.message).toContain('0 records imported');

    // Verify all tables are empty
    const categories = await db.select().from(categoriesTable).execute();
    const products = await db.select().from(productsTable).execute();
    const staff = await db.select().from(staffTable).execute();
    
    expect(categories).toHaveLength(0);
    expect(products).toHaveLength(0);
    expect(staff).toHaveLength(0);
  });

  it('should restore taxes and discounts with numeric conversions', async () => {
    await restoreBackup(testBackupData);

    const taxes = await db.select().from(taxesTable).execute();
    const discounts = await db.select().from(discountsTable).execute();
    
    expect(taxes).toHaveLength(1);
    expect(discounts).toHaveLength(1);
    
    const tax = taxes[0];
    expect(tax.name).toBe('Sales Tax');
    expect(typeof tax.rate).toBe('string'); // Stored as string
    expect(parseFloat(tax.rate)).toBe(8.5);
    expect(tax.is_active).toBe(true);
    
    const discount = discounts[0];
    expect(discount.name).toBe('Holiday Special');
    expect(discount.type).toBe('percentage');
    expect(typeof discount.value).toBe('string'); // Stored as string
    expect(parseFloat(discount.value)).toBe(15.0);
    expect(discount.is_active).toBe(true);
  });

  it('should restore printers correctly', async () => {
    await restoreBackup(testBackupData);

    const printers = await db.select().from(printersTable).execute();
    
    expect(printers).toHaveLength(1);
    
    const printer = printers[0];
    expect(printer.name).toBe('Receipt Printer 1');
    expect(printer.ip_address).toBe('192.168.1.100');
    expect(printer.port).toBe(9100);
    expect(printer.is_active).toBe(true);
    expect(printer.printer_type).toBe('thermal');
  });

  it('should handle foreign key constraints properly during restoration', async () => {
    // Test with backup data that has proper foreign key relationships
    const result = await restoreBackup(testBackupData);
    
    expect(result.success).toBe(true);
    
    // Verify foreign key relationships are maintained
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.category_id, 1))
      .execute();
    
    const sales = await db.select()
      .from(salesTable)
      .where(eq(salesTable.staff_id, 1))
      .execute();
    
    const saleItems = await db.select()
      .from(saleItemsTable)
      .where(eq(saleItemsTable.product_id, 1))
      .execute();
    
    expect(products).toHaveLength(1);
    expect(sales).toHaveLength(1);
    expect(saleItems).toHaveLength(1);
  });
});