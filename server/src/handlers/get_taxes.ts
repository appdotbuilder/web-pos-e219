import { db } from '../db';
import { taxesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Tax } from '../schema';

export async function getTaxes(): Promise<Tax[]> {
  try {
    const results = await db.select()
      .from(taxesTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(tax => ({
      ...tax,
      rate: parseFloat(tax.rate)
    }));
  } catch (error) {
    console.error('Failed to fetch taxes:', error);
    throw error;
  }
}

export async function getActiveTaxes(): Promise<Tax[]> {
  try {
    const results = await db.select()
      .from(taxesTable)
      .where(eq(taxesTable.is_active, true))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(tax => ({
      ...tax,
      rate: parseFloat(tax.rate)
    }));
  } catch (error) {
    console.error('Failed to fetch active taxes:', error);
    throw error;
  }
}