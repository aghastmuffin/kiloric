import RadialGauge from '@/components/Gague';
import { MotionView } from '@/components/MotionView';
import { SwipeableRow } from '@/components/SwipeableRow';
import { AppScreenHeader } from '@/components/ui/AppScreenHeader';
import { useAuth } from '@/lib/AuthContext';
import { showApiError } from '@/lib/apiErrors';
import { calculateGoalProgress, formatGoalProgress } from '@/lib/goals';
import { getTodayMeals, type MealDocument } from '@/lib/meals';
import { getProfile, type ProfileDocument } from '@/lib/profile';
import { createTask, deleteTask, listTasks, setTaskDone } from '@/lib/tasks';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useAppLayout } from '@/lib/theme/layout';
import { borderRadius, type ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { WATER_LOGGING_UI_ENABLED } from '@/lib/water';
import {
    formatWeightImperial,
    formatWeightMetric,
    parseDisplayUnitsPreference,
} from '@/lib/units';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DashboardData = {
  today: MealDocument[]
  profile: ProfileDocument | null
}

const emptyData: DashboardData = { today: [], profile: null }

function total(meals: MealDocument[], key: 'kcal' | 'protein' | 'carbs' | 'fat' | 'fluid') {
  return meals.reduce((sum, meal) => sum + (meal[key] ?? 0), 0)
}

function positiveTarget(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

function ProgressBar({
  value,
  max,
  label,
  color,
}: {
  value: number
  max: number
  label?: string
  color: string
}) {
  const { colors } = useTheme()
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const roundedPct = Math.round(pct)
  const accessibilityLabel = label ? `${label}: ${roundedPct}%` : `${roundedPct}% progress`

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max, now: Math.min(max, Math.max(0, value)) }}
      accessibilityLabel={accessibilityLabel}
      style={[stylesStatic.track, { backgroundColor: colors.progressTrail }]}
    >
      <MotionView
        from={{ width: '0%' }}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'timing', duration: 420 }}
        style={[stylesStatic.fill, { backgroundColor: color }]}
      />
    </View>
  )
}

type PersonalTask = { id: string; label: string; done: boolean }

type ChecklistItem = {
  key: string
  label: string
  done: boolean
  progress: string
  id?: string
}

export default function DashboardScreen() {
  const { user } = useAuth()
  const { colors } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { compact, gutter } = useAppLayout()
  const [data, setData] = useState<DashboardData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([])
  const [dismissedKeys, setDismissedKeys] = useState<string[]>([])
  const [taskModalVisible, setTaskModalVisible] = useState(false)

  useFocusEffect(
    useCallback(() => {
      void reloadKey
      let active = true
      if (!user?.$id) {
        setLoading(false)
        return
      }
      setLoading(true)
      setLoadError(null)
      Promise.all([
        getTodayMeals(user.$id),
        getProfile(user.$id),
        listTasks(user.$id),
      ])
        .then(([today, profile, tasks]) => {
          if (!active) return
          setData({ today, profile })
          setPersonalTasks(
            tasks.map((task) => ({
              id: task.$id,
              label: task.title,
              done: Boolean(task.done),
            })),
          )
        })
        .catch((error) => {
          console.warn('[Dashboard] load failed', error)
          if (active) setLoadError('Today’s record could not be refreshed. Check your connection and try again.')
        })
        .finally(() => active && setLoading(false))
      return () => { active = false }
    }, [reloadKey, user?.$id]),
  )

  const totals = useMemo(() => ({
    kcal: total(data.today, 'kcal'),
    protein: total(data.today, 'protein'),
    carbs: total(data.today, 'carbs'),
    fat: total(data.today, 'fat'),
    fluid: total(data.today, 'fluid'),
  }), [data.today])

  const kcalTarget = positiveTarget(data.profile?.target_kcal)
  const proteinTarget = positiveTarget(data.profile?.target_protein)
  const carbsTarget = positiveTarget(data.profile?.target_carbs)
  const fatTarget = positiveTarget(data.profile?.target_fat)
  const missingNutritionGoal = kcalTarget == null || proteinTarget == null || carbsTarget == null || fatTarget == null

  const displayUnits = useMemo(
    () => parseDisplayUnitsPreference(data.profile?.goal_plain, data.profile?.country),
    [data.profile?.goal_plain, data.profile?.country],
  )
  const formatWeight = useMemo(
    () => (displayUnits === 'imperial' ? formatWeightImperial : formatWeightMetric),
    [displayUnits],
  )
  const goalProgress = useMemo(() => calculateGoalProgress(data.profile), [data.profile])
  const goalSummary = useMemo(
    () => formatGoalProgress(goalProgress, formatWeight),
    [goalProgress, formatWeight],
  )

  const checklist = useMemo(() => {
    const items: ChecklistItem[] = []
    if (proteinTarget != null) {
      items.push({
        key: 'protein',
        label: 'Meet your protein target',
        done: totals.protein >= proteinTarget,
        progress: `${Math.round(totals.protein)}/${proteinTarget}g`,
      })
    }
    if (WATER_LOGGING_UI_ENABLED) {
      const fluidTarget = positiveTarget(data.profile?.daily_fluid)
      if (fluidTarget != null) {
        items.push({
          key: 'hydrate',
          label: 'Reach your water target',
          done: totals.fluid >= fluidTarget,
          progress: `${Math.round(totals.fluid)}/${fluidTarget}ml`,
        })
      }
    }
    for (const task of personalTasks) {
      items.push({
        key: task.id,
        label: task.label,
        done: task.done,
        progress: task.done ? 'Done' : 'Open',
        id: task.id,
      })
    }
    return items.filter((item) => !dismissedKeys.includes(item.key))
  }, [data.profile?.daily_fluid, dismissedKeys, personalTasks, proteinTarget, totals.fluid, totals.protein])

  const handleLogFood = useCallback(() => {
    router.push('/logfood')
  }, [router])

  const submitTask = useCallback((label: string) => {
    if (!user?.$id) return
    const optimisticId = `temp-${Date.now()}`
    setPersonalTasks((prev) => [...prev, { id: optimisticId, label, done: false }])
    setTaskModalVisible(false)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    void createTask(user.$id, { title: label })
      .then((task) => {
        setPersonalTasks((prev) =>
          prev.map((taskItem) => (taskItem.id === optimisticId ? { id: task.$id, label: task.title, done: Boolean(task.done) } : taskItem)),
        )
      })
      .catch((error) => {
        console.warn('[Dashboard] create task failed', error)
        setPersonalTasks((prev) => prev.filter((taskItem) => taskItem.id !== optimisticId))
        showApiError(error, 'appwrite')
      })
  }, [user])

  if (loading) {
    return (
      <View accessibilityState={{ busy: true }} style={styles.centered}>
        <ActivityIndicator color={colors.brand} />
        <Text style={styles.stateText}>Loading today…</Text>
      </View>
    )
  }

  const energyBalance = kcalTarget == null ? null : Math.round(kcalTarget - totals.kcal)
  const macros = [
    { label: 'Protein', value: totals.protein, max: proteinTarget, color: colors.protein },
    { label: 'Carbs', value: totals.carbs, max: carbsTarget, color: colors.carbs },
    { label: 'Fat', value: totals.fat, max: fatTarget, color: colors.fat },
  ] as const

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingHorizontal: gutter }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <AppScreenHeader
              title={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              description="Here’s what you’ve logged today and what’s left."
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log food"
            onPress={handleLogFood}
            style={({ pressed }) => [styles.logButton, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.logButtonText}>+ Log</Text>
          </Pressable>
        </View>

        {loadError ? (
          <View accessibilityLiveRegion="polite" style={styles.errorNotice}>
            <Ionicons name="cloud-offline-outline" size={20} color={colors.danger} />
            <Text style={styles.errorNoticeText}>{loadError}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading today"
              hitSlop={8}
              onPress={() => setReloadKey((key) => key + 1)}
              style={({ pressed }) => [styles.errorRetry, pressed && { opacity: 0.65 }]}
            >
              <Text style={styles.errorRetryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          {kcalTarget == null ? (
            <View style={styles.emptyGoals}>
              <Text style={styles.sectionTitle}>Energy</Text>
              <Text style={styles.empty}>Set a calorie goal before today’s balance can be drawn.</Text>
              <Pressable accessibilityRole="link" accessibilityLabel="Set goals" onPress={() => router.push('/config')}>
                <Text style={styles.link}>Set goals</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.heroHeader}>
                <View style={styles.heroTitleCopy}>
                  <Text style={styles.sectionTitle}>Energy</Text>
                </View>
                <Text style={styles.heroMeta}>
                  {energyBalance != null && energyBalance >= 0
                    ? `${energyBalance.toLocaleString()} kcal remaining`
                    : `${Math.abs(energyBalance ?? 0).toLocaleString()} kcal over target`}
                </Text>
              </View>
              <RadialGauge
                value={totals.kcal}
                max={kcalTarget}
                size={192}
                strokeWidth={10}
                color={colors.brand}
                backgroundColor={colors.progressTrail}
                textColor={colors.text}
                mutedColor={colors.textMuted}
              />
            </>
          )}
          <View style={[styles.macroStrip, compact && styles.macroStripCompact]}>
            {macros.map(({ label, value, max, color }) => (
              <View key={label} style={styles.macroCell}>
                <Text style={styles.macroLabel}>{label}</Text>
                {max == null ? (
                  <>
                    <Text style={styles.macroValue}>{Math.round(value)} g</Text>
                    <Pressable accessibilityRole="link" accessibilityLabel={`Set ${label} goal`} onPress={() => router.push('/config')}>
                      <Text style={styles.link}>Set goals</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={styles.macroValue}>{Math.round(value)} / {Math.round(max)} g</Text>
                    <ProgressBar value={value} max={max} label={label} color={color} />
                  </>
                )}
              </View>
            ))}
          </View>
          {missingNutritionGoal && kcalTarget != null ? (
            <Pressable accessibilityRole="link" accessibilityLabel="Set goals" onPress={() => router.push('/config')}>
              <Text style={styles.link}>Set goals</Text>
            </Pressable>
          ) : null}
        </View>

        {goalProgress ? (
          <View style={styles.goalProgressCard}>
            <View style={styles.goalProgressHeader}>
              <View style={styles.goalProgressTitle}>
                <Text style={styles.sectionTitle}>{goalSummary.label}</Text>
              </View>
              <View style={styles.goalProgressBadge}>
                <Text style={styles.goalProgressBadgeText}>{goalSummary.progressDisplay}</Text>
              </View>
            </View>
            <View style={styles.goalProgressBody}>
              <View style={styles.goalProgressMetrics}>
                <View style={styles.goalProgressMetric}>
                  <Text style={styles.goalProgressMetricLabel}>TARGET</Text>
                  <Text style={styles.goalProgressValue}>{goalSummary.targetWeightDisplay}</Text>
                </View>
                <View style={[styles.goalProgressMetric, styles.goalProgressMetricEnd]}>
                  <Text style={styles.goalProgressMetricLabel}>PACE</Text>
                  <Text style={styles.goalProgressValue}>{goalSummary.paceDisplay}</Text>
                </View>
              </View>
              <ProgressBar value={goalProgress.progress * 100} max={100} label={goalSummary.label} color={colors.brand} />
              {goalSummary.weeksDisplay ? (
                <Text style={styles.goalProgressMeta}>{goalSummary.weeksDisplay}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily checklist</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Add checklist item" onPress={() => setTaskModalVisible(true)}>
            <Text style={styles.link}>Add item</Text>
          </Pressable>
        </View>
        <View style={styles.ruledList}>
          {checklist.length === 0 ? (
            <Text style={styles.empty}>Your checklist is clear for today.</Text>
          ) : (
            checklist.map((item, index) => {
              const personalId = 'id' in item ? item.id : null
              return (
                <SwipeableRow
                  key={item.key}
                  swipeRight={{
                    label: 'Remove',
                    icon: 'trash-outline',
                    destructive: true,
                    onPress: () => {
                      if (personalId) {
                        setPersonalTasks((prev) => prev.filter((task) => task.id !== personalId))
                        if (user?.$id && !personalId.startsWith('temp-')) {
                          void deleteTask(user.$id, personalId).catch((error) => {
                            console.warn('[Dashboard] delete task failed', error)
                          })
                        }
                      }
                      setDismissedKeys((prev) =>
                        prev.includes(item.key) ? prev : [...prev, item.key],
                      )
                    },
                  }}
                >
                  <View style={[styles.checklistRow, index > 0 && styles.divider]}>
                    {personalId ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={item.done ? `Mark ${item.label} incomplete` : `Mark ${item.label} complete`}
                        onPress={() => {
                          if (!user?.$id) return
                          const nextDone = !item.done
                          setPersonalTasks((prev) =>
                            prev.map((task) => (task.id === personalId ? { ...task, done: nextDone } : task)),
                          )
                          if (personalId.startsWith('temp-')) return
                          void setTaskDone(user.$id, personalId, nextDone).catch((error) => {
                            console.warn('[Dashboard] update task failed', error)
                            setPersonalTasks((prev) =>
                              prev.map((task) => (task.id === personalId ? { ...task, done: !nextDone } : task)),
                            )
                          })
                        }}
                        hitSlop={8}
                        style={styles.checkTarget}
                      >
                        <View style={[styles.check, item.done && styles.checkDone]}>
                          {item.done && <Ionicons name="checkmark" size={15} color={colors.onAccent} />}
                        </View>
                      </Pressable>
                    ) : (
                      <View
                        accessibilityLabel={item.done ? `${item.label}: complete` : `${item.label}: in progress`}
                        style={styles.checkTarget}
                      >
                        <View
                          style={[
                            styles.check,
                            item.done ? styles.checkDone : styles.checkAuto,
                          ]}
                        >
                          {item.done && <Ionicons name="checkmark" size={15} color={colors.onAccent} />}
                        </View>
                      </View>
                    )}
                    <Text style={[styles.checklistText, item.done && styles.checklistDone]}>{item.label}</Text>
                    <Text style={styles.checklistProgress}>{item.progress}</Text>
                  </View>
                </SwipeableRow>
              )
            })
          )}
        </View>

        {/* Placeholder planners ( workouts / meds ) are development-only previews
            and intentionally have no production navigation entry points. */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Meals today</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View and edit today's meals"
            hitSlop={10}
            onPress={() => router.push('/logfood')}
          >
            <Text style={styles.link}>View all</Text>
          </Pressable>
        </View>
        <View style={styles.ruledList}>
          {data.today.length === 0 ? (
            <Text style={styles.empty}>No meals logged yet. Use + Log to add food.</Text>
          ) : data.today.map((meal) => (
            <View key={meal.$id} style={styles.mealRow}>
              <View>
                <Text style={styles.mealTitle}>{meal.friendlyname || meal.type || 'Meal'}</Text>
                <Text style={styles.mealMeta}>{meal.items?.length ?? 0} items</Text>
              </View>
              <Text style={styles.mealKcal}>{Math.round(meal.kcal ?? 0)} kcal</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <CreateTaskModal
        visible={taskModalVisible}
        onClose={() => setTaskModalVisible(false)}
        onSubmit={submitTask}
      />
    </View>
  )
}

function CreateTaskModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean
  onClose: () => void
  onSubmit: (label: string) => void
}) {
  const { colors } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const [taskDraft, setTaskDraft] = useState('')

  const close = useCallback(() => {
    setTaskDraft('')
    onClose()
  }, [onClose])

  const submit = useCallback(() => {
    const label = taskDraft.trim()
    if (!label) return
    setTaskDraft('')
    onSubmit(label)
  }, [onSubmit, taskDraft])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.taskBackdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={StyleSheet.absoluteFill}
          onPress={close}
        />
        <View accessibilityViewIsModal style={styles.taskCard}>
          <Text style={styles.taskTitle}>Add to your checklist</Text>
          <Text style={styles.taskHint}>What would you like to remember today?</Text>
          <TextInput
            value={taskDraft}
            onChangeText={setTaskDraft}
            placeholder="e.g. Evening stretch"
            placeholderTextColor={colors.textFaint}
            accessibilityLabel="Checklist item"
            style={styles.taskInput}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <View style={styles.taskActions}>
            <Pressable
              accessibilityRole="button"
              onPress={close}
              style={({ pressed }) => [styles.taskBtnGhost, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.taskBtnGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !taskDraft.trim() }}
              disabled={!taskDraft.trim()}
              onPress={submit}
              style={({ pressed }) => [styles.taskBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.taskBtnText}>Add</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}


const stylesStatic = StyleSheet.create({
  track: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
})

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  content: { paddingBottom: 48, gap: 24, alignSelf: 'center', width: '100%', maxWidth: 720 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: c.background },
  stateText: { ...typography.body, color: c.textMuted },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerCopy: { flex: 1, minWidth: 0 },
  logButton: { minHeight: 44, marginTop: 8, paddingHorizontal: 16, borderRadius: borderRadius.md, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' },
  logButtonText: { ...typography.label, color: c.onBrand },
  errorNotice: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderLeftWidth: 2, borderLeftColor: c.danger, backgroundColor: c.dangerSoft },
  errorNoticeText: { ...typography.bodySmall, color: c.textMuted, flex: 1 },
  errorRetry: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  errorRetryText: { ...typography.label, color: c.danger },
  heroCard: { backgroundColor: c.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: c.borderStrong, borderRadius: borderRadius.lg, padding: 16, alignItems: 'center', gap: 16 },
  emptyGoals: { width: '100%', alignItems: 'flex-start', gap: 8 },
  heroHeader: { width: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  heroTitleCopy: { flex: 1, minWidth: 0 },
  heroMeta: { ...typography.labelSmall, color: c.textMuted, textAlign: 'right', flexShrink: 1 },
  sectionTitle: { ...typography.metric, color: c.text },
  macroStrip: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, paddingTop: 14, width: '100%', gap: 16 },
  macroStripCompact: { gap: 8 },
  macroCell: { flex: 1, alignItems: 'center', gap: 5 },
  macroValue: { ...typography.numeric, color: c.text },
  macroLabel: { ...typography.labelSmall, color: c.textMuted },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.borderStrong, paddingBottom: 7 },
  ruledList: { paddingHorizontal: 4 },
  goalProgressCard: { backgroundColor: c.surface, borderWidth: StyleSheet.hairlineWidth, borderLeftWidth: 3, borderColor: c.border, borderLeftColor: c.brand, borderRadius: borderRadius.lg, padding: 18, gap: 16 },
  goalProgressHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  goalProgressTitle: { flex: 1, gap: 3 },
  goalProgressBadge: { minWidth: 46, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: c.brandSoft, alignItems: 'center' },
  goalProgressBadgeText: { ...typography.labelSmall, color: c.brand, fontWeight: '700' },
  goalProgressBody: { gap: 12 },
  goalProgressMetrics: { flexDirection: 'row', gap: 16 },
  goalProgressMetric: { flex: 1, gap: 3 },
  goalProgressMetricEnd: { alignItems: 'flex-end' },
  goalProgressMetricLabel: { ...typography.labelTiny, color: c.textFaint, letterSpacing: 0.7 },
  goalProgressValue: { ...typography.numeric, color: c.text },
  goalProgressMeta: { ...typography.labelSmall, color: c.textMuted },
  checklistRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  checkTarget: { width: 44, height: 44, marginHorizontal: -10, alignItems: 'center', justifyContent: 'center' },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkAuto: { borderStyle: 'dashed', borderColor: c.textFaint },
  checkDone: { backgroundColor: c.success, borderColor: c.success },
  checklistText: { ...typography.body, color: c.text, flex: 1 },
  checklistDone: { color: c.textMuted, textDecorationLine: 'line-through' },
  checklistProgress: { ...typography.numeric, color: c.success, fontSize: 13 },
  link: { ...typography.label, color: c.accent },
  empty: { ...typography.body, color: c.textMuted, paddingVertical: 16, textAlign: 'left' },
  mealRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  mealTitle: { ...typography.body, color: c.text, fontWeight: '600' },
  mealMeta: { ...typography.labelSmall, color: c.textMuted },
  mealKcal: { ...typography.numeric, color: c.text },
  taskBackdrop: {
    flex: 1,
    backgroundColor: c.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  taskCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: c.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 20,
    gap: 10,
  },
  taskTitle: { ...typography.headline, color: c.accent },
  taskHint: { ...typography.body, color: c.textMuted },
  taskInput: {
    ...typography.body,
    color: c.text,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  taskActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  taskBtnGhost: { minHeight: 44, paddingVertical: 10, paddingHorizontal: 14, justifyContent: 'center' },
  taskBtnGhostText: { ...typography.label, color: c.textMuted },
  taskBtn: {
    minHeight: 44,
    backgroundColor: c.brand,
    borderRadius: borderRadius.pill,
    paddingVertical: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  taskBtnText: { ...typography.label, color: c.onBrand, fontWeight: '500' },
})
