import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { printersTable } from '../db/schema';
import { type CreatePrinterInput } from '../schema';
import { createPrinter } from '../handlers/create_printer';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreatePrinterInput = {
  name: 'Receipt Printer 1',
  ip_address: '192.168.1.100',
  port: 9100,
  is_active: true,
  printer_type: 'thermal'
};

describe('createPrinter', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a printer with all fields', async () => {
    const result = await createPrinter(testInput);

    // Basic field validation
    expect(result.name).toEqual('Receipt Printer 1');
    expect(result.ip_address).toEqual('192.168.1.100');
    expect(result.port).toEqual(9100);
    expect(result.is_active).toEqual(true);
    expect(result.printer_type).toEqual('thermal');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a printer with default is_active value', async () => {
    const inputWithoutActive: CreatePrinterInput = {
      name: 'Label Printer',
      ip_address: '192.168.1.101',
      port: 8080,
      printer_type: 'laser'
    };

    const result = await createPrinter(inputWithoutActive);

    expect(result.name).toEqual('Label Printer');
    expect(result.ip_address).toEqual('192.168.1.101');
    expect(result.port).toEqual(8080);
    expect(result.is_active).toEqual(true); // Should default to true
    expect(result.printer_type).toEqual('laser');
  });

  it('should save printer to database', async () => {
    const result = await createPrinter(testInput);

    // Query database to verify the printer was saved
    const printers = await db.select()
      .from(printersTable)
      .where(eq(printersTable.id, result.id))
      .execute();

    expect(printers).toHaveLength(1);
    expect(printers[0].name).toEqual('Receipt Printer 1');
    expect(printers[0].ip_address).toEqual('192.168.1.100');
    expect(printers[0].port).toEqual(9100);
    expect(printers[0].is_active).toEqual(true);
    expect(printers[0].printer_type).toEqual('thermal');
    expect(printers[0].created_at).toBeInstanceOf(Date);
    expect(printers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle different printer types', async () => {
    const thermalInput: CreatePrinterInput = {
      name: 'Thermal Printer',
      ip_address: '192.168.1.102',
      port: 9100,
      printer_type: 'thermal'
    };

    const laserInput: CreatePrinterInput = {
      name: 'Laser Printer',
      ip_address: '192.168.1.103',
      port: 631,
      printer_type: 'laser'
    };

    const inkjetInput: CreatePrinterInput = {
      name: 'Inkjet Printer',
      ip_address: '192.168.1.104',
      port: 9100,
      printer_type: 'inkjet'
    };

    const thermalResult = await createPrinter(thermalInput);
    const laserResult = await createPrinter(laserInput);
    const inkjetResult = await createPrinter(inkjetInput);

    expect(thermalResult.printer_type).toEqual('thermal');
    expect(laserResult.printer_type).toEqual('laser');
    expect(inkjetResult.printer_type).toEqual('inkjet');

    // Verify all are saved in database
    const allPrinters = await db.select().from(printersTable).execute();
    expect(allPrinters).toHaveLength(3);
  });

  it('should handle inactive printer creation', async () => {
    const inactiveInput: CreatePrinterInput = {
      name: 'Inactive Printer',
      ip_address: '192.168.1.105',
      port: 9100,
      is_active: false,
      printer_type: 'thermal'
    };

    const result = await createPrinter(inactiveInput);

    expect(result.is_active).toEqual(false);
    expect(result.name).toEqual('Inactive Printer');
  });

  it('should handle various port numbers', async () => {
    const standardPortInput: CreatePrinterInput = {
      name: 'Standard Port Printer',
      ip_address: '192.168.1.106',
      port: 9100, // Common thermal printer port
      printer_type: 'thermal'
    };

    const ippPortInput: CreatePrinterInput = {
      name: 'IPP Port Printer',
      ip_address: '192.168.1.107',
      port: 631, // IPP port
      printer_type: 'laser'
    };

    const customPortInput: CreatePrinterInput = {
      name: 'Custom Port Printer',
      ip_address: '192.168.1.108',
      port: 8080, // Custom port
      printer_type: 'inkjet'
    };

    const standardResult = await createPrinter(standardPortInput);
    const ippResult = await createPrinter(ippPortInput);
    const customResult = await createPrinter(customPortInput);

    expect(standardResult.port).toEqual(9100);
    expect(ippResult.port).toEqual(631);
    expect(customResult.port).toEqual(8080);
  });

  it('should create multiple printers with unique IDs', async () => {
    const input1: CreatePrinterInput = {
      name: 'Printer 1',
      ip_address: '192.168.1.110',
      port: 9100,
      printer_type: 'thermal'
    };

    const input2: CreatePrinterInput = {
      name: 'Printer 2',
      ip_address: '192.168.1.111',
      port: 9100,
      printer_type: 'laser'
    };

    const result1 = await createPrinter(input1);
    const result2 = await createPrinter(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.name).toEqual('Printer 1');
    expect(result2.name).toEqual('Printer 2');
    
    // Verify both are in database
    const allPrinters = await db.select().from(printersTable).execute();
    expect(allPrinters).toHaveLength(2);
  });
});