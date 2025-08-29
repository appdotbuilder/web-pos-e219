import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { staffTable } from '../db/schema';
import { type UpdateStaffInput, type CreateStaffInput } from '../schema';
import { updateStaff } from '../handlers/update_staff';
import { eq } from 'drizzle-orm';

// Helper function to create a test staff member
const createTestStaff = async (data: CreateStaffInput) => {
  const result = await db.insert(staffTable)
    .values({
      name: data.name,
      email: data.email,
      role: data.role,
      is_active: data.is_active ?? true
    })
    .returning()
    .execute();
  
  return result[0];
};

// Test data
const testStaffData: CreateStaffInput = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  role: 'cashier',
  is_active: true
};

const anotherStaffData: CreateStaffInput = {
  name: 'Jane Smith',
  email: 'jane.smith@example.com',
  role: 'manager',
  is_active: true
};

describe('updateStaff', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update staff name', async () => {
    const staff = await createTestStaff(testStaffData);
    
    const updateInput: UpdateStaffInput = {
      id: staff.id,
      name: 'John Updated'
    };

    const result = await updateStaff(updateInput);

    expect(result.id).toEqual(staff.id);
    expect(result.name).toEqual('John Updated');
    expect(result.email).toEqual(testStaffData.email);
    expect(result.role).toEqual(testStaffData.role);
    expect(result.is_active).toEqual(true);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > staff.updated_at).toBe(true);
  });

  it('should update staff email', async () => {
    const staff = await createTestStaff(testStaffData);
    
    const updateInput: UpdateStaffInput = {
      id: staff.id,
      email: 'john.updated@example.com'
    };

    const result = await updateStaff(updateInput);

    expect(result.id).toEqual(staff.id);
    expect(result.name).toEqual(testStaffData.name);
    expect(result.email).toEqual('john.updated@example.com');
    expect(result.role).toEqual(testStaffData.role);
    expect(result.is_active).toEqual(true);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update staff role', async () => {
    const staff = await createTestStaff(testStaffData);
    
    const updateInput: UpdateStaffInput = {
      id: staff.id,
      role: 'admin'
    };

    const result = await updateStaff(updateInput);

    expect(result.id).toEqual(staff.id);
    expect(result.name).toEqual(testStaffData.name);
    expect(result.email).toEqual(testStaffData.email);
    expect(result.role).toEqual('admin');
    expect(result.is_active).toEqual(true);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update staff active status', async () => {
    const staff = await createTestStaff(testStaffData);
    
    const updateInput: UpdateStaffInput = {
      id: staff.id,
      is_active: false
    };

    const result = await updateStaff(updateInput);

    expect(result.id).toEqual(staff.id);
    expect(result.name).toEqual(testStaffData.name);
    expect(result.email).toEqual(testStaffData.email);
    expect(result.role).toEqual(testStaffData.role);
    expect(result.is_active).toEqual(false);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const staff = await createTestStaff(testStaffData);
    
    const updateInput: UpdateStaffInput = {
      id: staff.id,
      name: 'John Multi Update',
      email: 'john.multi@example.com',
      role: 'manager',
      is_active: false
    };

    const result = await updateStaff(updateInput);

    expect(result.id).toEqual(staff.id);
    expect(result.name).toEqual('John Multi Update');
    expect(result.email).toEqual('john.multi@example.com');
    expect(result.role).toEqual('manager');
    expect(result.is_active).toEqual(false);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > staff.updated_at).toBe(true);
  });

  it('should save changes to database', async () => {
    const staff = await createTestStaff(testStaffData);
    
    const updateInput: UpdateStaffInput = {
      id: staff.id,
      name: 'Database Update Test',
      role: 'admin'
    };

    await updateStaff(updateInput);

    // Verify changes were saved to database
    const updatedStaff = await db.select()
      .from(staffTable)
      .where(eq(staffTable.id, staff.id))
      .execute();

    expect(updatedStaff).toHaveLength(1);
    expect(updatedStaff[0].name).toEqual('Database Update Test');
    expect(updatedStaff[0].role).toEqual('admin');
    expect(updatedStaff[0].email).toEqual(testStaffData.email);
    expect(updatedStaff[0].updated_at).toBeInstanceOf(Date);
    expect(updatedStaff[0].updated_at > staff.updated_at).toBe(true);
  });

  it('should throw error when staff member not found', async () => {
    const updateInput: UpdateStaffInput = {
      id: 99999,
      name: 'Non Existent'
    };

    await expect(updateStaff(updateInput)).rejects.toThrow(/staff member with id 99999 not found/i);
  });

  it('should throw error when email already exists for another staff member', async () => {
    // Create first staff member
    const staff1 = await createTestStaff(testStaffData);
    
    // Create second staff member  
    const staff2 = await createTestStaff(anotherStaffData);

    // Try to update second staff member with first staff member's email
    const updateInput: UpdateStaffInput = {
      id: staff2.id,
      email: staff1.email
    };

    await expect(updateStaff(updateInput)).rejects.toThrow(/email .+ is already in use/i);
  });

  it('should allow updating staff member with same email (no change)', async () => {
    const staff = await createTestStaff(testStaffData);
    
    const updateInput: UpdateStaffInput = {
      id: staff.id,
      email: staff.email, // Same email
      name: 'Updated Name'
    };

    const result = await updateStaff(updateInput);

    expect(result.id).toEqual(staff.id);
    expect(result.name).toEqual('Updated Name');
    expect(result.email).toEqual(staff.email);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should preserve unchanged fields', async () => {
    const staff = await createTestStaff(testStaffData);
    
    // Only update name
    const updateInput: UpdateStaffInput = {
      id: staff.id,
      name: 'Only Name Changed'
    };

    const result = await updateStaff(updateInput);

    // All other fields should remain the same
    expect(result.id).toEqual(staff.id);
    expect(result.name).toEqual('Only Name Changed');
    expect(result.email).toEqual(staff.email);
    expect(result.role).toEqual(staff.role);
    expect(result.is_active).toEqual(staff.is_active);
    expect(result.created_at).toEqual(staff.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > staff.updated_at).toBe(true);
  });
});