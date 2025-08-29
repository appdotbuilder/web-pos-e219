import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { staffTable } from '../db/schema';
import { type CreateStaffInput } from '../schema';
import { createStaff } from '../handlers/create_staff';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateStaffInput = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  role: 'cashier',
  is_active: true
};

describe('createStaff', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a staff member with all fields', async () => {
    const result = await createStaff(testInput);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.role).toEqual('cashier');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toEqual('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save staff member to database', async () => {
    const result = await createStaff(testInput);

    // Query database to verify persistence
    const staffMembers = await db.select()
      .from(staffTable)
      .where(eq(staffTable.id, result.id))
      .execute();

    expect(staffMembers).toHaveLength(1);
    const saved = staffMembers[0];
    expect(saved.name).toEqual('John Doe');
    expect(saved.email).toEqual('john.doe@example.com');
    expect(saved.role).toEqual('cashier');
    expect(saved.is_active).toEqual(true);
    expect(saved.created_at).toBeInstanceOf(Date);
    expect(saved.updated_at).toBeInstanceOf(Date);
  });

  it('should apply default value for is_active when not provided', async () => {
    const inputWithoutIsActive: CreateStaffInput = {
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      role: 'manager'
      // is_active is optional and not provided
    };

    const result = await createStaff(inputWithoutIsActive);

    expect(result.is_active).toEqual(true); // Should default to true
    expect(result.name).toEqual('Jane Smith');
    expect(result.email).toEqual('jane.smith@example.com');
    expect(result.role).toEqual('manager');
  });

  it('should handle different roles correctly', async () => {
    // Test admin role
    const adminInput: CreateStaffInput = {
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
      is_active: true
    };

    const adminResult = await createStaff(adminInput);
    expect(adminResult.role).toEqual('admin');

    // Test manager role
    const managerInput: CreateStaffInput = {
      name: 'Manager User',
      email: 'manager@example.com',
      role: 'manager',
      is_active: false
    };

    const managerResult = await createStaff(managerInput);
    expect(managerResult.role).toEqual('manager');
    expect(managerResult.is_active).toEqual(false);
  });

  it('should reject duplicate email addresses', async () => {
    // Create first staff member
    await createStaff(testInput);

    // Try to create another with same email
    const duplicateInput: CreateStaffInput = {
      name: 'Different Name',
      email: 'john.doe@example.com', // Same email
      role: 'admin',
      is_active: true
    };

    await expect(createStaff(duplicateInput))
      .rejects
      .toThrow(/email already exists/i);
  });

  it('should allow different emails for different staff members', async () => {
    // Create first staff member
    const first = await createStaff(testInput);

    // Create second with different email
    const secondInput: CreateStaffInput = {
      name: 'Jane Doe',
      email: 'jane.doe@example.com', // Different email
      role: 'manager',
      is_active: false
    };

    const second = await createStaff(secondInput);

    expect(first.id).not.toEqual(second.id);
    expect(first.email).toEqual('john.doe@example.com');
    expect(second.email).toEqual('jane.doe@example.com');

    // Verify both exist in database
    const allStaff = await db.select()
      .from(staffTable)
      .execute();

    expect(allStaff).toHaveLength(2);
  });

  it('should handle case-sensitive email validation', async () => {
    // Create staff with lowercase email
    await createStaff(testInput);

    // Try to create with uppercase version of same email
    const uppercaseInput: CreateStaffInput = {
      name: 'Different Name',
      email: 'JOHN.DOE@EXAMPLE.COM',
      role: 'admin',
      is_active: true
    };

    // Should succeed because database treats emails case-sensitively
    const result = await createStaff(uppercaseInput);
    expect(result.email).toEqual('JOHN.DOE@EXAMPLE.COM');
  });

  it('should preserve exact input values', async () => {
    const preciseInput: CreateStaffInput = {
      name: 'Test User with Special Characters àáâãäå',
      email: 'test.user+tag@example-domain.co.uk',
      role: 'cashier',
      is_active: false
    };

    const result = await createStaff(preciseInput);

    expect(result.name).toEqual('Test User with Special Characters àáâãäå');
    expect(result.email).toEqual('test.user+tag@example-domain.co.uk');
    expect(result.role).toEqual('cashier');
    expect(result.is_active).toEqual(false);
  });
});