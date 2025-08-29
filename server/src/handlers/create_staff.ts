import { db } from '../db';
import { staffTable } from '../db/schema';
import { type CreateStaffInput, type Staff } from '../schema';
import { eq } from 'drizzle-orm';

export const createStaff = async (input: CreateStaffInput): Promise<Staff> => {
  try {
    // Check if email already exists
    const existingStaff = await db.select()
      .from(staffTable)
      .where(eq(staffTable.email, input.email))
      .limit(1)
      .execute();

    if (existingStaff.length > 0) {
      throw new Error('Staff member with this email already exists');
    }

    // Insert staff record with proper defaults
    const result = await db.insert(staffTable)
      .values({
        name: input.name,
        email: input.email,
        role: input.role,
        is_active: input.is_active ?? true // Apply default if not provided
      })
      .returning()
      .execute();

    const staff = result[0];
    return {
      ...staff,
      // No numeric conversions needed for this table - all fields are proper types
    };
  } catch (error) {
    console.error('Staff creation failed:', error);
    throw error;
  }
};