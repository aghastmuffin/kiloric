// eslint-disable-next-line import/no-unresolved
import { describe, expect, it } from 'vitest'
import {
  formatProductLabel,
  formatProductValue,
  getBarcodeFromProduct,
  getProductTitle,
  listProductColumns,
  unwrapProduct,
} from './productDisplay'

describe('productDisplay', () => {
  it('unwraps nested product / data envelopes', () => {
    expect(unwrapProduct({ product: { name: 'Oats' } })).toEqual({ name: 'Oats' })
    expect(unwrapProduct({ product_data: { name: 'Rice' } })).toEqual({ name: 'Rice' })
    expect(unwrapProduct({ data: { name: 'Beans' } })).toEqual({ name: 'Beans' })
    expect(unwrapProduct({ name: 'Plain' })).toEqual({ name: 'Plain' })
  })

  it('formats labels and scalar / list values', () => {
    expect(formatProductLabel('energy_kcal_100g')).toBe('Energy Kcal 100g')
    expect(formatProductValue(null)).toBe('—')
    expect(formatProductValue(true)).toBe('Yes')
    expect(formatProductValue(['a', 'b'])).toBe('a, b')
  })

  it('reads title and barcode from aliases', () => {
    const product = { product_name: 'Yogurt', code: '0123456789012' }
    expect(getProductTitle(product, 'fallback')).toBe('Yogurt')
    expect(getBarcodeFromProduct(product)).toBe('0123456789012')
  })

  it('lists visible product columns without wrapper keys', () => {
    const columns = listProductColumns({
      product_name: 'Yogurt',
      energy_kcal_100g: 90,
      proteins_100g: 10,
      data: { nested: true },
    })
    expect(columns.map(([key]) => key)).toEqual(['energy_kcal_100g', 'proteins_100g'])
  })
})
