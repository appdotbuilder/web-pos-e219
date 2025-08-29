import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, productsTable } from '../db/schema';
import { deleteCategory } from '../handlers/delete_category';
import { eq } from 'drizzle-orm';

describe('deleteCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully delete an existing category', async () => {
    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A category for testing deletion'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Delete the category
    const result = await deleteCategory(categoryId);

    expect(result.success).toBe(true);

    // Verify the category was actually deleted from the database
    const deletedCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(deletedCategory).toHaveLength(0);
  });

  it('should throw an error when trying to delete a non-existent category', async () => {
    const nonExistentId = 999;

    await expect(deleteCategory(nonExistentId))
      .rejects
      .toThrow(/Category not found/i);
  });

  it('should throw an error when trying to delete a category with associated products', async () => {
    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic products'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create a product associated with the category
    await db.insert(productsTable)
      .values({
        name: 'Laptop',
        description: 'Gaming laptop',
        price: '999.99',
        category_id: categoryId,
        stock_quantity: 5,
        sku: 'LAP001'
      })
      .execute();

    // Try to delete the category - should fail
    await expect(deleteCategory(categoryId))
      .rejects
      .toThrow(/Cannot delete category with associated products/i);

    // Verify the category still exists in the database
    const categoryStillExists = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categoryStillExists).toHaveLength(1);
    expect(categoryStillExists[0].name).toBe('Electronics');
  });

  it('should handle edge case with category that had products but they were deleted', async () => {
    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Temporary Category',
        description: 'Category that will have products deleted'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create and then delete a product associated with the category
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Temporary Product',
        description: 'Product to be deleted',
        price: '50.00',
        category_id: categoryId,
        stock_quantity: 1,
        sku: 'TEMP001'
      })
      .returning()
      .execute();

    // Delete the product
    await db.delete(productsTable)
      .where(eq(productsTable.id, productResult[0].id))
      .execute();

    // Now the category should be deletable
    const result = await deleteCategory(categoryId);

    expect(result.success).toBe(true);

    // Verify the category was deleted
    const deletedCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(deletedCategory).toHaveLength(0);
  });

  it('should verify database integrity after multiple category operations', async () => {
    // Create multiple categories
    const category1Result = await db.insert(categoriesTable)
      .values({
        name: 'Category 1',
        description: 'First category'
      })
      .returning()
      .execute();

    const category2Result = await db.insert(categoriesTable)
      .values({
        name: 'Category 2',
        description: 'Second category'
      })
      .returning()
      .execute();

    const category1Id = category1Result[0].id;
    const category2Id = category2Result[0].id;

    // Delete first category
    await deleteCategory(category1Id);

    // Verify first category is gone but second still exists
    const remainingCategories = await db.select()
      .from(categoriesTable)
      .execute();

    expect(remainingCategories).toHaveLength(1);
    expect(remainingCategories[0].id).toBe(category2Id);
    expect(remainingCategories[0].name).toBe('Category 2');

    // Delete second category
    await deleteCategory(category2Id);

    // Verify all categories are gone
    const allCategories = await db.select()
      .from(categoriesTable)
      .execute();

    expect(allCategories).toHaveLength(0);
  });
});