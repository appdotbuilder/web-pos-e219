import { db } from '../db';
import { staffTable } from '../db/schema';
import { type UpdateStaffInput, type Staff } from '../schema';
import { eq, and, ne } from 'drizzle-orm';

export const updateStaff = async (input: UpdateStaffInput): Promise<Staff> => {
  try {
    // First, check if the staff member exists
    const existingStaff = await db.select()
      .from(staffTable)
      .where(eq(staffTable.id, input.id))
      .execute();

    if (existingStaff.length === 0) {
      throw new Error(`Staff member with ID ${input.id} not found`);
    }

    // If email is being updated, check for uniqueness
    if (input.email) {
      const emailExists = await db.select()
        .from(staffTable)
        .where(and(
          eq(staffTable.email, input.email),
          ne(staffTable.id, input.id)
        ))
        .execute();

      if (emailExists.length > 0) {
        throw new Error(`Email ${input.email} is already in use by another staff member`);
      }
    }

    // Build the update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.email !== undefined) {
      updateData.email = input.email;
    }
    if (input.role !== undefined) {
      updateData.role = input.role;
    }
    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }

    // Update the staff member
    const result = await db.update(staffTable)
      .set(updateData)
      .where(eq(staffTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Staff update failed:', error);
    throw error;
  }
};