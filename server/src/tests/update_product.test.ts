import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable } from '../db/schema';
import { type UpdateProductInput } from '../schema';
import { updateProduct } from '../handlers/update_product';
import { eq } from 'drizzle-orm';

describe('updateProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testCategory: { id: number };
  let testProduct: { id: number };
  let secondCategory: { id: number };

  beforeEach(async () => {
    // Create test category
    const categories = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A category for testing'
      })
      .returning()
      .execute();
    testCategory = categories[0];

    // Create second category for category update tests
    const categories2 = await db.insert(categoriesTable)
      .values({
        name: 'Second Category',
        description: 'Another category for testing'
      })
      .returning()
      .execute();
    secondCategory = categories2[0];

    // Create test product
    const products = await db.insert(productsTable)
      .values({
        name: 'Original Product',
        description: 'Original description',
        price: '29.99', // String for numeric column
        category_id: testCategory.id,
        stock_quantity: 50,
        sku: 'ORIG-001'
      })
      .returning()
      .execute();
    testProduct = products[0];
  });

  it('should update product name', async () => {
    const input: UpdateProductInput = {
      id: testProduct.id,
      name: 'Updated Product Name'
    };

    const result = await updateProduct(input);

    expect(result.id).toEqual(testProduct.id);
    expect(result.name).toEqual('Updated Product Name');
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.price).toEqual(29.99);
    expect(result.category_id).toEqual(testCategory.id);
    expect(result.stock_quantity).toEqual(50);
    expect(result.sku).toEqual('ORIG-001');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update product description', async () => {
    const input: UpdateProductInput = {
      id: testProduct.id,
      description: 'Updated description'
    };

    const result = await updateProduct(input);

    expect(result.description).toEqual('Updated description');
    expect(result.name).toEqual('Original Product'); // Should remain unchanged
  });

  it('should update product description to null', async () => {
    const input: UpdateProductInput = {
      id: testProduct.id,
      description: null
    };

    const result = await updateProduct(input);

    expect(result.description).toBeNull();
    expect(result.name).toEqual('Original Product');
  });

  it('should update product price', async () => {
    const input: UpdateProductInput = {
      id: testProduct.id,
      price: 39.99
    };

    const result = await updateProduct(input);

    expect(result.price).toEqual(39.99);
    expect(typeof result.price).toBe('number');
    expect(result.name).toEqual('Original Product');
  });

  it('should update product category', async () => {
    const input: UpdateProductInput = {
      id: testProduct.id,
      category_id: secondCategory.id
    };

    const result = await updateProduct(input);

    expect(result.category_id).toEqual(secondCategory.id);
    expect(result.name).toEqual('Original Product');
  });

  it('should update stock quantity', async () => {
    const input: UpdateProductInput = {
      id: testProduct.id,
      stock_quantity: 75
    };

    const result = await updateProduct(input);

    expect(result.stock_quantity).toEqual(75);
    expect(result.name).toEqual('Original Product');
  });

  it('should update SKU', async () => {
    const input: UpdateProductInput = {
      id: testProduct.id,
      sku: 'UPD-002'
    };

    const result = await updateProduct(input);

    expect(result.sku).toEqual('UPD-002');
    expect(result.name).toEqual('Original Product');
  });

  it('should update SKU to null', async () => {
    const input: UpdateProductInput = {
      id: testProduct.id,
      sku: null
    };

    const result = await updateProduct(input);

    expect(result.sku).toBeNull();
    expect(result.name).toEqual('Original Product');
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateProductInput = {
      id: testProduct.id,
      name: 'Multi Update Product',
      description: 'Multi update description',
      price: 49.99,
      category_id: secondCategory.id,
      stock_quantity: 100,
      sku: 'MULTI-001'
    };

    const result = await updateProduct(input);

    expect(result.name).toEqual('Multi Update Product');
    expect(result.description).toEqual('Multi update description');
    expect(result.price).toEqual(49.99);
    expect(result.category_id).toEqual(secondCategory.id);
    expect(result.stock_quantity).toEqual(100);
    expect(result.sku).toEqual('MULTI-001');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated product to database', async () => {
    const input: UpdateProductInput = {
      id: testProduct.id,
      name: 'Database Update Test',
      price: 19.99
    };

    const result = await updateProduct(input);

    // Query database to verify changes were persisted
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Database Update Test');
    expect(parseFloat(products[0].price)).toEqual(19.99);
    expect(products[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent product', async () => {
    const input: UpdateProductInput = {
      id: 99999,
      name: 'Non-existent Product'
    };

    expect(updateProduct(input)).rejects.toThrow(/product with id 99999 not found/i);
  });

  it('should throw error for non-existent category', async () => {
    const input: UpdateProductInput = {
      id: testProduct.id,
      category_id: 99999
    };

    expect(updateProduct(input)).rejects.toThrow(/category with id 99999 not found/i);
  });

  it('should handle zero values correctly', async () => {
    const input: UpdateProductInput = {
      id: testProduct.id,
      price: 0,
      stock_quantity: 0
    };

    const result = await updateProduct(input);

    expect(result.price).toEqual(0);
    expect(result.stock_quantity).toEqual(0);
  });

  it('should update updated_at timestamp', async () => {
    const originalProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProduct.id))
      .execute();

    // Small delay to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateProductInput = {
      id: testProduct.id,
      name: 'Timestamp Test'
    };

    const result = await updateProduct(input);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalProduct[0].updated_at.getTime());
  });
});