// eslint-disable-next-line import/no-unresolved
import { describe, expect, it, vi } from 'vitest';
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

vi.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    default: {
      getItem: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
        return Promise.resolve();
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key);
        return Promise.resolve();
      }),
      clear: vi.fn(() => {
        store.clear();
        return Promise.resolve();
      }),
    },
  };
});

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
      expect(confirmation.status).toBe('received');
      expect(confirmation.message).toContain('export request');
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
      expect(exported.version).toBe('1.0.0');
      expect(exported.profile).toBeDefined();
      expect(exported.profile?.$id).toBe('profile_1');
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
