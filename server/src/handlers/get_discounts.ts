import { db } from '../db';
import { discountsTable } from '../db/schema';
import { type Discount } from '../schema';
import { eq } from 'drizzle-orm';

export async function getDiscounts(): Promise<Discount[]> {
  try {
    const results = await db.select()
      .from(discountsTable)
      .execute();

    // Convert numeric fields back to numbers for return
    return results.map(discount => ({
      ...discount,
      value: parseFloat(discount.value)
    }));
  } catch (error) {
    console.error('Failed to fetch discounts:', error);
    throw error;
  }
}

export async function getActiveDiscounts(): Promise<Discount[]> {
  try {
    const results = await db.select()
      .from(discountsTable)
      .where(eq(discountsTable.is_active, true))
      .execute();

    // Convert numeric fields back to numbers for return
    return results.map(discount => ({
      ...discount,
      value: parseFloat(discount.value)
    }));
  } catch (error) {
    console.error('Failed to fetch active discounts:', error);
    throw error;
  }
}