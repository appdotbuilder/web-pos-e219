import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type UpdateCategoryInput, type CreateCategoryInput } from '../schema';
import { updateCategory } from '../handlers/update_category';
import { eq } from 'drizzle-orm';

describe('updateCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createTestCategory = async (data: CreateCategoryInput) => {
    const result = await db.insert(categoriesTable)
      .values({
        name: data.name,
        description: data.description || null
      })
      .returning()
      .execute();
    
    return result[0];
  };

  it('should update category name', async () => {
    // Create test category
    const category = await createTestCategory({
      name: 'Original Category',
      description: 'Original description'
    });

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Updated Category Name'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Updated Category Name');
    expect(result.description).toEqual('Original description');
    expect(result.created_at).toEqual(category.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > category.updated_at).toBe(true);
  });

  it('should update category description', async () => {
    // Create test category
    const category = await createTestCategory({
      name: 'Test Category',
      description: 'Original description'
    });

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      description: 'Updated description'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Test Category');
    expect(result.description).toEqual('Updated description');
    expect(result.created_at).toEqual(category.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update both name and description', async () => {
    // Create test category
    const category = await createTestCategory({
      name: 'Original Category',
      description: 'Original description'
    });

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Updated Category Name',
      description: 'Updated description'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Updated Category Name');
    expect(result.description).toEqual('Updated description');
    expect(result.created_at).toEqual(category.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > category.updated_at).toBe(true);
  });

  it('should set description to null', async () => {
    // Create test category with description
    const category = await createTestCategory({
      name: 'Test Category',
      description: 'Original description'
    });

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      description: null
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Test Category');
    expect(result.description).toBeNull();
    expect(result.created_at).toEqual(category.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should preserve existing values when not updated', async () => {
    // Create test category
    const category = await createTestCategory({
      name: 'Test Category',
      description: 'Test description'
    });

    // Update only with ID (no other fields)
    const updateInput: UpdateCategoryInput = {
      id: category.id
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Test Category');
    expect(result.description).toEqual('Test description');
    expect(result.created_at).toEqual(category.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > category.updated_at).toBe(true);
  });

  it('should save updated category to database', async () => {
    // Create test category
    const category = await createTestCategory({
      name: 'Original Category',
      description: 'Original description'
    });

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Updated Category',
      description: 'Updated description'
    };

    await updateCategory(updateInput);

    // Query database to verify update
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, category.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Updated Category');
    expect(categories[0].description).toEqual('Updated description');
    expect(categories[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle category with null description initially', async () => {
    // Create test category without description
    const category = await createTestCategory({
      name: 'Test Category'
    });

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      description: 'New description'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Test Category');
    expect(result.description).toEqual('New description');
    expect(result.created_at).toEqual(category.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when category does not exist', async () => {
    const updateInput: UpdateCategoryInput = {
      id: 999999, // Non-existent ID
      name: 'Updated Category'
    };

    await expect(updateCategory(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle empty string description', async () => {
    // Create test category
    const category = await createTestCategory({
      name: 'Test Category',
      description: 'Original description'
    });

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      description: ''
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Test Category');
    expect(result.description).toEqual('');
    expect(result.created_at).toEqual(category.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});