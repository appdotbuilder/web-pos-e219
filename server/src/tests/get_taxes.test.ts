import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { taxesTable } from '../db/schema';
import { getTaxes, getActiveTaxes } from '../handlers/get_taxes';

describe('getTaxes', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no taxes exist', async () => {
    const result = await getTaxes();
    expect(result).toEqual([]);
  });

  it('should fetch all taxes with numeric rate conversion', async () => {
    // Insert test taxes
    await db.insert(taxesTable)
      .values([
        {
          name: 'Sales Tax',
          rate: '8.50',
          is_active: true
        },
        {
          name: 'VAT',
          rate: '20.00',
          is_active: false
        }
      ])
      .execute();

    const result = await getTaxes();

    expect(result).toHaveLength(2);
    
    // Check first tax
    const salesTax = result.find(t => t.name === 'Sales Tax');
    expect(salesTax).toBeDefined();
    expect(salesTax!.rate).toEqual(8.5);
    expect(typeof salesTax!.rate).toBe('number');
    expect(salesTax!.is_active).toBe(true);
    expect(salesTax!.id).toBeDefined();
    expect(salesTax!.created_at).toBeInstanceOf(Date);
    expect(salesTax!.updated_at).toBeInstanceOf(Date);

    // Check second tax
    const vat = result.find(t => t.name === 'VAT');
    expect(vat).toBeDefined();
    expect(vat!.rate).toEqual(20.0);
    expect(typeof vat!.rate).toBe('number');
    expect(vat!.is_active).toBe(false);
  });

  it('should return both active and inactive taxes', async () => {
    // Insert mixed active/inactive taxes
    await db.insert(taxesTable)
      .values([
        {
          name: 'Active Tax 1',
          rate: '5.00',
          is_active: true
        },
        {
          name: 'Inactive Tax 1',
          rate: '10.00',
          is_active: false
        },
        {
          name: 'Active Tax 2',
          rate: '7.50',
          is_active: true
        }
      ])
      .execute();

    const result = await getTaxes();

    expect(result).toHaveLength(3);
    expect(result.filter(t => t.is_active)).toHaveLength(2);
    expect(result.filter(t => !t.is_active)).toHaveLength(1);
  });

  it('should handle zero rate taxes correctly', async () => {
    await db.insert(taxesTable)
      .values([
        {
          name: 'Zero Tax',
          rate: '0.00',
          is_active: true
        }
      ])
      .execute();

    const result = await getTaxes();

    expect(result).toHaveLength(1);
    expect(result[0].rate).toEqual(0);
    expect(typeof result[0].rate).toBe('number');
  });
});

describe('getActiveTaxes', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no active taxes exist', async () => {
    // Insert only inactive taxes
    await db.insert(taxesTable)
      .values([
        {
          name: 'Inactive Tax',
          rate: '10.00',
          is_active: false
        }
      ])
      .execute();

    const result = await getActiveTaxes();
    expect(result).toEqual([]);
  });

  it('should return only active taxes with numeric conversion', async () => {
    // Insert mixed active/inactive taxes
    await db.insert(taxesTable)
      .values([
        {
          name: 'Sales Tax',
          rate: '8.50',
          is_active: true
        },
        {
          name: 'Inactive VAT',
          rate: '20.00',
          is_active: false
        },
        {
          name: 'Service Tax',
          rate: '12.00',
          is_active: true
        }
      ])
      .execute();

    const result = await getActiveTaxes();

    expect(result).toHaveLength(2);
    
    // All returned taxes should be active
    result.forEach(tax => {
      expect(tax.is_active).toBe(true);
      expect(typeof tax.rate).toBe('number');
    });

    // Check specific taxes
    const salesTax = result.find(t => t.name === 'Sales Tax');
    expect(salesTax).toBeDefined();
    expect(salesTax!.rate).toEqual(8.5);

    const serviceTax = result.find(t => t.name === 'Service Tax');
    expect(serviceTax).toBeDefined();
    expect(serviceTax!.rate).toEqual(12.0);

    // Inactive tax should not be present
    const inactiveVat = result.find(t => t.name === 'Inactive VAT');
    expect(inactiveVat).toBeUndefined();
  });

  it('should return all taxes when all are active', async () => {
    await db.insert(taxesTable)
      .values([
        {
          name: 'Tax 1',
          rate: '5.00',
          is_active: true
        },
        {
          name: 'Tax 2',
          rate: '10.00',
          is_active: true
        },
        {
          name: 'Tax 3',
          rate: '15.00',
          is_active: true
        }
      ])
      .execute();

    const result = await getActiveTaxes();

    expect(result).toHaveLength(3);
    result.forEach(tax => {
      expect(tax.is_active).toBe(true);
      expect(typeof tax.rate).toBe('number');
      expect(tax.id).toBeDefined();
      expect(tax.created_at).toBeInstanceOf(Date);
      expect(tax.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should handle decimal rates correctly for active taxes', async () => {
    await db.insert(taxesTable)
      .values([
        {
          name: 'Precise Tax',
          rate: '8.75',
          is_active: true
        },
        {
          name: 'Another Tax',
          rate: '13.25',
          is_active: true
        }
      ])
      .execute();

    const result = await getActiveTaxes();

    expect(result).toHaveLength(2);
    
    const preciseTax = result.find(t => t.name === 'Precise Tax');
    expect(preciseTax!.rate).toEqual(8.75);
    
    const anotherTax = result.find(t => t.name === 'Another Tax');
    expect(anotherTax!.rate).toEqual(13.25);
  });

  it('should correctly filter when default is_active is true', async () => {
    // Insert tax without explicitly setting is_active (should default to true)
    await db.insert(taxesTable)
      .values([
        {
          name: 'Default Active Tax',
          rate: '6.00'
          // is_active defaults to true
        }
      ])
      .execute();

    const result = await getActiveTaxes();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Default Active Tax');
    expect(result[0].is_active).toBe(true);
    expect(result[0].rate).toEqual(6.0);
  });
});