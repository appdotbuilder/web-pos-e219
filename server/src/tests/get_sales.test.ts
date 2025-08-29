import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { salesTable, staffTable } from '../db/schema';
import { getSales, getSaleById, getSalesByStaff, getSalesByDateRange } from '../handlers/get_sales';
import { eq } from 'drizzle-orm';

describe('getSales handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test staff
  const createTestStaff = async () => {
    const staffResult = await db.insert(staffTable)
      .values({
        name: 'Test Staff',
        email: 'staff@test.com',
        role: 'cashier',
        is_active: true
      })
      .returning()
      .execute();
    return staffResult[0];
  };

  // Helper function to create test sale
  const createTestSale = async (staffId: number, overrides = {}) => {
    const saleResult = await db.insert(salesTable)
      .values({
        staff_id: staffId,
        subtotal: '100.00',
        tax_amount: '10.00',
        discount_amount: '5.00',
        total_amount: '105.00',
        payment_method: 'cash',
        status: 'completed',
        ...overrides
      })
      .returning()
      .execute();
    return saleResult[0];
  };

  describe('getSales', () => {
    it('should return empty array when no sales exist', async () => {
      const result = await getSales();
      expect(result).toEqual([]);
    });

    it('should return all sales with converted numeric fields', async () => {
      const staff = await createTestStaff();
      await createTestSale(staff.id);
      await createTestSale(staff.id, {
        subtotal: '200.50',
        tax_amount: '20.05',
        discount_amount: '0.00',
        total_amount: '220.55'
      });

      const result = await getSales();

      expect(result).toHaveLength(2);
      
      // Check first sale (newest first due to ordering)
      expect(result[0].staff_id).toEqual(staff.id);
      expect(typeof result[0].subtotal).toBe('number');
      expect(typeof result[0].tax_amount).toBe('number');
      expect(typeof result[0].discount_amount).toBe('number');
      expect(typeof result[0].total_amount).toBe('number');
      expect(result[0].subtotal).toEqual(200.5);
      expect(result[0].tax_amount).toEqual(20.05);
      expect(result[0].discount_amount).toEqual(0);
      expect(result[0].total_amount).toEqual(220.55);

      // Check second sale
      expect(result[1].subtotal).toEqual(100);
      expect(result[1].tax_amount).toEqual(10);
      expect(result[1].discount_amount).toEqual(5);
      expect(result[1].total_amount).toEqual(105);
    });

    it('should return sales ordered by created_at descending', async () => {
      const staff = await createTestStaff();
      
      // Create sales with slight delay to ensure different timestamps
      const sale1 = await createTestSale(staff.id, { total_amount: '100.00' });
      await new Promise(resolve => setTimeout(resolve, 10));
      const sale2 = await createTestSale(staff.id, { total_amount: '200.00' });

      const result = await getSales();

      expect(result).toHaveLength(2);
      expect(result[0].id).toEqual(sale2.id); // Newest first
      expect(result[1].id).toEqual(sale1.id); // Oldest last
      expect(result[0].total_amount).toEqual(200);
      expect(result[1].total_amount).toEqual(100);
    });
  });

  describe('getSaleById', () => {
    it('should return null when sale does not exist', async () => {
      const result = await getSaleById(999);
      expect(result).toBeNull();
    });

    it('should return sale with converted numeric fields when found', async () => {
      const staff = await createTestStaff();
      const sale = await createTestSale(staff.id, {
        subtotal: '150.75',
        tax_amount: '15.08',
        discount_amount: '10.00',
        total_amount: '155.83'
      });

      const result = await getSaleById(sale.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(sale.id);
      expect(result!.staff_id).toEqual(staff.id);
      expect(typeof result!.subtotal).toBe('number');
      expect(typeof result!.tax_amount).toBe('number');
      expect(typeof result!.discount_amount).toBe('number');
      expect(typeof result!.total_amount).toBe('number');
      expect(result!.subtotal).toEqual(150.75);
      expect(result!.tax_amount).toEqual(15.08);
      expect(result!.discount_amount).toEqual(10);
      expect(result!.total_amount).toEqual(155.83);
      expect(result!.payment_method).toEqual('cash');
      expect(result!.status).toEqual('completed');
      expect(result!.created_at).toBeInstanceOf(Date);
      expect(result!.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('getSalesByStaff', () => {
    it('should return empty array when staff has no sales', async () => {
      const staff = await createTestStaff();
      const result = await getSalesByStaff(staff.id);
      expect(result).toEqual([]);
    });

    it('should return only sales for specified staff member', async () => {
      const staff1 = await createTestStaff();
      const staff2Result = await db.insert(staffTable)
        .values({
          name: 'Staff 2',
          email: 'staff2@test.com',
          role: 'manager',
          is_active: true
        })
        .returning()
        .execute();
      const staff2 = staff2Result[0];

      // Create sales for both staff members
      await createTestSale(staff1.id, { total_amount: '100.00' });
      await createTestSale(staff2.id, { total_amount: '200.00' });
      await createTestSale(staff1.id, { total_amount: '300.00' });

      const result = await getSalesByStaff(staff1.id);

      expect(result).toHaveLength(2);
      result.forEach(sale => {
        expect(sale.staff_id).toEqual(staff1.id);
        expect(typeof sale.total_amount).toBe('number');
      });
      
      // Should be ordered by created_at descending
      expect(result[0].total_amount).toEqual(300);
      expect(result[1].total_amount).toEqual(100);
    });

    it('should return sales with converted numeric fields', async () => {
      const staff = await createTestStaff();
      await createTestSale(staff.id, {
        subtotal: '99.99',
        tax_amount: '9.99',
        discount_amount: '4.99',
        total_amount: '104.99'
      });

      const result = await getSalesByStaff(staff.id);

      expect(result).toHaveLength(1);
      expect(typeof result[0].subtotal).toBe('number');
      expect(typeof result[0].tax_amount).toBe('number');
      expect(typeof result[0].discount_amount).toBe('number');
      expect(typeof result[0].total_amount).toBe('number');
      expect(result[0].subtotal).toEqual(99.99);
      expect(result[0].tax_amount).toEqual(9.99);
      expect(result[0].discount_amount).toEqual(4.99);
      expect(result[0].total_amount).toEqual(104.99);
    });
  });

  describe('getSalesByDateRange', () => {
    it('should return empty array when no sales in date range', async () => {
      const staff = await createTestStaff();
      await createTestSale(staff.id);

      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-12-31');
      const result = await getSalesByDateRange(startDate, endDate);

      expect(result).toEqual([]);
    });

    it('should return sales within specified date range', async () => {
      const staff = await createTestStaff();
      
      // Create test sales
      const sale1 = await createTestSale(staff.id, { total_amount: '100.00' });
      await new Promise(resolve => setTimeout(resolve, 10));
      const sale2 = await createTestSale(staff.id, { total_amount: '200.00' });
      await new Promise(resolve => setTimeout(resolve, 10));
      const sale3 = await createTestSale(staff.id, { total_amount: '300.00' });

      // Set date range to include all sales (current time should be after all sales)
      const startDate = new Date(Date.now() - 60000); // 1 minute ago
      const endDate = new Date(Date.now() + 60000);   // 1 minute from now

      const result = await getSalesByDateRange(startDate, endDate);

      expect(result).toHaveLength(3);
      result.forEach(sale => {
        expect(sale.created_at).toBeInstanceOf(Date);
        expect(sale.created_at >= startDate).toBe(true);
        expect(sale.created_at <= endDate).toBe(true);
        expect(typeof sale.total_amount).toBe('number');
      });

      // Should be ordered by created_at descending
      expect(result[0].id).toEqual(sale3.id);
      expect(result[1].id).toEqual(sale2.id);
      expect(result[2].id).toEqual(sale1.id);
    });

    it('should filter sales by exact date boundaries', async () => {
      const staff = await createTestStaff();
      
      // Create a sale and get its exact timestamp
      const sale = await createTestSale(staff.id);
      const saleFromDb = await db.select()
        .from(salesTable)
        .where(eq(salesTable.id, sale.id))
        .execute();
      const saleTimestamp = saleFromDb[0].created_at;

      // Set date range to exclude this sale (before its creation)
      const startDate = new Date(saleTimestamp.getTime() - 10000); // 10 seconds before
      const endDate = new Date(saleTimestamp.getTime() - 1000);    // 1 second before

      const result = await getSalesByDateRange(startDate, endDate);
      expect(result).toEqual([]);

      // Set date range to include this sale
      const startDate2 = new Date(saleTimestamp.getTime() - 1000);  // 1 second before
      const endDate2 = new Date(saleTimestamp.getTime() + 1000);    // 1 second after

      const result2 = await getSalesByDateRange(startDate2, endDate2);
      expect(result2).toHaveLength(1);
      expect(result2[0].id).toEqual(sale.id);
    });

    it('should return sales with converted numeric fields', async () => {
      const staff = await createTestStaff();
      await createTestSale(staff.id, {
        subtotal: '75.25',
        tax_amount: '7.53',
        discount_amount: '2.50',
        total_amount: '80.28'
      });

      const startDate = new Date(Date.now() - 60000); // 1 minute ago
      const endDate = new Date(Date.now() + 60000);   // 1 minute from now
      const result = await getSalesByDateRange(startDate, endDate);

      expect(result).toHaveLength(1);
      expect(typeof result[0].subtotal).toBe('number');
      expect(typeof result[0].tax_amount).toBe('number');
      expect(typeof result[0].discount_amount).toBe('number');
      expect(typeof result[0].total_amount).toBe('number');
      expect(result[0].subtotal).toEqual(75.25);
      expect(result[0].tax_amount).toEqual(7.53);
      expect(result[0].discount_amount).toEqual(2.5);
      expect(result[0].total_amount).toEqual(80.28);
    });
  });
});