import {
  Card,
  Chip,
  ErrorNote,
  Field,
  IconButton,
  LoadingBlock,
  parseDecimal,
  ScreenHeader,
  ScreenScroll,
  Txt,
  UButton,
} from '@/components/ds'
import { showApiError } from '@/lib/apiErrors'
import { useAuth } from '@/lib/AuthContext'
import { dayKey, longDate, parseDayKey } from '@/lib/data/dateKeys'
import { formatKcal } from '@/lib/data/foodItem'
import { frequentFoods, listRecentEntries } from '@/lib/data/foodLog'
import {
  addPlanEntry,
  deletePlanEntry,
  listPlanEntries,
  planCandidatesFrom,
  PLAN_MEAL_TYPES,
  updatePlanEntry,
  type PlanCandidate,
} from '@/lib/data/mealPlan'
import { listSavedMeals } from '@/lib/data/savedMeals'
import { useFocusLoader } from '@/lib/data/useLoader'
import type { MealType } from '@/lib/meals'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

type Draft = { name: string; kcal: string; protein: string; carbs: string; fat: string }

function draftFrom(source: Partial<PlanCandidate> | null): Draft {
  const num = (value: number | undefined) => (value != null && value > 0 ? String(Math.round(value * 10) / 10) : '')
  return {
    name: source?.name ?? '',
    kcal: num(source?.kcal),
    protein: num(source?.protein),
    carbs: num(source?.carbs),
    fat: num(source?.fat),
  }
}

function asMealType(value: string | undefined): MealType | null {
  return value && (PLAN_MEAL_TYPES as readonly string[]).includes(value) ? (value as MealType) : null
}

export default function PlanEntryScreen() {
  const params = useLocalSearchParams<{ id?: string; day?: string; meal?: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.$id ?? null
  const day = params.day && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : dayKey()

  const [mealType, setMealType] = useState<MealType>(asMealType(params.meal) ?? 'Lunch')
  const [prepped, setPrepped] = useState(false)
  const [draft, setDraft] = useState<Draft>(draftFrom(null))
  const [formKey, setFormKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const state = useFocusLoader(async () => {
    const [entries, saved, recent] = await Promise.all([
      params.id ? listPlanEntries(userId!, day, day) : Promise.resolve([]),
      listSavedMeals(userId!),
      listRecentEntries(userId!),
    ])
    const existing = entries.find((entry) => entry.$id === params.id) ?? null
    return { existing, candidates: planCandidatesFrom(saved, frequentFoods(recent, 20), recent) }
  }, userId ? `${userId}:${params.id ?? 'new'}` : null)

  const existing = state.data?.existing ?? null
  const [hydratedId, setHydratedId] = useState<string | null>(null)
  if (existing && hydratedId !== existing.$id) {
    setHydratedId(existing.$id)
    setMealType(existing.meal_type)
    setPrepped(existing.prepped)
    setDraft(draftFrom(existing))
    setFormKey((key) => key + 1)
  }

  const suggestions = state.data?.candidates.get(mealType) ?? []
  const otherSuggestions = state.data
    ? [...state.data.candidates.entries()].filter(([type]) => type !== mealType).flatMap(([, list]) => list)
    : []
  const pickList = [...suggestions, ...otherSuggestions].slice(0, 8)

  function pick(candidate: PlanCandidate) {
    setDraft(draftFrom(candidate))
    setFormKey((key) => key + 1)
  }

  function update(field: keyof Draft) {
    return (text: string) => setDraft((current) => ({ ...current, [field]: text }))
  }

  async function save() {
    if (!userId) return
    const kcal = parseDecimal(draft.kcal)
    if (!draft.name.trim()) return setFormError('Give the meal a name.')
    if (kcal == null || kcal < 0) return setFormError('Enter the calories for this meal.')
    setFormError(null)
    setSaving(true)
    const payload = {
      day,
      meal_type: mealType,
      name: draft.name,
      kcal,
      protein: parseDecimal(draft.protein) ?? 0,
      carbs: parseDecimal(draft.carbs) ?? 0,
      fat: parseDecimal(draft.fat) ?? 0,
      prepped,
    }
    try {
      if (existing) await updatePlanEntry(userId, existing.$id, { ...payload, name: payload.name.trim().slice(0, 128), kcal: Math.round(kcal) })
      else await addPlanEntry(userId, payload)
      router.back()
    } catch (err) {
      showApiError(err, 'appwrite')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!userId || !existing) return
    setSaving(true)
    try {
      await deletePlanEntry(userId, existing.$id)
      router.back()
    } catch (err) {
      showApiError(err, 'appwrite')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScreenScroll
      footer={
        <UButton
          label={saving ? 'Saving…' : existing ? 'Save changes' : `Add to ${mealType.toLowerCase()}`}
          size="lg"
          fullWidth
          disabled={saving}
          onPress={save}
          testID="plan-entry-save"
        />
      }
    >
      <ScreenHeader
        overline={longDate(parseDayKey(day))}
        title={existing ? 'Edit planned meal' : 'Plan a meal'}
        right={<IconButton icon="close" accessibilityLabel="Close" onPress={() => router.back()} />}
      />
      {state.error ? <ErrorNote message={state.error} onRetry={state.reload} /> : null}
      {params.id && !state.data ? (
        <LoadingBlock />
      ) : (
        <>
          <View style={styles.chips}>
            {PLAN_MEAL_TYPES.map((type) => (
              <Chip key={type} label={type} selected={mealType === type} onPress={() => setMealType(type)} size="md" />
            ))}
          </View>

          {!existing && pickList.length > 0 ? (
            <Card style={styles.gap}>
              <Txt variant="subheading">From your meals</Txt>
              <View style={styles.chips}>
                {pickList.map((candidate) => (
                  <Chip
                    key={`${candidate.meal_type}-${candidate.name}`}
                    label={`${candidate.name} · ${formatKcal(candidate.kcal)}`}
                    selected={draft.name === candidate.name}
                    selectedTone="mint"
                    onPress={() => pick(candidate)}
                  />
                ))}
              </View>
            </Card>
          ) : null}

          <Card style={styles.gap} key={formKey}>
            <Field label="Meal" defaultValue={draft.name} placeholder="e.g. Chicken rice bowl" onChangeText={update('name')} maxLength={128} testID="plan-entry-name" />
            <View style={styles.row}>
              <Field label="Calories" defaultValue={draft.kcal} keyboardType="decimal-pad" suffix="kcal" onChangeText={update('kcal')} testID="plan-entry-kcal" />
              <Field label="Protein" defaultValue={draft.protein} keyboardType="decimal-pad" suffix="g" onChangeText={update('protein')} />
            </View>
            <View style={styles.row}>
              <Field label="Carbs" defaultValue={draft.carbs} keyboardType="decimal-pad" suffix="g" onChangeText={update('carbs')} />
              <Field label="Fat" defaultValue={draft.fat} keyboardType="decimal-pad" suffix="g" onChangeText={update('fat')} />
            </View>
            <Chip label={prepped ? 'Prepped ahead ✓' : 'Mark as prepped'} selected={prepped} selectedTone="mint" onPress={() => setPrepped((v) => !v)} />
          </Card>
          {formError ? <ErrorNote message={formError} /> : null}
          {existing ? <UButton label="Remove from plan" tone="danger" size="sm" onPress={remove} disabled={saving} /> : null}
        </>
      )}
    </ScreenScroll>
  )
}

const styles = StyleSheet.create({
  gap: { gap: 14 },
  row: { flexDirection: 'row', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
