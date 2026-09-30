import { describe, expect, it } from 'vitest'
import {
  formatLabel,
  FORMATTED_LABEL_CACHE,
  getBarcodeFromProduct,
  getProductTitle,
  getQuickProductFacts,
} from './productDisplay'

describe('productDisplay label formatting & caching', () => {
  it('formats raw keys into title-cased labels', () => {
    expect(formatLabel('energy_kcal_100g')).toBe('Energy Kcal 100g')
    expect(formatLabel('carbon-footprint_100g')).toBe('Carbon Footprint 100g')
    expect(formatLabel('servingSize')).toBe('Serving Size')
  })

  it('uses FORMATTED_LABEL_CACHE on subsequent calls', () => {
    FORMATTED_LABEL_CACHE.clear()
    expect(FORMATTED_LABEL_CACHE.size).toBe(0)

    const first = formatLabel('proteins_100g')
    expect(FORMATTED_LABEL_CACHE.has('proteins_100g')).toBe(true)
    expect(FORMATTED_LABEL_CACHE.size).toBe(1)

    const second = formatLabel('proteins_100g')
    expect(second).toBe(first)
  })

  it('extracts product title correctly with fallback', () => {
    expect(getProductTitle({ product_name: ' Oats ' }, 'Default')).toBe('Oats')
    expect(getProductTitle({}, 'Fallback Title')).toBe('Fallback Title')
  })

  it('extracts barcode from product object', () => {
    expect(getBarcodeFromProduct({ code: ' 1234567890123 ' })).toBe('1234567890123')
    expect(getBarcodeFromProduct({})).toBeNull()
  })

  it('extracts quick product facts with optional serving scaling', () => {
    const data = {
      energy_kcal_100g: 100,
      proteins_100g: 10,
      carbohydrates_100g: 20,
      fat_100g: 5,
    }

    const unscaled = getQuickProductFacts(data)
    expect(unscaled).toEqual([
      { label: 'Energy Kcal 100g', value: '100' },
      { label: 'Proteins 100g', value: '10' },
      { label: 'Carbohydrates 100g', value: '20' },
      { label: 'Fat 100g', value: '5' },
    ])

    const scaled = getQuickProductFacts(data, { servings: 2 })
    expect(scaled).toEqual([
      { label: 'Energy Kcal 100g', value: '200' },
      { label: 'Proteins 100g', value: '20' },
      { label: 'Carbohydrates 100g', value: '40' },
      { label: 'Fat 100g', value: '10' },
    ])
  })
})
