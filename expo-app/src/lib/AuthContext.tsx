import { purgeAccountData } from '@/lib/accountDeletion'
import { apiClient, clearTokens, getAccessToken, setTokens } from '@/lib/apiClient'
import { clearAppwriteSession, restoreAppwriteSession } from '@/lib/appwriteSession'
import {
  validateConfirmPasswordResetInput,
  validateSendPasswordResetInput,
  validateSignInInput,
  validateSignUpInput,
} from '@/lib/authValidation'
import { setCachedUserId } from '@/lib/sessionAuth'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type AuthUser = {
  $id: string
  id: string
  email: string
  name: string
  username: string
  prefs: Record<string, unknown>
  [key: string]: unknown
}

export type SignUpResult = 'signed_in' | 'verification_required'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  signIn: (identity: string, password: string) => Promise<boolean>
  signUp: (email: string, password: string) => Promise<SignUpResult>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  confirmPasswordReset: (userId: string, secret: string, password: string) => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function authErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return 'Unknown error'
}

function normalizeAuthUser(raw: Record<string, unknown>): AuthUser {
  const id = (raw.$id as string) || (raw.id as string) || ''
  const email = (raw.email as string) || ''
  const username = (raw.username as string) || email.split('@')[0] || ''
  return {
    ...raw,
    $id: id,
    id,
    email,
    username,
    name: username || email,
    prefs: (raw.prefs as Record<string, unknown>) || {},
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const token = await getAccessToken()
      if (!token) {
        setUser(null)
        setCachedUserId(null)
        return
      }
      const raw = await apiClient.get<Record<string, unknown>>('/v1/me')
      if (raw && (raw.$id || raw.id)) {
        const u = normalizeAuthUser(raw)
        setUser(u)
        setCachedUserId(u.$id)
      } else {
        setUser(null)
        setCachedUserId(null)
      }
    } catch {
      setUser(null)
      setCachedUserId(null)
    }
  }, [])

  useEffect(() => {
    refreshUser().finally(() => setLoading(false))
  }, [refreshUser])

  const signIn = useCallback(async (identity: string, password: string): Promise<boolean> => {
    validateSignInInput(identity, password)
    const res = await apiClient.post<{
      access_token: string
      refresh_token: string
      user: Record<string, unknown>
    }>('/v1/auth/login', { identity: identity.trim(), password }, { skipAuth: true })

    if (res?.access_token) {
      await setTokens(res.access_token, res.refresh_token)
      const u = normalizeAuthUser(res.user)
      setUser(u)
      setCachedUserId(u.$id)
      return true
    }
    return false
  }, [])

  const signUp = useCallback(async (email: string, password: string): Promise<SignUpResult> => {
    validateSignUpInput(email, password)
    const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 32) || 'user'
    const username = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`

    const res = await apiClient.post<{
      access_token: string
      refresh_token: string
      user: Record<string, unknown>
    }>('/v1/auth/register', { email: email.trim().toLowerCase(), username, password }, { skipAuth: true })

    if (res?.access_token) {
      await setTokens(res.access_token, res.refresh_token)
      const u = normalizeAuthUser(res.user)
      setUser(u)
      setCachedUserId(u.$id)
      return 'signed_in'
    }
    return 'verification_required'
  }, [])

  const clearUserState = useCallback(async () => {
    await clearTokens()
    await clearAppwriteSession()
    setCachedUserId(null)
    setUser(null)
  }, [])

  const signOut = useCallback(async () => {
    try {
      await apiClient.post('/v1/auth/logout', {}).catch(() => {})
    } finally {
      await clearUserState()
    }
  }, [clearUserState])

  const sendPasswordReset = useCallback(async (email: string) => {
    validateSendPasswordResetInput(email)
    await apiClient.post('/v1/auth/reset-password-request', { email: email.trim().toLowerCase() }, { skipAuth: true })
  }, [])

  const confirmPasswordReset = useCallback(
    async (userId: string, secret: string, password: string) => {
      validateConfirmPasswordResetInput(userId, secret, password)
      await apiClient.post(
        '/v1/auth/reset-password-confirm',
        { token: secret, new_password: password },
        { skipAuth: true },
      )
    },
    [],
  )

  const deleteAccount = useCallback(async () => {
    if (!user?.$id) throw new Error('No signed-in account to delete.')
    await purgeAccountData(user.$id)
    await apiClient.delete('/v1/me').catch(() => {})
    await clearUserState()
  }, [clearUserState, user])

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      confirmPasswordReset,
      deleteAccount,
    }),
    [confirmPasswordReset, deleteAccount, loading, sendPasswordReset, signIn, signOut, signUp, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export function getAuthErrorMessage(err: unknown): string {
  return authErrorMessage(err)
}
