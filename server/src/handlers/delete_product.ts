import { db } from '../db';
import { productsTable, saleItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteProduct(productId: number): Promise<{ success: boolean }> {
  try {
    // First check if the product exists
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    if (existingProduct.length === 0) {
      throw new Error(`Product with id ${productId} not found`);
    }

    // Check if the product is referenced in any sale items
    const saleItems = await db.select()
      .from(saleItemsTable)
      .where(eq(saleItemsTable.product_id, productId))
      .execute();

    if (saleItems.length > 0) {
      throw new Error(`Cannot delete product with id ${productId} as it is referenced in existing sales`);
    }

    // Delete the product
    await db.delete(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Product deletion failed:', error);
    throw error;
  }
}