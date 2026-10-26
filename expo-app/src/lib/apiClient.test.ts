import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {
  getItem: vi.fn(async () => null), setItem: vi.fn(async () => {}), removeItem: vi.fn(async () => {}),
} }))
import { clearTokens, getApiBaseUrl, request, revokeSession, setTokens } from './apiClient'

afterEach(async () => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); await clearTokens() })
describe('production API contract', () => {
  it('uses the production origin and avoids duplicate v1 prefixes', () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', '')
    expect(getApiBaseUrl()).toBe('https://api.kiloric.co')
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://api.kiloric.co/v1/')
    expect(getApiBaseUrl()).toBe('https://api.kiloric.co')
  })
  it('refreshes once and retries the original production request', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', '')
    await setTokens('expired', 'refresh-secret')
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'fresh', refresh_token: 'rotated' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ $id: 'user' })))
    vi.stubGlobal('fetch', fetcher)
    expect(await request('/v1/me')).toEqual({ $id: 'user' })
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      'https://api.kiloric.co/v1/me', 'https://api.kiloric.co/v1/auth/refresh', 'https://api.kiloric.co/v1/me',
    ])
    expect(fetcher.mock.calls[2][1].headers.Authorization).toBe('Bearer fresh')
  })
  it('sends the refresh token when revoking the session', async () => {
    await setTokens('access', 'refresh-secret')
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetcher)
    await revokeSession()
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ refresh_token: 'refresh-secret' })
  })
})
