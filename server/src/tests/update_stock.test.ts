import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable } from '../db/schema';
import { type UpdateStockInput } from '../schema';
import { updateStock } from '../handlers/update_stock';
import { eq } from 'drizzle-orm';

describe('updateStock', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test product
  const createTestProduct = async (initialStock = 50) => {
    // First create a category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Category for testing'
      })
      .returning()
      .execute();

    // Then create a product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A product for testing',
        price: '19.99',
        category_id: categoryResult[0].id,
        stock_quantity: initialStock,
        sku: 'TEST-001'
      })
      .returning()
      .execute();

    return productResult[0];
  };

  describe('set operation', () => {
    it('should set stock to exact quantity', async () => {
      const product = await createTestProduct(100);
      
      const input: UpdateStockInput = {
        product_id: product.id,
        quantity_change: 25,
        operation: 'set'
      };

      const result = await updateStock(input);

      expect(result.id).toEqual(product.id);
      expect(result.stock_quantity).toEqual(25);
      expect(result.updated_at).toBeInstanceOf(Date);
      expect(result.updated_at > product.updated_at).toBe(true);
    });

    it('should set stock to zero', async () => {
      const product = await createTestProduct(100);
      
      const input: UpdateStockInput = {
        product_id: product.id,
        quantity_change: 0,
        operation: 'set'
      };

      const result = await updateStock(input);

      expect(result.stock_quantity).toEqual(0);
    });
  });

  describe('add operation', () => {
    it('should increase stock quantity', async () => {
      const product = await createTestProduct(50);
      
      const input: UpdateStockInput = {
        product_id: product.id,
        quantity_change: 25,
        operation: 'add'
      };

      const result = await updateStock(input);

      expect(result.stock_quantity).toEqual(75);
      expect(result.updated_at).toBeInstanceOf(Date);
      expect(result.updated_at > product.updated_at).toBe(true);
    });

    it('should add zero quantity', async () => {
      const product = await createTestProduct(50);
      
      const input: UpdateStockInput = {
        product_id: product.id,
        quantity_change: 0,
        operation: 'add'
      };

      const result = await updateStock(input);

      expect(result.stock_quantity).toEqual(50);
    });
  });

  describe('subtract operation', () => {
    it('should decrease stock quantity', async () => {
      const product = await createTestProduct(50);
      
      const input: UpdateStockInput = {
        product_id: product.id,
        quantity_change: 20,
        operation: 'subtract'
      };

      const result = await updateStock(input);

      expect(result.stock_quantity).toEqual(30);
      expect(result.updated_at).toBeInstanceOf(Date);
      expect(result.updated_at > product.updated_at).toBe(true);
    });

    it('should subtract to exactly zero', async () => {
      const product = await createTestProduct(30);
      
      const input: UpdateStockInput = {
        product_id: product.id,
        quantity_change: 30,
        operation: 'subtract'
      };

      const result = await updateStock(input);

      expect(result.stock_quantity).toEqual(0);
    });

    it('should reject negative stock quantity', async () => {
      const product = await createTestProduct(10);
      
      const input: UpdateStockInput = {
        product_id: product.id,
        quantity_change: 15,
        operation: 'subtract'
      };

      await expect(updateStock(input)).rejects.toThrow(/stock quantity cannot be negative/i);
    });
  });

  describe('database persistence', () => {
    it('should persist changes to database', async () => {
      const product = await createTestProduct(100);
      
      const input: UpdateStockInput = {
        product_id: product.id,
        quantity_change: 30,
        operation: 'subtract'
      };

      await updateStock(input);

      // Verify changes are persisted in database
      const updatedProducts = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, product.id))
        .execute();

      expect(updatedProducts).toHaveLength(1);
      expect(updatedProducts[0].stock_quantity).toEqual(70);
      expect(updatedProducts[0].updated_at).toBeInstanceOf(Date);
      expect(updatedProducts[0].updated_at > product.updated_at).toBe(true);
    });

    it('should return product with correct numeric conversion', async () => {
      const product = await createTestProduct(25);
      
      const input: UpdateStockInput = {
        product_id: product.id,
        quantity_change: 5,
        operation: 'add'
      };

      const result = await updateStock(input);

      // Verify numeric fields are properly converted
      expect(typeof result.price).toBe('number');
      expect(result.price).toEqual(19.99);
      expect(typeof result.stock_quantity).toBe('number');
      expect(result.stock_quantity).toEqual(30);
    });
  });

  describe('error handling', () => {
    it('should throw error for non-existent product', async () => {
      const input: UpdateStockInput = {
        product_id: 99999,
        quantity_change: 10,
        operation: 'add'
      };

      await expect(updateStock(input)).rejects.toThrow(/product with id 99999 not found/i);
    });

    it('should reject negative quantity with set operation', async () => {
      const product = await createTestProduct(50);
      
      const input: UpdateStockInput = {
        product_id: product.id,
        quantity_change: -5,
        operation: 'set'
      };

      await expect(updateStock(input)).rejects.toThrow(/stock quantity cannot be negative/i);
    });

    it('should reject negative quantity with add operation resulting in negative', async () => {
      const product = await createTestProduct(5);
      
      const input: UpdateStockInput = {
        product_id: product.id,
        quantity_change: -10,
        operation: 'add'
      };

      await expect(updateStock(input)).rejects.toThrow(/stock quantity cannot be negative/i);
    });
  });

  describe('multiple operations', () => {
    it('should handle consecutive stock operations correctly', async () => {
      const product = await createTestProduct(100);

      // First operation: subtract 30
      await updateStock({
        product_id: product.id,
        quantity_change: 30,
        operation: 'subtract'
      });

      // Second operation: add 15
      await updateStock({
        product_id: product.id,
        quantity_change: 15,
        operation: 'add'
      });

      // Third operation: set to 50
      const finalResult = await updateStock({
        product_id: product.id,
        quantity_change: 50,
        operation: 'set'
      });

      expect(finalResult.stock_quantity).toEqual(50);

      // Verify in database
      const dbProduct = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, product.id))
        .execute();

      expect(dbProduct[0].stock_quantity).toEqual(50);
    });
  });
});