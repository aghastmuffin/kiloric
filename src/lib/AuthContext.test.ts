// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi } from 'vitest'

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}))

vi.mock('./appwrite', () => ({
  account: {
    createEmailPasswordSession: vi.fn(),
    create: vi.fn(),
    createRecovery: vi.fn(),
    updateRecovery: vi.fn(),
    get: vi.fn(),
  },
}))

vi.mock('./appwriteSession', () => ({
  persistAppwriteSession: vi.fn(),
  restoreAppwriteSession: vi.fn(),
  clearAppwriteSession: vi.fn(),
}))

vi.mock('./accountDeletion', () => ({
  purgeAccountData: vi.fn(),
}))

vi.mock('react-native-appwrite', () => ({
  ID: { unique: () => 'unique_id' },
}))

import {
  validateSignInInput,
  validateSignUpInput,
  validateSendPasswordResetInput,
  validateConfirmPasswordResetInput,
  getAuthErrorMessage,
} from './AuthContext'

describe('AuthContext Input Validation Security', () => {
  describe('validateSignInInput', () => {
    it('accepts valid email and valid password', () => {
      expect(() => validateSignInInput('user@example.com', 'validPassword123')).not.toThrow()
    })

    it('rejects invalid email address', () => {
      expect(() => validateSignInInput('notanemail', 'validPassword123')).toThrow('Invalid email address.')
      expect(() => validateSignInInput('user@.com', 'validPassword123')).toThrow('Invalid email address.')
    })

    it('rejects passwords shorter than 8 characters or longer than 128 characters', () => {
      expect(() => validateSignInInput('user@example.com', 'short')).toThrow(
        'Password must be between 8 and 128 characters.',
      )
      expect(() => validateSignInInput('user@example.com', 'a'.repeat(129))).toThrow(
        'Password must be between 8 and 128 characters.',
      )
    })
  })

  describe('validateSignUpInput', () => {
    it('accepts valid email and valid password', () => {
      expect(() => validateSignUpInput('newuser@example.com', 'validPassword123')).not.toThrow()
    })

    it('rejects malformed emails', () => {
      expect(() => validateSignUpInput('bademail', 'validPassword123')).toThrow('Invalid email address.')
    })

    it('rejects short passwords', () => {
      expect(() => validateSignUpInput('newuser@example.com', '123')).toThrow(
        'Password must be between 8 and 128 characters.',
      )
    })
  })

  describe('validateSendPasswordResetInput', () => {
    it('accepts valid email for password reset', () => {
      expect(() => validateSendPasswordResetInput('reset@example.com')).not.toThrow()
    })

    it('rejects invalid email for password reset', () => {
      expect(() => validateSendPasswordResetInput('invalid-email')).toThrow('Invalid email address.')
    })
  })

  describe('validateConfirmPasswordResetInput', () => {
    it('accepts valid userId, secret, and new password', () => {
      expect(() =>
        validateConfirmPasswordResetInput('user_123.abc-XYZ', 'validSecretToken', 'newValidPassword123'),
      ).not.toThrow()
    })

    it('rejects invalid userId format containing spaces or illegal characters', () => {
      expect(() =>
        validateConfirmPasswordResetInput('invalid user id!', 'validSecret', 'newValidPassword123'),
      ).toThrow('Invalid user ID format.')
      expect(() =>
        validateConfirmPasswordResetInput('a'.repeat(129), 'validSecret', 'newValidPassword123'),
      ).toThrow('Invalid user ID format.')
    })

    it('rejects empty or whitespace-only recovery secret', () => {
      expect(() => validateConfirmPasswordResetInput('user_123', '', 'newValidPassword123')).toThrow(
        'Invalid recovery secret.',
      )
      expect(() => validateConfirmPasswordResetInput('user_123', '   ', 'newValidPassword123')).toThrow(
        'Invalid recovery secret.',
      )
    })

    it('rejects short or oversized new passwords', () => {
      expect(() => validateConfirmPasswordResetInput('user_123', 'validSecret', 'short')).toThrow(
        'Password must be between 8 and 128 characters.',
      )
    })
  })

  describe('getAuthErrorMessage', () => {
    it('extracts error message from Error instances', () => {
      expect(getAuthErrorMessage(new Error('Auth failed'))).toBe('Auth failed')
    })

    it('returns default fallback for non-Error thrown objects', () => {
      expect(getAuthErrorMessage('some string')).toBe('Unknown error')
      expect(getAuthErrorMessage(null)).toBe('Unknown error')
    })
  })
})
