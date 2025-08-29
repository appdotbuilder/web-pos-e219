import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';
import { eq } from 'drizzle-orm';

export async function getProducts(): Promise<Product[]> {
    try {
        const results = await db.select()
            .from(productsTable)
            .execute();

        // Convert numeric fields back to numbers
        return results.map(product => ({
            ...product,
            price: parseFloat(product.price)
        }));
    } catch (error) {
        console.error('Failed to fetch products:', error);
        throw error;
    }
}

export async function getProductsByCategory(categoryId: number): Promise<Product[]> {
    try {
        const results = await db.select()
            .from(productsTable)
            .where(eq(productsTable.category_id, categoryId))
            .execute();

        // Convert numeric fields back to numbers
        return results.map(product => ({
            ...product,
            price: parseFloat(product.price)
        }));
    } catch (error) {
        console.error('Failed to fetch products by category:', error);
        throw error;
    }
}

export async function getProduct(productId: number): Promise<Product | null> {
    try {
        const results = await db.select()
            .from(productsTable)
            .where(eq(productsTable.id, productId))
            .limit(1)
            .execute();

        if (results.length === 0) {
            return null;
        }

        const product = results[0];
        
        // Convert numeric fields back to numbers
        return {
            ...product,
            price: parseFloat(product.price)
        };
    } catch (error) {
        console.error('Failed to fetch product:', error);
        throw error;
    }
}