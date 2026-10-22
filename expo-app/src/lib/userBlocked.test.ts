// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppwriteException } from 'react-native-appwrite'
import {
  isUserBlockedError,
  parseUserBlockedDetails,
  registerUserBlockedListener,
  notifyUserBlocked,
} from './userBlocked'

vi.mock('react-native-appwrite', () => {
  return {
    AppwriteException: class extends Error {
      code: number
      type: string
      constructor(message: string, code: number = 0, type: string = '') {
        super(message)
        this.name = 'AppwriteException'
        this.code = code
        this.type = type
      }
    },
  }
})

describe('userBlocked utility', () => {
  beforeEach(() => {
    registerUserBlockedListener(null)
  })

  describe('isUserBlockedError', () => {
    it('returns false for null, undefined, or empty values', () => {
      expect(isUserBlockedError(null)).toBe(false)
      expect(isUserBlockedError(undefined)).toBe(false)
      expect(isUserBlockedError('')).toBe(false)
    })

    it('identifies AppwriteException with user_blocked type or message', () => {
      const errType = new AppwriteException('User is blocked', 401, 'user_blocked')
      expect(isUserBlockedError(errType)).toBe(true)

      const errMsg = new AppwriteException('The user has been blocked by admin', 401, 'general_error')
      expect(isUserBlockedError(errMsg)).toBe(true)

      const errNormal = new AppwriteException('Network request failed', 500, 'network_error')
      expect(isUserBlockedError(errNormal)).toBe(false)
    })

    it('identifies standard Error with blocked message', () => {
      expect(isUserBlockedError(new Error('user is blocked'))).toBe(true)
      expect(isUserBlockedError(new Error('account has been blocked'))).toBe(true)
      expect(isUserBlockedError(new Error('regular error'))).toBe(false)
    })

    it('identifies object or string representation of blocked errors', () => {
      expect(isUserBlockedError({ type: 'user_status_blocked' })).toBe(true)
      expect(isUserBlockedError('user_blocked')).toBe(true)
      expect(isUserBlockedError('something went wrong')).toBe(false)
    })
  })

  describe('parseUserBlockedDetails', () => {
    it('formats AppwriteException details without leaking sensitive internals', () => {
      const appwriteErr = new AppwriteException('User is disabled', 401, 'user_blocked')
      const details = parseUserBlockedDetails(appwriteErr)
      expect(details.message).toBe('User is disabled')
      expect(details.code).toBe(401)
      expect(details.type).toBe('user_blocked')
      expect(details.details).toContain('Appwrite Error 401')
    })

    it('does not expose internal stack traces when parsing standard Error instances', () => {
      const err = new Error('User blocked error message')
      err.stack = 'Error: User blocked error message\n    at SecretFunction (/app/src/secret.ts:42:10)'

      const parsed = parseUserBlockedDetails(err)
      expect(parsed.message).toBe('User blocked error message')
      expect(parsed.details).toBe('User blocked error message')
      expect(parsed.details).not.toContain('SecretFunction')
      expect(parsed.details).not.toContain('/app/src/secret.ts')
      expect(parsed.details).not.toContain('at ')
    })

    it('handles string errors and unknown error fallbacks safely', () => {
      const stringDetails = parseUserBlockedDetails('User blocked via string')
      expect(stringDetails.message).toBe('User blocked via string')

      const unknownDetails = parseUserBlockedDetails({})
      expect(unknownDetails.message).toBe('The current user account has been blocked.')
      expect(unknownDetails.details).toBe('User account has been disabled or blocked on the authentication service.')
    })
  })

  describe('notifyUserBlocked', () => {
    it('notifies registered listeners with parsed details', () => {
      const listener = vi.fn()
      registerUserBlockedListener(listener)

      notifyUserBlocked(new Error('user is blocked'))

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith({
        message: 'user is blocked',
        details: 'user is blocked',
      })
    })
  })
})
