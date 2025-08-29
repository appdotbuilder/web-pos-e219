import { db } from '../db';
import { taxesTable } from '../db/schema';
import { type CreateTaxInput, type Tax } from '../schema';

export const createTax = async (input: CreateTaxInput): Promise<Tax> => {
  try {
    // Insert tax record
    const result = await db.insert(taxesTable)
      .values({
        name: input.name,
        rate: input.rate.toString(), // Convert number to string for numeric column
        is_active: input.is_active ?? true // Apply default if not provided
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const tax = result[0];
    return {
      ...tax,
      rate: parseFloat(tax.rate) // Convert string back to number
    };
  } catch (error) {
    console.error('Tax creation failed:', error);
    throw error;
  }
};