import { db } from '../db';
import { discountsTable } from '../db/schema';
import { type CreateDiscountInput, type Discount } from '../schema';

export const createDiscount = async (input: CreateDiscountInput): Promise<Discount> => {
  try {
    // Validate percentage type constraint
    if (input.type === 'percentage' && input.value > 100) {
      throw new Error('Percentage discount value cannot exceed 100');
    }

    // Insert discount record
    const result = await db.insert(discountsTable)
      .values({
        name: input.name,
        type: input.type,
        value: input.value.toString(), // Convert number to string for numeric column
        is_active: input.is_active ?? true // Apply default if not provided
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const discount = result[0];
    return {
      ...discount,
      value: parseFloat(discount.value) // Convert string back to number
    };
  } catch (error) {
    console.error('Discount creation failed:', error);
    throw error;
  }
};