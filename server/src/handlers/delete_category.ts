import { db } from '../db';
import { categoriesTable, productsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteCategory(categoryId: number): Promise<{ success: boolean }> {
  try {
    // First, check if the category exists
    const categoryExists = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .limit(1)
      .execute();

    if (categoryExists.length === 0) {
      throw new Error('Category not found');
    }

    // Check if there are any products associated with this category
    const associatedProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.category_id, categoryId))
      .limit(1)
      .execute();

    if (associatedProducts.length > 0) {
      throw new Error('Cannot delete category with associated products');
    }

    // Delete the category
    const result = await db.delete(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Category deletion failed:', error);
    throw error;
  }
}