import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable, salesTable, saleItemsTable, staffTable } from '../db/schema';
import { deleteProduct } from '../handlers/delete_product';
import { eq } from 'drizzle-orm';

describe('deleteProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing product', async () => {
    // Create a category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Category for testing'
      })
      .returning()
      .execute();

    // Create a product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'Product for testing',
        price: '19.99',
        category_id: categoryResult[0].id,
        stock_quantity: 100,
        sku: 'TEST-001'
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // Delete the product
    const result = await deleteProduct(productId);

    expect(result.success).toBe(true);

    // Verify product is deleted from database
    const deletedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(deletedProduct).toHaveLength(0);
  });

  it('should throw error when product does not exist', async () => {
    const nonExistentId = 999;

    await expect(deleteProduct(nonExistentId)).rejects.toThrow(/Product with id 999 not found/i);
  });

  it('should throw error when product is referenced in sales', async () => {
    // Create prerequisite data
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Category for testing'
      })
      .returning()
      .execute();

    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'Product for testing',
        price: '19.99',
        category_id: categoryResult[0].id,
        stock_quantity: 100,
        sku: 'TEST-001'
      })
      .returning()
      .execute();

    const staffResult = await db.insert(staffTable)
      .values({
        name: 'Test Staff',
        email: 'staff@test.com',
        role: 'cashier',
        is_active: true
      })
      .returning()
      .execute();

    // Create a sale
    const saleResult = await db.insert(salesTable)
      .values({
        staff_id: staffResult[0].id,
        subtotal: '19.99',
        tax_amount: '0.00',
        discount_amount: '0.00',
        total_amount: '19.99',
        payment_method: 'cash',
        status: 'completed'
      })
      .returning()
      .execute();

    // Create a sale item referencing the product
    await db.insert(saleItemsTable)
      .values({
        sale_id: saleResult[0].id,
        product_id: productResult[0].id,
        quantity: 1,
        unit_price: '19.99',
        total_price: '19.99'
      })
      .execute();

    const productId = productResult[0].id;

    // Attempt to delete the product should fail
    await expect(deleteProduct(productId)).rejects.toThrow(/Cannot delete product.*referenced in existing sales/i);

    // Verify product still exists in database
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(existingProduct).toHaveLength(1);
    expect(existingProduct[0].name).toBe('Test Product');
  });

  it('should successfully delete product with no sale references', async () => {
    // Create category and product
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Category for testing'
      })
      .returning()
      .execute();

    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'Product for testing',
        price: '29.99',
        category_id: categoryResult[0].id,
        stock_quantity: 50,
        sku: 'TEST-002'
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // Verify product exists before deletion
    const beforeDeletion = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(beforeDeletion).toHaveLength(1);

    // Delete the product
    const result = await deleteProduct(productId);

    expect(result.success).toBe(true);

    // Verify product is removed
    const afterDeletion = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(afterDeletion).toHaveLength(0);
  });
});