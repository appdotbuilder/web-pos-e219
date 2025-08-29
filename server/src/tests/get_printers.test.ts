import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { printersTable } from '../db/schema';
import { type CreatePrinterInput } from '../schema';
import { getPrinters, getActivePrinters } from '../handlers/get_printers';

describe('getPrinters', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no printers exist', async () => {
    const result = await getPrinters();
    expect(result).toEqual([]);
  });

  it('should return all printers when they exist', async () => {
    // Create test printers directly in database
    await db.insert(printersTable).values([
      {
        name: 'Thermal Printer 1',
        ip_address: '192.168.1.100',
        port: 9100,
        is_active: true,
        printer_type: 'thermal'
      },
      {
        name: 'Laser Printer 1',
        ip_address: '192.168.1.101',
        port: 631,
        is_active: false,
        printer_type: 'laser'
      },
      {
        name: 'Inkjet Printer 1',
        ip_address: '192.168.1.102',
        port: 515,
        is_active: true,
        printer_type: 'inkjet'
      }
    ]).execute();

    const result = await getPrinters();

    expect(result).toHaveLength(3);
    
    // Verify all printers are returned regardless of active status
    const activeCount = result.filter(p => p.is_active).length;
    const inactiveCount = result.filter(p => !p.is_active).length;
    expect(activeCount).toBe(2);
    expect(inactiveCount).toBe(1);

    // Verify field types and values
    result.forEach(printer => {
      expect(typeof printer.id).toBe('number');
      expect(typeof printer.name).toBe('string');
      expect(typeof printer.ip_address).toBe('string');
      expect(typeof printer.port).toBe('number');
      expect(typeof printer.is_active).toBe('boolean');
      expect(['thermal', 'laser', 'inkjet']).toContain(printer.printer_type);
      expect(printer.created_at).toBeInstanceOf(Date);
      expect(printer.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return printers with correct data types', async () => {
    await db.insert(printersTable).values({
      name: 'Test Printer',
      ip_address: '10.0.0.1',
      port: 8080,
      is_active: true,
      printer_type: 'thermal'
    }).execute();

    const result = await getPrinters();
    
    expect(result).toHaveLength(1);
    const printer = result[0];
    
    // Verify specific field values and types
    expect(printer.name).toBe('Test Printer');
    expect(printer.ip_address).toBe('10.0.0.1');
    expect(printer.port).toBe(8080);
    expect(typeof printer.port).toBe('number');
    expect(printer.is_active).toBe(true);
    expect(printer.printer_type).toBe('thermal');
  });
});

describe('getActivePrinters', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no active printers exist', async () => {
    // Create only inactive printers
    await db.insert(printersTable).values([
      {
        name: 'Inactive Printer 1',
        ip_address: '192.168.1.100',
        port: 9100,
        is_active: false,
        printer_type: 'thermal'
      },
      {
        name: 'Inactive Printer 2',
        ip_address: '192.168.1.101',
        port: 631,
        is_active: false,
        printer_type: 'laser'
      }
    ]).execute();

    const result = await getActivePrinters();
    expect(result).toEqual([]);
  });

  it('should return only active printers', async () => {
    // Create mix of active and inactive printers
    await db.insert(printersTable).values([
      {
        name: 'Active Thermal',
        ip_address: '192.168.1.100',
        port: 9100,
        is_active: true,
        printer_type: 'thermal'
      },
      {
        name: 'Inactive Laser',
        ip_address: '192.168.1.101',
        port: 631,
        is_active: false,
        printer_type: 'laser'
      },
      {
        name: 'Active Inkjet',
        ip_address: '192.168.1.102',
        port: 515,
        is_active: true,
        printer_type: 'inkjet'
      },
      {
        name: 'Another Inactive',
        ip_address: '192.168.1.103',
        port: 9200,
        is_active: false,
        printer_type: 'thermal'
      }
    ]).execute();

    const result = await getActivePrinters();

    expect(result).toHaveLength(2);
    
    // Verify all returned printers are active
    result.forEach(printer => {
      expect(printer.is_active).toBe(true);
    });

    // Verify we got the correct active printers
    const printerNames = result.map(p => p.name).sort();
    expect(printerNames).toEqual(['Active Inkjet', 'Active Thermal']);
  });

  it('should return all printers when all are active', async () => {
    // Create only active printers
    await db.insert(printersTable).values([
      {
        name: 'Active Printer 1',
        ip_address: '192.168.1.100',
        port: 9100,
        is_active: true,
        printer_type: 'thermal'
      },
      {
        name: 'Active Printer 2',
        ip_address: '192.168.1.101',
        port: 631,
        is_active: true,
        printer_type: 'laser'
      }
    ]).execute();

    const result = await getActivePrinters();

    expect(result).toHaveLength(2);
    result.forEach(printer => {
      expect(printer.is_active).toBe(true);
    });
  });

  it('should return active printers with correct data types and values', async () => {
    await db.insert(printersTable).values({
      name: 'Receipt Printer',
      ip_address: '172.16.0.50',
      port: 9100,
      is_active: true,
      printer_type: 'thermal'
    }).execute();

    const result = await getActivePrinters();
    
    expect(result).toHaveLength(1);
    const printer = result[0];
    
    // Verify field types and values
    expect(typeof printer.id).toBe('number');
    expect(printer.name).toBe('Receipt Printer');
    expect(printer.ip_address).toBe('172.16.0.50');
    expect(printer.port).toBe(9100);
    expect(typeof printer.port).toBe('number');
    expect(printer.is_active).toBe(true);
    expect(printer.printer_type).toBe('thermal');
    expect(printer.created_at).toBeInstanceOf(Date);
    expect(printer.updated_at).toBeInstanceOf(Date);
  });
});