// eslint-disable-next-line import/no-unresolved
import { describe, expect, it } from 'vitest'
import {
  getOrdsFieldRank,
  isOrdsPresent,
  normalizeOrdsProduct,
  normalizeOrdsResponse,
  ORDS_FIELD_PRIORITY,
  productHasUnknownDetails,
} from './ordsNormalize'

describe('ordsNormalize', () => {
  it('strips Unknown sentinels and maps all nutrient aliases', () => {
    const product = normalizeOrdsProduct({
      code: '2709224',
      product_name: 'Banana, raw',
      brands: 'Unknown',
      energy_kcal_100g: '97.0',
      proteins_100g: '0.74',
      carbohydrates_100g: '22.71',
      fat_100g: '0.28',
      fiber_100g: '1.7',
      sugars_100g: '15.8',
      potassium_100g: '326.0',
      vitamin_c_100g: '12.0',
      sodium_100g: '0.0',
      image_url: 'Unknown',
      relevance: 97,
    })

    expect(product.brands).toBeUndefined()
    expect(product.image_url).toBeUndefined()
    expect(product.energy_kcal).toBe(97)
    expect(product.calories).toBe(97)
    expect(product.proteins).toBe(0.74)
    expect(product.carbs).toBe(22.71)
    expect(product.fat).toBe(0.28)
    expect(product.sodium).toBe(0)
    expect((product.nutriments as Record<string, number>).potassium).toBe(326)
    expect((product.nutriments as Record<string, number>)['vitamin-c']).toBe(12)
    expect(product.product_name).toBe('Banana, raw')
    expect(isOrdsPresent('Unknown')).toBe(false)
    expect(isOrdsPresent('0.0')).toBe(true)
  })

  it('normalizes fuzzy search collections and sorts by relevance', () => {
    const result = normalizeOrdsResponse('/api/fuzzy/banana', {
      items: [
        { code: '1', product_name: 'Low', energy_kcal_100g: '10', relevance: 10 },
        { code: '2', product_name: 'High', energy_kcal_100g: '20', relevance: 99 },
      ],
      hasMore: false,
      offset: 0,
      limit: 25,
      count: 2,
    }) as { items: Record<string, unknown>[] }

    expect(result.items).toHaveLength(2)
    expect(result.items[0].product_name).toBe('High')
    expect(result.items[0].energy_kcal).toBe(20)
  })

  it('returns O(1) field priority rank correctly', () => {
    expect(getOrdsFieldRank('product_name')).toBe(0)
    expect(getOrdsFieldRank('brands')).toBe(1)
    expect(getOrdsFieldRank('non_existent_key')).toBe(ORDS_FIELD_PRIORITY.length)
  })

  it('flags products with unknown / missing label fields', () => {
    const incomplete = normalizeOrdsProduct({
      code: '2709224',
      product_name: 'Banana, raw',
      brands: 'Unknown',
      energy_kcal_100g: '97.0',
      proteins_100g: '0.74',
    })
    expect(productHasUnknownDetails(incomplete)).toBe(true)

    const complete = normalizeOrdsProduct({
      code: '1',
      product_name: 'Yogurt',
      brands: 'Demo',
      categories: 'Dairy',
      quantity: '150g',
      serving_size: '150g',
      serving_quantity: '150',
      allergens: 'Milk',
      traces_tags: 'Nuts',
      image_url: 'https://example.com/y.jpg',
      ingredients_text: 'Milk, cultures',
      energy_kcal_100g: '80',
      proteins_100g: '4',
      carbohydrates_100g: '6',
      fat_100g: '3',
      fiber_100g: '0',
      sugars_100g: '6',
      sodium_100g: '0.05',
      saturated_fat_100g: '2',
    })
    expect(productHasUnknownDetails(complete)).toBe(false)
  })
})
