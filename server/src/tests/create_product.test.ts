import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/create_product';
import { eq } from 'drizzle-orm';

// Test data
const testCategory = {
  name: 'Test Category',
  description: 'A category for testing'
};

const testInput: CreateProductInput = {
  name: 'Test Product',
  description: 'A product for testing',
  price: 19.99,
  category_id: 1, // Will be set after category creation
  stock_quantity: 100,
  sku: 'TEST-001'
};

describe('createProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a product with all fields', async () => {
    // Create a category first
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    
    const categoryId = categoryResult[0].id;
    const productInput = { ...testInput, category_id: categoryId };

    const result = await createProduct(productInput);

    // Basic field validation
    expect(result.id).toBeDefined();
    expect(result.name).toEqual('Test Product');
    expect(result.description).toEqual('A product for testing');
    expect(result.price).toEqual(19.99);
    expect(typeof result.price).toBe('number'); // Ensure proper numeric conversion
    expect(result.category_id).toEqual(categoryId);
    expect(result.stock_quantity).toEqual(100);
    expect(result.sku).toEqual('TEST-001');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a product with optional fields as null', async () => {
    // Create a category first
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    
    const categoryId = categoryResult[0].id;
    const minimalInput: CreateProductInput = {
      name: 'Minimal Product',
      price: 9.99,
      category_id: categoryId,
      stock_quantity: 50
    };

    const result = await createProduct(minimalInput);

    expect(result.name).toEqual('Minimal Product');
    expect(result.description).toBeNull();
    expect(result.price).toEqual(9.99);
    expect(result.sku).toBeNull();
    expect(result.category_id).toEqual(categoryId);
    expect(result.stock_quantity).toEqual(50);
  });

  it('should save product to database correctly', async () => {
    // Create a category first
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    
    const categoryId = categoryResult[0].id;
    const productInput = { ...testInput, category_id: categoryId };

    const result = await createProduct(productInput);

    // Query the database to verify the product was saved
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    const savedProduct = products[0];
    expect(savedProduct.name).toEqual('Test Product');
    expect(savedProduct.description).toEqual('A product for testing');
    expect(parseFloat(savedProduct.price)).toEqual(19.99); // Database stores as string
    expect(savedProduct.category_id).toEqual(categoryId);
    expect(savedProduct.stock_quantity).toEqual(100);
    expect(savedProduct.sku).toEqual('TEST-001');
    expect(savedProduct.created_at).toBeInstanceOf(Date);
    expect(savedProduct.updated_at).toBeInstanceOf(Date);
  });

  it('should handle decimal prices correctly', async () => {
    // Create a category first
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    
    const categoryId = categoryResult[0].id;
    const productInput: CreateProductInput = {
      name: 'Decimal Product',
      price: 123.45, // Use 2 decimal places to match database precision
      category_id: categoryId,
      stock_quantity: 25
    };

    const result = await createProduct(productInput);

    expect(result.price).toEqual(123.45);
    expect(typeof result.price).toBe('number');

    // Verify in database
    const savedProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(parseFloat(savedProducts[0].price)).toEqual(123.45);
  });

  it('should throw error when category does not exist', async () => {
    const invalidInput: CreateProductInput = {
      name: 'Invalid Product',
      price: 19.99,
      category_id: 999, // Non-existent category
      stock_quantity: 10
    };

    await expect(createProduct(invalidInput)).rejects.toThrow(/Category with id 999 does not exist/i);
  });

  it('should handle zero stock quantity', async () => {
    // Create a category first
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    
    const categoryId = categoryResult[0].id;
    const productInput: CreateProductInput = {
      name: 'Zero Stock Product',
      price: 15.00,
      category_id: categoryId,
      stock_quantity: 0
    };

    const result = await createProduct(productInput);

    expect(result.stock_quantity).toEqual(0);
    expect(result.name).toEqual('Zero Stock Product');
  });

  it('should create multiple products in same category', async () => {
    // Create a category first
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    
    const categoryId = categoryResult[0].id;
    
    const product1Input: CreateProductInput = {
      name: 'Product One',
      price: 10.00,
      category_id: categoryId,
      stock_quantity: 50,
      sku: 'PROD-001'
    };

    const product2Input: CreateProductInput = {
      name: 'Product Two',
      price: 20.00,
      category_id: categoryId,
      stock_quantity: 75,
      sku: 'PROD-002'
    };

    const result1 = await createProduct(product1Input);
    const result2 = await createProduct(product2Input);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.name).toEqual('Product One');
    expect(result2.name).toEqual('Product Two');
    expect(result1.category_id).toEqual(categoryId);
    expect(result2.category_id).toEqual(categoryId);
    
    // Verify both products exist in database
    const allProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.category_id, categoryId))
      .execute();

    expect(allProducts).toHaveLength(2);
  });
});