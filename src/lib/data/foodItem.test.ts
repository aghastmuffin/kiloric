// eslint-disable-next-line import/no-unresolved
import { describe, expect, it } from 'vitest'
import { addMacros, foodItemFromProduct, formatAmount, macrosForAmount, servingsForAmount, sumMacros } from './foodItem'

describe('foodItemFromProduct', () => {
  it('scales per-100 g values to one labelled serving', () => {
    const item = foodItemFromProduct({
      product_name: 'Greek yogurt',
      brands: 'Fage',
      code: '5200435000027',
      serving_quantity: 170,
      serving_size: '170 g',
      energy_kcal_100g: 100,
      proteins_100g: 10,
      carbohydrates_100g: 4,
      fat_100g: 5,
    })
    expect(item.name).toBe('Greek yogurt')
    expect(item.brand).toBe('Fage')
    expect(item.servingGrams).toBe(170)
    expect(item.servingLabel).toBe('1 serving = 170 g')
    expect(item.perServing).toEqual({ kcal: 170, protein: 17, carbs: 6.8, fat: 8.5 })
  })

  it('falls back to 100 g and treats "Unknown" as missing', () => {
    const item = foodItemFromProduct({
      product_name: 'Oats',
      serving_quantity: 'Unknown',
      energy_kcal_100g: '380',
      proteins_100g: 'Unknown',
      brands: 'Unknown',
    })
    expect(item.servingGrams).toBe(100)
    expect(item.brand).toBeNull()
    expect(item.perServing).toEqual({ kcal: 380, protein: 0, carbs: 0, fat: 0 })
  })

  it('treats impossible kcal values as kilojoules and falls back to kJ', () => {
    expect(foodItemFromProduct({ product_name: 'Snacks, banana chips', energy_kcal_100g: '2170.0' }).perServing.kcal).toBe(519)
    expect(foodItemFromProduct({ product_name: 'Oil', energy_kcal_100g: 884 }).perServing.kcal).toBe(884)
    expect(foodItemFromProduct({ product_name: 'Bar', energy_kcal_100g: 'Unknown', energy_kj_100g: 1674 }).perServing.kcal).toBe(400)
  })

  it('falls back to Atwater 4/4/9 when no energy value is listed', () => {
    expect(foodItemFromProduct({ product_name: 'Lentils', proteins_100g: 9, carbohydrates_100g: 20, fat_100g: 0.4 }).perServing.kcal).toBe(120)
    expect(foodItemFromProduct({ product_name: 'Lentils', energy_kcal_100g: 0, proteins_100g: 9, carbohydrates_100g: 20, fat_100g: 0.4 }).perServing.kcal).toBe(120)
    expect(foodItemFromProduct({ product_name: 'Water', energy_kcal_100g: 0 }).perServing.kcal).toBe(0)
  })

  it('detects kilojoules that disagree with the macros', () => {
    const yogurt = { product_name: 'Yogurt, Greek, plain, nonfat', proteins_100g: 10.3, carbohydrates_100g: 3.6, fat_100g: 0.4 }
    expect(foodItemFromProduct({ ...yogurt, energy_kcal_100g: 256 }).perServing.kcal).toBe(61)
    expect(foodItemFromProduct({ ...yogurt, energy_kcal_100g: 59 }).perServing.kcal).toBe(59)
    expect(foodItemFromProduct({ product_name: 'Light beer', energy_kcal_100g: 29, carbohydrates_100g: 1.6 }).perServing.kcal).toBe(29)
    expect(foodItemFromProduct({ product_name: 'Fried snack', energy_kcal_100g: 536, proteins_100g: 6.6, carbohydrates_100g: 53, fat_100g: 34 }).perServing.kcal).toBe(536)
  })
})

describe('amount helpers', () => {
  const item = { servingGrams: 40, perServing: { kcal: 200, protein: 10, carbs: 20, fat: 8 } }

  it('computes macros for servings and for grams', () => {
    expect(macrosForAmount(item, 'servings', 1.5)).toEqual({ kcal: 300, protein: 15, carbs: 30, fat: 12 })
    expect(macrosForAmount(item, 'grams', 20)).toEqual({ kcal: 100, protein: 5, carbs: 10, fat: 4 })
    expect(macrosForAmount(item, 'servings', -1).kcal).toBe(0)
  })

  it('converts grams to servings', () => {
    expect(servingsForAmount(item, 'grams', 60)).toBe(1.5)
    expect(servingsForAmount(item, 'servings', 2)).toBe(2)
  })

  it('sums macros without float drift', () => {
    expect(addMacros({ kcal: 1, protein: 0.1, carbs: 0.2, fat: 0 }, { kcal: 2, protein: 0.2, carbs: 0.1, fat: 0 })).toEqual({
      kcal: 3,
      protein: 0.3,
      carbs: 0.3,
      fat: 0,
    })
    expect(sumMacros([{ kcal: 100 }, { kcal: 50, fat: 1.5 }])).toEqual({ kcal: 150, protein: 0, carbs: 0, fat: 1.5 })
  })

  it('formats amounts compactly', () => {
    expect(formatAmount(1)).toBe('1')
    expect(formatAmount(1.5)).toBe('1.5')
    expect(formatAmount(12.4)).toBe('12')
  })
})
