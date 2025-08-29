import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createCategoryInputSchema,
  updateCategoryInputSchema,
  createProductInputSchema,
  updateProductInputSchema,
  updateStockInputSchema,
  createStaffInputSchema,
  updateStaffInputSchema,
  createPrinterInputSchema,
  createTaxInputSchema,
  createDiscountInputSchema,
  createSaleInputSchema,
  salesReportQuerySchema,
  backupDataSchema
} from './schema';

// Import handlers
import { createCategory } from './handlers/create_category';
import { getCategories } from './handlers/get_categories';
import { updateCategory } from './handlers/update_category';
import { deleteCategory } from './handlers/delete_category';

import { createProduct } from './handlers/create_product';
import { getProducts, getProductsByCategory, getProduct } from './handlers/get_products';
import { updateProduct } from './handlers/update_product';
import { updateStock } from './handlers/update_stock';
import { deleteProduct } from './handlers/delete_product';

import { createStaff } from './handlers/create_staff';
import { getStaff, getStaffById, getActiveStaff } from './handlers/get_staff';
import { updateStaff } from './handlers/update_staff';

import { createPrinter } from './handlers/create_printer';
import { getPrinters, getActivePrinters } from './handlers/get_printers';

import { createTax } from './handlers/create_tax';
import { getTaxes, getActiveTaxes } from './handlers/get_taxes';

import { createDiscount } from './handlers/create_discount';
import { getDiscounts, getActiveDiscounts } from './handlers/get_discounts';

import { createSale } from './handlers/create_sale';
import { getSales, getSaleById, getSalesByStaff, getSalesByDateRange } from './handlers/get_sales';

import { generateSalesReport } from './handlers/generate_sales_report';

import { createBackup } from './handlers/create_backup';
import { restoreBackup } from './handlers/restore_backup';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Category management
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),
  
  getCategories: publicProcedure
    .query(() => getCategories()),
    
  updateCategory: publicProcedure
    .input(updateCategoryInputSchema)
    .mutation(({ input }) => updateCategory(input)),
    
  deleteCategory: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteCategory(input)),

  // Product management
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),
    
  getProducts: publicProcedure
    .query(() => getProducts()),
    
  getProductsByCategory: publicProcedure
    .input(z.number())
    .query(({ input }) => getProductsByCategory(input)),
    
  getProduct: publicProcedure
    .input(z.number())
    .query(({ input }) => getProduct(input)),
    
  updateProduct: publicProcedure
    .input(updateProductInputSchema)
    .mutation(({ input }) => updateProduct(input)),
    
  updateStock: publicProcedure
    .input(updateStockInputSchema)
    .mutation(({ input }) => updateStock(input)),
    
  deleteProduct: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteProduct(input)),

  // Staff management
  createStaff: publicProcedure
    .input(createStaffInputSchema)
    .mutation(({ input }) => createStaff(input)),
    
  getStaff: publicProcedure
    .query(() => getStaff()),
    
  getStaffById: publicProcedure
    .input(z.number())
    .query(({ input }) => getStaffById(input)),
    
  getActiveStaff: publicProcedure
    .query(() => getActiveStaff()),
    
  updateStaff: publicProcedure
    .input(updateStaffInputSchema)
    .mutation(({ input }) => updateStaff(input)),

  // Printer management
  createPrinter: publicProcedure
    .input(createPrinterInputSchema)
    .mutation(({ input }) => createPrinter(input)),
    
  getPrinters: publicProcedure
    .query(() => getPrinters()),
    
  getActivePrinters: publicProcedure
    .query(() => getActivePrinters()),

  // Tax management
  createTax: publicProcedure
    .input(createTaxInputSchema)
    .mutation(({ input }) => createTax(input)),
    
  getTaxes: publicProcedure
    .query(() => getTaxes()),
    
  getActiveTaxes: publicProcedure
    .query(() => getActiveTaxes()),

  // Discount management
  createDiscount: publicProcedure
    .input(createDiscountInputSchema)
    .mutation(({ input }) => createDiscount(input)),
    
  getDiscounts: publicProcedure
    .query(() => getDiscounts()),
    
  getActiveDiscounts: publicProcedure
    .query(() => getActiveDiscounts()),

  // Sales management
  createSale: publicProcedure
    .input(createSaleInputSchema)
    .mutation(({ input }) => createSale(input)),
    
  getSales: publicProcedure
    .query(() => getSales()),
    
  getSaleById: publicProcedure
    .input(z.number())
    .query(({ input }) => getSaleById(input)),
    
  getSalesByStaff: publicProcedure
    .input(z.number())
    .query(({ input }) => getSalesByStaff(input)),
    
  getSalesByDateRange: publicProcedure
    .input(z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime()
    }))
    .query(({ input }) => getSalesByDateRange(new Date(input.startDate), new Date(input.endDate))),

  // Sales reporting
  generateSalesReport: publicProcedure
    .input(salesReportQuerySchema)
    .query(({ input }) => generateSalesReport(input)),

  // Backup and restore
  createBackup: publicProcedure
    .query(() => createBackup()),
    
  restoreBackup: publicProcedure
    .input(backupDataSchema)
    .mutation(({ input }) => restoreBackup(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC POS Server listening at port: ${port}`);
}

start();