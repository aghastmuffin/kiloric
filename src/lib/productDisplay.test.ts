// eslint-disable-next-line import/no-unresolved
import { describe, expect, it } from 'vitest'
import {
  clearFormattedLabelCache,
  formatLabel,
  getBarcodeFromProduct,
  getProductTitle,
  getQuickProductFacts,
} from './productDisplay'

describe('productDisplay', () => {
  it('formats property keys and uses FORMATTED_LABEL_CACHE for subsequent calls', () => {
    clearFormattedLabelCache()

    const label1 = formatLabel('energy_kcal_100g')
    expect(label1).toBe('Energy Kcal 100g')

    // Second call should return identical cached result
    const label2 = formatLabel('energy_kcal_100g')
    expect(label2).toBe('Energy Kcal 100g')

    expect(formatLabel('proteins_100g')).toBe('Proteins 100g')
    expect(formatLabel('serving-size')).toBe('Serving Size')

    clearFormattedLabelCache()
    expect(formatLabel('energy_kcal_100g')).toBe('Energy Kcal 100g')
  })

  it('extracts product title and barcode correctly', () => {
    const product = {
      code: '123456789',
      product_name: ' Organic Oat Milk ',
      brands: 'Oatly',
    }

    expect(getProductTitle(product, 'Fallback')).toBe('Organic Oat Milk')
    expect(getBarcodeFromProduct(product)).toBe('123456789')
  })

  it('extracts quick product facts with label caching and scaling options', () => {
    clearFormattedLabelCache()

    const product = {
      calories: 120,
      protein: 5,
      carbs: 20,
      fat: 3,
      serving_size: '250 ml',
    }

    const facts = getQuickProductFacts(product, { limit: 3, servings: 2 })

    expect(facts).toEqual([
      { label: 'Calories', value: '240' },
      { label: 'Protein', value: '10' },
      { label: 'Carbs', value: '40' },
    ])
  })
})
