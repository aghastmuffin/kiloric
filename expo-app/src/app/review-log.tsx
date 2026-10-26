import {
  Badge,
  Card,
  Chip,
  EmptyState,
  ErrorNote,
  IconButton,
  LoadingBlock,
  MacroBar,
  ScreenScroll,
  Segmented,
  Txt,
  UButton,
} from '@/components/ds'
import { authenticatedRequest } from '@/lib/apiUtils'
import { showApiError } from '@/lib/apiErrors'
import { useAuth } from '@/lib/AuthContext'
import { logFood, type FoodEntrySource, type LogMealType } from '@/lib/data/foodLog'
import { effectiveMealNames, loadPlanPreferences } from '@/lib/planPreferences'
import {
  formatAmount,
  formatGrams,
  formatKcal,
  foodItemFromProduct,
  macrosForAmount,
  servingsForAmount,
  type AmountMode,
  type FoodItem,
} from '@/lib/data/foodItem'
import { loadTodayBudget } from '@/lib/data/overview'
import { readReviewItem } from '@/lib/data/reviewHandoff'
import { useFocusLoader } from '@/lib/data/useLoader'
import { useMealTypePreferences } from '@/lib/MealTypePreferencesContext'
import { fonts, usePalette } from '@/lib/theme/palette'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

const AMOUNT_OPTIONS = [
  { value: 'servings', label: 'Servings' },
  { value: 'grams', label: 'Grams' },
] as const

const QUICK_PICKS: Record<AmountMode, number[]> = {
  servings: [0.5, 1, 1.5, 2],
  grams: [50, 100, 150, 200],
}

const STEP: Record<AmountMode, number> = { servings: 0.5, grams: 10 }


function asSource(value: string | undefined): FoodEntrySource {
  return value === 'scan' || value === 'search' || value === 'recent' || value === 'plan' ? value : 'search'
}

async function fetchBarcode(barcode: string): Promise<FoodItem | null> {
  const response = await authenticatedRequest(`/api/barcode/${encodeURIComponent(barcode)}`)
  if (!response || typeof response !== 'object') return null
  const item = foodItemFromProduct(response as Record<string, unknown>)
  return { ...item, barcode: item.barcode ?? barcode }
}

export default function ReviewLogScreen() {
  const params = useLocalSearchParams<{ id?: string; barcode?: string; source?: string; meal?: string }>()
  const router = useRouter()
  const c = usePalette()
  const { user } = useAuth()
  const userId = user?.$id ?? null
  const { selectedMealType, setSelectedMealType } = useMealTypePreferences()
  const [handoff] = useState(() => readReviewItem(params.id))

  const [mode, setMode] = useState<AmountMode>('servings')
  const [amount, setAmount] = useState(handoff?.servings ?? 1)
  const [meal, setMeal] = useState<LogMealType>(params.meal ?? selectedMealType ?? 'Snack')
  const [logging, setLogging] = useState(false)

  const source = handoff?.source ?? asSource(params.source)
  const state = useFocusLoader(async () => {
    const [budget, item, planPrefs] = await Promise.all([
      loadTodayBudget(userId!, user?.name),
      handoff ? Promise.resolve(handoff.item) : params.barcode ? fetchBarcode(params.barcode) : Promise.resolve(null),
      userId ? loadPlanPreferences(userId).catch(() => null) : Promise.resolve(null),
    ])
    return { budget, item, planPrefs }
  }, userId ? `${userId}:${params.id ?? ''}:${params.barcode ?? ''}` : null)

  const activeMealNames = state.data?.planPrefs
    ? effectiveMealNames(state.data.planPrefs)
    : ['Breakfast', 'Lunch', 'Snack', 'Dinner']

  const item = state.data?.item ?? null
  const budget = state.data?.budget ?? null

  function close() {
    if (router.canGoBack()) router.back()
    else router.replace('/')
  }

  function switchMode(next: AmountMode) {
    if (!item || next === mode) return
    const servings = servingsForAmount(item, mode, amount)
    setAmount(next === 'grams' ? Math.round(servings * item.servingGrams) : Math.round(servings * 2) / 2 || 0.5)
    setMode(next)
  }

  function step(direction: 1 | -1) {
    setAmount((current) => {
      const next = Math.round((current + STEP[mode] * direction) * 100) / 100
      return Math.max(STEP[mode], next)
    })
  }

  async function submit() {
    if (!userId || !item) return
    setLogging(true)
    try {
      await logFood(userId, { item, servings: servingsForAmount(item, mode, amount), mealType: meal, source })
      void setSelectedMealType(meal)
      close()
    } catch (err) {
      showApiError(err, 'appwrite')
    } finally {
      setLogging(false)
    }
  }

  const header = (
    <View style={styles.topRow}>
      <IconButton icon="chevron-back" accessibilityLabel="Back" onPress={close} testID="review-back" />
      {source === 'scan' ? <Badge label="Scanned" icon="barcode-outline" tone="mint" /> : null}
    </View>
  )

  if (!item) {
    return (
      <ScreenScroll>
        {header}
        {state.error ? <ErrorNote message={state.error} onRetry={state.reload} /> : null}
        {state.loading ? (
          <LoadingBlock />
        ) : (
          <Card>
            <EmptyState
              icon="barcode-outline"
              title={params.barcode ? 'We couldn’t find that barcode' : 'Nothing to review'}
              body={
                params.barcode
                  ? `No product matches ${params.barcode}. Add it to the database or search by name instead.`
                  : 'Pick a food from Log food to review it here.'
              }
              actionLabel={params.barcode ? 'Add this food' : 'Search foods'}
              onAction={() =>
                params.barcode
                  ? router.replace({ pathname: '/contribute-food', params: { code: params.barcode } })
                  : router.replace('/logfood')
              }
            />
          </Card>
        )}
      </ScreenScroll>
    )
  }

  const macros = macrosForAmount(item, mode, amount)
  const targets = budget?.summary.targets
  const eaten = budget?.eaten
  const goalKcal = targets?.kcal ?? 0
  const percentOfDaily = goalKcal > 0 ? Math.round((macros.kcal / goalKcal) * 100) : null
  const leftAfter = budget ? budget.remaining - macros.kcal : null
  const unitLabel = mode === 'servings' ? (amount === 1 ? 'serving' : 'servings') : 'g'
  const servingsEquivalent = servingsForAmount(item, mode, amount)

  const macroRows = [
    { key: 'protein', label: 'Protein', value: macros.protein, eaten: eaten?.protein ?? 0, goal: targets?.protein ?? 0, color: c.protein, soft: c.proteinSoft },
    { key: 'carbs', label: 'Carbs', value: macros.carbs, eaten: eaten?.carbs ?? 0, goal: targets?.carbs ?? 0, color: c.carbs, soft: c.carbsSoft },
    { key: 'fat', label: 'Fat', value: macros.fat, eaten: eaten?.fat ?? 0, goal: targets?.fat ?? 0, color: c.fat, soft: c.fatSoft },
  ]

  return (
    <ScreenScroll
      footer={
        <UButton
          label={logging ? 'Logging…' : `Log to ${meal}`}
          trailing={`${formatKcal(macros.kcal)} kcal`}
          size="lg"
          fullWidth
          disabled={logging || !userId}
          onPress={submit}
          testID="log-food-submit"
        />
      }
    >
      {header}
      <View style={styles.titleBlock}>
        <Txt variant="title" numberOfLines={3}>
          {item.name}
        </Txt>
        <Txt variant="label" tone="muted">
          {[item.brand, item.servingLabel].filter(Boolean).join(' · ')}
        </Txt>
      </View>

      {state.error ? <ErrorNote message={state.error} onRetry={state.reload} /> : null}

      <Card style={styles.gap}>
        <Segmented options={AMOUNT_OPTIONS} value={mode} onChange={switchMode} testID="amount-mode" />
        <View style={styles.stepper}>
          <IconButton icon="remove" tone="chip" size={56} accessibilityLabel="Decrease amount" onPress={() => step(-1)} testID="amount-minus" />
          <View style={styles.amountBlock} accessible accessibilityLabel={`${formatAmount(amount)} ${unitLabel}`}>
            <Text style={[styles.amount, { color: c.ink }]} testID="amount-value">
              {mode === 'servings' ? formatAmount(amount) : Math.round(amount)}
            </Text>
            <Txt variant="caption" tone="muted">
              {mode === 'servings' ? `${unitLabel} · ${Math.round(servingsEquivalent * item.servingGrams)} g` : `grams · ${formatAmount(Math.round(servingsEquivalent * 10) / 10)} servings`}
            </Txt>
          </View>
          <IconButton icon="add" tone="chip" size={56} accessibilityLabel="Increase amount" onPress={() => step(1)} testID="amount-plus" />
        </View>
        <View style={styles.quickRow}>
          {QUICK_PICKS[mode].map((value) => (
            <View key={value} style={styles.flex}>
              <Chip
                label={mode === 'servings' ? `${formatAmount(value)}` : `${value} g`}
                selected={amount === value}
                selectedTone="mint"
                fullWidth
                onPress={() => setAmount(value)}
              />
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.mealRow}>
        {activeMealNames.map((type) => (
          <Chip key={type} label={type} selected={meal === type} onPress={() => setMeal(type)} size="md" testID={`meal-${type}`} />
        ))}
      </View>

      <Card style={styles.gap}>
        <View style={styles.kcalRow}>
          <View style={styles.flex}>
            <Txt variant="caption" tone="muted">
              This adds
            </Txt>
            <View style={styles.kcalValue}>
              <Text style={[styles.kcal, { color: c.ink }]}>{formatKcal(macros.kcal)}</Text>
              <Txt variant="label" tone="muted">
                kcal
              </Txt>
            </View>
          </View>
          {percentOfDaily != null ? <Badge label={`${percentOfDaily}% of daily`} tone="blue" /> : null}
        </View>
        <View style={styles.legend}>
          <View style={[styles.legendSwatch, { backgroundColor: c.inkFaint }]} />
          <Txt variant="caption" tone="muted">
            Today so far
          </Txt>
          <View style={[styles.legendSwatch, { backgroundColor: c.ink }]} />
          <Txt variant="caption" tone="muted">
            + this
          </Txt>
        </View>
        {macroRows.map((row) => (
          <View key={row.key} style={styles.macro}>
            <View style={styles.macroHeader}>
              <Txt variant="bodyStrong">{row.label}</Txt>
              <Txt variant="caption" tone="muted">
                +{formatGrams(row.value)} g{row.goal > 0 ? ` · ${Math.round(row.eaten + row.value)} / ${Math.round(row.goal)} g` : ''}
              </Txt>
            </View>
            <MacroBar
              color={row.color}
              soft={row.soft}
              base={row.goal > 0 ? row.eaten / row.goal : 0}
              extra={row.goal > 0 ? row.value / row.goal : 0}
              label={`${row.label}: ${formatGrams(row.value)} grams`}
            />
          </View>
        ))}
      </Card>

      {leftAfter != null ? (
        <Card tone="mint" style={styles.leftCard} testID="left-after">
          <Txt variant="bodyStrong" color={c.mintInk}>
            Left for today after this
          </Txt>
          <Txt variant="metric" color={leftAfter < 0 ? c.danger : c.mintInk}>
            {leftAfter < 0 ? `${formatKcal(-leftAfter)} over` : `${formatKcal(leftAfter)} kcal`}
          </Txt>
        </Card>
      ) : null}
    </ScreenScroll>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleBlock: { gap: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  amountBlock: { alignItems: 'center', flex: 1 },
  amount: { fontFamily: fonts.heavy, fontSize: 48, lineHeight: 54, letterSpacing: -1.4 },
  quickRow: { flexDirection: 'row', gap: 8 },
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kcalRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  kcalValue: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  kcal: { fontFamily: fonts.heavy, fontSize: 40, lineHeight: 46, letterSpacing: -1.2 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: 5, marginLeft: 4 },
  macro: { gap: 8 },
  macroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leftCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
})
