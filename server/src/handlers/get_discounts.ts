import { type Discount } from '../schema';

export async function getDiscounts(): Promise<Discount[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching all discount configurations from the database.
    // It should return an array of all discounts, both active and inactive.
    return [];
}

export async function getActiveDiscounts(): Promise<Discount[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching only active discount configurations.
    // It should return an array of discounts where is_active = true.
    return [];
}