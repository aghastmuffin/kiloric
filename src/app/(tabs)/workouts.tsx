import { MotionView } from '@/components/MotionView'
import { AppScreenHeader } from '@/components/ui/AppScreenHeader'
import { useTheme } from '@/lib/theme/ThemeContext'
import { useAppLayout } from '@/lib/theme/layout'
import type { ThemeColors } from '@/lib/theme/tokens'
import { typography } from '@/lib/theme/typography'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { Ionicons } from '@expo/vector-icons'
import { Redirect } from 'expo-router'
import { triggerNotificationHaptic, triggerSelectionHaptic } from '@/lib/haptics'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type Pillar = {
  id: 'push' | 'pull' | 'legs'
  title: string
  focus: string
  meta: string
  icon: keyof typeof Ionicons.glyphMap
}

type Exercise = {
  id: string
  name: string
  detail: string
  rest: string
}

const PILLARS: Pillar[] = [
  { id: 'push', title: 'Push', focus: 'Chest · shoulders', meta: '4 moves · 38 min', icon: 'arrow-up-circle-outline' },
  { id: 'pull', title: 'Pull', focus: 'Back · biceps', meta: '4 moves · 42 min', icon: 'git-pull-request-outline' },
  { id: 'legs', title: 'Legs', focus: 'Quads · glutes', meta: '4 moves · 45 min', icon: 'walk-outline' },
]

const EXERCISES: Record<Pillar['id'], Exercise[]> = {
  push: [
    { id: 'bench', name: 'Incline dumbbell press', detail: '3 sets · 8–10 reps', rest: '90 sec rest' },
    { id: 'press', name: 'Seated shoulder press', detail: '3 sets · 10 reps', rest: '75 sec rest' },
    { id: 'fly', name: 'Cable chest fly', detail: '3 sets · 12 reps', rest: '60 sec rest' },
    { id: 'raise', name: 'Lateral raise', detail: '3 sets · 12–15 reps', rest: '45 sec rest' },
  ],
  pull: [
    { id: 'row', name: 'Chest-supported row', detail: '4 sets · 8 reps', rest: '90 sec rest' },
    { id: 'pulldown', name: 'Neutral-grip pulldown', detail: '3 sets · 10 reps', rest: '75 sec rest' },
    { id: 'facepull', name: 'Rope face pull', detail: '3 sets · 12 reps', rest: '60 sec rest' },
    { id: 'curl', name: 'Incline curl', detail: '3 sets · 10–12 reps', rest: '60 sec rest' },
  ],
  legs: [
    { id: 'squat', name: 'Front squat', detail: '4 sets · 6–8 reps', rest: '120 sec rest' },
    { id: 'rdl', name: 'Romanian deadlift', detail: '3 sets · 8 reps', rest: '90 sec rest' },
    { id: 'split', name: 'Rear-foot split squat', detail: '3 sets · 10 / side', rest: '75 sec rest' },
    { id: 'calf', name: 'Standing calf raise', detail: '3 sets · 15 reps', rest: '45 sec rest' },
  ],
}

const PARTICLES = [
  { x: -118, y: -56, delay: 60, icon: 'sparkles' as const },
  { x: -82, y: -92, delay: 150, icon: 'ellipse' as const },
  { x: -32, y: -112, delay: 80, icon: 'star' as const },
  { x: 35, y: -108, delay: 180, icon: 'ellipse' as const },
  { x: 86, y: -86, delay: 110, icon: 'sparkles' as const },
  { x: 120, y: -45, delay: 210, icon: 'star' as const },
]

export default function WorkoutsScreen() {
  const { colors } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const { compact, gutter } = useAppLayout()
  const [selectedPillar, setSelectedPillar] = useState<Pillar['id']>('push')
  const [completed, setCompleted] = useState<Record<string, boolean>>({})
  const exercises = EXERCISES[selectedPillar]
  const completedCount = exercises.filter((exercise) => completed[`${selectedPillar}-${exercise.id}`]).length
  const isComplete = completedCount === exercises.length
  const progress = (completedCount / exercises.length) * 100
  const completedSessions = PILLARS.filter((pillar) =>
    EXERCISES[pillar.id].every((exercise) => completed[`${pillar.id}-${exercise.id}`]),
  ).length
  const selected = useMemo(
    () => PILLARS.find((pillar) => pillar.id === selectedPillar) ?? PILLARS[0],
    [selectedPillar],
  )

  const selectPillar = (id: Pillar['id']) => {
    if (id === selectedPillar) return
    triggerSelectionHaptic()
    setSelectedPillar(id)
  }

  const toggleExercise = (id: string) => {
    const key = `${selectedPillar}-${id}`
    triggerSelectionHaptic()
    const willBeComplete = exercises.every(
      (e) => (e.id === id ? !completed[key] : completed[`${selectedPillar}-${e.id}`]),
    )
    if (willBeComplete && !isComplete) {
      triggerNotificationHaptic('success')
    }
    setCompleted((current) => ({ ...current, [key]: !current[key] }))
  }

  if (!__DEV__) return <Redirect href="/" />

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          compact && styles.contentCompact,
          { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 112, paddingHorizontal: gutter },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AppScreenHeader
          overline="Training"
          title="Move with intention."
          description="Explore a sample push, pull, or legs session and mark each movement as you go."
          accessory={(
            <View style={styles.previewPill}>
              <Ionicons name="eye-outline" size={13} color={colors.success} />
              <Text style={styles.previewText}>INTERACTIVE SAMPLE</Text>
            </View>
          )}
        />

        <View style={styles.previewNote}>
          <Ionicons name="information-circle-outline" size={19} color={colors.brand} />
          <Text style={styles.previewNoteText}>
            Preview only. Progress stays on this screen and is not saved to your account.
          </Text>
        </View>

        <View style={[styles.weekCard, compact && styles.weekCardCompact]}>
          <View>
            <Text style={styles.weekLabel}>SAMPLE WEEK</Text>
            <Text style={styles.weekValue}>{completedSessions} of 3 sessions</Text>
          </View>
          <View style={styles.weekDays}>
            {['M', 'W', 'F'].map((day, index) => (
              <View key={`${day}-${index}`} style={[styles.dayDot, index < completedSessions && styles.dayDotActive]}>
                {index < completedSessions ? (
                  <Ionicons name="checkmark" size={13} color={colors.onBrand} />
                ) : (
                  <Text style={styles.dayText}>{day}</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeadingCopy}>
            <Text style={styles.sectionKicker}>TRAINING PILLARS</Text>
            <Text style={styles.sectionTitle}>Choose today’s focus</Text>
          </View>
          <Text style={styles.sectionMeta}>3 SAMPLE SESSIONS</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillarRow}>
          {PILLARS.map((pillar, index) => {
            const active = pillar.id === selectedPillar
            return (
              <MotionView
                key={pillar.id}
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0, scale: active ? 1 : 0.98 }}
                transition={{ type: 'spring', damping: 18, delay: index * 65 }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${pillar.title} session`}
                  accessibilityHint={`Switch workout focus to ${pillar.title}`}
                  accessibilityState={{ selected: active }}
                  onPress={() => selectPillar(pillar.id)}
                  style={({ pressed }) => [
                    styles.pillarCard,
                    compact && styles.pillarCardCompact,
                    active && styles.pillarCardActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.pillarIcon, active && styles.pillarIconActive]}>
                    <Ionicons
                      name={pillar.icon}
                      size={21}
                      color={active ? colors.onBrand : colors.brand}
                    />
                  </View>
                  <Text style={[styles.pillarTitle, active && styles.pillarTitleActive]}>{pillar.title}</Text>
                  <Text style={[styles.pillarFocus, active && styles.pillarCopyActive]}>{pillar.focus}</Text>
                  <Text style={[styles.pillarMeta, active && styles.pillarCopyActive]}>{pillar.meta}</Text>
                </Pressable>
              </MotionView>
            )
          })}
        </ScrollView>

        <View style={styles.sessionHeader}>
          <View>
            <Text style={styles.sectionKicker}>SAMPLE SESSION</Text>
            <Text style={styles.sessionTitle}>{selected.title} / 01</Text>
          </View>
          <View style={styles.progressCopy}>
            <Text style={styles.progressNumber}>{completedCount}/{exercises.length}</Text>
            <Text style={styles.progressLabel}>MOVES</Text>
          </View>
        </View>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: exercises.length, now: completedCount }}
          accessibilityLabel={`Session progress: ${completedCount} of ${exercises.length} moves completed`}
          style={styles.progressTrack}
        >
          <MotionView
            animate={{ width: `${progress}%` }}
            transition={{ type: 'timing', duration: 380 }}
            style={styles.progressFill}
          />
        </View>

        <View style={styles.timelineCard}>
          {exercises.map((exercise, index) => {
            const key = `${selectedPillar}-${exercise.id}`
            const done = Boolean(completed[key])
            return (
              <MotionView
                key={key}
                from={{ opacity: 0, translateX: 12 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'timing', duration: 240, delay: index * 45 }}
                style={styles.timelineRow}
              >
                <View style={styles.timelineRail}>
                  <View accessible={false} style={[styles.check, done && styles.checkDone]}>
                    {done ? <Ionicons name="checkmark" size={16} color={colors.onAccent} /> : (
                      <Text style={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</Text>
                    )}
                  </View>
                  {index < exercises.length - 1 && <View style={[styles.rail, done && styles.railDone]} />}
                </View>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${exercise.name}, ${exercise.detail}`}
                  accessibilityHint={done ? 'Unchecks this exercise' : 'Marks this exercise as completed'}
                  accessibilityState={{ checked: done }}
                  onPress={() => toggleExercise(exercise.id)}
                  style={({ pressed }) => [styles.exerciseCopy, pressed && styles.pressed]}
                >
                  <View style={styles.exerciseTop}>
                    <Text style={[styles.exerciseName, done && styles.exerciseDone]}>{exercise.name}</Text>
                    <Ionicons
                      name={done ? 'checkmark-circle' : 'ellipsis-horizontal'}
                      size={19}
                      color={done ? colors.success : colors.textFaint}
                    />
                  </View>
                  <Text style={styles.exerciseDetail}>{exercise.detail}</Text>
                  <View style={styles.restRow}>
                    <Ionicons name="timer-outline" size={13} color={colors.textMuted} />
                    <Text style={styles.restText}>{exercise.rest}</Text>
                  </View>
                </Pressable>
              </MotionView>
            )
          })}
        </View>

        <View style={styles.coachNote}>
          <Ionicons name="leaf-outline" size={20} color={colors.success} />
          <View style={styles.coachCopy}>
            <Text style={styles.coachTitle}>Coach’s note</Text>
            <Text style={styles.coachText}>
              Keep two reps in reserve. Quality first; the next session is part of the plan.
            </Text>
          </View>
        </View>

        {isComplete && (
          <MotionView
            key={`${selectedPillar}-celebration`}
            from={{ opacity: 0, scale: 0.82, translateY: 18 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 13, stiffness: 130 }}
            style={styles.celebration}
          >
            <MotionView
              from={{ opacity: 0.25, scale: 0.7 }}
              animate={{ opacity: 0, scale: 1.8 }}
              transition={{ type: 'timing', duration: 1100, loop: true }}
              style={styles.celebrationHalo}
            />
            {PARTICLES.map((particle, index) => (
              <MotionView
                key={`${particle.x}-${particle.y}`}
                from={{ opacity: 0, translateX: 0, translateY: 0, scale: 0.3 }}
                animate={{
                  opacity: 1,
                  translateX: particle.x,
                  translateY: particle.y,
                  scale: index % 2 ? 0.7 : 1,
                }}
                transition={{ type: 'spring', damping: 11, delay: particle.delay }}
                style={styles.particle}
              >
                <Ionicons name={particle.icon} size={index % 2 ? 10 : 15} color={colors.warning} />
              </MotionView>
            ))}
            <MotionView
              from={{ rotate: '-8deg', scale: 0.7 }}
              animate={{ rotate: '0deg', scale: 1 }}
              transition={{ type: 'spring', damping: 8, delay: 100 }}
              style={styles.trophy}
            >
              <Ionicons name="trophy" size={29} color={colors.onBrand} />
            </MotionView>
            <Text style={styles.celebrationKicker}>SESSION COMPLETE</Text>
            <Text style={styles.celebrationTitle}>Strong work.</Text>
            <Text style={styles.celebrationText}>
              {selected.title} is in the books. Take the win and recover well.
            </Text>
          </MotionView>
        )}
      </ScrollView>
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', gap: 22 },
  contentCompact: { gap: 18 },
  previewPill: { minHeight: 28, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, marginBottom: 8 },
  previewText: { ...typography.overline, color: c.textMuted, fontSize: 9, lineHeight: 12, letterSpacing: 0.8 },
  previewNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderLeftWidth: 2, borderLeftColor: c.brand, backgroundColor: c.brandSoft, padding: 13 },
  previewNoteText: { ...typography.bodySmall, color: c.textMuted, flex: 1 },
  weekCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.borderStrong, paddingVertical: 14, gap: 12 },
  weekCardCompact: { paddingVertical: 12 },
  weekLabel: { ...typography.labelSmall, color: c.textMuted, fontSize: 10 },
  weekValue: { ...typography.body, color: c.accent, fontWeight: '700' },
  weekDays: { flexDirection: 'row', gap: 6 },
  dayDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center' },
  dayDotActive: { backgroundColor: c.brand, borderColor: c.brand },
  dayText: { ...typography.labelSmall, color: c.textMuted, fontSize: 9 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.borderStrong, paddingBottom: 8 },
  sectionHeadingCopy: { flex: 1, minWidth: 0 },
  sectionKicker: { ...typography.labelSmall, color: c.brand, fontSize: 10 },
  sectionTitle: { ...typography.headline, color: c.text, fontSize: 22, lineHeight: 28 },
  sectionMeta: { ...typography.labelSmall, color: c.textMuted, textAlign: 'right' },
  pillarRow: { gap: 10, paddingRight: 16 },
  pillarCard: { width: 178, minHeight: 164, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, borderRadius: 8, backgroundColor: c.surface, gap: 6 },
  pillarCardCompact: { width: 158, minHeight: 154 },
  pillarCardActive: { backgroundColor: c.brand, borderColor: c.brand },
  pillarIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  pillarIconActive: { backgroundColor: 'rgba(255,255,255,0.15)' },
  pillarTitle: { ...typography.headline, color: c.accent, fontSize: 21, lineHeight: 26 },
  pillarTitleActive: { color: c.onBrand },
  pillarFocus: { ...typography.body, color: c.textMuted, fontSize: 14, lineHeight: 19 },
  pillarMeta: { ...typography.labelSmall, color: c.textFaint, fontSize: 9, marginTop: 'auto' },
  pillarCopyActive: { color: c.onBrand, opacity: 0.82 },
  pressed: { opacity: 0.72 },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 3 },
  sessionTitle: { ...typography.headline, color: c.accent },
  progressCopy: { alignItems: 'flex-end' },
  progressNumber: { ...typography.label, color: c.accent, fontSize: 16 },
  progressLabel: { ...typography.labelSmall, color: c.textMuted, fontSize: 9 },
  progressTrack: { height: 5, backgroundColor: c.progressTrail, borderRadius: 999, overflow: 'hidden', marginTop: -10 },
  progressFill: { height: 5, backgroundColor: c.success, borderRadius: 999 },
  timelineCard: { borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, borderRadius: 8, backgroundColor: c.surface, paddingHorizontal: 14, paddingVertical: 8 },
  timelineRow: { flexDirection: 'row', minHeight: 96 },
  timelineRail: { width: 34, alignItems: 'center', paddingTop: 18 },
  check: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  checkDone: { backgroundColor: c.success, borderColor: c.success },
  stepNumber: { ...typography.labelSmall, color: c.textMuted, fontSize: 8 },
  rail: { width: 1, flex: 1, backgroundColor: c.border, marginVertical: 3 },
  railDone: { backgroundColor: c.success },
  exerciseCopy: { flex: 1, paddingVertical: 16, paddingLeft: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  exerciseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  exerciseName: { ...typography.body, color: c.text, fontWeight: '700', flex: 1 },
  exerciseDone: { color: c.textMuted, textDecorationLine: 'line-through' },
  exerciseDetail: { ...typography.body, color: c.textMuted, fontSize: 14, lineHeight: 19, marginTop: 2 },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  restText: { ...typography.labelSmall, color: c.textMuted, fontSize: 9 },
  coachNote: { flexDirection: 'row', gap: 12, borderLeftWidth: 3, borderLeftColor: c.success, backgroundColor: c.accentSoft, borderRadius: 4, padding: 15 },
  coachCopy: { flex: 1 },
  coachTitle: { ...typography.label, color: c.accent },
  coachText: { ...typography.body, color: c.textMuted, fontSize: 14, lineHeight: 20, marginTop: 2 },
  celebration: { alignItems: 'center', overflow: 'hidden', backgroundColor: c.surface, borderWidth: 1, borderColor: c.success, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 30, marginTop: 2 },
  celebrationHalo: { position: 'absolute', top: 35, width: 74, height: 74, borderRadius: 37, backgroundColor: c.levelGlow },
  particle: { position: 'absolute', top: 72, alignSelf: 'center' },
  trophy: { width: 62, height: 62, borderRadius: 31, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  celebrationKicker: { ...typography.labelSmall, color: c.success, fontSize: 10 },
  celebrationTitle: { ...typography.headlineLarge, color: c.accent, marginTop: 2 },
  celebrationText: { ...typography.body, color: c.textMuted, textAlign: 'center', maxWidth: 380, marginTop: 4 },
})
