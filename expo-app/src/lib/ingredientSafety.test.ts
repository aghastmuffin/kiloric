// eslint-disable-next-line import/no-unresolved
import { describe, expect, it } from 'vitest'
import { inspectIngredients } from './ingredientSafety'

describe('inspectIngredients', () => {
  it('flags the matched ingredient text while preserving the full original blob', () => {
    const text = 'Flour, BHA, potassium bromate, salt.'
    const result = inspectIngredients(text)
    expect(result.segments.map((segment) => segment.text).join('')).toBe(text)
    expect(result.segments.filter((segment) => segment.flagged).map((segment) => segment.text)).toEqual([
      'BHA', 'potassium bromate',
    ])
    expect(result.flags.map((flag) => flag.classification)).toEqual(['IARC Group 2B', 'IARC Group 2B'])
  })

  it('recognizes listed ingredient aliases and does not match partial words', () => {
    expect(inspectIngredients('E 320 and E924').flags).toHaveLength(2)
    expect(inspectIngredients('Bharat flour and bromated yeast').flags).toHaveLength(0)
  })

  it('keeps unflagged or empty ingredient text intact without asserting safety', () => {
    expect(inspectIngredients('Water, oats').segments).toEqual([{ text: 'Water, oats', flagged: false }])
    expect(inspectIngredients('').segments).toEqual([])
  })
})
