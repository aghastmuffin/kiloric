import { AppwriteException } from 'react-native-appwrite'

export type UserBlockedDetails = {
  message: string
  details?: string
  code?: number
  type?: string
}

type UserBlockedListener = (details: UserBlockedDetails) => void

let listener: UserBlockedListener | null = null

export function registerUserBlockedListener(next: UserBlockedListener | null): void {
  listener = next
}

export function isUserBlockedError(err: unknown): boolean {
  if (!err) return false

  if (err instanceof AppwriteException) {
    if (err.type === 'user_blocked' || err.type === 'user_status_blocked') {
      return true
    }
    const msg = (err.message || '').toLowerCase()
    if (
      msg.includes('user_blocked') ||
      msg.includes('user-blocked') ||
      msg.includes('user has been blocked') ||
      msg.includes('current user has been blocked') ||
      msg.includes('user is blocked') ||
      msg.includes('account has been blocked') ||
      msg.includes('user disabled')
    ) {
      return true
    }
  }

  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (
      msg.includes('user_blocked') ||
      msg.includes('user-blocked') ||
      msg.includes('user has been blocked') ||
      msg.includes('current user has been blocked') ||
      msg.includes('user is blocked') ||
      msg.includes('account has been blocked') ||
      msg.includes('user disabled')
    ) {
      return true
    }
  }

  if (typeof err === 'object' && err !== null) {
    const rec = err as Record<string, unknown>
    if (rec.type === 'user_blocked' || rec.type === 'user_status_blocked') {
      return true
    }
    if (typeof rec.message === 'string') {
      const msg = rec.message.toLowerCase()
      if (
        msg.includes('user_blocked') ||
        msg.includes('user-blocked') ||
        msg.includes('user has been blocked') ||
        msg.includes('current user has been blocked') ||
        msg.includes('user is blocked') ||
        msg.includes('account has been blocked')
      ) {
        return true
      }
    }
  }

  if (typeof err === 'string') {
    const msg = err.toLowerCase()
    if (
      msg.includes('user_blocked') ||
      msg.includes('user-blocked') ||
      msg.includes('user has been blocked') ||
      msg.includes('user is blocked')
    ) {
      return true
    }
  }

  return false
}

export function parseUserBlockedDetails(err: unknown): UserBlockedDetails {
  if (err instanceof AppwriteException) {
    return {
      message: err.message || 'The current user account has been blocked.',
      details: `Appwrite Error ${err.code} (${err.type}): ${err.message}`,
      code: err.code,
      type: err.type,
    }
  }

  if (err instanceof Error) {
    return {
      message: err.message || 'The current user account has been blocked.',
      details: err.stack || err.message,
    }
  }

  if (typeof err === 'string') {
    return {
      message: err,
      details: err,
    }
  }

  return {
    message: 'The current user account has been blocked.',
    details: 'User account has been disabled or blocked on the authentication service.',
  }
}

export function notifyUserBlocked(err: unknown): void {
  const details = parseUserBlockedDetails(err)
  console.warn('[userBlocked] User blocked detected:', details)
  listener?.(details)
}
