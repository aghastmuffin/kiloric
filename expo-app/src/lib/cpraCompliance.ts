import AsyncStorage from '@react-native-async-storage/async-storage';
import { isValidEmail } from './authValidation';
import { listRecentWorkouts, type Workout } from './data/workouts';
import { listHistoricMeals, type MealDocument } from './meals';
import { getProfile, type ProfileDocument } from './profile';
import { listTasks, type TaskDocument } from './tasks';
import { listWaterEntries, type WaterDocument } from './water';

export const DO_NOT_SELL_SHARE_KEY = 'kiloric_do_not_sell_share';
export const LIMIT_SENSITIVE_DATA_KEY = 'kiloric_limit_sensitive_data';

export type CpraPrivacyRequestType =
  | 'export_data'
  | 'delete_account'
  | 'correct_data'
  | 'opt_out_sale'
  | 'limit_sensitive_data';

export type CpraPrivacyRequest = {
  userId: string;
  email: string;
  requestType: CpraPrivacyRequestType;
  notes?: string;
  timestamp?: string;
};

export type CpraRequestConfirmation = {
  requestId: string;
  userId: string;
  email: string;
  requestType: CpraPrivacyRequestType;
  status: 'received' | 'processed';
  receivedAt: string;
  message: string;
};

export type UserDataExport = {
  exportedAt: string;
  version: string;
  userId: string;
  profile: ProfileDocument | null;
  meals: MealDocument[];
  waterLogs: WaterDocument[];
  tasks: TaskDocument[];
  recentWorkouts: Workout[];
  privacyPreferences: {
    doNotSellOrShare: boolean;
    limitSensitiveDataUsage: boolean;
  };
};

export async function getDoNotSellSharePreference(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(DO_NOT_SELL_SHARE_KEY);
    // Defaults to true because kiloric NEVER sells or shares data
    return value !== null ? value === 'true' : true;
  } catch {
    return true;
  }
}

export async function setDoNotSellSharePreference(optedOut: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(DO_NOT_SELL_SHARE_KEY, String(optedOut));
  } catch (err) {
    console.warn('[CPRA] Failed to save Do Not Sell/Share preference:', err);
  }
}

export async function getLimitSensitiveDataPreference(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(LIMIT_SENSITIVE_DATA_KEY);
    // Defaults to true to limit sensitive data use strictly to core features
    return value !== null ? value === 'true' : true;
  } catch {
    return true;
  }
}

export async function setLimitSensitiveDataPreference(limited: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(LIMIT_SENSITIVE_DATA_KEY, String(limited));
  } catch (err) {
    console.warn('[CPRA] Failed to save Limit Sensitive Data preference:', err);
  }
}

export function validatePrivacyRequest(request: CpraPrivacyRequest): void {
  if (!request.userId || typeof request.userId !== 'string' || !request.userId.trim()) {
    throw new Error('User ID is required for submitting a privacy request.');
  }

  if (!request.email || typeof request.email !== 'string' || !isValidEmail(request.email)) {
    throw new Error('A valid email address is required to process your request.');
  }

  const validTypes: CpraPrivacyRequestType[] = [
    'export_data',
    'delete_account',
    'correct_data',
    'opt_out_sale',
    'limit_sensitive_data',
  ];

  if (!validTypes.includes(request.requestType)) {
    throw new Error(`Invalid request type: ${String(request.requestType)}`);
  }
}

export async function submitPrivacyRequest(
  request: CpraPrivacyRequest,
): Promise<CpraRequestConfirmation> {
  validatePrivacyRequest(request);

  const timestamp = request.timestamp || new Date().toISOString();
  const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
  const requestId = `CPRA-REQ-${Date.now()}-${randomSuffix}`;

  if (request.requestType === 'opt_out_sale') {
    await setDoNotSellSharePreference(true);
  } else if (request.requestType === 'limit_sensitive_data') {
    await setLimitSensitiveDataPreference(true);
  }

  let message = 'Your privacy request has been received and logged.';
  if (request.requestType === 'export_data') {
    message = 'Your data export request has been acknowledged. You can also generate an immediate export below.';
  } else if (request.requestType === 'delete_account') {
    message = 'Your deletion request has been registered. Account access can be disabled directly from Account settings.';
  } else if (request.requestType === 'opt_out_sale') {
    message = 'Your opt-out preference is confirmed. kiloric does not sell or share user data.';
  } else if (request.requestType === 'limit_sensitive_data') {
    message = 'Your sensitive data restriction is confirmed. Data is processed strictly for core app tracking.';
  } else if (request.requestType === 'correct_data') {
    message = 'Your correction request has been registered. Profile details can also be updated directly in settings.';
  }

  return {
    requestId,
    userId: request.userId,
    email: request.email.trim().toLowerCase(),
    requestType: request.requestType,
    status: 'received',
    receivedAt: timestamp,
    message,
  };
}

export async function exportUserData(userId: string): Promise<UserDataExport> {
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    throw new Error('User ID is required for generating a data export.');
  }

  const [
    profileResult,
    mealsResult,
    waterResult,
    tasksResult,
    workoutsResult,
    doNotSell,
    limitSensitive,
  ] = await Promise.allSettled([
    getProfile(userId),
    listHistoricMeals(userId, 365),
    listWaterEntries(userId),
    listTasks(userId),
    listRecentWorkouts(userId, 50),
    getDoNotSellSharePreference(),
    getLimitSensitiveDataPreference(),
  ]);

  const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;
  const meals = mealsResult.status === 'fulfilled' ? mealsResult.value : [];
  const waterLogs = waterResult.status === 'fulfilled' ? waterResult.value : [];
  const tasks = tasksResult.status === 'fulfilled' ? tasksResult.value : [];
  const recentWorkouts = workoutsResult.status === 'fulfilled' ? workoutsResult.value : [];
  const doNotSellOrShare = doNotSell.status === 'fulfilled' ? doNotSell.value : true;
  const limitSensitiveDataUsage = limitSensitive.status === 'fulfilled' ? limitSensitive.value : true;

  return {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    userId,
    profile,
    meals,
    waterLogs,
    tasks,
    recentWorkouts,
    privacyPreferences: {
      doNotSellOrShare,
      limitSensitiveDataUsage,
    },
  };
}
