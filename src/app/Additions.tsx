import { authenticatedRequest } from '@/components/apiUtils'
import {
  contributeParamsFromProduct,
  macrosFromProduct,
  type SearchResult,
} from '@/components/LogFoodMultiView'
import { MotionView } from '@/components/MotionView'
import { useAuth } from '@/lib/AuthContext'
import { addProductToMeal, MEAL_TYPE_OPTIONS, type MealType } from '@/lib/meals'
import { useMealTypePreferences } from '@/lib/MealTypePreferencesContext'
import { isOrdsPresent, ORDS_FIELD_PRIORITY, productHasUnknownDetails } from '@/lib/ordsNormalize'
import { getBarcodeFromProduct, getProductTitle } from '@/lib/productDisplay'
import { takeSearchResult } from '@/lib/searchResultStore'
import { useTheme } from '@/lib/theme/ThemeContext'
import { borderRadius, spacing, type ThemeColors } from '@/lib/theme/tokens'
import { typography } from '@/lib/theme/typography'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const HIDDEN_KEYS = new Set([
  'product',
  'product_data',
  'data',
  'nutriments',
  'calories',
  'energy-kcal',
  'energy_kcal',
  'energy-kj',
  'energy_kj',
  'proteins',
  'protein',
  'carbohydrates',
  'carbs',
  'fat',
  'fiber',
  'fibre',
  'sugars',
  'sugar',
  'sodium',
  'saturated-fat',
  'saturated_fat',
  'trans-fat',
  'trans_fat',
  'monounsaturated-fat',
  'monounsaturated_fat',
  'polyunsaturated-fat',
  'polyunsaturated_fat',
  'added-sugars',
  'added_sugars',
  'vitamin-a',
  'vitamin_a',
  'vitamin-c',
  'vitamin_c',
  'vitamin-d',
  'vitamin_d',
  'vitamin-b12',
  'vitamin_b12',
  'calcium',
  'iron',
  'potassium',
  'magnesium',
  'caffeine',
  'taurine',
  'carbon-footprint',
  'carbon_footprint',
])

const TITLE_SKIP = new Set(['name', 'title', 'food_name', 'product_name', 'description', 'label'])

function paramString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' || typeof item === 'number' ? String(item) : null))
      .filter(Boolean)
      .join(', ') || '—'
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function unwrapProduct(item: SearchResult): SearchResult {
  for (const key of ['product', 'product_data', 'data']) {
    const value = item[key]
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as SearchResult
    }
  }
  return item
}

function productColumns(source: SearchResult): [string, unknown][] {
  const entries: [string, unknown][] = []
  for (const [key, value] of Object.entries(source)) {
    if (HIDDEN_KEYS.has(key) || TITLE_SKIP.has(key)) continue
    if (!isOrdsPresent(value)) continue
    if (typeof value === 'object' && !Array.isArray(value)) continue
    entries.push([key, value])
  }
  return entries.sort(([a], [b]) => {
    const rankA = (ORDS_FIELD_PRIORITY as readonly string[]).indexOf(a)
    const rankB = (ORDS_FIELD_PRIORITY as readonly string[]).indexOf(b)
    const scoreA = rankA === -1 ? ORDS_FIELD_PRIORITY.length : rankA
    const scoreB = rankB === -1 ? ORDS_FIELD_PRIORITY.length : rankB
    if (scoreA !== scoreB) return scoreA - scoreB
    return a.localeCompare(b)
  })
}

function buildContributeParams(payload: ReturnType<typeof contributeParamsFromProduct>) {
  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value !== 'string' || !value.trim()) continue
    const routeKey = key.replace(/-/g, '_')
    params[routeKey] = value.trim()
  }
  return params
}

export default function AdditionsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const styles = useThemedStyles(makeStyles)
  const { colors } = useTheme()
  const { user } = useAuth()
  const { selectedMealType, setSelectedMealType } = useMealTypePreferences()
  const params = useLocalSearchParams<{ id?: string; barcode?: string; query?: string }>()

  const resultId = paramString(params.id)
  const barcodeParam = paramString(params.barcode)
  const queryParam = paramString(params.query)

  const [product, setProduct] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mealPickerOpen, setMealPickerOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      setAdded(false)

      const stored = takeSearchResult(resultId)
      const storedProduct =
        stored?.data && typeof stored.data === 'object' && !Array.isArray(stored.data)
          ? unwrapProduct(stored.data as SearchResult)
          : null

      const looksComplete =
        storedProduct != null &&
        (isOrdsPresent(storedProduct.energy_kcal_100g) ||
          isOrdsPresent(storedProduct.energy_kcal) ||
          isOrdsPresent(storedProduct.product_name))

      if (looksComplete && storedProduct) {
        if (!active) return
        setProduct(storedProduct)
        setLoading(false)
        return
      }

      if (!barcodeParam) {
        if (!active) return
        if (storedProduct) {
          setProduct(storedProduct)
          setLoading(false)
          return
        }
        setError('No product data available. Search again and open a match.')
        setLoading(false)
        return
      }

      try {
        const data = await authenticatedRequest(`/api/barcode/${encodeURIComponent(barcodeParam)}`)
        if (!active) return
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          setProduct(unwrapProduct(data as SearchResult))
        } else if (storedProduct) {
          setProduct(storedProduct)
        } else {
          setError('Product lookup returned no usable fields.')
        }
      } catch (err) {
        if (!active) return
        if (storedProduct) {
          setProduct(storedProduct)
        } else {
          setError(err instanceof Error ? err.message : 'Could not load product.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [barcodeParam, resultId])

  const title = useMemo(
    () => (product ? getProductTitle(product, barcodeParam || 'Food') : 'Food'),
    [barcodeParam, product],
  )
  const barcode = useMemo(
    () => ((product ? getBarcodeFromProduct(product) : null) ?? barcodeParam) || null,
    [barcodeParam, product],
  )
  const macros = useMemo(() => (product ? macrosFromProduct(product) : null), [product])
  const columns = useMemo(() => (product ? productColumns(product) : []), [product])
  const needsLabelPhoto = useMemo(
    () => (product ? productHasUnknownDetails(product) : false),
    [product],
  )

  const handleAdd = useCallback(async () => {
    if (!product || !barcode || adding || added) return
    if (!user?.$id) {
      Alert.alert('Sign in required', 'Sign in to add foods to your meals.')
      return
    }

    setAdding(true)
    try {
      await addProductToMeal(user.$id, selectedMealType, barcode, product)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setAdded(true)
      Alert.alert('Added', `${title} added to ${selectedMealType}.`, [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not add food.'
      Alert.alert('Could not add', message)
    } finally {
      setAdding(false)
    }
  }, [added, adding, barcode, product, router, selectedMealType, title, user])

  const handleContribute = useCallback(() => {
    if (!product) {
      router.push({
        pathname: '/contribute-food',
        params: {
          ...(queryParam ? { query: queryParam } : {}),
          ...(barcodeParam ? { code: barcodeParam } : {}),
        },
      })
      return
    }
    const payload = contributeParamsFromProduct(product, queryParam || title)
    router.push({
      pathname: '/contribute-food',
      params: buildContributeParams(payload),
    })
  }, [barcodeParam, product, queryParam, router, title])

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.accent} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>ADDITION</Text>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {title}
          </Text>
        </View>
        <View style={styles.mealSelectWrap}>
          <Pressable
            onPress={() => setMealPickerOpen((open) => !open)}
            style={({ pressed }) => [styles.mealSelect, pressed && styles.pressed]}
          >
            <Text style={styles.mealSelectText}>{selectedMealType}</Text>
            <Ionicons
              name={mealPickerOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
          {mealPickerOpen ? (
            <View style={styles.mealMenu}>
              {MEAL_TYPE_OPTIONS.filter((type) => type !== 'Other').map((type: MealType) => (
                <Pressable
                  key={type}
                  onPress={() => {
                    void setSelectedMealType(type)
                    setMealPickerOpen(false)
                  }}
                  style={({ pressed }) => [
                    styles.mealMenuItem,
                    type === selectedMealType && styles.mealMenuItemSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.mealMenuItemText,
                      type === selectedMealType && styles.mealMenuItemTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.muted}>Loading full nutrition…</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.secondaryButton} onPress={handleContribute}>
              <Text style={styles.secondaryButtonText}>Contribute this product</Text>
            </Pressable>
          </View>
        ) : product ? (
          <MotionView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 240 }}
            style={styles.stack}
          >
            {barcode ? <Text style={styles.barcode}>Code · {barcode}</Text> : null}

            <View style={styles.macroRow}>
              <View style={styles.macroCard}>
                <Text style={styles.macroLabel}>kcal</Text>
                <Text style={styles.macroValue}>
                  {macros?.kcal != null ? Math.round(macros.kcal) : '—'}
                </Text>
              </View>
              <View style={styles.macroCard}>
                <Text style={styles.macroLabel}>Protein</Text>
                <Text style={styles.macroValue}>
                  {macros?.protein != null ? `${macros.protein}g` : '—'}
                </Text>
              </View>
              <View style={styles.macroCard}>
                <Text style={styles.macroLabel}>Carbs</Text>
                <Text style={styles.macroValue}>
                  {macros?.carbs != null ? `${macros.carbs}g` : '—'}
                </Text>
              </View>
              <View style={styles.macroCard}>
                <Text style={styles.macroLabel}>Fat</Text>
                <Text style={styles.macroValue}>
                  {macros?.fat != null ? `${macros.fat}g` : '—'}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>
              All fields · {columns.length} provided
            </Text>
            <View style={styles.columnsCard}>
              {columns.length === 0 ? (
                <Text style={styles.muted}>No nutrient columns on this product.</Text>
              ) : (
                columns.map(([key, value]) => (
                  <View key={key} style={styles.columnRow}>
                    <Text style={styles.columnLabel}>{formatLabel(key)}</Text>
                    <Text style={styles.columnValue}>{formatValue(value)}</Text>
                  </View>
                ))
              )}
            </View>

            {needsLabelPhoto ? (
              <Pressable
                onPress={handleContribute}
                style={({ pressed }) => [styles.photoNudge, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <View style={styles.photoNudgeIcon}>
                  <Ionicons name="camera-outline" size={22} color={colors.accent} />
                </View>
                <View style={styles.photoNudgeCopy}>
                  <Text style={styles.photoNudgeTitle}>Some details are unknown</Text>
                  <Text style={styles.photoNudgeBody}>
                    Snap a clear photo of the nutrition facts and ingredients list so we can fill
                    the gaps.
                  </Text>
                  <Text style={styles.photoNudgeCta}>Take photo →</Text>
                </View>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleContribute}
                style={({ pressed }) => [styles.improveLink, pressed && styles.pressed]}
              >
                <Ionicons name="create-outline" size={16} color={colors.accent} />
                <Text style={styles.improveLinkText}>Add / change details</Text>
              </Pressable>
            )}
          </MotionView>
        ) : null}
      </ScrollView>

      {!loading && product ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Pressable
            disabled={!barcode || adding || added}
            onPress={() => void handleAdd()}
            style={({ pressed }) => [
              styles.primaryButton,
              (!barcode || adding || added) && styles.primaryButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            {adding ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <>
                <Ionicons
                  name={added ? 'checkmark' : 'add-circle-outline'}
                  size={18}
                  color={colors.onAccent}
                />
                <Text style={styles.primaryButtonText}>
                  {added ? `Added to ${selectedMealType}` : `Add to ${selectedMealType}`}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderStrong,
      zIndex: 5,
    },
    iconButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.md,
      backgroundColor: c.surface,
      marginTop: 2,
    },
    headerCopy: {
      flex: 1,
      gap: 2,
    },
    eyebrow: {
      ...typography.labelSmall,
      color: c.textMuted,
      letterSpacing: 1.2,
    },
    headerTitle: {
      ...typography.headline,
      color: c.text,
    },
    mealSelectWrap: {
      position: 'relative',
      zIndex: 10,
    },
    mealSelect: {
      minWidth: 110,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: 'rgba(120,118,114,0.3)',
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
    },
    mealSelectText: {
      ...typography.label,
      color: c.accent,
    },
    mealMenu: {
      position: 'absolute',
      top: 42,
      right: 0,
      zIndex: 20,
      minWidth: 140,
      backgroundColor: c.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
    },
    mealMenuItem: {
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
    },
    mealMenuItemSelected: {
      backgroundColor: c.accentSoft,
    },
    mealMenuItemText: {
      ...typography.label,
      color: c.text,
    },
    mealMenuItemTextSelected: {
      color: c.accent,
      fontWeight: '700',
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      gap: spacing.md,
    },
    stack: {
      gap: spacing.md,
    },
    centered: {
      minHeight: 220,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      padding: spacing.lg,
    },
    muted: {
      ...typography.body,
      color: c.textMuted,
      textAlign: 'center',
    },
    errorText: {
      ...typography.body,
      color: c.danger,
      textAlign: 'center',
    },
    barcode: {
      ...typography.labelSmall,
      color: c.textMuted,
    },
    macroRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    macroCard: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: 'rgba(120,118,114,0.2)',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
      alignItems: 'center',
      gap: 2,
    },
    macroLabel: {
      ...typography.labelSmall,
      color: c.textMuted,
      fontSize: 10,
    },
    macroValue: {
      ...typography.label,
      color: c.text,
      fontWeight: '700',
    },
    sectionLabel: {
      ...typography.label,
      color: c.accent,
      marginTop: spacing.xs,
    },
    columnsCard: {
      backgroundColor: c.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: 'rgba(120,118,114,0.2)',
      overflow: 'hidden',
      paddingHorizontal: spacing.md,
    },
    columnRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(196,198,207,0.28)',
    },
    columnLabel: {
      ...typography.labelSmall,
      color: c.textMuted,
      flex: 1,
    },
    columnValue: {
      ...typography.labelSmall,
      color: c.text,
      fontSize: 13,
      fontWeight: '500',
      flex: 1.2,
      textAlign: 'right',
    },
    improveLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingVertical: spacing.sm,
    },
    improveLinkText: {
      ...typography.labelSmall,
      color: c.accent,
      fontWeight: '600',
    },
    photoNudge: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      backgroundColor: c.accentSoft,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.md,
    },
    photoNudgeIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoNudgeCopy: {
      flex: 1,
      gap: 4,
    },
    photoNudgeTitle: {
      ...typography.label,
      color: c.text,
      fontWeight: '700',
    },
    photoNudgeBody: {
      ...typography.labelSmall,
      color: c.textMuted,
      lineHeight: 18,
    },
    photoNudgeCta: {
      ...typography.labelSmall,
      color: c.accent,
      fontWeight: '700',
      marginTop: 4,
    },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      backgroundColor: c.bg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.accent,
      borderRadius: borderRadius.md,
      paddingVertical: 14,
    },
    primaryButtonDisabled: {
      opacity: 0.55,
    },
    primaryButtonText: {
      ...typography.label,
      color: c.onAccent,
      fontWeight: '700',
    },
    secondaryButton: {
      marginTop: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: spacing.lg,
      paddingVertical: 12,
      backgroundColor: c.surface,
    },
    secondaryButtonText: {
      ...typography.label,
      color: c.accent,
      fontWeight: '600',
    },
    pressed: {
      opacity: 0.78,
    },
  })
