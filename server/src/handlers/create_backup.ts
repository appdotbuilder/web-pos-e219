import { db } from '../db';
import { 
  categoriesTable, 
  productsTable, 
  staffTable, 
  printersTable, 
  taxesTable, 
  discountsTable, 
  salesTable, 
  saleItemsTable 
} from '../db/schema';
import { type BackupData } from '../schema';

export async function createBackup(): Promise<BackupData> {
  try {
    // Fetch all data from all tables concurrently for better performance
    const [
      categories,
      products,
      staff,
      printers,
      taxes,
      discounts,
      sales,
      saleItems
    ] = await Promise.all([
      db.select().from(categoriesTable).execute(),
      db.select().from(productsTable).execute(),
      db.select().from(staffTable).execute(),
      db.select().from(printersTable).execute(),
      db.select().from(taxesTable).execute(),
      db.select().from(discountsTable).execute(),
      db.select().from(salesTable).execute(),
      db.select().from(saleItemsTable).execute()
    ]);

    // Convert numeric fields to numbers for consistent schema compliance
    const processedProducts = products.map(product => ({
      ...product,
      price: parseFloat(product.price)
    }));

    const processedTaxes = taxes.map(tax => ({
      ...tax,
      rate: parseFloat(tax.rate)
    }));

    const processedDiscounts = discounts.map(discount => ({
      ...discount,
      value: parseFloat(discount.value)
    }));

    const processedSales = sales.map(sale => ({
      ...sale,
      subtotal: parseFloat(sale.subtotal),
      tax_amount: parseFloat(sale.tax_amount),
      discount_amount: parseFloat(sale.discount_amount),
      total_amount: parseFloat(sale.total_amount)
    }));

    const processedSaleItems = saleItems.map(item => ({
      ...item,
      unit_price: parseFloat(item.unit_price),
      total_price: parseFloat(item.total_price)
    }));

    return {
      timestamp: new Date().toISOString(),
      categories,
      products: processedProducts,
      staff,
      printers,
      taxes: processedTaxes,
      discounts: processedDiscounts,
      sales: processedSales,
      sale_items: processedSaleItems
    };
  } catch (error) {
    console.error('Backup creation failed:', error);
    throw error;
  }
}