import RadialGauge from '@/components/Gague'
import { useAuth } from '@/lib/AuthContext'
import { calculateStreak, calculateXP } from '@/lib/gamification'
import { getTodayMeals, listHistoricMeals, type MealDocument } from '@/lib/meals'
import { getProfile, type ProfileDocument } from '@/lib/profile'
import { useTheme } from '@/lib/theme/ThemeContext'
import type { ThemeColors } from '@/lib/theme/tokens'
import { typography } from '@/lib/theme/typography'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { Ionicons } from '@expo/vector-icons'
import { MotiView } from 'moti'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type DashboardData = {
  today: MealDocument[]
  history: MealDocument[]
  profile: ProfileDocument | null
}

const emptyData: DashboardData = { today: [], history: [], profile: null }

function total(meals: MealDocument[], key: 'kcal' | 'protein' | 'carbs' | 'fat' | 'fluid') {
  return meals.reduce((sum, meal) => sum + (meal[key] ?? 0), 0)
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const { colors } = useTheme()
  const pct = Math.min(100, Math.max(0, (value / Math.max(1, max)) * 100))
  return (
    <View style={[stylesStatic.track, { backgroundColor: colors.progressTrail }]}>
      <MotiView
        from={{ width: '0%' }}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'timing', duration: 420 }}
        style={[stylesStatic.fill, { backgroundColor: colors.success }]}
      />
    </View>
  )
}

export default function DashboardScreen() {
  const { user } = useAuth()
  const { colors } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [data, setData] = useState<DashboardData>(emptyData)
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      let active = true
      if (!user?.$id) {
        setLoading(false)
        return
      }
      setLoading(true)
      Promise.all([
        getTodayMeals(user.$id),
        listHistoricMeals(user.$id, 100),
        getProfile(user.$id),
      ])
        .then(([today, history, profile]) => {
          if (active) setData({ today, history, profile })
        })
        .catch((error) => console.warn('[Dashboard] load failed', error))
        .finally(() => active && setLoading(false))
      return () => { active = false }
    }, [user]),
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
  const allMeals = [...data.today, ...data.history]
  const streak = calculateStreak(allMeals)
  const xp = calculateXP({
    meals: data.today.length,
    water: Math.floor(totals.fluid / 250),
    calorieTargetHit: totals.kcal >= targets.kcal * 0.9 && totals.kcal <= targets.kcal * 1.1,
    proteinTargetHit: totals.protein >= targets.protein,
  })
  const quests = [
    { label: 'Log three meal moments', done: data.today.length >= 3, progress: `${Math.min(data.today.length, 3)}/3` },
    { label: 'Meet your protein target', done: totals.protein >= targets.protein, progress: `${Math.round(totals.protein)}/${targets.protein}g` },
    { label: 'Hydrate with intention', done: totals.fluid >= targets.fluid, progress: `${Math.round(totals.fluid)}/${targets.fluid}ml` },
  ]

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={styles.eyebrow}>TODAY</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
          <Text style={styles.lede}>A calm view of what matters now.</Text>
        </View>

        <View style={styles.gameStrip}>
          <View style={styles.gameMetric}>
            <Ionicons name="flame-outline" size={20} color={colors.streakColor} />
            <Text style={styles.gameValue}>{streak}</Text>
            <Text style={styles.gameLabel}>DAY STREAK</Text>
          </View>
          <View style={styles.gameMetric}>
            <Ionicons name="sparkles-outline" size={20} color={colors.xpAccent} />
            <Text style={styles.gameValue}>LV {xp.level}</Text>
            <Text style={styles.gameLabel}>{xp.xpInCurrentLevel}/{xp.xpNeeded} XP</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.sectionTitle}>Daily energy</Text>
          <RadialGauge
            value={totals.kcal}
            max={targets.kcal}
            size={220}
            strokeWidth={10}
            color={colors.accent}
            backgroundColor={colors.progressTrail}
            textColor={colors.accent}
            mutedColor={colors.textMuted}
          />
          <View style={styles.macroStrip}>
            {([
              ['Protein', totals.protein, targets.protein],
              ['Carbs', totals.carbs, targets.carbs],
              ['Fat', totals.fat, targets.fat],
            ] as const).map(([label, value, max]) => (
              <View key={label} style={styles.macroCell}>
                <Text style={styles.macroValue}>{Math.round(value)}g</Text>
                <Text style={styles.macroLabel}>{label.toUpperCase()}</Text>
                <ProgressBar value={value} max={max} />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily quests</Text>
          <Text style={styles.sectionMeta}>{quests.filter((q) => q.done).length}/{quests.length}</Text>
        </View>
        <View style={styles.card}>
          {quests.map((quest, index) => (
            <MotiView
              key={quest.label}
              animate={{ opacity: 1, translateY: 0, scale: quest.done ? 1 : 0.99 }}
              from={{ opacity: 0, translateY: 8 }}
              transition={{ delay: index * 55, type: 'spring', damping: 22 }}
              style={[styles.quest, index > 0 && styles.divider]}
            >
              <View style={[styles.check, quest.done && styles.checkDone]}>
                {quest.done && <Ionicons name="checkmark" size={15} color={colors.onAccent} />}
              </View>
              <Text style={[styles.questText, quest.done && styles.questDone]}>{quest.label}</Text>
              <Text style={styles.questProgress}>{quest.progress}</Text>
            </MotiView>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Goals</Text>
          <Text style={styles.sectionMeta}>PILLARS</Text>
        </View>
        <View style={styles.goalGrid}>
          <GoalCard
            title="Training plan"
            subtitle="Push, pull and legs"
            icon="barbell-outline"
            onPress={() => router.push('/workouts')}
          />
          <GoalCard
            title="Wellbeing"
            subtitle="Medication rhythm"
            icon="medical-outline"
            onPress={() => router.push('/meds')}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today’s logs</Text>
          <Pressable onPress={() => router.push('/meals')}>
            <Text style={styles.link}>ORGANISE</Text>
          </Pressable>
        </View>
        <View style={styles.card}>
          {data.today.length === 0 ? (
            <Text style={styles.empty}>No meals yet. Your first log starts today’s run.</Text>
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

      <Pressable
        accessibilityLabel="Log food"
        onPress={() => router.push('/logfood')}
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + 78 },
          pressed && { transform: [{ scale: 0.94 }] },
        ]}
      >
        <Ionicons name="add" size={28} color={colors.onAccent} />
      </Pressable>
    </View>
  )
}

function GoalCard({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
}) {
  const { colors } = useTheme()
  const styles = useThemedStyles(makeStyles)
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.goalCard, pressed && { opacity: 0.78 }]}>
      <View style={styles.goalIcon}><Ionicons name={icon} size={22} color={colors.success} /></View>
      <Text style={styles.goalTitle}>{title}</Text>
      <Text style={styles.goalSubtitle}>{subtitle}</Text>
      <ProgressBar value={65} max={100} />
    </Pressable>
  )
}

const stylesStatic = StyleSheet.create({
  track: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
})

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: 16, paddingBottom: 130, gap: 18, alignSelf: 'center', width: '100%', maxWidth: 760 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background },
  eyebrow: { ...typography.labelSmall, color: c.textMuted },
  date: { ...typography.headlineLarge, color: c.accent, marginTop: 2 },
  lede: { ...typography.body, color: c.textMuted },
  gameStrip: { flexDirection: 'row', gap: 10 },
  gameMetric: { flex: 1, padding: 14, backgroundColor: c.accentSoft, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 7 },
  gameValue: { ...typography.label, color: c.accent, fontWeight: '700' },
  gameLabel: { ...typography.labelSmall, color: c.textMuted, marginLeft: 'auto' },
  heroCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 20, alignItems: 'center', gap: 14 },
  sectionTitle: { ...typography.headline, color: c.accent },
  macroStrip: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, paddingTop: 14, width: '100%', gap: 16 },
  macroCell: { flex: 1, alignItems: 'center', gap: 5 },
  macroValue: { ...typography.label, color: c.text },
  macroLabel: { ...typography.labelSmall, color: c.textMuted, fontSize: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.borderStrong, paddingBottom: 7 },
  sectionMeta: { ...typography.labelSmall, color: c.textMuted },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 8, paddingHorizontal: 16 },
  quest: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: c.success, borderColor: c.success },
  questText: { ...typography.body, color: c.text, flex: 1 },
  questDone: { color: c.textMuted, textDecorationLine: 'line-through' },
  questProgress: { ...typography.labelSmall, color: c.success },
  goalGrid: { flexDirection: 'row', gap: 12 },
  goalCard: { flex: 1, minHeight: 150, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 14, gap: 8 },
  goalIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  goalTitle: { ...typography.body, color: c.accent, fontWeight: '700' },
  goalSubtitle: { ...typography.labelSmall, color: c.textMuted, flex: 1 },
  link: { ...typography.labelSmall, color: c.accent },
  empty: { ...typography.body, color: c.textMuted, paddingVertical: 24, textAlign: 'center' },
  mealRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mealTitle: { ...typography.body, color: c.text, fontWeight: '600' },
  mealMeta: { ...typography.labelSmall, color: c.textMuted },
  mealKcal: { ...typography.label, color: c.accent },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: c.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
})
