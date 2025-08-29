import { db } from '../db';
import { salesTable } from '../db/schema';
import { type Sale } from '../schema';
import { eq, gte, lte, and, desc } from 'drizzle-orm';

export async function getSales(): Promise<Sale[]> {
  try {
    const results = await db.select()
      .from(salesTable)
      .orderBy(desc(salesTable.created_at))
      .execute();

    // Convert numeric fields from string to number
    return results.map(sale => ({
      ...sale,
      subtotal: parseFloat(sale.subtotal),
      tax_amount: parseFloat(sale.tax_amount),
      discount_amount: parseFloat(sale.discount_amount),
      total_amount: parseFloat(sale.total_amount)
    }));
  } catch (error) {
    console.error('Failed to fetch sales:', error);
    throw error;
  }
}

export async function getSaleById(saleId: number): Promise<Sale | null> {
  try {
    const results = await db.select()
      .from(salesTable)
      .where(eq(salesTable.id, saleId))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const sale = results[0];
    return {
      ...sale,
      subtotal: parseFloat(sale.subtotal),
      tax_amount: parseFloat(sale.tax_amount),
      discount_amount: parseFloat(sale.discount_amount),
      total_amount: parseFloat(sale.total_amount)
    };
  } catch (error) {
    console.error('Failed to fetch sale by ID:', error);
    throw error;
  }
}

export async function getSalesByStaff(staffId: number): Promise<Sale[]> {
  try {
    const results = await db.select()
      .from(salesTable)
      .where(eq(salesTable.staff_id, staffId))
      .orderBy(desc(salesTable.created_at))
      .execute();

    // Convert numeric fields from string to number
    return results.map(sale => ({
      ...sale,
      subtotal: parseFloat(sale.subtotal),
      tax_amount: parseFloat(sale.tax_amount),
      discount_amount: parseFloat(sale.discount_amount),
      total_amount: parseFloat(sale.total_amount)
    }));
  } catch (error) {
    console.error('Failed to fetch sales by staff:', error);
    throw error;
  }
}

export async function getSalesByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
  try {
    const results = await db.select()
      .from(salesTable)
      .where(and(
        gte(salesTable.created_at, startDate),
        lte(salesTable.created_at, endDate)
      ))
      .orderBy(desc(salesTable.created_at))
      .execute();

    // Convert numeric fields from string to number
    return results.map(sale => ({
      ...sale,
      subtotal: parseFloat(sale.subtotal),
      tax_amount: parseFloat(sale.tax_amount),
      discount_amount: parseFloat(sale.discount_amount),
      total_amount: parseFloat(sale.total_amount)
    }));
  } catch (error) {
    console.error('Failed to fetch sales by date range:', error);
    throw error;
  }
}