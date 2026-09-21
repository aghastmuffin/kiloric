// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { account } from './appwrite'
import { clearCachedToken, getAccessToken } from './getAccessToken'

vi.mock('./appwrite', () => ({
  account: {
    createJWT: vi.fn(),
  },
}))

describe('getAccessToken security & functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearCachedToken()
  })

  it('fetches and caches JWT token successfully', async () => {
    vi.mocked(account.createJWT).mockResolvedValue({ jwt: 'mock.jwt.token' })

    const token1 = await getAccessToken()
    expect(token1).toBe('mock.jwt.token')
    expect(account.createJWT).toHaveBeenCalledTimes(1)

    // Second call should hit in-memory cache
    const token2 = await getAccessToken()
    expect(token2).toBe('mock.jwt.token')
    expect(account.createJWT).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent inflight requests', async () => {
    let resolveJWT!: (val: { jwt: string }) => void
    const pendingPromise = new Promise<{ jwt: string }>((res) => {
      resolveJWT = res
    })
    vi.mocked(account.createJWT).mockReturnValue(pendingPromise)

    const req1 = getAccessToken()
    const req2 = getAccessToken()

    expect(account.createJWT).toHaveBeenCalledTimes(1)

    resolveJWT({ jwt: 'inflight.jwt.token' })

    const [res1, res2] = await Promise.all([req1, req2])
    expect(res1).toBe('inflight.jwt.token')
    expect(res2).toBe('inflight.jwt.token')
  })

  it('sanitizes error logging without leaking raw error objects or stack traces', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const sensitiveError = new Error('Appwrite session invalid or expired')
    sensitiveError.stack = 'Error: Appwrite session invalid\n    at SecretAuthHandler (/app/secret.ts:99:10)'
    vi.mocked(account.createJWT).mockRejectedValue(sensitiveError)

    const token = await getAccessToken()
    expect(token).toBeNull()

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
    const logArgs = consoleWarnSpy.mock.calls[0]
    expect(logArgs[0]).toBe('[getAccessToken] failed to create JWT:')
    expect(logArgs[1]).toBe('Appwrite session invalid or expired')
    // Verify entire raw error object/stack trace is NOT passed as an argument
    expect(logArgs).not.toContain(sensitiveError)

    consoleWarnSpy.mockRestore()
  })

  it('clears cached token and allows new fetch when clearCachedToken is called', async () => {
    vi.mocked(account.createJWT)
      .mockResolvedValueOnce({ jwt: 'first.jwt.token' })
      .mockResolvedValueOnce({ jwt: 'second.jwt.token' })

    const firstToken = await getAccessToken()
    expect(firstToken).toBe('first.jwt.token')

    clearCachedToken()

    const secondToken = await getAccessToken()
    expect(secondToken).toBe('second.jwt.token')
    expect(account.createJWT).toHaveBeenCalledTimes(2)
  })
})
