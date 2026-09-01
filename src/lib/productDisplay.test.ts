import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearFormattedLabelCache,
  formatLabel,
  getBarcodeFromProduct,
  getProductTitle,
  getQuickProductFacts,
} from './productDisplay'

describe('productDisplay utility & optimizations', () => {
  beforeEach(() => {
    clearFormattedLabelCache()
  })

  describe('formatLabel caching', () => {
    it('formats snake_case and kebab-case keys correctly', () => {
      expect(formatLabel('energy_kcal')).toBe('Energy Kcal')
      expect(formatLabel('serving-size')).toBe('Serving Size')
      expect(formatLabel('proteins_100g')).toBe('Proteins 100g')
    })

    it('caches formatted strings and returns identical references on subsequent calls', () => {
      const first = formatLabel('energy_kcal_100g')
      const second = formatLabel('energy_kcal_100g')
      expect(first).toBe('Energy Kcal 100g')
      expect(first).toBe(second) // reference equality check
    })

    it('clears cache when clearFormattedLabelCache is called', () => {
      const first = formatLabel('test_key')
      clearFormattedLabelCache()
      const second = formatLabel('test_key')
      expect(first).toEqual(second)
    })
  })

  describe('getProductTitle', () => {
    it('returns product name when available', () => {
      expect(getProductTitle({ product_name: ' Greek Yogurt ' }, 'Fallback')).toBe('Greek Yogurt')
      expect(getProductTitle({ name: 'Apple' }, 'Fallback')).toBe('Apple')
      expect(getProductTitle({ title: 'Oats' }, 'Fallback')).toBe('Oats')
    })

    it('returns fallback if no title keys are present or valid', () => {
      expect(getProductTitle({}, 'Fallback Title')).toBe('Fallback Title')
      expect(getProductTitle({ product_name: 'unknown' }, 'Fallback')).toBe('Fallback')
    })
  })

  describe('getBarcodeFromProduct', () => {
    it('extracts barcode from candidate fields', () => {
      expect(getBarcodeFromProduct({ code: ' 12345678 ' })).toBe('12345678')
      expect(getBarcodeFromProduct({ barcode: '87654321' })).toBe('87654321')
    })

    it('returns null if no valid barcode is found', () => {
      expect(getBarcodeFromProduct({})).toBeNull()
      expect(getBarcodeFromProduct({ code: 'unknown' })).toBeNull()
    })
  })

  describe('getQuickProductFacts', () => {
    it('extracts quick product facts up to default limit', () => {
      const data = {
        calories: 250,
        protein: 20,
        carbohydrates: 30,
        fat: 10,
        fiber_100g: 5,
      }
      const facts = getQuickProductFacts(data)
      expect(facts).toHaveLength(4)
      expect(facts[0]).toEqual({ label: 'Calories', value: '250' })
      expect(facts[1]).toEqual({ label: 'Protein', value: '20' })
    })

    it('scales numeric facts based on servings multiplier', () => {
      const data = {
        calories: 100,
        protein: 10.5,
      }
      const facts = getQuickProductFacts(data, { limit: 2, servings: 2 })
      expect(facts).toEqual([
        { label: 'Calories', value: '200' },
        { label: 'Protein', value: '21' },
      ])
    })
  })
})
