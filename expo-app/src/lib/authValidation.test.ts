// eslint-disable-next-line import/no-unresolved
import { describe, it, expect } from 'vitest'
import {
  isValidEmail,
  isValidPassword,
  isValidUserId,
  isValidSecret,
  validateSignInInput,
  validateSignUpInput,
  validateSendPasswordResetInput,
  validateConfirmPasswordResetInput,
} from './authValidation'

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

  it('should reject email formats exceeding 254 characters', () => {
    const longDomain = 'a'.repeat(250) + '@example.com'
    expect(isValidEmail(longDomain)).toBe(false)
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

  it('should reject passwords exceeding 128 characters', () => {
    expect(isValidPassword('a'.repeat(129))).toBe(false)
  })
})

describe('isValidUserId', () => {
  it('should accept valid Persistence user IDs', () => {
    expect(isValidUserId('user_12345')).toBe(true)
    expect(isValidUserId('64f1a2b3c4d5e6f7a8b9c0d1')).toBe(true)
    expect(isValidUserId('a-b.c_123')).toBe(true)
  })

  it('should reject invalid user IDs', () => {
    expect(isValidUserId('')).toBe(false)
    expect(isValidUserId('   ')).toBe(false)
    expect(isValidUserId('user@name')).toBe(false)
    expect(isValidUserId('user/123')).toBe(false)
    expect(isValidUserId('a'.repeat(129))).toBe(false)
  })
})

describe('isValidSecret', () => {
  it('should accept valid secrets', () => {
    expect(isValidSecret('secret_token_123')).toBe(true)
    expect(isValidSecret('a'.repeat(512))).toBe(true)
  })

  it('should reject empty or overly long secrets', () => {
    expect(isValidSecret('')).toBe(false)
    expect(isValidSecret('   ')).toBe(false)
    expect(isValidSecret('a'.repeat(513))).toBe(false)
  })
})

describe('validation helpers', () => {
  it('validateSignInInput accepts valid inputs and throws on invalid inputs', () => {
    expect(() => validateSignInInput('user@example.com', 'password123')).not.toThrow()
    expect(() => validateSignInInput('invalid-email', 'password123')).toThrow('Invalid email format.')
    expect(() => validateSignInInput('user@example.com', 'short')).toThrow('Password must be between 8 and 128 characters.')
  })

  it('validateSignUpInput accepts valid inputs and throws on invalid inputs', () => {
    expect(() => validateSignUpInput('user@example.com', 'password123')).not.toThrow()
    expect(() => validateSignUpInput('invalid-email', 'password123')).toThrow('Invalid email format.')
    expect(() => validateSignUpInput('user@example.com', 'short')).toThrow('Password must be between 8 and 128 characters.')
  })

  it('validateSendPasswordResetInput accepts valid inputs and throws on invalid inputs', () => {
    expect(() => validateSendPasswordResetInput('user@example.com')).not.toThrow()
    expect(() => validateSendPasswordResetInput('invalid-email')).toThrow('Invalid email format.')
  })

  it('validateConfirmPasswordResetInput accepts valid inputs and throws on invalid inputs', () => {
    expect(() => validateConfirmPasswordResetInput('user_123', 'secret_abc', 'newpassword123')).not.toThrow()
    expect(() => validateConfirmPasswordResetInput('invalid user!', 'secret_abc', 'newpassword123')).toThrow('Invalid user ID.')
    expect(() => validateConfirmPasswordResetInput('user_123', '', 'newpassword123')).toThrow('Invalid recovery secret.')
    expect(() => validateConfirmPasswordResetInput('user_123', 'secret_abc', 'short')).toThrow('Password must be between 8 and 128 characters.')
  })
})
