import { describe, it, expect } from 'vitest'
import { isValidEmail, isValidPassword } from './authValidation'

describe('isValidEmail', () => {
  it('should accept valid email formats', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name+tag@sub.domain.co')).toBe(true)
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(isValidEmail('123@456.com')).toBe(true)
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

  it('should reject emails that are too long (exceeding 254 characters)', () => {
    // Generate an email address with 255 characters
    const longEmail = 'a'.repeat(245) + '@example.com'
    expect(longEmail.length).toBe(257)
    expect(isValidEmail(longEmail)).toBe(false)

    // Exactly 254 characters should be okay if format is valid
    const borderEmail = 'a'.repeat(242) + '@example.com'
    expect(borderEmail.length).toBe(254)
    expect(isValidEmail(borderEmail)).toBe(true)
  })
})

describe('isValidPassword', () => {
  it('should accept passwords with 8 or more characters', () => {
    expect(isValidPassword('12345678')).toBe(true)
    expect(isValidPassword('password123')).toBe(true)
  })

  it('should reject passwords with fewer than 8 characters', () => {
    expect(isValidPassword('')).toBe(false)
    expect(isValidPassword('1234567')).toBe(false)
  })

  it('should reject passwords that are too long (exceeding 128 characters)', () => {
    const longPassword = 'p'.repeat(129)
    expect(longPassword.length).toBe(129)
    expect(isValidPassword(longPassword)).toBe(false)

    const borderPassword = 'p'.repeat(128)
    expect(borderPassword.length).toBe(128)
    expect(isValidPassword(borderPassword)).toBe(true)
  })
})
