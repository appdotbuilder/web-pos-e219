import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { discountsTable } from '../db/schema';
import { getDiscounts, getActiveDiscounts } from '../handlers/get_discounts';

describe('getDiscounts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no discounts exist', async () => {
    const result = await getDiscounts();
    expect(result).toEqual([]);
  });

  it('should return all discounts', async () => {
    // Create test discounts
    await db.insert(discountsTable).values([
      {
        name: 'Active Percentage Discount',
        type: 'percentage',
        value: '10.00',
        is_active: true
      },
      {
        name: 'Inactive Fixed Discount',
        type: 'fixed',
        value: '5.50',
        is_active: false
      }
    ]).execute();

    const result = await getDiscounts();

    expect(result).toHaveLength(2);
    
    // Check first discount
    const activeDiscount = result.find(d => d.name === 'Active Percentage Discount');
    expect(activeDiscount).toBeDefined();
    expect(activeDiscount?.type).toBe('percentage');
    expect(activeDiscount?.value).toBe(10.00);
    expect(typeof activeDiscount?.value).toBe('number');
    expect(activeDiscount?.is_active).toBe(true);
    expect(activeDiscount?.id).toBeDefined();
    expect(activeDiscount?.created_at).toBeInstanceOf(Date);
    expect(activeDiscount?.updated_at).toBeInstanceOf(Date);

    // Check second discount
    const inactiveDiscount = result.find(d => d.name === 'Inactive Fixed Discount');
    expect(inactiveDiscount).toBeDefined();
    expect(inactiveDiscount?.type).toBe('fixed');
    expect(inactiveDiscount?.value).toBe(5.50);
    expect(typeof inactiveDiscount?.value).toBe('number');
    expect(inactiveDiscount?.is_active).toBe(false);
  });

  it('should handle multiple discounts with different types', async () => {
    // Create various discount types
    await db.insert(discountsTable).values([
      {
        name: '15% Off Everything',
        type: 'percentage',
        value: '15.00',
        is_active: true
      },
      {
        name: '$20 Off Purchase',
        type: 'fixed',
        value: '20.00',
        is_active: true
      },
      {
        name: 'Expired 25% Off',
        type: 'percentage',
        value: '25.00',
        is_active: false
      }
    ]).execute();

    const result = await getDiscounts();

    expect(result).toHaveLength(3);
    
    // Verify percentage discount
    const percentageDiscount = result.find(d => d.name === '15% Off Everything');
    expect(percentageDiscount?.type).toBe('percentage');
    expect(percentageDiscount?.value).toBe(15.00);
    expect(percentageDiscount?.is_active).toBe(true);

    // Verify fixed discount
    const fixedDiscount = result.find(d => d.name === '$20 Off Purchase');
    expect(fixedDiscount?.type).toBe('fixed');
    expect(fixedDiscount?.value).toBe(20.00);
    expect(fixedDiscount?.is_active).toBe(true);

    // Verify inactive discount
    const expiredDiscount = result.find(d => d.name === 'Expired 25% Off');
    expect(expiredDiscount?.type).toBe('percentage');
    expect(expiredDiscount?.value).toBe(25.00);
    expect(expiredDiscount?.is_active).toBe(false);
  });
});

describe('getActiveDiscounts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no active discounts exist', async () => {
    // Create only inactive discounts
    await db.insert(discountsTable).values({
      name: 'Inactive Discount',
      type: 'percentage',
      value: '10.00',
      is_active: false
    }).execute();

    const result = await getActiveDiscounts();
    expect(result).toEqual([]);
  });

  it('should return only active discounts', async () => {
    // Create both active and inactive discounts
    await db.insert(discountsTable).values([
      {
        name: 'Active Discount 1',
        type: 'percentage',
        value: '10.00',
        is_active: true
      },
      {
        name: 'Inactive Discount',
        type: 'fixed',
        value: '5.00',
        is_active: false
      },
      {
        name: 'Active Discount 2',
        type: 'fixed',
        value: '15.50',
        is_active: true
      }
    ]).execute();

    const result = await getActiveDiscounts();

    expect(result).toHaveLength(2);
    
    // Verify all returned discounts are active
    result.forEach(discount => {
      expect(discount.is_active).toBe(true);
    });

    // Check specific discounts
    const activeNames = result.map(d => d.name);
    expect(activeNames).toContain('Active Discount 1');
    expect(activeNames).toContain('Active Discount 2');
    expect(activeNames).not.toContain('Inactive Discount');
  });

  it('should return all active discounts with correct numeric conversion', async () => {
    // Create active discounts with various values
    await db.insert(discountsTable).values([
      {
        name: 'Student Discount',
        type: 'percentage',
        value: '12.50',
        is_active: true
      },
      {
        name: 'Senior Discount',
        type: 'fixed',
        value: '7.25',
        is_active: true
      }
    ]).execute();

    const result = await getActiveDiscounts();

    expect(result).toHaveLength(2);

    const studentDiscount = result.find(d => d.name === 'Student Discount');
    expect(studentDiscount?.value).toBe(12.50);
    expect(typeof studentDiscount?.value).toBe('number');
    expect(studentDiscount?.type).toBe('percentage');
    expect(studentDiscount?.is_active).toBe(true);
    expect(studentDiscount?.id).toBeDefined();
    expect(studentDiscount?.created_at).toBeInstanceOf(Date);
    expect(studentDiscount?.updated_at).toBeInstanceOf(Date);

    const seniorDiscount = result.find(d => d.name === 'Senior Discount');
    expect(seniorDiscount?.value).toBe(7.25);
    expect(typeof seniorDiscount?.value).toBe('number');
    expect(seniorDiscount?.type).toBe('fixed');
    expect(seniorDiscount?.is_active).toBe(true);
  });

  it('should handle edge case with zero value active discount', async () => {
    await db.insert(discountsTable).values({
      name: 'Zero Discount',
      type: 'fixed',
      value: '0.00',
      is_active: true
    }).execute();

    const result = await getActiveDiscounts();

    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(0.00);
    expect(typeof result[0].value).toBe('number');
    expect(result[0].is_active).toBe(true);
  });
});