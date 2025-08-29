import { db } from '../db';
import { productsTable } from '../db/schema';
import { type UpdateStockInput, type Product } from '../schema';
import { eq } from 'drizzle-orm';

export const updateStock = async (input: UpdateStockInput): Promise<Product> => {
  try {
    // First, get the current product to calculate new stock quantity
    const currentProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.product_id))
      .execute();

    if (currentProducts.length === 0) {
      throw new Error(`Product with id ${input.product_id} not found`);
    }

    const currentProduct = currentProducts[0];
    let newStockQuantity: number;

    // Calculate new stock quantity based on operation
    switch (input.operation) {
      case 'set':
        newStockQuantity = input.quantity_change;
        break;
      case 'add':
        newStockQuantity = currentProduct.stock_quantity + input.quantity_change;
        break;
      case 'subtract':
        newStockQuantity = currentProduct.stock_quantity - input.quantity_change;
        break;
      default:
        throw new Error(`Invalid operation: ${input.operation}`);
    }

    // Prevent negative stock
    if (newStockQuantity < 0) {
      throw new Error('Stock quantity cannot be negative');
    }

    // Update the product stock and updated_at timestamp
    const result = await db.update(productsTable)
      .set({
        stock_quantity: newStockQuantity,
        updated_at: new Date()
      })
      .where(eq(productsTable.id, input.product_id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const updatedProduct = result[0];
    return {
      ...updatedProduct,
      price: parseFloat(updatedProduct.price)
    };
  } catch (error) {
    console.error('Stock update failed:', error);
    throw error;
  }
};