import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { taxesTable } from '../db/schema';
import { type CreateTaxInput } from '../schema';
import { createTax } from '../handlers/create_tax';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateTaxInput = {
  name: 'Sales Tax',
  rate: 8.25,
  is_active: true
};

describe('createTax', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a tax', async () => {
    const result = await createTax(testInput);

    // Basic field validation
    expect(result.name).toEqual('Sales Tax');
    expect(result.rate).toEqual(8.25);
    expect(typeof result.rate).toEqual('number');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save tax to database', async () => {
    const result = await createTax(testInput);

    // Query using proper drizzle syntax
    const taxes = await db.select()
      .from(taxesTable)
      .where(eq(taxesTable.id, result.id))
      .execute();

    expect(taxes).toHaveLength(1);
    expect(taxes[0].name).toEqual('Sales Tax');
    expect(parseFloat(taxes[0].rate)).toEqual(8.25);
    expect(taxes[0].is_active).toEqual(true);
    expect(taxes[0].created_at).toBeInstanceOf(Date);
    expect(taxes[0].updated_at).toBeInstanceOf(Date);
  });

  it('should apply default is_active value when not provided', async () => {
    const inputWithoutActive: CreateTaxInput = {
      name: 'VAT Tax',
      rate: 20.0
      // is_active is optional and not provided
    };

    const result = await createTax(inputWithoutActive);

    expect(result.name).toEqual('VAT Tax');
    expect(result.rate).toEqual(20.0);
    expect(result.is_active).toEqual(true); // Should default to true

    // Verify in database
    const taxes = await db.select()
      .from(taxesTable)
      .where(eq(taxesTable.id, result.id))
      .execute();

    expect(taxes[0].is_active).toEqual(true);
  });

  it('should handle different tax rates correctly', async () => {
    const testCases = [
      { name: 'Zero Tax', rate: 0.0 },
      { name: 'Low Tax', rate: 5.5 },
      { name: 'High Tax', rate: 25.75 },
      { name: 'Max Tax', rate: 100.0 }
    ];

    for (const testCase of testCases) {
      const input: CreateTaxInput = {
        name: testCase.name,
        rate: testCase.rate,
        is_active: true
      };

      const result = await createTax(input);

      expect(result.name).toEqual(testCase.name);
      expect(result.rate).toEqual(testCase.rate);
      expect(typeof result.rate).toEqual('number');

      // Verify numeric precision is preserved
      const taxes = await db.select()
        .from(taxesTable)
        .where(eq(taxesTable.id, result.id))
        .execute();

      expect(parseFloat(taxes[0].rate)).toEqual(testCase.rate);
    }
  });

  it('should handle inactive tax creation', async () => {
    const inactiveInput: CreateTaxInput = {
      name: 'Inactive Tax',
      rate: 10.0,
      is_active: false
    };

    const result = await createTax(inactiveInput);

    expect(result.name).toEqual('Inactive Tax');
    expect(result.rate).toEqual(10.0);
    expect(result.is_active).toEqual(false);

    // Verify in database
    const taxes = await db.select()
      .from(taxesTable)
      .where(eq(taxesTable.id, result.id))
      .execute();

    expect(taxes[0].is_active).toEqual(false);
  });
});