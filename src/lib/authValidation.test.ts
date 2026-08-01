// eslint-disable-next-line import/no-unresolved
import { describe, it, expect } from 'vitest'
import { isValidEmail, isValidPassword } from './authValidation'

describe('isValidEmail', () => {
  it('should accept valid email formats', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name+tag@sub.domain.co')).toBe(true)
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(isValidEmail('123@456.com')).toBe(true)
  })

  it('should accept emails with length up to 254 characters', () => {
    const validLongEmail = 'a'.repeat(242) + '@example.com' // 242 + 12 = 254
    expect(isValidEmail(validLongEmail)).toBe(true)
  })

  it('should reject invalid email formats', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('   ')).toBe(false)
    expect(isValidEmail('test')).toBe(false)
    expect(isValidEmail('test@')).toBe(false)
    expect(isValidEmail('test@com')).toBe(false)
    expect(isValidEmail('@example.com')).toBe(false)
    expect(isValidEmail('test@.com')).toBe(false)
    expect(isValidEmail('test@example.')).toBe(false)
    expect(isValidEmail('test@example.c')).toBe(false) // TLD too short (must be at least 2 chars based on regex)
    expect(isValidEmail('test@@example.com')).toBe(false)
    expect(isValidEmail('test.example.com')).toBe(false)
  })

  it('should reject emails with length greater than 254 characters', () => {
    const invalidTooLongEmail = 'a'.repeat(243) + '@example.com' // 243 + 12 = 255
    expect(isValidEmail(invalidTooLongEmail)).toBe(false)
  })
})

describe('isValidPassword', () => {
  it('should accept passwords with 8 or more characters up to 128 characters', () => {
    expect(isValidPassword('12345678')).toBe(true)
    expect(isValidPassword('password123')).toBe(true)
    expect(isValidPassword('a'.repeat(128))).toBe(true)
  })

  it('should reject passwords with fewer than 8 characters', () => {
    expect(isValidPassword('')).toBe(false)
    expect(isValidPassword('1234567')).toBe(false)
  })

  it('should reject passwords with more than 128 characters', () => {
    expect(isValidPassword('a'.repeat(129))).toBe(false)
  })
})
