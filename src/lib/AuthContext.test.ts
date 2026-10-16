// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockCreateRecovery, mockUpdateRecovery } = vi.hoisted(() => ({
  mockCreateRecovery: vi.fn(),
  mockUpdateRecovery: vi.fn(),
}))

vi.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}))

vi.mock('react-native-appwrite', () => ({
  ID: {
    unique: () => 'unique-id',
  },
  AppwriteException: class extends Error {
    code: number
    type: string
    constructor(message: string, code: number, type: string) {
      super(message)
      this.code = code
      this.type = type
    }
  },
}))

vi.mock('./appwrite', () => ({
  account: {
    createRecovery: mockCreateRecovery,
    updateRecovery: mockUpdateRecovery,
    createEmailPasswordSession: vi.fn(),
    get: vi.fn(),
    deleteSession: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
  },
}))

vi.mock('./accountDeletion', () => ({
  purgeAccountData: vi.fn(),
}))

vi.mock('./appwriteSession', () => ({
  clearAppwriteSession: vi.fn(),
  persistAppwriteSession: vi.fn(),
  restoreAppwriteSession: vi.fn(() => Promise.resolve()),
}))

import { sendPasswordResetRequest, confirmPasswordResetRequest } from './AuthContext'

describe('AuthContext password recovery validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sendPasswordResetRequest rejects invalid emails', async () => {
    await expect(sendPasswordResetRequest('')).rejects.toThrow('Enter a valid email address.')
    await expect(sendPasswordResetRequest('invalid-email')).rejects.toThrow('Enter a valid email address.')
    await expect(sendPasswordResetRequest('user@.com')).rejects.toThrow('Enter a valid email address.')
    expect(mockCreateRecovery).not.toHaveBeenCalled()
  })

  it('sendPasswordResetRequest calls account.createRecovery for valid emails', async () => {
    mockCreateRecovery.mockResolvedValueOnce({} as any)

    await sendPasswordResetRequest('user@example.com')
    expect(mockCreateRecovery).toHaveBeenCalledWith({
      email: 'user@example.com',
      url: 'calorie://reset-password',
    })
  })

  it('confirmPasswordResetRequest rejects invalid inputs', async () => {
    await expect(confirmPasswordResetRequest('', 'secret123', 'newpassword123')).rejects.toThrow('Invalid user ID.')
    await expect(confirmPasswordResetRequest('user123', '', 'newpassword123')).rejects.toThrow('Invalid recovery secret.')
    await expect(confirmPasswordResetRequest('user123', 'secret123', 'short')).rejects.toThrow(
      'Password must be between 8 and 128 characters.',
    )
    expect(mockUpdateRecovery).not.toHaveBeenCalled()
  })

  it('confirmPasswordResetRequest calls account.updateRecovery for valid inputs', async () => {
    mockUpdateRecovery.mockResolvedValueOnce({} as any)

    await confirmPasswordResetRequest('user123', 'secret123', 'validPassword123')
    expect(mockUpdateRecovery).toHaveBeenCalledWith({
      userId: 'user123',
      secret: 'secret123',
      password: 'validPassword123',
    })
  })
})
