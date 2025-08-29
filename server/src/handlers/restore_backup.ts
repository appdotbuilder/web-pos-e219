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

export async function restoreBackup(backupData: BackupData): Promise<{ success: boolean; message: string }> {
  try {
    // Start transaction for atomicity
    await db.transaction(async (tx) => {
      // Clear existing data in reverse dependency order (children first, then parents)
      await tx.delete(saleItemsTable);
      await tx.delete(salesTable);
      await tx.delete(productsTable);
      await tx.delete(categoriesTable);
      await tx.delete(staffTable);
      await tx.delete(printersTable);
      await tx.delete(taxesTable);
      await tx.delete(discountsTable);

      // Insert data in dependency order (parents first, then children)
      
      // 1. Insert categories first (no dependencies)
      if (backupData.categories.length > 0) {
        const categoryInsertData = backupData.categories.map(category => ({
          id: category.id,
          name: category.name,
          description: category.description,
          created_at: category.created_at,
          updated_at: category.updated_at
        }));
        await tx.insert(categoriesTable).values(categoryInsertData);
      }

      // 2. Insert staff (no dependencies)
      if (backupData.staff.length > 0) {
        const staffInsertData = backupData.staff.map(staff => ({
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          is_active: staff.is_active,
          created_at: staff.created_at,
          updated_at: staff.updated_at
        }));
        await tx.insert(staffTable).values(staffInsertData);
      }

      // 3. Insert printers (no dependencies)
      if (backupData.printers.length > 0) {
        const printerInsertData = backupData.printers.map(printer => ({
          id: printer.id,
          name: printer.name,
          ip_address: printer.ip_address,
          port: printer.port,
          is_active: printer.is_active,
          printer_type: printer.printer_type,
          created_at: printer.created_at,
          updated_at: printer.updated_at
        }));
        await tx.insert(printersTable).values(printerInsertData);
      }

      // 4. Insert taxes (no dependencies)
      if (backupData.taxes.length > 0) {
        const taxInsertData = backupData.taxes.map(tax => ({
          id: tax.id,
          name: tax.name,
          rate: tax.rate.toString(), // Convert number to string for numeric column
          is_active: tax.is_active,
          created_at: tax.created_at,
          updated_at: tax.updated_at
        }));
        await tx.insert(taxesTable).values(taxInsertData);
      }

      // 5. Insert discounts (no dependencies)
      if (backupData.discounts.length > 0) {
        const discountInsertData = backupData.discounts.map(discount => ({
          id: discount.id,
          name: discount.name,
          type: discount.type,
          value: discount.value.toString(), // Convert number to string for numeric column
          is_active: discount.is_active,
          created_at: discount.created_at,
          updated_at: discount.updated_at
        }));
        await tx.insert(discountsTable).values(discountInsertData);
      }

      // 6. Insert products (depends on categories)
      if (backupData.products.length > 0) {
        const productInsertData = backupData.products.map(product => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price.toString(), // Convert number to string for numeric column
          category_id: product.category_id,
          stock_quantity: product.stock_quantity,
          sku: product.sku,
          created_at: product.created_at,
          updated_at: product.updated_at
        }));
        await tx.insert(productsTable).values(productInsertData);
      }

      // 7. Insert sales (depends on staff)
      if (backupData.sales.length > 0) {
        const salesInsertData = backupData.sales.map(sale => ({
          id: sale.id,
          staff_id: sale.staff_id,
          subtotal: sale.subtotal.toString(), // Convert number to string for numeric column
          tax_amount: sale.tax_amount.toString(), // Convert number to string for numeric column
          discount_amount: sale.discount_amount.toString(), // Convert number to string for numeric column
          total_amount: sale.total_amount.toString(), // Convert number to string for numeric column
          payment_method: sale.payment_method,
          status: sale.status,
          created_at: sale.created_at,
          updated_at: sale.updated_at
        }));
        await tx.insert(salesTable).values(salesInsertData);
      }

      // 8. Insert sale items last (depends on both sales and products)
      if (backupData.sale_items.length > 0) {
        const saleItemsInsertData = backupData.sale_items.map(saleItem => ({
          id: saleItem.id,
          sale_id: saleItem.sale_id,
          product_id: saleItem.product_id,
          quantity: saleItem.quantity,
          unit_price: saleItem.unit_price.toString(), // Convert number to string for numeric column
          total_price: saleItem.total_price.toString(), // Convert number to string for numeric column
          created_at: saleItem.created_at
        }));
        await tx.insert(saleItemsTable).values(saleItemsInsertData);
      }
    });

    const totalRecords = 
      backupData.categories.length + 
      backupData.products.length + 
      backupData.staff.length + 
      backupData.printers.length + 
      backupData.taxes.length + 
      backupData.discounts.length + 
      backupData.sales.length + 
      backupData.sale_items.length;

    return {
      success: true,
      message: `Backup restored successfully. ${totalRecords} records imported from ${backupData.timestamp}`
    };

  } catch (error) {
    console.error('Backup restoration failed:', error);
    throw error;
  }
}