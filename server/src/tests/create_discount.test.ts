import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { discountsTable } from '../db/schema';
import { type CreateDiscountInput } from '../schema';
import { createDiscount } from '../handlers/create_discount';
import { eq } from 'drizzle-orm';

// Test inputs
const percentageDiscountInput: CreateDiscountInput = {
  name: 'Holiday Sale',
  type: 'percentage',
  value: 15.5,
  is_active: true
};

const fixedDiscountInput: CreateDiscountInput = {
  name: 'Fixed Amount Off',
  type: 'fixed',
  value: 25.00,
  is_active: false
};

const minimalDiscountInput: CreateDiscountInput = {
  name: 'Basic Discount',
  type: 'percentage',
  value: 10
  // is_active not provided - should default to true
};

describe('createDiscount', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a percentage discount', async () => {
    const result = await createDiscount(percentageDiscountInput);

    // Basic field validation
    expect(result.name).toEqual('Holiday Sale');
    expect(result.type).toEqual('percentage');
    expect(result.value).toEqual(15.5);
    expect(typeof result.value).toBe('number');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a fixed discount', async () => {
    const result = await createDiscount(fixedDiscountInput);

    // Basic field validation
    expect(result.name).toEqual('Fixed Amount Off');
    expect(result.type).toEqual('fixed');
    expect(result.value).toEqual(25.00);
    expect(typeof result.value).toBe('number');
    expect(result.is_active).toBe(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should apply default is_active value when not provided', async () => {
    const result = await createDiscount(minimalDiscountInput);

    expect(result.name).toEqual('Basic Discount');
    expect(result.type).toEqual('percentage');
    expect(result.value).toEqual(10);
    expect(result.is_active).toBe(true); // Should default to true
    expect(result.id).toBeDefined();
  });

  it('should save discount to database', async () => {
    const result = await createDiscount(percentageDiscountInput);

    // Query using proper drizzle syntax
    const discounts = await db.select()
      .from(discountsTable)
      .where(eq(discountsTable.id, result.id))
      .execute();

    expect(discounts).toHaveLength(1);
    const savedDiscount = discounts[0];
    expect(savedDiscount.name).toEqual('Holiday Sale');
    expect(savedDiscount.type).toEqual('percentage');
    expect(parseFloat(savedDiscount.value)).toEqual(15.5);
    expect(savedDiscount.is_active).toBe(true);
    expect(savedDiscount.created_at).toBeInstanceOf(Date);
    expect(savedDiscount.updated_at).toBeInstanceOf(Date);
  });

  it('should reject percentage discount over 100%', async () => {
    const invalidInput: CreateDiscountInput = {
      name: 'Invalid Percentage',
      type: 'percentage',
      value: 150, // Invalid - over 100%
      is_active: true
    };

    await expect(createDiscount(invalidInput))
      .rejects
      .toThrow(/percentage discount value cannot exceed 100/i);
  });

  it('should allow fixed discount over 100', async () => {
    const validFixedInput: CreateDiscountInput = {
      name: 'Large Fixed Discount',
      type: 'fixed',
      value: 250.00, // Valid for fixed type
      is_active: true
    };

    const result = await createDiscount(validFixedInput);

    expect(result.name).toEqual('Large Fixed Discount');
    expect(result.type).toEqual('fixed');
    expect(result.value).toEqual(250.00);
    expect(typeof result.value).toBe('number');
    expect(result.is_active).toBe(true);
  });

  it('should allow 100% discount for percentage type', async () => {
    const maxPercentageInput: CreateDiscountInput = {
      name: 'Free Item',
      type: 'percentage',
      value: 100, // Edge case - exactly 100% should be allowed
      is_active: true
    };

    const result = await createDiscount(maxPercentageInput);

    expect(result.name).toEqual('Free Item');
    expect(result.type).toEqual('percentage');
    expect(result.value).toEqual(100);
    expect(result.is_active).toBe(true);
  });

  it('should handle decimal values correctly', async () => {
    const decimalInput: CreateDiscountInput = {
      name: 'Precise Discount',
      type: 'percentage',
      value: 12.75,
      is_active: true
    };

    const result = await createDiscount(decimalInput);

    expect(result.value).toEqual(12.75);
    expect(typeof result.value).toBe('number');

    // Verify in database
    const saved = await db.select()
      .from(discountsTable)
      .where(eq(discountsTable.id, result.id))
      .execute();

    expect(parseFloat(saved[0].value)).toEqual(12.75);
  });

  it('should create multiple discounts with different configurations', async () => {
    const discount1 = await createDiscount({
      name: 'Summer Sale',
      type: 'percentage',
      value: 20,
      is_active: true
    });

    const discount2 = await createDiscount({
      name: 'Loyalty Reward',
      type: 'fixed',
      value: 50,
      is_active: false
    });

    // Verify both exist in database
    const allDiscounts = await db.select()
      .from(discountsTable)
      .execute();

    expect(allDiscounts).toHaveLength(2);
    
    const discountNames = allDiscounts.map(d => d.name);
    expect(discountNames).toContain('Summer Sale');
    expect(discountNames).toContain('Loyalty Reward');

    // Verify different IDs
    expect(discount1.id).not.toEqual(discount2.id);
  });
});