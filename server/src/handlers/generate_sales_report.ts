import { db } from '../db';
import { salesTable, saleItemsTable, productsTable, categoriesTable, staffTable } from '../db/schema';
import { type SalesReportQuery, type SalesReport } from '../schema';
import { eq, gte, lte, and, desc, sum, count } from 'drizzle-orm';
import { sql, type SQL } from 'drizzle-orm';

export async function generateSalesReport(query: SalesReportQuery): Promise<SalesReport> {
  try {
    const startDate = new Date(query.start_date);
    const endDate = new Date(query.end_date);

    // Build base conditions for date range
    const baseConditions: SQL<unknown>[] = [
      gte(salesTable.created_at, startDate),
      lte(salesTable.created_at, endDate),
      eq(salesTable.status, 'completed') // Only include completed sales
    ];

    // Add staff filter if provided
    if (query.staff_id !== undefined) {
      baseConditions.push(eq(salesTable.staff_id, query.staff_id));
    }

    // Get total sales and transaction count - simplified approach
    const totalQuery = db.select({
      total_sales: sum(salesTable.total_amount).as('total_sales'),
      total_transactions: count(salesTable.id).as('total_transactions')
    })
    .from(salesTable);

    let totalSalesResult;
    
    if (query.category_id !== undefined) {
      // For category filtering, join with sale items and products
      totalSalesResult = await totalQuery
        .innerJoin(saleItemsTable, eq(salesTable.id, saleItemsTable.sale_id))
        .innerJoin(productsTable, eq(saleItemsTable.product_id, productsTable.id))
        .where(and(...baseConditions, eq(productsTable.category_id, query.category_id)))
        .execute();
    } else {
      totalSalesResult = await totalQuery
        .where(and(...baseConditions))
        .execute();
    }

    const totalSales = parseFloat(totalSalesResult[0]?.total_sales || '0');
    const totalTransactions = Number(totalSalesResult[0]?.total_transactions || 0);
    const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    // Get top products
    const topProductsConditions: SQL<unknown>[] = [
      gte(salesTable.created_at, startDate),
      lte(salesTable.created_at, endDate),
      eq(salesTable.status, 'completed')
    ];

    if (query.staff_id !== undefined) {
      topProductsConditions.push(eq(salesTable.staff_id, query.staff_id));
    }

    if (query.category_id !== undefined) {
      topProductsConditions.push(eq(productsTable.category_id, query.category_id));
    }

    const topProductsQuery = db.select({
      product_id: productsTable.id,
      product_name: productsTable.name,
      quantity_sold: sum(saleItemsTable.quantity).as('quantity_sold'),
      total_revenue: sum(saleItemsTable.total_price).as('total_revenue')
    })
    .from(saleItemsTable)
    .innerJoin(productsTable, eq(saleItemsTable.product_id, productsTable.id))
    .innerJoin(salesTable, eq(saleItemsTable.sale_id, salesTable.id))
    .where(and(...topProductsConditions))
    .groupBy(productsTable.id, productsTable.name)
    .orderBy(desc(sum(saleItemsTable.total_price)))
    .limit(10);

    const topProductsResult = await topProductsQuery.execute();

    const topProducts = topProductsResult.map(product => ({
      product_id: product.product_id,
      product_name: product.product_name,
      quantity_sold: Number(product.quantity_sold || 0),
      total_revenue: parseFloat(String(product.total_revenue || '0'))
    }));

    // Get daily breakdown
    const dailyBreakdownQuery = db.select({
      date: sql<string>`DATE(${salesTable.created_at})`.as('date'),
      sales_count: count(salesTable.id).as('sales_count'),
      total_amount: sum(salesTable.total_amount).as('total_amount')
    })
    .from(salesTable);

    let dailyBreakdownResult;
    
    if (query.category_id !== undefined) {
      dailyBreakdownResult = await dailyBreakdownQuery
        .innerJoin(saleItemsTable, eq(salesTable.id, saleItemsTable.sale_id))
        .innerJoin(productsTable, eq(saleItemsTable.product_id, productsTable.id))
        .where(and(...baseConditions, eq(productsTable.category_id, query.category_id)))
        .groupBy(sql`DATE(${salesTable.created_at})`)
        .orderBy(sql`DATE(${salesTable.created_at})`)
        .execute();
    } else {
      dailyBreakdownResult = await dailyBreakdownQuery
        .where(and(...baseConditions))
        .groupBy(sql`DATE(${salesTable.created_at})`)
        .orderBy(sql`DATE(${salesTable.created_at})`)
        .execute();
    }

    const dailyBreakdown = dailyBreakdownResult.map(day => ({
      date: day.date,
      sales_count: Number(day.sales_count || 0),
      total_amount: parseFloat(String(day.total_amount || '0'))
    }));

    return {
      total_sales: totalSales,
      total_transactions: totalTransactions,
      average_transaction: averageTransaction,
      top_products: topProducts,
      daily_breakdown: dailyBreakdown
    };
  } catch (error) {
    console.error('Sales report generation failed:', error);
    throw error;
  }
}