import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, productsTable, staffTable, salesTable, saleItemsTable } from '../db/schema';
import { type SalesReportQuery } from '../schema';
import { generateSalesReport } from '../handlers/generate_sales_report';

// Test data setup
const testCategory = {
  name: 'Electronics',
  description: 'Electronic devices'
};

const testCategory2 = {
  name: 'Books',
  description: 'Books and literature'
};

const testStaff = {
  name: 'John Doe',
  email: 'john@example.com',
  role: 'cashier' as const,
  is_active: true
};

const testStaff2 = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  role: 'manager' as const,
  is_active: true
};

describe('generateSalesReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate basic sales report with no sales', async () => {
    const query: SalesReportQuery = {
      start_date: '2024-01-01T00:00:00.000Z',
      end_date: '2024-01-31T23:59:59.999Z'
    };

    const result = await generateSalesReport(query);

    expect(result.total_sales).toEqual(0);
    expect(result.total_transactions).toEqual(0);
    expect(result.average_transaction).toEqual(0);
    expect(result.top_products).toHaveLength(0);
    expect(result.daily_breakdown).toHaveLength(0);
  });

  it('should generate report with single completed sale', async () => {
    // Create test data
    const [category] = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const [staff] = await db.insert(staffTable)
      .values(testStaff)
      .returning()
      .execute();

    const [product] = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '29.99',
        category_id: category.id,
        stock_quantity: 100,
        sku: 'TEST001'
      })
      .returning()
      .execute();

    const [sale] = await db.insert(salesTable)
      .values({
        staff_id: staff.id,
        subtotal: '29.99',
        tax_amount: '2.40',
        discount_amount: '0.00',
        total_amount: '32.39',
        payment_method: 'cash',
        status: 'completed'
      })
      .returning()
      .execute();

    await db.insert(saleItemsTable)
      .values({
        sale_id: sale.id,
        product_id: product.id,
        quantity: 1,
        unit_price: '29.99',
        total_price: '29.99'
      })
      .execute();

    // Use a very wide date range to ensure we catch the sale
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, 0, 1);
    const oneYearFromNow = new Date(now.getFullYear() + 1, 11, 31);

    const query: SalesReportQuery = {
      start_date: oneYearAgo.toISOString(),
      end_date: oneYearFromNow.toISOString()
    };

    const result = await generateSalesReport(query);

    expect(result.total_sales).toEqual(32.39);
    expect(result.total_transactions).toEqual(1);
    expect(result.average_transaction).toEqual(32.39);
    expect(result.top_products).toHaveLength(1);
    expect(result.top_products[0].product_id).toEqual(product.id);
    expect(result.top_products[0].product_name).toEqual('Test Product');
    expect(result.top_products[0].quantity_sold).toEqual(1);
    expect(result.top_products[0].total_revenue).toEqual(29.99);
    expect(result.daily_breakdown).toHaveLength(1);
    expect(result.daily_breakdown[0].sales_count).toEqual(1);
    expect(result.daily_breakdown[0].total_amount).toEqual(32.39);
  });

  it('should filter sales by staff_id', async () => {
    // Create test data
    const [category] = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const [staff1] = await db.insert(staffTable)
      .values(testStaff)
      .returning()
      .execute();

    const [staff2] = await db.insert(staffTable)
      .values(testStaff2)
      .returning()
      .execute();

    const [product] = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '19.99',
        category_id: category.id,
        stock_quantity: 100,
        sku: 'TEST001'
      })
      .returning()
      .execute();

    // Create sales for both staff members
    const [sale1] = await db.insert(salesTable)
      .values({
        staff_id: staff1.id,
        subtotal: '19.99',
        tax_amount: '1.60',
        discount_amount: '0.00',
        total_amount: '21.59',
        payment_method: 'cash',
        status: 'completed'
      })
      .returning()
      .execute();

    const [sale2] = await db.insert(salesTable)
      .values({
        staff_id: staff2.id,
        subtotal: '39.98',
        tax_amount: '3.20',
        discount_amount: '0.00',
        total_amount: '43.18',
        payment_method: 'card',
        status: 'completed'
      })
      .returning()
      .execute();

    await db.insert(saleItemsTable)
      .values([
        {
          sale_id: sale1.id,
          product_id: product.id,
          quantity: 1,
          unit_price: '19.99',
          total_price: '19.99'
        },
        {
          sale_id: sale2.id,
          product_id: product.id,
          quantity: 2,
          unit_price: '19.99',
          total_price: '39.98'
        }
      ])
      .execute();

    // Use dynamic date range
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, 0, 1);
    const oneYearFromNow = new Date(now.getFullYear() + 1, 11, 31);

    const query: SalesReportQuery = {
      start_date: oneYearAgo.toISOString(),
      end_date: oneYearFromNow.toISOString(),
      staff_id: staff1.id
    };

    const result = await generateSalesReport(query);

    expect(result.total_sales).toEqual(21.59);
    expect(result.total_transactions).toEqual(1);
    expect(result.top_products[0].quantity_sold).toEqual(1);
    expect(result.top_products[0].total_revenue).toEqual(19.99);
  });

  it('should filter sales by category_id', async () => {
    // Create test data
    const [category1] = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const [category2] = await db.insert(categoriesTable)
      .values(testCategory2)
      .returning()
      .execute();

    const [staff] = await db.insert(staffTable)
      .values(testStaff)
      .returning()
      .execute();

    const [product1] = await db.insert(productsTable)
      .values({
        name: 'Electronics Product',
        description: 'An electronic device',
        price: '99.99',
        category_id: category1.id,
        stock_quantity: 50,
        sku: 'ELEC001'
      })
      .returning()
      .execute();

    const [product2] = await db.insert(productsTable)
      .values({
        name: 'Book Product',
        description: 'A great book',
        price: '15.99',
        category_id: category2.id,
        stock_quantity: 100,
        sku: 'BOOK001'
      })
      .returning()
      .execute();

    // Create mixed sales
    const [sale1] = await db.insert(salesTable)
      .values({
        staff_id: staff.id,
        subtotal: '99.99',
        tax_amount: '8.00',
        discount_amount: '0.00',
        total_amount: '107.99',
        payment_method: 'card',
        status: 'completed'
      })
      .returning()
      .execute();

    const [sale2] = await db.insert(salesTable)
      .values({
        staff_id: staff.id,
        subtotal: '15.99',
        tax_amount: '1.28',
        discount_amount: '0.00',
        total_amount: '17.27',
        payment_method: 'cash',
        status: 'completed'
      })
      .returning()
      .execute();

    await db.insert(saleItemsTable)
      .values([
        {
          sale_id: sale1.id,
          product_id: product1.id,
          quantity: 1,
          unit_price: '99.99',
          total_price: '99.99'
        },
        {
          sale_id: sale2.id,
          product_id: product2.id,
          quantity: 1,
          unit_price: '15.99',
          total_price: '15.99'
        }
      ])
      .execute();

    // Use dynamic date range
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, 0, 1);
    const oneYearFromNow = new Date(now.getFullYear() + 1, 11, 31);

    const query: SalesReportQuery = {
      start_date: oneYearAgo.toISOString(),
      end_date: oneYearFromNow.toISOString(),
      category_id: category1.id
    };

    const result = await generateSalesReport(query);

    expect(result.total_sales).toEqual(107.99);
    expect(result.total_transactions).toEqual(1);
    expect(result.top_products).toHaveLength(1);
    expect(result.top_products[0].product_name).toEqual('Electronics Product');
    expect(result.top_products[0].total_revenue).toEqual(99.99);
  });

  it('should exclude pending and cancelled sales', async () => {
    // Create test data
    const [category] = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const [staff] = await db.insert(staffTable)
      .values(testStaff)
      .returning()
      .execute();

    const [product] = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '25.00',
        category_id: category.id,
        stock_quantity: 100,
        sku: 'TEST001'
      })
      .returning()
      .execute();

    // Create sales with different statuses
    const [completedSale] = await db.insert(salesTable)
      .values({
        staff_id: staff.id,
        subtotal: '25.00',
        tax_amount: '2.00',
        discount_amount: '0.00',
        total_amount: '27.00',
        payment_method: 'cash',
        status: 'completed'
      })
      .returning()
      .execute();

    const [pendingSale] = await db.insert(salesTable)
      .values({
        staff_id: staff.id,
        subtotal: '25.00',
        tax_amount: '2.00',
        discount_amount: '0.00',
        total_amount: '27.00',
        payment_method: 'cash',
        status: 'pending'
      })
      .returning()
      .execute();

    const [cancelledSale] = await db.insert(salesTable)
      .values({
        staff_id: staff.id,
        subtotal: '25.00',
        tax_amount: '2.00',
        discount_amount: '0.00',
        total_amount: '27.00',
        payment_method: 'cash',
        status: 'cancelled'
      })
      .returning()
      .execute();

    await db.insert(saleItemsTable)
      .values([
        {
          sale_id: completedSale.id,
          product_id: product.id,
          quantity: 1,
          unit_price: '25.00',
          total_price: '25.00'
        },
        {
          sale_id: pendingSale.id,
          product_id: product.id,
          quantity: 1,
          unit_price: '25.00',
          total_price: '25.00'
        },
        {
          sale_id: cancelledSale.id,
          product_id: product.id,
          quantity: 1,
          unit_price: '25.00',
          total_price: '25.00'
        }
      ])
      .execute();

    // Use dynamic date range
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, 0, 1);
    const oneYearFromNow = new Date(now.getFullYear() + 1, 11, 31);

    const query: SalesReportQuery = {
      start_date: oneYearAgo.toISOString(),
      end_date: oneYearFromNow.toISOString()
    };

    const result = await generateSalesReport(query);

    // Should only include the completed sale
    expect(result.total_sales).toEqual(27.00);
    expect(result.total_transactions).toEqual(1);
    expect(result.top_products[0].quantity_sold).toEqual(1);
    expect(result.top_products[0].total_revenue).toEqual(25.00);
  });

  it('should handle multiple products and calculate top products correctly', async () => {
    // Create test data
    const [category] = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const [staff] = await db.insert(staffTable)
      .values(testStaff)
      .returning()
      .execute();

    const [product1] = await db.insert(productsTable)
      .values({
        name: 'High Revenue Product',
        description: 'Expensive product',
        price: '500.00',
        category_id: category.id,
        stock_quantity: 10,
        sku: 'HIGH001'
      })
      .returning()
      .execute();

    const [product2] = await db.insert(productsTable)
      .values({
        name: 'High Volume Product',
        description: 'Cheap but popular product',
        price: '5.00',
        category_id: category.id,
        stock_quantity: 1000,
        sku: 'VOL001'
      })
      .returning()
      .execute();

    // Create sales
    const [sale1] = await db.insert(salesTable)
      .values({
        staff_id: staff.id,
        subtotal: '500.00',
        tax_amount: '40.00',
        discount_amount: '0.00',
        total_amount: '540.00',
        payment_method: 'card',
        status: 'completed'
      })
      .returning()
      .execute();

    const [sale2] = await db.insert(salesTable)
      .values({
        staff_id: staff.id,
        subtotal: '50.00',
        tax_amount: '4.00',
        discount_amount: '0.00',
        total_amount: '54.00',
        payment_method: 'cash',
        status: 'completed'
      })
      .returning()
      .execute();

    await db.insert(saleItemsTable)
      .values([
        {
          sale_id: sale1.id,
          product_id: product1.id,
          quantity: 1,
          unit_price: '500.00',
          total_price: '500.00'
        },
        {
          sale_id: sale2.id,
          product_id: product2.id,
          quantity: 10,
          unit_price: '5.00',
          total_price: '50.00'
        }
      ])
      .execute();

    // Use dynamic date range
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, 0, 1);
    const oneYearFromNow = new Date(now.getFullYear() + 1, 11, 31);

    const query: SalesReportQuery = {
      start_date: oneYearAgo.toISOString(),
      end_date: oneYearFromNow.toISOString()
    };

    const result = await generateSalesReport(query);

    expect(result.total_sales).toEqual(594.00);
    expect(result.total_transactions).toEqual(2);
    expect(result.average_transaction).toEqual(297.00);
    expect(result.top_products).toHaveLength(2);
    
    // Should be ordered by revenue (highest first)
    expect(result.top_products[0].product_name).toEqual('High Revenue Product');
    expect(result.top_products[0].total_revenue).toEqual(500.00);
    expect(result.top_products[1].product_name).toEqual('High Volume Product');
    expect(result.top_products[1].total_revenue).toEqual(50.00);
    expect(result.top_products[1].quantity_sold).toEqual(10);
  });

  it('should respect date range filters', async () => {
    // Create test data
    const [category] = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const [staff] = await db.insert(staffTable)
      .values(testStaff)
      .returning()
      .execute();

    const [product] = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '20.00',
        category_id: category.id,
        stock_quantity: 100,
        sku: 'TEST001'
      })
      .returning()
      .execute();

    // Create a sale that should be excluded by date filter
    const [oldSale] = await db.insert(salesTable)
      .values({
        staff_id: staff.id,
        subtotal: '20.00',
        tax_amount: '1.60',
        discount_amount: '0.00',
        total_amount: '21.60',
        payment_method: 'cash',
        status: 'completed',
        created_at: new Date('2023-12-31') // Outside date range
      })
      .returning()
      .execute();

    await db.insert(saleItemsTable)
      .values({
        sale_id: oldSale.id,
        product_id: product.id,
        quantity: 1,
        unit_price: '20.00',
        total_price: '20.00'
      })
      .execute();

    const query: SalesReportQuery = {
      start_date: '2024-01-01T00:00:00.000Z',
      end_date: '2024-01-31T23:59:59.999Z'
    };

    const result = await generateSalesReport(query);

    // Should not include the old sale
    expect(result.total_sales).toEqual(0);
    expect(result.total_transactions).toEqual(0);
    expect(result.top_products).toHaveLength(0);
    expect(result.daily_breakdown).toHaveLength(0);
  });
});