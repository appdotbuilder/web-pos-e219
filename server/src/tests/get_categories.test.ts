import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { getCategories } from '../handlers/get_categories';

describe('getCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no categories exist', async () => {
    const result = await getCategories();
    expect(result).toEqual([]);
  });

  it('should return all categories sorted by name', async () => {
    // Create test categories in unsorted order
    await db.insert(categoriesTable).values([
      {
        name: 'Zebra Category',
        description: 'Last alphabetically',
      },
      {
        name: 'Alpha Category',
        description: 'First alphabetically',
      },
      {
        name: 'Beta Category',
        description: null,
      }
    ]).execute();

    const result = await getCategories();

    expect(result).toHaveLength(3);
    
    // Verify categories are sorted by name
    expect(result[0].name).toEqual('Alpha Category');
    expect(result[1].name).toEqual('Beta Category');
    expect(result[2].name).toEqual('Zebra Category');

    // Verify all fields are present
    result.forEach(category => {
      expect(category.id).toBeDefined();
      expect(category.name).toBeDefined();
      expect(category.created_at).toBeInstanceOf(Date);
      expect(category.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should handle categories with null descriptions', async () => {
    await db.insert(categoriesTable).values({
      name: 'Test Category',
      description: null,
    }).execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Test Category');
    expect(result[0].description).toBeNull();
  });

  it('should handle large number of categories', async () => {
    // Create many categories to test performance and sorting
    const categories = Array.from({ length: 50 }, (_, i) => ({
      name: `Category ${String(i).padStart(2, '0')}`,
      description: `Description for category ${i}`,
    }));

    await db.insert(categoriesTable).values(categories).execute();

    const result = await getCategories();

    expect(result).toHaveLength(50);
    
    // Verify they are sorted correctly
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].name.localeCompare(result[i].name)).toBeLessThanOrEqual(0);
    }
  });

  it('should include all category properties', async () => {
    await db.insert(categoriesTable).values({
      name: 'Complete Category',
      description: 'Full category with all fields',
    }).execute();

    const result = await getCategories();
    const category = result[0];

    expect(category.id).toBeTypeOf('number');
    expect(category.name).toEqual('Complete Category');
    expect(category.description).toEqual('Full category with all fields');
    expect(category.created_at).toBeInstanceOf(Date);
    expect(category.updated_at).toBeInstanceOf(Date);
    expect(category.created_at).toEqual(category.updated_at);
  });
});