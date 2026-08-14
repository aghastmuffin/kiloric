import { MotionView } from '@/components/MotionView'
import { useTheme } from '@/lib/theme/ThemeContext'
import type { ThemeColors } from '@/lib/theme/tokens'
import { typography } from '@/lib/theme/typography'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { Ionicons } from '@expo/vector-icons'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { triggerSelectionHaptic } from '@/lib/haptics'

type ScheduleItem = {
  id: string
  time: string
  period: string
  title: string
  detail: string
  instruction: string
  kind: 'medication' | 'wellbeing'
  icon: keyof typeof Ionicons.glyphMap
}

const DAYS = Array.from({ length: 5 }, (_, index) => {
  const date = new Date()
  date.setDate(date.getDate() + index)
  return {
    key: date.toISOString().slice(0, 10),
    day: date.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase(),
    date: String(date.getDate()).padStart(2, '0'),
  }
})

const SCHEDULE: ScheduleItem[] = [
  {
    id: 'morning-med',
    time: '08:00',
    period: 'MORNING',
    title: 'Vitamin D3',
    detail: '1 softgel · 1,000 IU',
    instruction: 'With breakfast',
    kind: 'medication',
    icon: 'sunny-outline',
  },
  {
    id: 'breathing',
    time: '10:30',
    period: 'RESET',
    title: 'Two-minute pause',
    detail: 'Slow breathing · 6 cycles',
    instruction: 'Wellbeing check-in',
    kind: 'wellbeing',
    icon: 'leaf-outline',
  },
  {
    id: 'afternoon-med',
    time: '13:00',
    period: 'MIDDAY',
    title: 'Daily prescription',
    detail: '1 tablet · mock reminder',
    instruction: 'After lunch',
    kind: 'medication',
    icon: 'medical-outline',
  },
  {
    id: 'evening',
    time: '21:30',
    period: 'EVENING',
    title: 'Wind-down routine',
    detail: 'Screen-free · 15 minutes',
    instruction: 'Prepare for rest',
    kind: 'wellbeing',
    icon: 'moon-outline',
  },
]

const MOODS = [
  { id: 'low', label: 'Low', icon: 'rainy-outline' as const },
  { id: 'steady', label: 'Steady', icon: 'remove-outline' as const },
  { id: 'bright', label: 'Bright', icon: 'sunny-outline' as const },
]

export default function MedsScreen() {
  const { colors } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const [selectedDay, setSelectedDay] = useState(DAYS[0].key)
  const [completed, setCompleted] = useState<Record<string, boolean>>({})
  const [mood, setMood] = useState<string | null>(null)

  const doneCount = SCHEDULE.filter((item) => completed[`${selectedDay}-${item.id}`]).length
  const nextItem = SCHEDULE.find((item) => !completed[`${selectedDay}-${item.id}`])
  const progress = (doneCount / SCHEDULE.length) * 100
  const selectedDate = useMemo(
    () => DAYS.find((day) => day.key === selectedDay) ?? DAYS[0],
    [selectedDay],
  )

  const toggleItem = (id: string) => {
    const key = `${selectedDay}-${id}`
    triggerSelectionHaptic()
    setCompleted((current) => ({ ...current, [key]: !current[key] }))
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 104 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.mockPill}>
            <Ionicons name="flask-outline" size={12} color={colors.success} />
            <Text style={styles.mockText}>WELLBEING PLANNER · MOCK DATA</Text>
          </View>
          <Text style={styles.eyebrow}>VITALITY / WELLBEING</Text>
          <Text style={styles.title}>A gentler rhythm.</Text>
          <Text style={styles.lede}>
            A calm schedule for everyday reminders and small moments of care.
          </Text>
        </View>

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={19} color={colors.accent} />
          <Text style={styles.noticeText}>
            Planner preview only — this does not provide medical advice, alerts, or saved records.
          </Text>
        </View>

        <View style={styles.dateHeader}>
          <View>
            <Text style={styles.month}>AUGUST 2026</Text>
            <Text style={styles.dateTitle}>Your week</Text>
          </View>
          <View style={styles.calendarIcon}>
            <Ionicons name="calendar-clear-outline" size={20} color={colors.success} />
          </View>
        </View>

        <View style={styles.dayRow}>
          {DAYS.map((day) => {
            const selected = selectedDay === day.key
            const dayDone = SCHEDULE.filter((item) => completed[`${day.key}-${item.id}`]).length
            return (
              <Pressable
                key={day.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  triggerSelectionHaptic()
                  setSelectedDay(day.key)
                }}
                style={({ pressed }) => [
                  styles.day,
                  selected && styles.daySelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.dayName, selected && styles.dayTextSelected]}>{day.day}</Text>
                <Text style={[styles.dayDate, selected && styles.dayTextSelected]}>{day.date}</Text>
                <View style={[styles.dayIndicator, dayDone > 0 && styles.dayIndicatorStarted, dayDone === SCHEDULE.length && styles.dayIndicatorDone]} />
              </Pressable>
            )
          })}
        </View>

        <MotionView
          key={selectedDay}
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 260 }}
          style={styles.overviewCard}
        >
          <View style={styles.overviewTop}>
            <View>
              <Text style={styles.overviewLabel}>{selectedDate.day} {selectedDate.date} · DAILY PLAN</Text>
              <Text style={styles.overviewTitle}>
                {doneCount === SCHEDULE.length ? 'All moments complete' : nextItem ? `Next at ${nextItem.time}` : 'Ready for today'}
              </Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countValue}>{doneCount}/{SCHEDULE.length}</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <MotionView
              animate={{ width: `${progress}%` }}
              transition={{ type: 'timing', duration: 380 }}
              style={styles.progressFill}
            />
          </View>
          <View style={styles.overviewFooter}>
            <Text style={styles.overviewHint}>
              {doneCount === SCHEDULE.length ? 'A complete, cared-for day.' : `${SCHEDULE.length - doneCount} gentle reminders remaining`}
            </Text>
            <Ionicons
              name={doneCount === SCHEDULE.length ? 'checkmark-circle' : 'time-outline'}
              size={17}
              color={doneCount === SCHEDULE.length ? colors.success : colors.textMuted}
            />
          </View>
        </MotionView>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionKicker}>SCHEDULE</Text>
            <Text style={styles.sectionTitle}>Today’s moments</Text>
          </View>
          <Text style={styles.sectionMeta}>LOCAL CHECKS</Text>
        </View>

        <View style={styles.scheduleCard}>
          {SCHEDULE.map((item, index) => {
            const key = `${selectedDay}-${item.id}`
            const done = Boolean(completed[key])
            const isWellbeing = item.kind === 'wellbeing'
            return (
              <MotionView
                key={`${selectedDay}-${item.id}`}
                from={{ opacity: 0, translateX: 10 }}
                animate={{ opacity: 1, translateX: 0, scale: done ? 0.99 : 1 }}
                transition={{ type: 'spring', damping: 20, delay: index * 45 }}
                style={[styles.scheduleRow, index > 0 && styles.divider]}
              >
                <View style={styles.timeColumn}>
                  <Text style={[styles.time, done && styles.mutedDone]}>{item.time}</Text>
                  <Text style={styles.period}>{item.period}</Text>
                  {index < SCHEDULE.length - 1 && <View style={[styles.timeRail, done && styles.timeRailDone]} />}
                </View>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel={`Mark ${item.title} complete`}
                  accessibilityState={{ checked: done }}
                  onPress={() => toggleItem(item.id)}
                  style={({ pressed }) => [styles.scheduleBody, pressed && styles.pressed]}
                >
                  <View style={[styles.itemIcon, isWellbeing && styles.itemIconWellbeing, done && styles.itemIconDone]}>
                    <Ionicons
                      name={done ? 'checkmark' : item.icon}
                      size={19}
                      color={done ? colors.onAccent : isWellbeing ? colors.success : colors.accent}
                    />
                  </View>
                  <View style={styles.itemCopy}>
                    <View style={styles.itemHeading}>
                      <Text style={[styles.itemTitle, done && styles.itemDone]}>{item.title}</Text>
                      <View style={[styles.typeTag, isWellbeing && styles.typeTagWellbeing]}>
                        <Text style={[styles.typeText, isWellbeing && styles.typeTextWellbeing]}>
                          {isWellbeing ? 'CARE' : 'MED'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.itemDetail, done && styles.mutedDone]}>{item.detail}</Text>
                    <View style={styles.instructionRow}>
                      <Ionicons name="restaurant-outline" size={12} color={colors.textFaint} />
                      <Text style={styles.instruction}>{item.instruction}</Text>
                    </View>
                  </View>
                  <View style={[styles.checkbox, done && styles.checkboxDone]}>
                    {done && <Ionicons name="checkmark" size={16} color={colors.onAccent} />}
                  </View>
                </Pressable>
              </MotionView>
            )
          })}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionKicker}>CHECK-IN</Text>
            <Text style={styles.sectionTitle}>How is your energy?</Text>
          </View>
          <Text style={styles.sectionMeta}>OPTIONAL</Text>
        </View>

        <View style={styles.moodCard}>
          <Text style={styles.moodPrompt}>Choose what feels closest right now.</Text>
          <View style={styles.moodRow}>
            {MOODS.map((option) => {
              const selected = mood === option.id
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    triggerSelectionHaptic()
                    setMood(selected ? null : option.id)
                  }}
                  style={({ pressed }) => [
                    styles.moodOption,
                    selected && styles.moodOptionSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <MotionView
                    animate={{ scale: selected ? 1.12 : 1 }}
                    transition={{ type: 'spring', damping: 12 }}
                  >
                    <Ionicons
                      name={option.icon}
                      size={22}
                      color={selected ? colors.onAccent : colors.success}
                    />
                  </MotionView>
                  <Text style={[styles.moodLabel, selected && styles.moodLabelSelected]}>{option.label}</Text>
                </Pressable>
              )
            })}
          </View>
          {mood && (
            <MotionView
              from={{ opacity: 0, translateY: 5 }}
              animate={{ opacity: 1, translateY: 0 }}
              style={styles.moodThanks}
            >
              <Ionicons name="heart-outline" size={15} color={colors.success} />
              <Text style={styles.moodThanksText}>Noted for this preview. Thank you for checking in.</Text>
            </MotionView>
          )}
        </View>

        <View style={styles.safetyCard}>
          <View style={styles.safetyIcon}>
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.safetyCopy}>
            <Text style={styles.safetyTitle}>Keep your real plan authoritative</Text>
            <Text style={styles.safetyText}>
              Follow the label and advice from your clinician or pharmacist. This mock planner does not replace either.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 16, gap: 18 },
  hero: { gap: 6, paddingTop: 2 },
  mockPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, marginBottom: 8 },
  mockText: { ...typography.labelSmall, color: c.textMuted, fontSize: 9, letterSpacing: 0.8 },
  eyebrow: { ...typography.labelSmall, color: c.success },
  title: { ...typography.headlineLarge, color: c.accent },
  lede: { ...typography.body, color: c.textMuted, maxWidth: 560 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: c.accentSoft, borderRadius: 8, padding: 13 },
  noticeText: { ...typography.body, color: c.textMuted, fontSize: 13, lineHeight: 19, flex: 1 },
  dateHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  month: { ...typography.labelSmall, color: c.success, fontSize: 10 },
  dateTitle: { ...typography.headline, color: c.accent },
  calendarIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  dayRow: { flexDirection: 'row', gap: 7 },
  day: { flex: 1, minWidth: 52, alignItems: 'center', borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: 8, paddingVertical: 10, gap: 2 },
  daySelected: { backgroundColor: c.accent, borderColor: c.accent },
  dayName: { ...typography.labelSmall, color: c.textMuted, fontSize: 8 },
  dayDate: { ...typography.headline, color: c.text, fontSize: 19, lineHeight: 23 },
  dayTextSelected: { color: c.onAccent },
  dayIndicator: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.borderStrong, marginTop: 3 },
  dayIndicatorStarted: { backgroundColor: c.warning },
  dayIndicatorDone: { backgroundColor: c.success },
  pressed: { opacity: 0.72 },
  overviewCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 16, gap: 13 },
  overviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  overviewLabel: { ...typography.labelSmall, color: c.textMuted, fontSize: 9 },
  overviewTitle: { ...typography.headline, color: c.accent, fontSize: 21, lineHeight: 27 },
  countBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  countValue: { ...typography.label, color: c.accent, fontSize: 13 },
  progressTrack: { height: 5, borderRadius: 999, backgroundColor: c.progressTrail, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 999, backgroundColor: c.success },
  overviewFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overviewHint: { ...typography.body, color: c.textMuted, fontSize: 13, lineHeight: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.borderStrong, paddingBottom: 8 },
  sectionKicker: { ...typography.labelSmall, color: c.success, fontSize: 10 },
  sectionTitle: { ...typography.headline, color: c.accent, fontSize: 22, lineHeight: 28 },
  sectionMeta: { ...typography.labelSmall, color: c.textMuted, fontSize: 9 },
  scheduleCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 8, paddingHorizontal: 14 },
  scheduleRow: { flexDirection: 'row', minHeight: 112 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  timeColumn: { width: 58, paddingTop: 18, alignItems: 'flex-start' },
  time: { ...typography.label, color: c.accent, fontSize: 13 },
  period: { ...typography.labelSmall, color: c.textFaint, fontSize: 8, marginTop: 1 },
  timeRail: { width: 1, flex: 1, marginLeft: 20, marginTop: 7, backgroundColor: c.border },
  timeRailDone: { backgroundColor: c.success },
  scheduleBody: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 17 },
  itemIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  itemIconWellbeing: { backgroundColor: c.surfaceAlt },
  itemIconDone: { backgroundColor: c.success },
  itemCopy: { flex: 1, minWidth: 0 },
  itemHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  itemTitle: { ...typography.body, color: c.text, fontWeight: '700', flexShrink: 1 },
  itemDone: { color: c.textMuted, textDecorationLine: 'line-through' },
  itemDetail: { ...typography.body, color: c.textMuted, fontSize: 13, lineHeight: 18, marginTop: 2 },
  mutedDone: { color: c.textFaint },
  instructionRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  instruction: { ...typography.labelSmall, color: c.textFaint, fontSize: 8 },
  typeTag: { backgroundColor: c.accentSoft, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  typeTagWellbeing: { backgroundColor: c.surfaceAlt },
  typeText: { ...typography.labelSmall, color: c.accent, fontSize: 7 },
  typeTextWellbeing: { color: c.success },
  checkbox: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  checkboxDone: { backgroundColor: c.success, borderColor: c.success },
  moodCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 16, gap: 13 },
  moodPrompt: { ...typography.body, color: c.textMuted, fontSize: 14 },
  moodRow: { flexDirection: 'row', gap: 9 },
  moodOption: { flex: 1, height: 72, borderWidth: 1, borderColor: c.border, borderRadius: 8, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center', gap: 5 },
  moodOptionSelected: { backgroundColor: c.accent, borderColor: c.accent },
  moodLabel: { ...typography.labelSmall, color: c.textMuted, fontSize: 9 },
  moodLabelSelected: { color: c.onAccent },
  moodThanks: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: 2 },
  moodThanksText: { ...typography.body, color: c.textMuted, fontSize: 13, lineHeight: 18, flex: 1 },
  safetyCard: { flexDirection: 'row', gap: 12, backgroundColor: c.accentSoft, borderRadius: 8, padding: 15 },
  safetyIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  safetyCopy: { flex: 1 },
  safetyTitle: { ...typography.label, color: c.accent },
  safetyText: { ...typography.body, color: c.textMuted, fontSize: 13, lineHeight: 19, marginTop: 2 },
})
