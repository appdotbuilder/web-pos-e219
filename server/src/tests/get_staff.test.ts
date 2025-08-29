import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { staffTable } from '../db/schema';
import { type CreateStaffInput } from '../schema';
import { getStaff, getStaffById, getActiveStaff } from '../handlers/get_staff';

// Test data
const testStaff: CreateStaffInput[] = [
  {
    name: 'John Admin',
    email: 'john@example.com',
    role: 'admin',
    is_active: true
  },
  {
    name: 'Jane Cashier',
    email: 'jane@example.com',
    role: 'cashier',
    is_active: true
  },
  {
    name: 'Bob Manager',
    email: 'bob@example.com',
    role: 'manager',
    is_active: false
  }
];

describe('getStaff', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no staff exist', async () => {
    const result = await getStaff();
    expect(result).toHaveLength(0);
  });

  it('should return all staff members', async () => {
    // Create test staff
    await db.insert(staffTable)
      .values(testStaff)
      .execute();

    const result = await getStaff();

    expect(result).toHaveLength(3);
    
    // Verify all staff are returned
    const names = result.map(staff => staff.name).sort();
    expect(names).toEqual(['Bob Manager', 'Jane Cashier', 'John Admin']);
  });

  it('should return staff with all correct properties', async () => {
    await db.insert(staffTable)
      .values([testStaff[0]])
      .execute();

    const result = await getStaff();

    expect(result).toHaveLength(1);
    const staff = result[0];

    expect(staff.name).toBe('John Admin');
    expect(staff.email).toBe('john@example.com');
    expect(staff.role).toBe('admin');
    expect(staff.is_active).toBe(true);
    expect(staff.id).toBeDefined();
    expect(staff.created_at).toBeInstanceOf(Date);
    expect(staff.updated_at).toBeInstanceOf(Date);
  });
});

describe('getStaffById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when staff does not exist', async () => {
    const result = await getStaffById(999);
    expect(result).toBe(null);
  });

  it('should return staff member when found', async () => {
    // Create test staff
    const insertResult = await db.insert(staffTable)
      .values([testStaff[0]])
      .returning()
      .execute();

    const staffId = insertResult[0].id;
    const result = await getStaffById(staffId);

    expect(result).not.toBe(null);
    expect(result!.id).toBe(staffId);
    expect(result!.name).toBe('John Admin');
    expect(result!.email).toBe('john@example.com');
    expect(result!.role).toBe('admin');
    expect(result!.is_active).toBe(true);
  });

  it('should return correct staff member when multiple exist', async () => {
    // Create multiple staff members
    const insertResult = await db.insert(staffTable)
      .values(testStaff)
      .returning()
      .execute();

    const targetStaff = insertResult[1]; // Jane Cashier
    const result = await getStaffById(targetStaff.id);

    expect(result).not.toBe(null);
    expect(result!.id).toBe(targetStaff.id);
    expect(result!.name).toBe('Jane Cashier');
    expect(result!.role).toBe('cashier');
  });
});

describe('getActiveStaff', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no active staff exist', async () => {
    // Create only inactive staff
    await db.insert(staffTable)
      .values([{
        name: 'Inactive User',
        email: 'inactive@example.com',
        role: 'cashier',
        is_active: false
      }])
      .execute();

    const result = await getActiveStaff();
    expect(result).toHaveLength(0);
  });

  it('should return only active staff members', async () => {
    // Create mix of active and inactive staff
    await db.insert(staffTable)
      .values(testStaff)
      .execute();

    const result = await getActiveStaff();

    expect(result).toHaveLength(2);
    
    // All returned staff should be active
    result.forEach(staff => {
      expect(staff.is_active).toBe(true);
    });

    // Verify correct staff are returned
    const names = result.map(staff => staff.name).sort();
    expect(names).toEqual(['Jane Cashier', 'John Admin']);
  });

  it('should return all staff when all are active', async () => {
    // Create all active staff
    const allActiveStaff = testStaff.map(staff => ({
      ...staff,
      is_active: true
    }));

    await db.insert(staffTable)
      .values(allActiveStaff)
      .execute();

    const result = await getActiveStaff();

    expect(result).toHaveLength(3);
    result.forEach(staff => {
      expect(staff.is_active).toBe(true);
    });
  });

  it('should return staff with all correct properties', async () => {
    await db.insert(staffTable)
      .values([testStaff[0]])
      .execute();

    const result = await getActiveStaff();

    expect(result).toHaveLength(1);
    const staff = result[0];

    expect(staff.name).toBe('John Admin');
    expect(staff.email).toBe('john@example.com');
    expect(staff.role).toBe('admin');
    expect(staff.is_active).toBe(true);
    expect(staff.id).toBeDefined();
    expect(staff.created_at).toBeInstanceOf(Date);
    expect(staff.updated_at).toBeInstanceOf(Date);
  });
});