import { authenticatedRequest } from '@/lib/apiUtils'
import {
  contributeParamsFromProduct,
  macrosFromProduct,
  type SearchResult,
} from '@/components/LogFoodMultiView'
import { MotionView } from '@/components/MotionView'
import { useAuth } from '@/lib/AuthContext'
import { addProductToMeal, type MealType } from '@/lib/meals'
import { effectiveMealNames, loadPlanPreferences } from '@/lib/planPreferences'
import { useMealTypePreferences } from '@/lib/MealTypePreferencesContext'
import { isOrdsPresent, productHasUnknownDetails } from '@/lib/ordsNormalize'
import {
  formatProductLabel,
  formatProductValue,
  getBarcodeFromProduct,
  getProductTitle,
  listProductColumns,
  unwrapProduct,
} from '@/lib/productDisplay'
import { takeSearchResult } from '@/lib/searchResultStore'
import { useTheme } from '@/lib/theme/ThemeContext'
import { useAppLayout } from '@/lib/theme/layout'
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

function paramString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
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
  const { compact, gutter } = useAppLayout()
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
  const [activeMealNames, setActiveMealNames] = useState<string[]>(['Breakfast', 'Lunch', 'Snack', 'Dinner'])

  useEffect(() => {
    if (!user?.$id) return
    loadPlanPreferences(user.$id)
      .then((prefs) => {
        setActiveMealNames(effectiveMealNames(prefs))
      })
      .catch(() => {})
  }, [user?.$id])

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
    () => (product ? getBarcodeFromProduct(product) : null) ?? (barcodeParam || null),
    [barcodeParam, product],
  )
  const macros = useMemo(() => (product ? macrosFromProduct(product) : null), [product])
  const columns = useMemo(() => (product ? listProductColumns(product) : []), [product])
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
      setTimeout(() => router.back(), 650)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not add food.'
      Alert.alert('Could not add', message)
    } finally {
      setAdding(false)
    }
  }, [added, adding, barcode, product, router, selectedMealType, user])

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
      <View style={[styles.header, compact && styles.headerCompact, { paddingHorizontal: gutter }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.accent} />
        </Pressable>
        <View style={styles.headerCopy}>
          <View style={styles.overlineRow}>
            <Text style={styles.eyebrow}>FOOD DETAILS</Text>
            <View style={styles.overlineRule} />
          </View>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {title}
          </Text>
        </View>
        <View style={[styles.mealSelectWrap, compact && styles.mealSelectWrapCompact]}>
          <Pressable
            onPress={() => setMealPickerOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel={`Choose meal. Currently ${selectedMealType}`}
            accessibilityState={{ expanded: mealPickerOpen }}
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
            <MotionView
              from={{ opacity: 0, translateY: -6, scale: 0.98 }}
              animate={{ opacity: 1, translateY: 0, scale: 1 }}
              transition={{ type: 'timing', duration: 140 }}
              style={styles.mealMenu}
            >
              {activeMealNames.map((type: string) => (
                <Pressable
                  key={type}
                  accessibilityRole="button"
                  accessibilityState={{ selected: type === selectedMealType }}
                  onPress={() => {
                    if (type !== selectedMealType) void Haptics.selectionAsync()
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
            </MotionView>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100, paddingHorizontal: gutter }]}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.stateTitle}>Loading nutrition</Text>
            <Text style={styles.muted}>Checking the recorded product details…</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
            <Text style={styles.stateTitle}>Product details unavailable</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              onPress={handleContribute}
            >
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

            <View style={styles.basisHeader}>
              <Text style={styles.sectionKicker}>NUTRITION BASIS</Text>
              <Text style={styles.sectionTitle}>Per 100 g</Text>
              <Text style={styles.basisNote}>
                Values below use the product’s existing 100 g nutrition fields.
              </Text>
            </View>

            <View style={styles.macroRow}>
              {[
                { label: 'Energy', value: macros?.kcal != null ? Math.round(macros.kcal) : '—', unit: 'kcal' },
                { label: 'Protein', value: macros?.protein ?? '—', unit: 'g' },
                { label: 'Carbs', value: macros?.carbs ?? '—', unit: 'g' },
                { label: 'Fat', value: macros?.fat ?? '—', unit: 'g' },
              ].map((metric, index) => (
                <MotionView
                  key={metric.label}
                  from={{ opacity: 0, translateY: 8 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ delay: 30 + index * 30, type: 'timing', duration: 180 }}
                  style={styles.macroMetric}
                >
                  <Text style={styles.macroLabel}>{metric.label}</Text>
                  <Text
                    style={styles.macroValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                  >
                    {metric.value}
                    {metric.value !== '—' ? <Text style={styles.macroUnit}> {metric.unit}</Text> : null}
                  </Text>
                </MotionView>
              ))}
            </View>

            <View style={styles.detailsHeader}>
              <View>
                <Text style={styles.sectionKicker}>PRODUCT RECORD</Text>
                <Text style={styles.sectionTitle}>Recorded details</Text>
              </View>
              <Text style={styles.sectionMeta}>{columns.length} FIELDS</Text>
            </View>
            <View style={styles.columnsCard}>
              {columns.length === 0 ? (
                <Text style={styles.emptyDetails}>No additional product fields were provided.</Text>
              ) : (
                columns.map(([key, value]) => (
                  <View key={key} style={styles.columnRow}>
                    <Text style={styles.columnLabel}>{formatProductLabel(key)}</Text>
                    <Text style={styles.columnValue}>{formatProductValue(value)}</Text>
                  </View>
                ))
              )}
            </View>

            {needsLabelPhoto ? (
              <Pressable
                onPress={handleContribute}
                style={({ pressed }) => [styles.photoNudge, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Help complete this product's missing details"
              >
                <View style={styles.photoNudgeIcon}>
                  <Ionicons name="camera-outline" size={22} color={colors.accent} />
                </View>
                <View style={styles.photoNudgeCopy}>
                  <Text style={styles.photoNudgeTitle}>We need your help!</Text>
                  <Text style={styles.photoNudgeBody}>
                    This product is missing a few useful details. Share a clear label photo and
                    we&apos;ll use it to complete the nutrition information.
                  </Text>
                  <Text style={styles.photoNudgeCta}>Help complete this product →</Text>
                </View>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleContribute}
                style={({ pressed }) => [styles.improveLink, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <Ionicons name="create-outline" size={16} color={colors.accent} />
                <Text style={styles.improveLinkText}>Add / change details</Text>
              </Pressable>
            )}
          </MotionView>
        ) : null}
      </ScrollView>

      {!loading && product ? (
        <MotionView
          from={{ opacity: 0, translateY: 18 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md), paddingHorizontal: gutter }]}
        >
          <Pressable
            disabled={!barcode || adding || added}
            accessibilityRole="button"
            accessibilityState={{ disabled: !barcode || adding || added }}
            onPress={() => void handleAdd()}
            style={({ pressed }) => [
              styles.primaryButton,
              (!barcode || adding || added) && styles.primaryButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            {adding ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <>
                <Ionicons
                  name={added ? 'checkmark' : 'add-circle-outline'}
                  size={18}
                  color={colors.onBrand}
                />
                <Text style={styles.primaryButtonText}>
                  {added ? `Added to ${selectedMealType}` : `Add to ${selectedMealType}`}
                </Text>
              </>
            )}
          </Pressable>
        </MotionView>
      ) : null}
    </View>
  )
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderStrong,
      zIndex: 5,
    },
    headerCompact: {
      flexWrap: 'wrap',
    },
    iconButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.md,
      backgroundColor: c.surface,
      marginTop: 2,
    },
    headerCopy: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    overlineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      maxWidth: 190,
    },
    eyebrow: {
      ...typography.overline,
      color: c.brand,
    },
    overlineRule: {
      height: StyleSheet.hairlineWidth,
      flex: 1,
      backgroundColor: c.brand,
      opacity: 0.45,
    },
    headerTitle: {
      ...typography.headline,
      color: c.text,
    },
    mealSelectWrap: {
      position: 'relative',
      zIndex: 10,
    },
    mealSelectWrapCompact: {
      flexBasis: '100%',
      marginLeft: 52,
      marginTop: spacing.xs,
    },
    mealSelect: {
      minWidth: 110,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
    },
    mealSelectText: {
      ...typography.label,
      color: c.brand,
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
      minHeight: 44,
      justifyContent: 'center',
    },
    mealMenuItemSelected: {
      backgroundColor: c.brandSoft,
    },
    mealMenuItemText: {
      ...typography.label,
      color: c.text,
    },
    mealMenuItemTextSelected: {
      color: c.brand,
      fontWeight: '700',
    },
    content: {
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
    stateTitle: {
      ...typography.headline,
      color: c.text,
      textAlign: 'center',
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
      ...typography.overline,
      color: c.textMuted,
    },
    basisHeader: {
      gap: 3,
      paddingTop: spacing.xs,
    },
    sectionKicker: {
      ...typography.overline,
      color: c.brand,
    },
    sectionTitle: {
      ...typography.headline,
      color: c.text,
    },
    basisNote: {
      ...typography.bodySmall,
      color: c.textMuted,
      maxWidth: 520,
    },
    macroRow: {
      flexDirection: 'row',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderStrong,
      paddingVertical: spacing.md,
    },
    macroMetric: {
      flex: 1,
      minWidth: 0,
      paddingHorizontal: spacing.xs,
      alignItems: 'center',
      gap: 2,
    },
    macroLabel: {
      ...typography.labelSmall,
      color: c.textMuted,
    },
    macroValue: {
      ...typography.metric,
      color: c.text,
      fontSize: 25,
      lineHeight: 30,
    },
    macroUnit: {
      ...typography.labelSmall,
      color: c.textMuted,
    },
    detailsHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    sectionMeta: {
      ...typography.overline,
      color: c.textMuted,
    },
    columnsCard: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderStrong,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderStrong,
    },
    columnRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
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
    emptyDetails: {
      ...typography.bodySmall,
      color: c.textMuted,
      paddingVertical: spacing.lg,
      textAlign: 'center',
    },
    improveLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      minHeight: 44,
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
      backgroundColor: c.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    primaryButton: {
      width: '100%',
      maxWidth: 720,
      alignSelf: 'center',
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.brand,
      borderRadius: borderRadius.pill,
      paddingVertical: 14,
    },
    primaryButtonDisabled: {
      opacity: 0.55,
    },
    primaryButtonText: {
      ...typography.label,
      color: c.onBrand,
      fontWeight: '700',
    },
    secondaryButton: {
      marginTop: spacing.sm,
      minHeight: 44,
      justifyContent: 'center',
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
