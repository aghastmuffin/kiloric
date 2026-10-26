import { apiClient } from './apiClient';
import { openURL } from 'expo-linking';
import { readAccountPreferences, updateAccountPreferences } from './accountPreferences';
import { isValidEmail } from './authValidation';
import { type Workout } from './data/workouts';
import { type MealDocument } from './meals';
import { type ProfileDocument } from './profile';
import { type TaskDocument } from './tasks';
import { type WaterDocument } from './water';

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
  status: 'draft_prepared';
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
    const value = (await readAccountPreferences())[DO_NOT_SELL_SHARE_KEY];
    // Defaults to true because kiloric NEVER sells or shares data
    return typeof value === 'boolean' ? value : true;
  } catch {
    return true;
  }
}

export async function setDoNotSellSharePreference(optedOut: boolean): Promise<void> {
  try {
    await updateAccountPreferences((current) => ({
      ...current,
      [DO_NOT_SELL_SHARE_KEY]: optedOut,
    }));
  } catch (err) {
    console.warn('[CPRA] Failed to save Do Not Sell/Share preference:', err);
    throw err;
  }
}

export async function getLimitSensitiveDataPreference(): Promise<boolean> {
  try {
    const value = (await readAccountPreferences())[LIMIT_SENSITIVE_DATA_KEY];
    // Defaults to true to limit sensitive data use strictly to core features
    return typeof value === 'boolean' ? value : true;
  } catch {
    return true;
  }
}

export async function setLimitSensitiveDataPreference(limited: boolean): Promise<void> {
  try {
    await updateAccountPreferences((current) => ({
      ...current,
      [LIMIT_SENSITIVE_DATA_KEY]: limited,
    }));
  } catch (err) {
    console.warn('[CPRA] Failed to save Limit Sensitive Data preference:', err);
    throw err;
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

  const subject = `Kiloric privacy request: ${request.requestType}`;
  const body = [
    `Account email: ${request.email.trim()}`,
    `User ID: ${request.userId}`,
    `Request type: ${request.requestType}`,
    `Draft reference: ${requestId}`,
    '', request.notes?.trim() || '',
  ].join('\n');
  await openURL(`mailto:data_privacy@kiloric.co?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  const message = 'Your privacy email draft is ready. Send it from your email app to submit the request. No request has been sent or registered by the app.';

  return {
    requestId,
    userId: request.userId,
    email: request.email.trim().toLowerCase(),
    requestType: request.requestType,
    status: 'draft_prepared',
    receivedAt: timestamp,
    message,
  };
}

export async function exportUserData(userId: string): Promise<UserDataExport> {
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    throw new Error('User ID is required for generating a data export.');
  }

  const data = await apiClient.get<Record<string, unknown>>('/v1/me/export');
  const profile = data.profile as ProfileDocument | null;
  if (profile?.$id !== userId) throw new Error('Export does not match the signed-in account.');
  const [doNotSellOrShare, limitSensitiveDataUsage] = await Promise.all([
    getDoNotSellSharePreference(), getLimitSensitiveDataPreference(),
  ]);
  const meals = data.meals as MealDocument[];
  const waterLogs = data.water_logs as WaterDocument[];
  const tasks = data.tasks as TaskDocument[];
  const recentWorkouts = data.workouts as Workout[];

  return {
    ...data,
    exportedAt: new Date().toISOString(),
    version: '1.0.0-beta.1',
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
