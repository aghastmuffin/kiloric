// eslint-disable-next-line import/no-unresolved
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  exportUserData,
  getDoNotSellSharePreference,
  getLimitSensitiveDataPreference,
  setDoNotSellSharePreference,
  setLimitSensitiveDataPreference,
  submitPrivacyRequest,
  validatePrivacyRequest,
  type CpraPrivacyRequest,
} from './cpraCompliance';

const serverPrefs: Record<string, unknown> = {};

vi.mock('./accountPreferences', () => ({
  readAccountPreferences: vi.fn(async () => ({ ...serverPrefs })),
  updateAccountPreferences: vi.fn(async (update: (current: Record<string, unknown>) => Record<string, unknown>) => {
    const next = update({ ...serverPrefs });
    Object.keys(serverPrefs).forEach((key) => delete serverPrefs[key]);
    Object.assign(serverPrefs, next);
    return next;
  }),
}));

vi.mock('./apiClient', () => ({ apiClient: { get: vi.fn(async () => ({
  profile: { $id: 'user_123', username: 'testuser' },
  meals: [{ $id: 'meal_1' }], water_logs: [{ $id: 'water_1' }], tasks: [{ $id: 'task_1' }], workouts: [{ $id: 'workout_1' }],
  food_entries: [{ $id: 'food_1' }],
})) } }));

vi.mock('expo-linking', () => ({ openURL: vi.fn(async () => {}) }));

vi.mock('./profile', () => ({
  getProfile: vi.fn((userId: string) =>
    Promise.resolve({
      $id: 'profile_1',
      userId,
      username: 'testuser',
      goal_plain: 'Maintain weight',
      target_kcal: 2000,
    }),
  ),
}));

vi.mock('./meals', () => ({
  listHistoricMeals: vi.fn(() =>
    Promise.resolve([
      { $id: 'meal_1', title: 'Breakfast', kcal: 450, owner: 'user_123' },
    ]),
  ),
}));

vi.mock('./water', () => ({
  listWaterEntries: vi.fn(() =>
    Promise.resolve([
      { $id: 'water_1', amount_ml: 500, owner: 'user_123' },
    ]),
  ),
}));

vi.mock('./tasks', () => ({
  listTasks: vi.fn(() =>
    Promise.resolve([
      { $id: 'task_1', title: 'Walk 10,000 steps', userId: 'user_123', completed: false },
    ]),
  ),
}));

vi.mock('./data/workouts', () => ({
  listRecentWorkouts: vi.fn(() =>
    Promise.resolve([
      { id: 'workout_1', title: 'Morning Run', status: 'done', userId: 'user_123' },
    ]),
  ),
}));

describe('cpraCompliance', () => {
  beforeEach(() => {
    Object.keys(serverPrefs).forEach((key) => delete serverPrefs[key]);
  });

  describe('preferences', () => {
    it('defaults Do Not Sell/Share preference to true', async () => {
      const pref = await getDoNotSellSharePreference();
      expect(pref).toBe(true);
    });

    it('sets and retrieves Do Not Sell/Share preference', async () => {
      await setDoNotSellSharePreference(false);
      expect(await getDoNotSellSharePreference()).toBe(false);

      await setDoNotSellSharePreference(true);
      expect(await getDoNotSellSharePreference()).toBe(true);
    });

    it('defaults Limit Sensitive Data preference to true', async () => {
      const pref = await getLimitSensitiveDataPreference();
      expect(pref).toBe(true);
    });

    it('sets and retrieves Limit Sensitive Data preference', async () => {
      await setLimitSensitiveDataPreference(false);
      expect(await getLimitSensitiveDataPreference()).toBe(false);

      await setLimitSensitiveDataPreference(true);
      expect(await getLimitSensitiveDataPreference()).toBe(true);
    });
  });

  describe('validatePrivacyRequest', () => {
    it('accepts valid privacy requests', () => {
      const request: CpraPrivacyRequest = {
        userId: 'user_123',
        email: 'user@example.com',
        requestType: 'export_data',
        notes: 'Please export all my data.',
      };
      expect(() => validatePrivacyRequest(request)).not.toThrow();
    });

    it('rejects empty or missing userId', () => {
      const request: CpraPrivacyRequest = {
        userId: '',
        email: 'user@example.com',
        requestType: 'export_data',
      };
      expect(() => validatePrivacyRequest(request)).toThrow('User ID is required');
    });

    it('rejects invalid email formats', () => {
      const request: CpraPrivacyRequest = {
        userId: 'user_123',
        email: 'not-an-email',
        requestType: 'export_data',
      };
      expect(() => validatePrivacyRequest(request)).toThrow('A valid email address is required');
    });

    it('rejects invalid request types', () => {
      const request = {
        userId: 'user_123',
        email: 'user@example.com',
        requestType: 'unknown_type' as any,
      };
      expect(() => validatePrivacyRequest(request)).toThrow('Invalid request type');
    });
  });

  describe('submitPrivacyRequest', () => {
    it('processes a valid request and returns confirmation details', async () => {
      const confirmation = await submitPrivacyRequest({
        userId: 'user_123',
        email: 'user@example.com',
        requestType: 'export_data',
      });

      expect(confirmation.requestId).toMatch(/^CPRA-REQ-/);
      expect(confirmation.userId).toBe('user_123');
      expect(confirmation.email).toBe('user@example.com');
      expect(confirmation.requestType).toBe('export_data');
      expect(confirmation.status).toBe('draft_prepared');
      expect(confirmation.message).toContain('Send it from your email app');
    });

    it('automatically updates preference when submitting opt_out_sale', async () => {
      await setDoNotSellSharePreference(false);
      await submitPrivacyRequest({
        userId: 'user_123',
        email: 'user@example.com',
        requestType: 'opt_out_sale',
      });
      expect(await getDoNotSellSharePreference()).toBe(true);
    });
  });

  describe('exportUserData', () => {
    it('aggregates profile, meals, water, tasks, workouts, and privacy preferences into UserDataExport', async () => {
      const exported = await exportUserData('user_123');

      expect(exported.userId).toBe('user_123');
      expect(exported.version).toBe('1.0.0-beta.1');
      expect(exported.profile).toBeDefined();
      expect(exported.profile?.$id).toBe('user_123');
      expect(exported.meals).toHaveLength(1);
      expect(exported.waterLogs).toHaveLength(1);
      expect(exported.tasks).toHaveLength(1);
      expect(exported.recentWorkouts).toHaveLength(1);
      expect(exported.privacyPreferences).toEqual({
        doNotSellOrShare: true,
        limitSensitiveDataUsage: true,
      });
    });

    it('throws when userId is empty', async () => {
      await expect(exportUserData('')).rejects.toThrow('User ID is required');
    });
  });
});
