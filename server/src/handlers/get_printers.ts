import { db } from '../db';
import { printersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Printer } from '../schema';

export async function getPrinters(): Promise<Printer[]> {
  try {
    const results = await db.select()
      .from(printersTable)
      .execute();

    // Convert numeric fields to numbers (port is integer, but we apply consistent pattern)
    return results.map(printer => ({
      ...printer,
      // Note: port is integer type, not numeric, so no conversion needed
      // but keeping consistent pattern for any future numeric fields
    }));
  } catch (error) {
    console.error('Failed to fetch printers:', error);
    throw error;
  }
}

export async function getActivePrinters(): Promise<Printer[]> {
  try {
    const results = await db.select()
      .from(printersTable)
      .where(eq(printersTable.is_active, true))
      .execute();

    // Convert numeric fields to numbers (port is integer, but we apply consistent pattern)
    return results.map(printer => ({
      ...printer,
      // Note: port is integer type, not numeric, so no conversion needed
      // but keeping consistent pattern for any future numeric fields
    }));
  } catch (error) {
    console.error('Failed to fetch active printers:', error);
    throw error;
  }
}