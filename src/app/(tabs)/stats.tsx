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

function getInsight(days: DayTotal[], goal: number | null): { title: string; body: string } {
  const logged = days.filter((day) => day.hasLog)
  if (logged.length === 0) {
    return {
      title: 'Start with one honest log',
      body: 'There is not enough meal data for a pattern yet. Logging a full day will make this view useful.',
    }
  }

  if (!goal) {
    return {
      title: logged.length >= days.length * 0.7 ? 'Your logging rhythm is taking shape' : 'Build a steadier baseline',
      body: `You logged meals on ${logged.length} of ${days.length} days. Set an energy goal to add goal-based guidance.`,
    }
  }

  const average = logged.reduce((sum, day) => sum + day.kcal, 0) / logged.length
  const onTarget = logged.filter((day) => Math.abs(day.kcal - goal) \u003c= goal * 0.15).length
  if (onTarget >= Math.max(2, logged.length * 0.7)) {
    return {
      title: 'Your energy intake looks steady',
      body: `${onTarget} of ${logged.length} logged days landed within 15% of your daily goal. Keep the routine repeatable.`,
    }
  }
  if (average > goal * 1.15) {
    return {
      title: 'Logged days are trending above goal',
      body: `Your logged-day average is ${Math.round(average - goal)} kcal above goal. Look for the meals driving the gap.`,
    }
  }
  if (average \u003c goal * 0.85) {
    return {
      title: 'Logged days are landing below goal',
      body: `Your logged-day average is ${Math.round(goal - average)} kcal below goal. Check that your logs are complete before adjusting intake.`,
    }
  }
  return {
    title: 'The average is close; the days vary',
    body: `Your logged-day average is within 15% of goal, with ${onTarget} individual days in range. Aim for a more even rhythm.`,
  }
}

function PeriodToggle({
  period,
  onChange,
}: {
  period: Period
  onChange: (period: Period) => void
}) {
  const styles = useThemedStyles(makeStyles)
  return (
    \u003cView style={styles.toggle} accessibilityRole="tablist">
      {(['week', 'month'] as const).map((option) => {
        const selected = option === period
        return (
          \u003cPressable
            key={option}
            accessibilityRole="tab"
            accessibilityLabel={option === 'week' ? 'Show the last 7 days' : 'Show the last 30 days'}
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            style={({ pressed }) => [
              styles.toggleButton,
              selected && styles.toggleButtonSelected,
              pressed && styles.pressed,
            ]}
          >
            \u003cText style={[styles.toggleText, selected && styles.toggleTextSelected]}>
              {option === 'week' ? '7 DAYS' : '30 DAYS'}
            \u003c/Text>
          \u003c/Pressable>
        )
      })}
    \u003c/View>
  )
}
