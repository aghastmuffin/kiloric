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

  it('should reject emails that are too long (greater than 254 characters) to prevent DoS', () => {
    const longEmail = 'a'.repeat(245) + '@example.com' // 245 + 12 = 257 chars
    expect(isValidEmail(longEmail)).toBe(false)
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

  it('should reject passwords with more than 128 characters to prevent hashing DoS', () => {
    expect(isValidPassword('a'.repeat(129))).toBe(false)
  })
})
