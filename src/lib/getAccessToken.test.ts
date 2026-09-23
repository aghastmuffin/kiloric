// eslint-disable-next-line import/no-unresolved
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCreateJWT } = vi.hoisted(() => ({
  mockCreateJWT: vi.fn(),
}))

vi.mock('@/lib/appwrite', () => ({
  account: {
    createJWT: mockCreateJWT,
  },
}))

describe('getAccessToken security & functionality', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { clearCachedToken } = await import('./getAccessToken')
    clearCachedToken()
  })

  it('fetches and returns a JWT token from Appwrite', async () => {
    mockCreateJWT.mockResolvedValueOnce({ jwt: 'mock-jwt-token-123' })
    const { getAccessToken } = await import('./getAccessToken')

    const token = await getAccessToken()
    expect(token).toBe('mock-jwt-token-123')
    expect(mockCreateJWT).toHaveBeenCalledTimes(1)
  })

  it('caches the token in memory and reuses it on subsequent calls', async () => {
    mockCreateJWT.mockResolvedValueOnce({ jwt: 'mock-jwt-token-cached' })
    const { getAccessToken } = await import('./getAccessToken')

    const token1 = await getAccessToken()
    const token2 = await getAccessToken()

    expect(token1).toBe('mock-jwt-token-cached')
    expect(token2).toBe('mock-jwt-token-cached')
    expect(mockCreateJWT).toHaveBeenCalledTimes(1)
  })

  it('deduplicates parallel inflight requests', async () => {
    let resolveJWT!: (value: { jwt: string }) => void
    const pendingPromise = new Promise<{ jwt: string }>((resolve) => {
      resolveJWT = resolve
    })
    mockCreateJWT.mockReturnValueOnce(pendingPromise)

    const { getAccessToken } = await import('./getAccessToken')

    const p1 = getAccessToken()
    const p2 = getAccessToken()

    resolveJWT({ jwt: 'parallel-jwt' })

    const [t1, t2] = await Promise.all([p1, p2])
    expect(t1).toBe('parallel-jwt')
    expect(t2).toBe('parallel-jwt')
    expect(mockCreateJWT).toHaveBeenCalledTimes(1)
  })

  it('clears cached token when clearCachedToken is called', async () => {
    mockCreateJWT
      .mockResolvedValueOnce({ jwt: 'token-1' })
      .mockResolvedValueOnce({ jwt: 'token-2' })

    const { getAccessToken, clearCachedToken } = await import('./getAccessToken')

    const t1 = await getAccessToken()
    expect(t1).toBe('token-1')

    clearCachedToken()

    const t2 = await getAccessToken()
    expect(t2).toBe('token-2')
    expect(mockCreateJWT).toHaveBeenCalledTimes(2)
  })

  it('sanitizes error logging when createJWT fails without exposing raw error object', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const secretError = new Error('Appwrite auth error with secret stack details')

    mockCreateJWT.mockRejectedValueOnce(secretError)

    const { getAccessToken } = await import('./getAccessToken')

    const token = await getAccessToken()
    expect(token).toBeNull()
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[getAccessToken] failed to create JWT:',
      'Appwrite auth error with secret stack details',
    )

    consoleWarnSpy.mockRestore()
  })
})
