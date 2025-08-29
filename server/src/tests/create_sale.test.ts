import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, productsTable, staffTable, taxesTable, discountsTable, salesTable, saleItemsTable } from '../db/schema';
import { type CreateSaleInput } from '../schema';
import { createSale } from '../handlers/create_sale';
import { eq } from 'drizzle-orm';

describe('createSale', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let categoryId: number;
  let productId1: number;
  let productId2: number;
  let staffId: number;
  let taxId: number;
  let discountId: number;

  beforeEach(async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A category for testing'
      })
      .returning()
      .execute();
    categoryId = categoryResult[0].id;

    // Create test products
    const product1Result = await db.insert(productsTable)
      .values({
        name: 'Test Product 1',
        description: 'First test product',
        price: '10.00',
        category_id: categoryId,
        stock_quantity: 100,
        sku: 'TEST001'
      })
      .returning()
      .execute();
    productId1 = product1Result[0].id;

    const product2Result = await db.insert(productsTable)
      .values({
        name: 'Test Product 2',
        description: 'Second test product',
        price: '15.50',
        category_id: categoryId,
        stock_quantity: 50,
        sku: 'TEST002'
      })
      .returning()
      .execute();
    productId2 = product2Result[0].id;

    // Create test staff
    const staffResult = await db.insert(staffTable)
      .values({
        name: 'Test Cashier',
        email: 'cashier@test.com',
        role: 'cashier',
        is_active: true
      })
      .returning()
      .execute();
    staffId = staffResult[0].id;

    // Create test tax
    const taxResult = await db.insert(taxesTable)
      .values({
        name: 'Sales Tax',
        rate: '10.00',
        is_active: true
      })
      .returning()
      .execute();
    taxId = taxResult[0].id;

    // Create test discount
    const discountResult = await db.insert(discountsTable)
      .values({
        name: '10% Off',
        type: 'percentage',
        value: '10.00',
        is_active: true
      })
      .returning()
      .execute();
    discountId = discountResult[0].id;
  });

  it('should create a sale with single item', async () => {
    const testInput: CreateSaleInput = {
      staff_id: staffId,
      items: [
        {
          product_id: productId1,
          quantity: 2,
          unit_price: 10.00
        }
      ],
      payment_method: 'cash'
    };

    const result = await createSale(testInput);

    // Validate sale fields
    expect(result.staff_id).toBe(staffId);
    expect(result.subtotal).toBe(20.00);
    expect(result.tax_amount).toBe(0);
    expect(result.discount_amount).toBe(0);
    expect(result.total_amount).toBe(20.00);
    expect(result.payment_method).toBe('cash');
    expect(result.status).toBe('completed');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a sale with multiple items', async () => {
    const testInput: CreateSaleInput = {
      staff_id: staffId,
      items: [
        {
          product_id: productId1,
          quantity: 3,
          unit_price: 10.00
        },
        {
          product_id: productId2,
          quantity: 2,
          unit_price: 15.50
        }
      ],
      payment_method: 'card'
    };

    const result = await createSale(testInput);

    // Validate calculations
    expect(result.subtotal).toBe(61.00); // (3 * 10.00) + (2 * 15.50)
    expect(result.total_amount).toBe(61.00);
    expect(result.payment_method).toBe('card');
  });

  it('should apply tax correctly', async () => {
    const testInput: CreateSaleInput = {
      staff_id: staffId,
      items: [
        {
          product_id: productId1,
          quantity: 1,
          unit_price: 10.00
        }
      ],
      tax_id: taxId,
      payment_method: 'cash'
    };

    const result = await createSale(testInput);

    expect(result.subtotal).toBe(10.00);
    expect(result.tax_amount).toBe(1.00); // 10% of 10.00
    expect(result.total_amount).toBe(11.00); // 10.00 + 1.00
  });

  it('should apply percentage discount correctly', async () => {
    const testInput: CreateSaleInput = {
      staff_id: staffId,
      items: [
        {
          product_id: productId1,
          quantity: 1,
          unit_price: 10.00
        }
      ],
      discount_id: discountId,
      payment_method: 'cash'
    };

    const result = await createSale(testInput);

    expect(result.subtotal).toBe(10.00);
    expect(result.discount_amount).toBe(1.00); // 10% of 10.00
    expect(result.total_amount).toBe(9.00); // 10.00 - 1.00
  });

  it('should apply fixed discount correctly', async () => {
    // Create fixed discount
    const fixedDiscountResult = await db.insert(discountsTable)
      .values({
        name: '$5 Off',
        type: 'fixed',
        value: '5.00',
        is_active: true
      })
      .returning()
      .execute();

    const testInput: CreateSaleInput = {
      staff_id: staffId,
      items: [
        {
          product_id: productId1,
          quantity: 2,
          unit_price: 10.00
        }
      ],
      discount_id: fixedDiscountResult[0].id,
      payment_method: 'cash'
    };

    const result = await createSale(testInput);

    expect(result.subtotal).toBe(20.00);
    expect(result.discount_amount).toBe(5.00);
    expect(result.total_amount).toBe(15.00); // 20.00 - 5.00
  });

  it('should apply both tax and discount correctly', async () => {
    const testInput: CreateSaleInput = {
      staff_id: staffId,
      items: [
        {
          product_id: productId1,
          quantity: 1,
          unit_price: 10.00
        }
      ],
      tax_id: taxId,
      discount_id: discountId,
      payment_method: 'digital_wallet'
    };

    const result = await createSale(testInput);

    expect(result.subtotal).toBe(10.00);
    expect(result.tax_amount).toBe(1.00); // 10% of 10.00
    expect(result.discount_amount).toBe(1.00); // 10% of 10.00
    expect(result.total_amount).toBe(10.00); // 10.00 + 1.00 - 1.00
  });

  it('should update product stock quantities', async () => {
    const testInput: CreateSaleInput = {
      staff_id: staffId,
      items: [
        {
          product_id: productId1,
          quantity: 5,
          unit_price: 10.00
        },
        {
          product_id: productId2,
          quantity: 3,
          unit_price: 15.50
        }
      ],
      payment_method: 'cash'
    };

    await createSale(testInput);

    // Check updated stock quantities
    const updatedProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId1))
      .execute();
    expect(updatedProducts[0].stock_quantity).toBe(95); // 100 - 5

    const updatedProducts2 = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId2))
      .execute();
    expect(updatedProducts2[0].stock_quantity).toBe(47); // 50 - 3
  });

  it('should create sale items in database', async () => {
    const testInput: CreateSaleInput = {
      staff_id: staffId,
      items: [
        {
          product_id: productId1,
          quantity: 2,
          unit_price: 10.00
        },
        {
          product_id: productId2,
          quantity: 1,
          unit_price: 15.50
        }
      ],
      payment_method: 'cash'
    };

    const result = await createSale(testInput);

    // Check sale items were created
    const saleItems = await db.select()
      .from(saleItemsTable)
      .where(eq(saleItemsTable.sale_id, result.id))
      .execute();

    expect(saleItems).toHaveLength(2);

    const item1 = saleItems.find(item => item.product_id === productId1);
    expect(item1?.quantity).toBe(2);
    expect(parseFloat(item1?.unit_price || '0')).toBe(10.00);
    expect(parseFloat(item1?.total_price || '0')).toBe(20.00);

    const item2 = saleItems.find(item => item.product_id === productId2);
    expect(item2?.quantity).toBe(1);
    expect(parseFloat(item2?.unit_price || '0')).toBe(15.50);
    expect(parseFloat(item2?.total_price || '0')).toBe(15.50);
  });

  it('should throw error for non-existent product', async () => {
    const testInput: CreateSaleInput = {
      staff_id: staffId,
      items: [
        {
          product_id: 999999, // Non-existent product
          quantity: 1,
          unit_price: 10.00
        }
      ],
      payment_method: 'cash'
    };

    await expect(createSale(testInput)).rejects.toThrow(/Products not found: 999999/);
  });

  it('should throw error for insufficient stock', async () => {
    const testInput: CreateSaleInput = {
      staff_id: staffId,
      items: [
        {
          product_id: productId1,
          quantity: 150, // More than available stock (100)
          unit_price: 10.00
        }
      ],
      payment_method: 'cash'
    };

    await expect(createSale(testInput)).rejects.toThrow(/Insufficient stock for product/);
  });

  it('should throw error for inactive tax', async () => {
    // Create inactive tax
    const inactiveTaxResult = await db.insert(taxesTable)
      .values({
        name: 'Inactive Tax',
        rate: '5.00',
        is_active: false
      })
      .returning()
      .execute();

    const testInput: CreateSaleInput = {
      staff_id: staffId,
      items: [
        {
          product_id: productId1,
          quantity: 1,
          unit_price: 10.00
        }
      ],
      tax_id: inactiveTaxResult[0].id,
      payment_method: 'cash'
    };

    await expect(createSale(testInput)).rejects.toThrow(/Active tax with ID \d+ not found/);
  });

  it('should throw error for inactive discount', async () => {
    // Create inactive discount
    const inactiveDiscountResult = await db.insert(discountsTable)
      .values({
        name: 'Inactive Discount',
        type: 'percentage',
        value: '15.00',
        is_active: false
      })
      .returning()
      .execute();

    const testInput: CreateSaleInput = {
      staff_id: staffId,
      items: [
        {
          product_id: productId1,
          quantity: 1,
          unit_price: 10.00
        }
      ],
      discount_id: inactiveDiscountResult[0].id,
      payment_method: 'cash'
    };

    await expect(createSale(testInput)).rejects.toThrow(/Active discount with ID \d+ not found/);
  });

  it('should handle complex calculation with precision', async () => {
    const testInput: CreateSaleInput = {
      staff_id: staffId,
      items: [
        {
          product_id: productId1,
          quantity: 3,
          unit_price: 12.99
        }
      ],
      tax_id: taxId, // 10% tax
      discount_id: discountId, // 10% discount
      payment_method: 'card'
    };

    const result = await createSale(testInput);

    expect(result.subtotal).toBe(38.97); // 3 * 12.99
    expect(Math.round(result.tax_amount * 100) / 100).toBe(3.90); // 10% of 38.97, rounded to 2 decimals
    expect(Math.round(result.discount_amount * 100) / 100).toBe(3.90); // 10% of 38.97, rounded to 2 decimals
    expect(result.total_amount).toBe(38.97); // 38.97 + 3.90 - 3.90
  });
});