import { db } from '../db';
import { staffTable } from '../db/schema';
import { type Staff } from '../schema';
import { eq } from 'drizzle-orm';

export async function getStaff(): Promise<Staff[]> {
  try {
    const results = await db.select()
      .from(staffTable)
      .execute();

    // No numeric field conversions needed for staff table
    return results;
  } catch (error) {
    console.error('Failed to fetch staff:', error);
    throw error;
  }
}

export async function getStaffById(staffId: number): Promise<Staff | null> {
  try {
    const results = await db.select()
      .from(staffTable)
      .where(eq(staffTable.id, staffId))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch staff by ID:', error);
    throw error;
  }
}

export async function getActiveStaff(): Promise<Staff[]> {
  try {
    const results = await db.select()
      .from(staffTable)
      .where(eq(staffTable.is_active, true))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch active staff:', error);
    throw error;
  }
}