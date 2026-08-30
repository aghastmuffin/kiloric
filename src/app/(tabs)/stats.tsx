import { useAuth } from '@/lib/AuthContext';
import { AppScreenHeader } from '@/components/ui/AppScreenHeader';
import { resolveGoalState } from '@/lib/goals';
import { calculateEnergyTrend } from '@/lib/nutritionTrends';
import { getTodayMeals, listHistoricMeals, type MealDocument } from '@/lib/meals';
import { getProfile, type ProfileDocument } from '@/lib/profile';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useAppLayout } from '@/lib/theme/layout';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import {
    formatWeightImperial,
    formatWeightMetric,
    parseDisplayUnitsPreference,
} from '@/lib/units';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, memo, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Period = 'week' | 'month'
type StatsData = {
  meals: MealDocument[]
  profile: ProfileDocument | null
}
type DayTotal = {
  key: string
  date: Date
  kcal: number
  hasLog: boolean
  fullDateLabel: string
  axisLabel: string
}

const EMPTY_DATA: StatsData = { meals: [], profile: null }
const CHART_HEIGHT = 174

// Fast zero-padded YYYY-MM-DD date key formatting without String().padStart allocations
function dayKey(date: Date): string {
  const m = date.getMonth() + 1
  const d = date.getDate()
  return `${date.getFullYear()}-${m \u003c 10 ? '0' : ''}${m}-${d \u003c 10 ? '0' : ''}${d}`
}

function makeDays(
  totals: Map\u003cstring, { kcal: number; hasLog: boolean }>,
  period: Period,
): DayTotal[] {
  const count = period === 'week' ? 7 : 30
  const today = new Date()
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth()
  const todayDate = today.getDate()

  const days = new Array\u003cDayTotal>(count)
  for (let index = 0; index \u003c count; index++) {
    const date = new Date(todayYear, todayMonth, todayDate - (count - 1 - index))
    const key = dayKey(date)
    const total = totals.get(key)
    days[index] = {
      key,
      date,
      kcal: total?.kcal ?? 0,
      hasLog: total?.hasLog ?? false,
      fullDateLabel: date.toLocaleDateString(),
      axisLabel: period === 'week'
        ? date.toLocaleDateString(undefined, { weekday: 'short' })
        : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    }
  }
  return days
}
