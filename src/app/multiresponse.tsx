import { authenticatedRequest } from '@/components/apiUtils'
import BarcodeDetailModal from '@/components/BarcodeDetailModal'
import { MotionView } from '@/components/MotionView'
import { SwipeableRow } from '@/components/SwipeableRow'
import { useAuth } from '@/lib/AuthContext'
import { addProductToMeal, MEAL_TYPE_OPTIONS, type MealType } from '@/lib/meals'
import { useMealTypePreferences } from '@/lib/MealTypePreferencesContext'
import { getBarcodeFromProduct, getProductTitle } from '@/lib/productDisplay'
import { useTheme } from '@/lib/theme/ThemeContext'
import { borderRadius, spacing, type ThemeColors } from '@/lib/theme/tokens'
import { typography } from '@/lib/theme/typography'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type SearchResult = Record<string, unknown>

const TITLE_KEYS = ['name', 'title', 'food_name', 'product_name', 'description', 'label']

function getBrand(item: SearchResult): string {
  for (const key of ['brands', 'brand', 'manufacturer', 'store']) {
    const value = item[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  const nested = item.product
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return getBrand(nested as SearchResult)
  }
  return 'Food database'
}

function getCaloriesLabel(item: SearchResult): string {
  const product =
    item.product && typeof item.product === 'object' && !Array.isArray(item.product)
      ? (item.product as SearchResult)
      : item
  const nutriments =
    product.nutriments && typeof product.nutriments === 'object' && !Array.isArray(product.nutriments)
      ? (product.nutriments as Record<string, unknown>)
      : null

  const calories =
    product.calories ??
    product['energy-kcal'] ??
    product.energy_kcal ??
    nutriments?.['energy-kcal_100g'] ??
    nutriments?.['energy-kcal'] ??
    nutriments?.energy_kcal

  if (typeof calories === 'number' && Number.isFinite(calories)) {
    return `${Math.round(calories)} kcal / 100g`
  }
  if (typeof calories === 'string' && calories.trim()) {
    return calories.includes('kcal') ? calories : `${calories} kcal`
  }
  return 'View details'
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

function parseResult(raw: string | undefined): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function parseSearchPayload(data: unknown): SearchResult[] {
  if (typeof data === 'string') {
    const trimmed = data.trim().toLowerCase()
    if (!trimmed || trimmed.includes('404') || trimmed.includes('no products')) return []
    try {
      return parseSearchPayload(JSON.parse(data))
    } catch {
      return []
    }
  }

  if (Array.isArray(data)) {
    return data.filter(
      (item): item is SearchResult =>
        !!item && typeof item === 'object' && !Array.isArray(item),
    )
  }

  if (data && typeof data === 'object') {
    const obj = data as SearchResult
    const nested = obj.results ?? obj.products ?? obj.items ?? obj.data
    if (Array.isArray(nested)) return parseSearchPayload(nested)
    return [obj]
  }

  return []
}

function getItemTitle(item: SearchResult, index: number): string {
  const product = unwrapProduct(item)
  for (const key of TITLE_KEYS) {
    const value = product[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return getProductTitle(product, `Result ${index + 1}`)
}

export default function MultiResponseScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const { user } = useAuth()
  const { selectedMealType, setSelectedMealType } = useMealTypePreferences()
  const { query, result } = useLocalSearchParams<{ query?: string; result?: string }>()

  const results = useMemo(() => parseSearchPayload(parseResult(result)), [result])
  const [mealPickerOpen, setMealPickerOpen] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedBarcode, setSelectedBarcode] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<Record<string, unknown> | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [addStatuses, setAddStatuses] = useState<
    Record<number, { state: 'adding' | 'added' | 'error'; message: string }>
  >({})

  const handleViewMore = useCallback(async (barcode: string) => {
    setSelectedBarcode(barcode)
    setModalVisible(true)
    setDetailLoading(true)
    setDetailError(null)
    setDetailData(null)

    try {
      const data = await authenticatedRequest(`/api/barcode/${barcode}`)
      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        setDetailData(data as Record<string, unknown>)
      } else {
        setDetailData({ result: data })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setDetailError(`Request failed: ${message}`)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const handleQuickAdd = useCallback(async (
    item: SearchResult,
    index: number,
  ) => {
    if (addStatuses[index]?.state === 'adding') return

    const product = unwrapProduct(item)
    const barcode = getBarcodeFromProduct(product) ?? getBarcodeFromProduct(item)
    if (!barcode) {
      setAddStatuses((current) => ({
        ...current,
        [index]: { state: 'error', message: 'No barcode available for this item.' },
      }))
      return
    }
    if (!user?.$id) {
      setAddStatuses((current) => ({
        ...current,
        [index]: { state: 'error', message: 'Sign in to add foods.' },
      }))
      return
    }

    setAddStatuses((current) => ({
      ...current,
      [index]: { state: 'adding', message: `Adding to ${selectedMealType}…` },
    }))
    try {
      await addProductToMeal(user.$id, selectedMealType, barcode, product)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setAddStatuses((current) => ({
        ...current,
        [index]: { state: 'added', message: `Added to ${selectedMealType}` },
      }))
    } catch (error) {
      console.error('Could not quick-add search result', error)
      setAddStatuses((current) => ({
        ...current,
        [index]: { state: 'error', message: 'Couldn’t add. Try again.' },
      }))
    }
  }, [addStatuses, selectedMealType, user])

  return (
    <GestureHandlerRootView style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: spacing.lg, paddingBottom: insets.bottom + 48 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <MotionView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.resultsHeading}>
              <Pressable
                onPress={() => router.back()}
                hitSlop={8}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Ionicons name="arrow-back" size={18} color={colors.accent} />
              </Pressable>
              <View>
                <Text style={styles.sectionTitle}>Search Results</Text>
                {query ? (
                  <Text style={styles.queryMeta} numberOfLines={1}>
                    Matches for “{query}”
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.mealSelectWrap}>
              <Pressable
                onPress={() => setMealPickerOpen((open) => !open)}
                style={({ pressed }) => [styles.mealSelect, pressed && styles.pressed]}
              >
                <Text style={styles.mealSelectText}>{selectedMealType}</Text>
                <Ionicons
                  name={mealPickerOpen ? 'chevron-up' : 'chevron-down'}
                  size={20}
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

          <Text style={styles.swipeHint}>Swipe left or tap + to add to {selectedMealType}</Text>

          <View style={styles.resultsCard}>
            {results.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No matches found for this search.</Text>
              </View>
            ) : (
              results.map((item, index) => {
                const product = unwrapProduct(item)
                const title = getItemTitle(item, index)
                const barcode = getBarcodeFromProduct(product) ?? getBarcodeFromProduct(item)
                const brand = getBrand(product)
                const calories = getCaloriesLabel(product)
                const status = addStatuses[index]

                const row = (
                  <Pressable
                    onPress={() => barcode && void handleViewMore(barcode)}
                    disabled={!barcode}
                    style={({ pressed }) => [
                      styles.resultRow,
                      index > 0 && styles.rowDivider,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.resultCopy}>
                      <Text style={styles.resultTitle} numberOfLines={2}>{title}</Text>
                      <Text style={styles.resultBrand} numberOfLines={1}>{brand}</Text>
                      <View style={styles.resultBadge}>
                        <Text style={styles.resultBadgeText}>{calories}</Text>
                      </View>
                      {status ? (
                        <Text
                          style={[
                            styles.resultFeedback,
                            status.state === 'error' && styles.resultFeedbackError,
                          ]}
                        >
                          {status.message}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      accessibilityLabel={`Add ${title}`}
                      disabled={!barcode || status?.state === 'adding'}
                      onPress={() => void handleQuickAdd(item, index)}
                      style={({ pressed }) => [
                        styles.addCircle,
                        (pressed || status?.state === 'added') && styles.addCircleActive,
                      ]}
                    >
                      {status?.state === 'adding' ? (
                        <ActivityIndicator size="small" color={colors.accent} />
                      ) : (
                        <Ionicons
                          name={status?.state === 'added' ? 'checkmark' : 'add'}
                          size={18}
                          color={status?.state === 'added' ? colors.onAccent : colors.textMuted}
                        />
                      )}
                    </Pressable>
                  </Pressable>
                )

                return (
                  <MotionView
                    key={`${barcode ?? title}-${index}`}
                    from={{ opacity: 0, translateY: 8 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 240, delay: index * 35 }}
                  >
                    {barcode ? (
                      <SwipeableRow
                        swipeLeft={{
                          label: 'Add',
                          icon: 'add-circle-outline',
                          onPress: () => void handleQuickAdd(item, index),
                        }}
                      >
                        {row}
                      </SwipeableRow>
                    ) : (
                      row
                    )}
                  </MotionView>
                )
              })
            )}
          </View>
        </MotionView>
      </ScrollView>

      <BarcodeDetailModal
        visible={modalVisible}
        barcode={selectedBarcode}
        data={detailData}
        isLoading={detailLoading}
        error={detailError}
        onClose={() => setModalVisible(false)}
      />
    </GestureHandlerRootView>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: c.background,
  },
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.borderStrong,
    paddingBottom: spacing.sm,
  },
  resultsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  sectionTitle: {
    ...typography.headline,
    color: c.accent,
  },
  queryMeta: {
    ...typography.labelSmall,
    color: c.textMuted,
    marginTop: 2,
  },
  mealSelectWrap: {
    position: 'relative',
    zIndex: 5,
  },
  mealSelect: {
    minWidth: 118,
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
  swipeHint: {
    ...typography.labelSmall,
    color: c.textMuted,
  },
  resultsCard: {
    backgroundColor: c.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(120,118,114,0.2)',
    overflow: 'hidden',
  },
  resultRow: {
    minHeight: 92,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: c.surface,
  },
  resultCopy: {
    flex: 1,
    gap: 4,
  },
  resultTitle: {
    ...typography.body,
    color: c.text,
  },
  resultBrand: {
    ...typography.labelSmall,
    color: c.textMuted,
  },
  resultBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(27,54,93,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  resultBadgeText: {
    ...typography.labelSmall,
    fontSize: 10,
    color: c.accent,
  },
  resultFeedback: {
    ...typography.labelSmall,
    color: c.success,
    marginTop: 4,
  },
  resultFeedbackError: {
    color: c.danger,
  },
  addCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCircleActive: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(196,198,207,0.35)',
  },
  emptyCard: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: c.textMuted,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.78,
  },
})
