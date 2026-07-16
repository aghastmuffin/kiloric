import { AppwriteException } from 'react-native-appwrite'

export type ApiErrorSource = 'oracle' | 'appwrite'

export class ApiRequestError extends Error {
  readonly shown = true

  constructor(message: string) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

export function isApiRequestError(err: unknown): err is ApiRequestError {
  return err instanceof ApiRequestError
}

export function formatAppwriteError(err: unknown): string {
  if (err instanceof AppwriteException) {
    return err.message || `Appwrite error (${err.code})`
  }
  if (err instanceof Error) return err.message
  return 'Unknown Appwrite error'
}

export function formatOracleError(status: number, body: unknown): string {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const record = body as Record<string, unknown>
    if (typeof record.detail === 'string') return record.detail
    if (typeof record.message === 'string') return record.message
    if (typeof record.error === 'string') return record.error
  }
  if (typeof body === 'string' && body.trim()) return body
  return `Request failed (${status})`
}

export function formatApiError(error: unknown, source: ApiErrorSource): string {
  if (typeof error === 'string') return error
  if (source === 'appwrite') return formatAppwriteError(error)
  if (error instanceof Error) return error.message
  return 'Something went wrong'
}

type ApiErrorPayload = {
  message: string
  source: ApiErrorSource
  id: number
}

type ApiErrorListener = (payload: ApiErrorPayload) => void

let listener: ApiErrorListener | null = null
let nextId = 0

export function registerApiErrorListener(next: ApiErrorListener | null): void {
  listener = next
}

export function showApiError(error: unknown, source: ApiErrorSource = 'appwrite'): void {
  nextId += 1
  listener?.({
    id: nextId,
    source,
    message: formatApiError(error, source),
  })
}

/**
 * Safely logs Appwrite and generic errors to the console without leaking PII or raw responses.
 * Use this instead of console.error(err) for any Appwrite-related failures.
 */
export function logAppwriteError(tag: string, err: unknown): void {
  if (err instanceof AppwriteException) {
    console.error(
      `[${tag}] failed →`,
      JSON.stringify(
        {
          code: err.code,
          type: err.type,
          message: err.message,
        },
        null,
        2,
      ),
    )
    return
  }

  if (err instanceof Error) {
    // Only log essential Error properties to avoid leaking context that might be attached to custom error objects
    console.error(`[${tag}] failed →`, {
      name: err.name,
      message: err.message,
      stack: err.stack,
    })
    return
  }

  // Fallback for non-Error objects: ensures we don't accidentally log an object containing 'response' or PII
  console.error(`[${tag}] failed with unknown error type`)
}
