import { CaloriesCard } from '@/components/cards/CaloriesCard'
import { PlanChecklist } from '@/components/cards/PlanChecklist'
import { PrepCard } from '@/components/cards/PrepCard'
import { CaloriesWeekCard, WeightCard } from '@/components/cards/ProgressCards'
import { ErrorNote, LoadingBlock, ScreenHeader, ScreenScroll, UButton, useShell } from '@/components/ds'
import { useAuth } from '@/lib/AuthContext'
import { greetingFor, longDate } from '@/lib/data/dateKeys'
import { setPlanEntryLogged, type PlanEntry } from '@/lib/data/mealPlan'
import { loadDashboard, loadToday, type PrepOverview, type ProgressData, type TodayOverview } from '@/lib/data/overview'
import { useFocusLoader } from '@/lib/data/useLoader'
import type { Workout } from '@/lib/data/workouts'
import { showApiError } from '@/lib/apiErrors'
import { fonts, usePalette } from '@/lib/theme/palette'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

function AvatarButton({ initial, ...props }: TabTriggerSlotProps & { initial: string }) {
  const c = usePalette()
  const { isFocused: _focused, ...rest } = props
  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityLabel="Account and settings"
      style={[styles.avatar, { backgroundColor: c.proteinSoft }]}
    >
      <Text style={[styles.avatarText, { color: c.protein }]}>{initial || '?'}</Text>
    </Pressable>
  )
}

function StreakPill({ days }: { days: number }) {
  const c = usePalette()
  return (
    <View
      accessible
      accessibilityLabel={`${days} day logging streak`}
      style={[styles.streak, { backgroundColor: c.peach }]}
    >
      <Ionicons name="flame-outline" size={18} color={c.peachInk} />
      <Text style={[styles.streakText, { color: c.peachInk }]}>{days}</Text>
    </View>
  )
}

export default function TodayScreen() {
  const { user } = useAuth()
  const { wide } = useShell()
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const userId = user?.$id ?? null

  const dashboard = useFocusLoader<{ today: TodayOverview; progress: ProgressData | null; prep: PrepOverview | null }>(
    () => (wide ? loadDashboard(userId!, user?.name) : loadToday(userId!, user?.name).then((today) => ({ today, progress: null, prep: null }))),
    userId ? `${userId}:${wide ? 'wide' : 'narrow'}` : null,
  )

  const data = dashboard.data
  const today = data?.today
  const now = new Date()
  const greeting = `${greetingFor(now)}${today?.summary.firstName ? `, ${today.summary.firstName}` : ''}`
  const initial = today?.summary.firstName.charAt(0) ?? user?.email?.charAt(0)?.toUpperCase() ?? ''

  async function toggleMeal(entry: PlanEntry) {
    if (!userId) return
    setBusyId(entry.$id)
    try {
      await setPlanEntryLogged(userId, entry, !entry.logged)
      await dashboard.reload()
    } catch (err) {
      showApiError(err, 'appwrite')
    } finally {
      setBusyId(null)
    }
  }

  function openWorkout(workout: Workout) {
    router.navigate({ pathname: '/train', params: { workout: workout.$id } })
  }

  const header = (
    <ScreenHeader
      overline={longDate(now)}
      title={greeting}
      right={
        <>
          {wide ? (
            <UButton label="+  Log food" size="sm" onPress={() => router.navigate('/logfood')} testID="header-log-food" />
          ) : today && today.streak > 0 ? (
            <StreakPill days={today.streak} />
          ) : null}
          <TabTrigger name="account" asChild>
            <AvatarButton initial={initial} />
          </TabTrigger>
        </>
      }
    />
  )

  if (!today) {
    return (
      <ScreenScroll>
        {header}
        {dashboard.error ? <ErrorNote message={dashboard.error} onRetry={dashboard.reload} /> : <LoadingBlock />}
      </ScreenScroll>
    )
  }

  const checklist = (
    <PlanChecklist
      plan={today.plan}
      workouts={today.workouts}
      onToggleMeal={toggleMeal}
      onOpenWorkout={openWorkout}
      onPlan={() => router.navigate('/plan')}
      busyId={busyId}
      compact={wide}
    />
  )

  if (wide && data?.progress && data.prep) {
    const { progress, prep } = data
    return (
      <ScreenScroll refreshing={dashboard.loading} onRefresh={dashboard.reload}>
        {header}
        {dashboard.error ? <ErrorNote message={dashboard.error} onRetry={dashboard.reload} /> : null}
        <View style={styles.gridRow}>
          <CaloriesCard eaten={today.eaten} burned={today.burned} targets={today.summary.targets} remaining={today.remaining} layout="wide" />
          {checklist}
          <PrepCard
            prep={prep}
            layout="dashboard"
            onGrocery={() => router.push('/grocery')}
            onEdit={() => router.push('/prep-edit')}
          />
        </View>
        <View style={styles.gridRow}>
          <WeightCard
            weights={progress.weights}
            units={progress.summary.units}
            fallbackKg={progress.summary.currentWeightKg}
            overline="Weight · last 30 days"
            compact
          />
          <CaloriesWeekCard bars={progress.bars} goal={progress.summary.targets.kcal} compact initials={false} />
        </View>
      </ScreenScroll>
    )
  }

  return (
    <ScreenScroll refreshing={dashboard.loading} onRefresh={dashboard.reload}>
      {header}
      {dashboard.error ? <ErrorNote message={dashboard.error} onRetry={dashboard.reload} /> : null}
      <CaloriesCard eaten={today.eaten} burned={today.burned} targets={today.summary.targets} remaining={today.remaining} layout="mobile" />
      {checklist}
    </ScreenScroll>
  )
}

const styles = StyleSheet.create({
  gridRow: { flexDirection: 'row', gap: 20, alignItems: 'stretch' },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bold, fontSize: 17 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 14, height: 44 },
  streakText: { fontFamily: fonts.bold, fontSize: 17 },
})
