import RadialGauge from '@/components/Gague';
import { MotionView } from '@/components/MotionView';
import { SwipeableRow } from '@/components/SwipeableRow';
import { AppScreenHeader } from '@/components/ui/AppScreenHeader';
import { NoiseOverlay } from '@/components/ui/NoiseOverlay';
import { useAuth } from '@/lib/AuthContext';
import { showApiError } from '@/lib/apiErrors';
import { calculateGoalProgress, formatGoalProgress } from '@/lib/goals';
import { getTodayMeals, type MealDocument } from '@/lib/meals';
import { panelSpring, quickTiming } from '@/lib/motion';
import { getProfile, type ProfileDocument } from '@/lib/profile';
import { createTask, deleteTask, listTasks, setTaskDone } from '@/lib/tasks';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useAppLayout } from '@/lib/theme/layout';
import { borderRadius, type ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import {
    formatWeightImperial,
    formatWeightMetric,
    parseDisplayUnitsPreference,
} from '@/lib/units';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import Animated, {
    Extrapolation,
    interpolate,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FAB_SIZE = 48
const MENU_WIDTH = 196
const MENU_HEIGHT = 140

type DashboardData = {
  today: MealDocument[]
  profile: ProfileDocument | null
}

const emptyData: DashboardData = { today: [], profile: null }

function total(meals: MealDocument[], key: 'kcal' | 'protein' | 'carbs' | 'fat' | 'fluid') {
  return meals.reduce((sum, meal) => sum + (meal[key] ?? 0), 0)
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const { colors } = useTheme()
  const pct = Math.min(100, Math.max(0, (value / Math.max(1, max)) * 100))
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max, now: Math.min(max, Math.max(0, value)) }}
      style={[stylesStatic.track, { backgroundColor: colors.progressTrail }]}
    >
      <MotionView
        from={{ width: '0%' }}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'timing', duration: 420 }}
        style={[stylesStatic.fill, { backgroundColor: colors.success }]}
      />
    </View>
  )
}

type PersonalQuest = { id: string; label: string; done: boolean }

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
  const [fabOpen, setFabOpen] = useState(false)
  const [personalQuests, setPersonalQuests] = useState<PersonalQuest[]>([])
  const [dismissedQuestKeys, setDismissedQuestKeys] = useState<string[]>([])
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
          setPersonalQuests(
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

  const targets = {
    kcal: data.profile?.target_kcal ?? 2000,
    protein: data.profile?.target_protein ?? 120,
    carbs: data.profile?.target_carbs ?? 250,
    fat: data.profile?.target_fat ?? 70,
    fluid: data.profile?.daily_fluid ?? 2000,
  }

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

  const quests = useMemo(
    () => [
    { key: 'meals', label: 'Log three meals', done: data.today.length >= 3, progress: `${Math.min(data.today.length, 3)}/3` },
    { key: 'protein', label: 'Meet your protein target', done: totals.protein >= targets.protein, progress: `${Math.round(totals.protein)}/${targets.protein}g` },
    { key: 'hydrate', label: 'Hydrate with intention', done: totals.fluid >= targets.fluid, progress: `${Math.round(totals.fluid)}/${targets.fluid}ml` },
    ...personalQuests.map((q) => ({
      key: q.id,
      label: q.label,
      done: q.done,
      progress: q.done ? 'Done' : 'Open',
      id: q.id,
    })),
  ].filter((quest) => !dismissedQuestKeys.includes(quest.key)), [
    data.today.length,
    dismissedQuestKeys,
    personalQuests,
    targets.fluid,
    targets.protein,
    totals.fluid,
    totals.protein,
  ])

  const closeFab = useCallback(() => setFabOpen(false), [])
  const toggleFab = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setFabOpen((open) => !open)
  }, [])

  const handleLogFood = useCallback(() => {
    setFabOpen(false)
    router.push('/logfood')
  }, [router])

  const handleCreateTask = useCallback(() => {
    setFabOpen(false)
    setTaskModalVisible(true)
  }, [])

  const submitTask = useCallback((label: string) => {
    if (!user?.$id) return
    const optimisticId = `temp-${Date.now()}`
    setPersonalQuests((prev) => [...prev, { id: optimisticId, label, done: false }])
    setTaskModalVisible(false)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    void createTask(user.$id, { title: label })
      .then((task) => {
        setPersonalQuests((prev) =>
          prev.map((q) => (q.id === optimisticId ? { id: task.$id, label: task.title, done: Boolean(task.done) } : q)),
        )
      })
      .catch((error) => {
        console.warn('[Dashboard] create task failed', error)
        setPersonalQuests((prev) => prev.filter((q) => q.id !== optimisticId))
        showApiError(error, 'appwrite')
      })
  }, [user])

  if (loading) {
    return (
      <View accessibilityState={{ busy: true }} style={styles.centered}>
        <ActivityIndicator color={colors.brand} />
        <Text style={styles.stateText}>Preparing today’s record…</Text>
      </View>
    )
  }

  const energyBalance = Math.round(targets.kcal - totals.kcal)

  return (
    <View style={styles.screen}>
      <NoiseOverlay />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingHorizontal: gutter }]}
        showsVerticalScrollIndicator={false}
      >
        <AppScreenHeader
          overline="Today"
          title={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          description="A clear view of today’s nutrition and routines."
        />

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
              <Text style={styles.errorRetryText}>RETRY</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroTitleCopy}>
              <Text style={styles.eyebrow}>DAILY BALANCE</Text>
              <Text style={styles.sectionTitle}>Energy</Text>
            </View>
            <Text style={styles.heroMeta}>
              {energyBalance >= 0
                ? `${energyBalance.toLocaleString()} kcal remaining`
                : `${Math.abs(energyBalance).toLocaleString()} kcal over target`}
            </Text>
          </View>
          <RadialGauge
            value={totals.kcal}
            max={targets.kcal}
            size={192}
            strokeWidth={10}
            color={colors.accent}
            backgroundColor={colors.progressTrail}
            textColor={colors.accent}
            mutedColor={colors.textMuted}
          />
          <View style={[styles.macroStrip, compact && styles.macroStripCompact]}>
            {([
              ['Protein', totals.protein, targets.protein],
              ['Carbs', totals.carbs, targets.carbs],
              ['Fat', totals.fat, targets.fat],
            ] as const).map(([label, value, max]) => (
              <View key={label} style={styles.macroCell}>
                <Text style={styles.macroLabel}>{label}</Text>
                <Text style={styles.macroValue}>{Math.round(value)} / {Math.round(max)} g</Text>
                <ProgressBar value={value} max={max} />
              </View>
            ))}
          </View>
        </View>

        {goalProgress ? (
          <View style={styles.goalProgressCard}>
            <View style={styles.goalProgressHeader}>
              <View style={styles.goalProgressTitle}>
                <Text style={styles.eyebrow}>GOAL</Text>
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
              <ProgressBar value={goalProgress.progress * 100} max={100} />
              {goalSummary.weeksDisplay ? (
                <Text style={styles.goalProgressMeta}>{goalSummary.weeksDisplay}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today’s plan</Text>
          <Text style={styles.sectionMeta}>{quests.filter((q) => q.done).length}/{quests.length}</Text>
        </View>
        <View style={styles.card}>
          {quests.length === 0 ? (
            <Text style={styles.empty}>No quests for today.</Text>
          ) : (
            quests.map((quest, index) => {
              const personalId = 'id' in quest ? quest.id : null
              return (
                <SwipeableRow
                  key={quest.key}
                  swipeRight={{
                    label: 'Remove',
                    icon: 'trash-outline',
                    destructive: true,
                    onPress: () => {
                      if (personalId) {
                        setPersonalQuests((prev) => prev.filter((q) => q.id !== personalId))
                        if (user?.$id && !personalId.startsWith('temp-')) {
                          void deleteTask(user.$id, personalId).catch((error) => {
                            console.warn('[Dashboard] delete task failed', error)
                          })
                        }
                      }
                      setDismissedQuestKeys((prev) =>
                        prev.includes(quest.key) ? prev : [...prev, quest.key],
                      )
                    },
                  }}
                >
                  <MotionView
                    animate={{ opacity: 1, translateY: 0, scale: quest.done ? 1 : 0.99 }}
                    from={{ opacity: 0, translateY: 8 }}
                    transition={{ delay: index * 55, type: 'spring', damping: 22 }}
                    style={[styles.quest, index > 0 && styles.divider]}
                  >
                    {personalId ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={quest.done ? `Mark ${quest.label} incomplete` : `Mark ${quest.label} complete`}
                        onPress={() => {
                          if (!user?.$id) return
                          const nextDone = !quest.done
                          setPersonalQuests((prev) =>
                            prev.map((q) => (q.id === personalId ? { ...q, done: nextDone } : q)),
                          )
                          if (personalId.startsWith('temp-')) return
                          void setTaskDone(user.$id, personalId, nextDone).catch((error) => {
                            console.warn('[Dashboard] update task failed', error)
                            setPersonalQuests((prev) =>
                              prev.map((q) => (q.id === personalId ? { ...q, done: !nextDone } : q)),
                            )
                          })
                        }}
                        hitSlop={8}
                        style={styles.checkTarget}
                      >
                        <View style={[styles.check, quest.done && styles.checkDone]}>
                          {quest.done && <Ionicons name="checkmark" size={15} color={colors.onAccent} />}
                        </View>
                      </Pressable>
                    ) : (
                      // Built-in indicators update from your logs and are not tappable.
                      <View
                        accessibilityLabel={quest.done ? `${quest.label}: complete` : `${quest.label}: in progress`}
                        style={styles.checkTarget}
                      >
                        <View
                          style={[
                            styles.check,
                            quest.done ? styles.checkDone : styles.checkAuto,
                          ]}
                        >
                          {quest.done && <Ionicons name="checkmark" size={15} color={colors.onAccent} />}
                        </View>
                      </View>
                    )}
                    <Text style={[styles.questText, quest.done && styles.questDone]}>{quest.label}</Text>
                    <Text style={styles.questProgress}>{quest.progress}</Text>
                  </MotionView>
                </SwipeableRow>
              )
            })
          )}
        </View>

        {/* Placeholder planners ( workouts / meds ) are development-only previews
            and intentionally have no production navigation entry points. */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today’s logs</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Organise today's logs"
            hitSlop={10}
            onPress={() => router.push('/logfood')}
          >
            <Text style={styles.link}>ORGANISE</Text>
          </Pressable>
        </View>
        <View style={styles.card}>
          {data.today.length === 0 ? (
            <Text style={styles.empty}>No meals to display.</Text>
          ) : data.today.map((meal, index) => (
            <View key={meal.$id} style={[styles.mealRow, index > 0 && styles.divider]}>
              <View>
                <Text style={styles.mealTitle}>{meal.friendlyname || meal.type || 'Meal'}</Text>
                <Text style={styles.mealMeta}>{meal.items?.length ?? 0} items</Text>
              </View>
              <Text style={styles.mealKcal}>{Math.round(meal.kcal ?? 0)} kcal</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <DashboardFab
        open={fabOpen}
        onToggle={toggleFab}
        onDismiss={closeFab}
        onLogFood={handleLogFood}
        onCreateTask={handleCreateTask}
        bottomInset={insets.bottom}
      />

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
          <Text style={styles.taskTitle}>Create task</Text>
          <Text style={styles.taskHint}>Add a personal action for today.</Text>
          <TextInput
            value={taskDraft}
            onChangeText={setTaskDraft}
            placeholder="e.g. Evening stretch"
            placeholderTextColor={colors.textFaint}
            accessibilityLabel="Task name"
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

function DashboardFab({
  open,
  onToggle,
  onDismiss,
  onLogFood,
  onCreateTask,
  bottomInset,
}: {
  open: boolean
  onToggle: () => void
  onDismiss: () => void
  onLogFood: () => void
  onCreateTask: () => void
  bottomInset: number
}) {
  const { colors } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = open
      ? withSpring(1, panelSpring)
      : withTiming(0, quickTiming)
  }, [open, progress])

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }))

  const shellStyle = useAnimatedStyle(() => {
    const width = interpolate(progress.value, [0, 1], [FAB_SIZE, MENU_WIDTH], Extrapolation.CLAMP)
    const height = interpolate(progress.value, [0, 1], [FAB_SIZE, MENU_HEIGHT], Extrapolation.CLAMP)
    const radius = interpolate(progress.value, [0, 1], [FAB_SIZE / 2, 12], Extrapolation.CLAMP)
    return {
      width,
      height,
      borderRadius: radius,
      borderColor: interpolateColor(progress.value, [0, 1], [colors.accent, colors.border]),
      backgroundColor: interpolateColor(progress.value, [0, 1], [colors.accent, colors.surface]),
    }
  })

  const plusStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35], [1, 0], Extrapolation.CLAMP),
    transform: [
      { rotate: `${interpolate(progress.value, [0, 1], [0, 45], Extrapolation.CLAMP)}deg` },
      { scale: interpolate(progress.value, [0, 0.35], [1, 0.6], Extrapolation.CLAMP) },
    ],
  }))

  const menuStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.4, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0.4, 1], [10, 0], Extrapolation.CLAMP) },
    ],
  }))

  return (
    <>
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[styles.fabBackdrop, backdropStyle]}
      >
        <Pressable
          accessibilityLabel="Dismiss menu"
          style={StyleSheet.absoluteFill}
          onPress={onDismiss}
        />
      </Animated.View>

      <View pointerEvents="box-none" style={[styles.fabAnchor, { bottom: Math.max(bottomInset + 72, 80) }]}>
        <View style={styles.fabPressWrap}>
          <Animated.View style={[styles.fabShell, shellStyle]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open quick add menu"
              accessibilityState={{ expanded: open }}
              onPress={onToggle}
              pointerEvents={open ? 'none' : 'auto'}
              style={styles.fabPlusLayer}
            >
              <Animated.View pointerEvents="none" style={plusStyle}>
                <Ionicons name="add" size={24} color={colors.onAccent} />
              </Animated.View>
            </Pressable>
            <Animated.View
              pointerEvents={open ? 'auto' : 'none'}
              style={[styles.fabMenu, menuStyle]}
            >
              <View style={styles.fabMenuHeader}>
                <Text style={styles.fabMenuTitle}>Quick add</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close menu"
                  onPress={onDismiss}
                  hitSlop={8}
                  style={({ pressed }) => [styles.fabClose, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Log food"
                onPress={onLogFood}
                style={({ pressed }) => [styles.fabMenuItem, pressed && styles.fabMenuItemPressed]}
              >
                <View style={styles.fabMenuIcon}>
                  <Ionicons name="restaurant-outline" size={18} color={colors.accent} />
                </View>
                <Text style={styles.fabMenuItemText}>Log food</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create task"
                onPress={onCreateTask}
                style={({ pressed }) => [styles.fabMenuItem, pressed && styles.fabMenuItemPressed]}
              >
                <View style={styles.fabMenuIcon}>
                  <Ionicons name="checkbox-outline" size={18} color={colors.accent} />
                </View>
                <Text style={styles.fabMenuItemText}>Create task</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </View>
      </View>
    </>
  )
}

const stylesStatic = StyleSheet.create({
  track: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
})

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  content: { paddingBottom: 140, gap: 20, alignSelf: 'center', width: '100%', maxWidth: 720 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: c.background },
  stateText: { ...typography.body, color: c.textMuted },
  eyebrow: { ...typography.overline, color: c.brand },
  errorNotice: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderLeftWidth: 2, borderLeftColor: c.danger, backgroundColor: c.dangerSoft },
  errorNoticeText: { ...typography.bodySmall, color: c.textMuted, flex: 1 },
  errorRetry: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  errorRetryText: { ...typography.overline, color: c.danger },
  gameStrip: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.borderStrong, paddingVertical: 12 },
  gameMetric: { flex: 1, minHeight: 44, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  gameMetricDivider: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: c.borderStrong },
  gameIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brandSoft },
  gameCopy: { flex: 1, gap: 1 },
  gameValue: { ...typography.body, color: c.text, fontWeight: '600' },
  gameLabel: { ...typography.overline, color: c.textMuted, fontSize: 9 },
  heroCard: { backgroundColor: c.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: c.borderStrong, borderRadius: borderRadius.lg, padding: 20, alignItems: 'center', gap: 14 },
  heroHeader: { width: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  heroTitleCopy: { flex: 1, minWidth: 0 },
  heroMeta: { ...typography.labelSmall, color: c.textMuted, textAlign: 'right', flexShrink: 1 },
  sectionTitle: { ...typography.metric, color: c.text },
  macroStrip: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, paddingTop: 14, width: '100%', gap: 16 },
  macroStripCompact: { gap: 8 },
  macroCell: { flex: 1, alignItems: 'center', gap: 5 },
  macroValue: { ...typography.label, color: c.text },
  macroLabel: { ...typography.labelSmall, color: c.textMuted },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.borderStrong, paddingBottom: 7 },
  sectionMeta: { ...typography.labelSmall, color: c.textMuted },
  card: { backgroundColor: c.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, borderRadius: borderRadius.lg, paddingHorizontal: 18 },
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
  goalProgressValue: { ...typography.label, color: c.text, fontWeight: '600' },
  goalProgressMeta: { ...typography.labelSmall, color: c.textMuted },
  quest: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  checkTarget: { width: 44, height: 44, marginHorizontal: -10, alignItems: 'center', justifyContent: 'center' },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkAuto: { borderStyle: 'dashed', borderColor: c.textFaint },
  checkDone: { backgroundColor: c.success, borderColor: c.success },
  questText: { ...typography.body, color: c.text, flex: 1 },
  questDone: { color: c.textMuted, textDecorationLine: 'line-through' },
  questProgress: { ...typography.labelSmall, color: c.success },
  link: { ...typography.labelSmall, color: c.accent },
  empty: { ...typography.body, color: c.textMuted, paddingVertical: 24, textAlign: 'center' },
  mealRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mealTitle: { ...typography.body, color: c.text, fontWeight: '600' },
  mealMeta: { ...typography.labelSmall, color: c.textMuted },
  mealKcal: { ...typography.label, color: c.accent },
  fabBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: c.overlay,
    zIndex: 40,
  },
  fabAnchor: {
    position: 'absolute',
    right: 16,
    width: MENU_WIDTH,
    height: MENU_HEIGHT,
    zIndex: 50,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  fabShell: {
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
      web: { boxShadow: '0px 6px 18px rgba(0, 0, 0, 0.18)' },
    }),
  },
  fabPressWrap: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  fabPlusLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabMenu: {
    ...StyleSheet.absoluteFill,
    padding: 12,
    gap: 4,
  },
  fabMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  fabMenuTitle: {
    ...typography.labelSmall,
    color: c.textMuted,
  },
  fabClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  fabMenuItemPressed: {
    backgroundColor: c.accentSoft,
  },
  fabMenuIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabMenuItemText: {
    ...typography.body,
    color: c.text,
    fontWeight: '600',
  },
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
    borderRadius: 8,
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
