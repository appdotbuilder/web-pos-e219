import { db } from '../db';
import { productsTable, salesTable, saleItemsTable, taxesTable, discountsTable } from '../db/schema';
import { type CreateSaleInput, type Sale } from '../schema';
import { eq, and, inArray } from 'drizzle-orm';

export const createSale = async (input: CreateSaleInput): Promise<Sale> => {
  try {
    // 1. Validate all products exist and have sufficient stock
    const productIds = input.items.map(item => item.product_id);
    const products = await db.select()
      .from(productsTable)
      .where(inArray(productsTable.id, productIds))
      .execute();

    // Check if all products exist
    if (products.length !== productIds.length) {
      const foundIds = products.map(p => p.id);
      const missingIds = productIds.filter(id => !foundIds.includes(id));
      throw new Error(`Products not found: ${missingIds.join(', ')}`);
    }

    // Check stock availability
    const stockMap = new Map(products.map(p => [p.id, p.stock_quantity]));
    for (const item of input.items) {
      const availableStock = stockMap.get(item.product_id) ?? 0;
      if (availableStock < item.quantity) {
        const product = products.find(p => p.id === item.product_id);
        throw new Error(`Insufficient stock for product "${product?.name}". Available: ${availableStock}, Required: ${item.quantity}`);
      }
    }

    // 2. Calculate subtotal from items
    const subtotal = input.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

    // 3. Apply tax and discount calculations
    let tax_amount = 0;
    if (input.tax_id) {
      const taxRecord = await db.select()
        .from(taxesTable)
        .where(and(eq(taxesTable.id, input.tax_id), eq(taxesTable.is_active, true)))
        .limit(1)
        .execute();
      
      if (taxRecord.length === 0) {
        throw new Error(`Active tax with ID ${input.tax_id} not found`);
      }
      
      const taxRate = parseFloat(taxRecord[0].rate);
      tax_amount = (subtotal * taxRate) / 100;
    }

    let discount_amount = 0;
    if (input.discount_id) {
      const discountRecord = await db.select()
        .from(discountsTable)
        .where(and(eq(discountsTable.id, input.discount_id), eq(discountsTable.is_active, true)))
        .limit(1)
        .execute();
      
      if (discountRecord.length === 0) {
        throw new Error(`Active discount with ID ${input.discount_id} not found`);
      }

      const discountValue = parseFloat(discountRecord[0].value);
      if (discountRecord[0].type === 'percentage') {
        discount_amount = (subtotal * discountValue) / 100;
      } else {
        discount_amount = discountValue;
      }
    }

    const total_amount = subtotal + tax_amount - discount_amount;

    // 4. Create the sale record and associated sale items
    const saleResult = await db.insert(salesTable)
      .values({
        staff_id: input.staff_id,
        subtotal: subtotal.toString(),
        tax_amount: tax_amount.toString(),
        discount_amount: discount_amount.toString(),
        total_amount: total_amount.toString(),
        payment_method: input.payment_method,
        status: 'completed'
      })
      .returning()
      .execute();

    const sale = saleResult[0];

    // Create sale items
    const saleItemsData = input.items.map(item => ({
      sale_id: sale.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price.toString(),
      total_price: (item.unit_price * item.quantity).toString()
    }));

    await db.insert(saleItemsTable)
      .values(saleItemsData)
      .execute();

    // 5. Update product stock quantities
    for (const item of input.items) {
      await db.update(productsTable)
        .set({
          stock_quantity: (stockMap.get(item.product_id)! - item.quantity),
          updated_at: new Date()
        })
        .where(eq(productsTable.id, item.product_id))
        .execute();
    }

    // 6. Return the created sale with calculated totals
    return {
      ...sale,
      subtotal: parseFloat(sale.subtotal),
      tax_amount: parseFloat(sale.tax_amount),
      discount_amount: parseFloat(sale.discount_amount),
      total_amount: parseFloat(sale.total_amount)
    };
  } catch (error) {
    console.error('Sale creation failed:', error);
    throw error;
  }
};