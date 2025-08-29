import { db } from '../db';
import { printersTable } from '../db/schema';
import { type CreatePrinterInput, type Printer } from '../schema';

export const createPrinter = async (input: CreatePrinterInput): Promise<Printer> => {
  try {
    // Insert printer record
    const result = await db.insert(printersTable)
      .values({
        name: input.name,
        ip_address: input.ip_address,
        port: input.port,
        is_active: input.is_active ?? true, // Default to true if not provided
        printer_type: input.printer_type
      })
      .returning()
      .execute();

    const printer = result[0];
    return {
      ...printer,
      // No numeric conversions needed for this table - all fields are appropriate types
    };
  } catch (error) {
    console.error('Printer creation failed:', error);
    throw error;
  }
};