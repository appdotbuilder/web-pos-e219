import { type Tax } from '../schema';

export async function getTaxes(): Promise<Tax[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching all tax configurations from the database.
    // It should return an array of all taxes, both active and inactive.
    return [];
}

export async function getActiveTaxes(): Promise<Tax[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching only active tax configurations.
    // It should return an array of taxes where is_active = true.
    return [];
}