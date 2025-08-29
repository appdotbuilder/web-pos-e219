import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, productsTable } from '../db/schema';
import { getProducts, getProductsByCategory, getProduct } from '../handlers/get_products';
import { eq } from 'drizzle-orm';

describe('get_products handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createTestCategory = async (name: string = 'Test Category') => {
    const result = await db.insert(categoriesTable)
      .values({
        name,
        description: 'A test category'
      })
      .returning()
      .execute();
    return result[0];
  };

  const createTestProduct = async (categoryId: number, overrides: any = {}) => {
    const result = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '19.99',
        category_id: categoryId,
        stock_quantity: 100,
        sku: 'TEST001',
        ...overrides
      })
      .returning()
      .execute();
    return result[0];
  };

  describe('getProducts', () => {
    it('should return empty array when no products exist', async () => {
      const result = await getProducts();
      expect(result).toEqual([]);
    });

    it('should return all products with correct data types', async () => {
      // Create test data
      const category = await createTestCategory();
      await createTestProduct(category.id);
      await createTestProduct(category.id, {
        name: 'Product 2',
        price: '29.99',
        sku: 'TEST002'
      });

      const result = await getProducts();

      expect(result).toHaveLength(2);
      
      // Verify first product
      const product1 = result.find(p => p.name === 'Test Product');
      expect(product1).toBeDefined();
      expect(product1!.name).toEqual('Test Product');
      expect(product1!.description).toEqual('A test product');
      expect(product1!.price).toEqual(19.99);
      expect(typeof product1!.price).toBe('number');
      expect(product1!.category_id).toEqual(category.id);
      expect(product1!.stock_quantity).toEqual(100);
      expect(product1!.sku).toEqual('TEST001');
      expect(product1!.id).toBeDefined();
      expect(product1!.created_at).toBeInstanceOf(Date);
      expect(product1!.updated_at).toBeInstanceOf(Date);

      // Verify second product
      const product2 = result.find(p => p.name === 'Product 2');
      expect(product2).toBeDefined();
      expect(product2!.price).toEqual(29.99);
      expect(typeof product2!.price).toBe('number');
      expect(product2!.sku).toEqual('TEST002');
    });

    it('should handle products with null description and sku', async () => {
      const category = await createTestCategory();
      await createTestProduct(category.id, {
        description: null,
        sku: null
      });

      const result = await getProducts();

      expect(result).toHaveLength(1);
      expect(result[0].description).toBeNull();
      expect(result[0].sku).toBeNull();
      expect(result[0].price).toEqual(19.99);
      expect(typeof result[0].price).toBe('number');
    });

    it('should return products from multiple categories', async () => {
      const category1 = await createTestCategory('Electronics');
      const category2 = await createTestCategory('Books');
      
      await createTestProduct(category1.id, { name: 'Laptop' });
      await createTestProduct(category2.id, { name: 'Novel' });

      const result = await getProducts();

      expect(result).toHaveLength(2);
      expect(result.find(p => p.name === 'Laptop')).toBeDefined();
      expect(result.find(p => p.name === 'Novel')).toBeDefined();
    });
  });

  describe('getProductsByCategory', () => {
    it('should return empty array for non-existent category', async () => {
      const result = await getProductsByCategory(999);
      expect(result).toEqual([]);
    });

    it('should return empty array for category with no products', async () => {
      const category = await createTestCategory();
      const result = await getProductsByCategory(category.id);
      expect(result).toEqual([]);
    });

    it('should return only products from specified category', async () => {
      const category1 = await createTestCategory('Electronics');
      const category2 = await createTestCategory('Books');
      
      await createTestProduct(category1.id, { name: 'Laptop' });
      await createTestProduct(category1.id, { name: 'Phone' });
      await createTestProduct(category2.id, { name: 'Novel' });

      const result = await getProductsByCategory(category1.id);

      expect(result).toHaveLength(2);
      expect(result.every(p => p.category_id === category1.id)).toBe(true);
      expect(result.find(p => p.name === 'Laptop')).toBeDefined();
      expect(result.find(p => p.name === 'Phone')).toBeDefined();
      expect(result.find(p => p.name === 'Novel')).toBeUndefined();
    });

    it('should convert numeric fields correctly', async () => {
      const category = await createTestCategory();
      await createTestProduct(category.id, { price: '99.99' });

      const result = await getProductsByCategory(category.id);

      expect(result).toHaveLength(1);
      expect(result[0].price).toEqual(99.99);
      expect(typeof result[0].price).toBe('number');
    });

    it('should handle multiple products with different prices', async () => {
      const category = await createTestCategory();
      await createTestProduct(category.id, { name: 'Cheap Item', price: '5.50' });
      await createTestProduct(category.id, { name: 'Expensive Item', price: '199.99' });

      const result = await getProductsByCategory(category.id);

      expect(result).toHaveLength(2);
      const cheapItem = result.find(p => p.name === 'Cheap Item');
      const expensiveItem = result.find(p => p.name === 'Expensive Item');
      
      expect(cheapItem!.price).toEqual(5.50);
      expect(expensiveItem!.price).toEqual(199.99);
      expect(typeof cheapItem!.price).toBe('number');
      expect(typeof expensiveItem!.price).toBe('number');
    });
  });

  describe('getProduct', () => {
    it('should return null for non-existent product', async () => {
      const result = await getProduct(999);
      expect(result).toBeNull();
    });

    it('should return specific product by id', async () => {
      const category = await createTestCategory();
      const createdProduct = await createTestProduct(category.id, {
        name: 'Unique Product',
        price: '45.67',
        sku: 'UNIQUE001'
      });

      const result = await getProduct(createdProduct.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdProduct.id);
      expect(result!.name).toEqual('Unique Product');
      expect(result!.price).toEqual(45.67);
      expect(typeof result!.price).toBe('number');
      expect(result!.sku).toEqual('UNIQUE001');
      expect(result!.category_id).toEqual(category.id);
      expect(result!.created_at).toBeInstanceOf(Date);
      expect(result!.updated_at).toBeInstanceOf(Date);
    });

    it('should return correct product when multiple products exist', async () => {
      const category = await createTestCategory();
      const product1 = await createTestProduct(category.id, { name: 'Product 1' });
      const product2 = await createTestProduct(category.id, { name: 'Product 2' });
      const product3 = await createTestProduct(category.id, { name: 'Product 3' });

      const result = await getProduct(product2.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(product2.id);
      expect(result!.name).toEqual('Product 2');
      expect(result!.id).not.toEqual(product1.id);
      expect(result!.id).not.toEqual(product3.id);
    });

    it('should handle product with null optional fields', async () => {
      const category = await createTestCategory();
      const createdProduct = await createTestProduct(category.id, {
        description: null,
        sku: null
      });

      const result = await getProduct(createdProduct.id);

      expect(result).not.toBeNull();
      expect(result!.description).toBeNull();
      expect(result!.sku).toBeNull();
      expect(result!.price).toEqual(19.99);
      expect(typeof result!.price).toBe('number');
    });

    it('should verify product exists in database', async () => {
      const category = await createTestCategory();
      const createdProduct = await createTestProduct(category.id);

      const result = await getProduct(createdProduct.id);

      // Verify the product actually exists in database
      const dbProducts = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, createdProduct.id))
        .execute();

      expect(dbProducts).toHaveLength(1);
      expect(result!.id).toEqual(dbProducts[0].id);
      expect(result!.name).toEqual(dbProducts[0].name);
    });
  });
});