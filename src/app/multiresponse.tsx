import { authenticatedRequest } from '@/components/apiUtils';
import BarcodeDetailModal from '@/components/BarcodeDetailModal';
import { MotionView } from '@/components/MotionView';
import { useAuth } from '@/lib/AuthContext';
import { addProductToMeal } from '@/lib/meals';
import { useMealTypePreferences } from '@/lib/MealTypePreferencesContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useAppLayout } from '@/lib/theme/layout';
import { triggerImpactHaptic, triggerSelectionHaptic } from '@/lib/haptics';
import { borderRadius, spacing, type ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TITLE_KEYS = ['name', 'title', 'food_name', 'product_name', 'description', 'label'];
const BARCODE_KEYS = ['code', 'barcode', 'barcode_id', 'upc', 'ean'];

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function getItemTitle(item: Record<string, unknown>, index: number): string {
  for (const key of TITLE_KEYS) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  const product = getProductData(item);
  if (product !== item) {
    for (const key of TITLE_KEYS) {
      const value = product[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
  }
  return `Result ${index + 1}`;
}

function getItemBarcode(item: Record<string, unknown>): string | null {
  for (const key of BARCODE_KEYS) {
    const value = item[key];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value);
    }
  }
  const product = getProductData(item);
  if (product !== item) return getItemBarcode(product);
  return null;
}

function getProductData(item: Record<string, unknown>): Record<string, unknown> {
  for (const key of ['product', 'product_data', 'data']) {
    const value = item[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return item;
}

function ResultRow({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function ObjectCard({
  item,
  index,
  onViewMore,
  onAdd,
  addStatus,
}: {
  item: Record<string, unknown>;
  index: number;
  onViewMore?: (barcode: string) => void;
  onAdd?: (item: Record<string, unknown>, index: number) => void;
  addStatus?: { state: 'adding' | 'added' | 'error'; message: string };
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const title = getItemTitle(item, index);
  const barcode = getItemBarcode(item);
  const entries = Object.entries(item).filter(([key]) => !TITLE_KEYS.includes(key));
  const isAdding = addStatus?.state === 'adding';
  const isAdded = addStatus?.state === 'added';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeading}>
        <View style={styles.cardHeadingText}>
          <Text style={styles.cardTitle}>{title}</Text>
          {barcode ? <Text style={styles.barcodeText}>Barcode · {barcode}</Text> : null}
        </View>
        <Text style={styles.resultNumber}>{String(index + 1).padStart(2, '0')}</Text>
      </View>
      {entries.length > 0 ? (
        <View style={styles.detailsBlock}>
          {entries.map(([key, value]) => (
            <ResultRow key={key} label={formatLabel(key)} value={formatValue(value)} />
          ))}
        </View>
      ) : (
        <Text style={styles.mutedText}>No additional details</Text>
      )}
      {barcode && (onViewMore || onAdd) ? (
        <View style={styles.cardActions}>
          {onViewMore ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View full details for ${title}`}
              accessibilityHint="Opens complete product nutrition and metadata details"
              onPress={() => {
                triggerSelectionHaptic();
                onViewMore(barcode);
              }}
              style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
            >
              <Ionicons name="eye-outline" size={17} color={colors.accent} />
              <Text style={styles.secondaryActionText}>Full details</Text>
            </Pressable>
          ) : null}
          {onAdd ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${isAdded ? 'Added' : 'Add'} ${title}`}
              accessibilityHint="Adds this item to your active meal log"
              accessibilityState={{ disabled: isAdding || isAdded }}
              disabled={isAdding || isAdded}
              onPress={() => {
                triggerImpactHaptic();
                onAdd(item, index);
              }}
              style={({ pressed }) => [
                styles.primaryAction,
                isAdded && styles.primaryActionDone,
                pressed && styles.pressed,
              ]}
            >
              {isAdding ? (
                <ActivityIndicator size="small" color={colors.onBrand} />
              ) : (
                <Ionicons
                  name={isAdded ? 'checkmark' : 'add'}
                  size={18}
                  color={colors.onBrand}
                />
              )}
              <Text style={styles.primaryActionText}>
                {isAdding ? 'Adding…' : isAdded ? 'Added' : 'Add to meal'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {addStatus ? (
        <Text style={[styles.addStatus, addStatus.state === 'error' && styles.addStatusError]}>
          {addStatus.message}
        </Text>
      ) : null}
    </View>
  );
}

function parseResult(raw: string | undefined): unknown {
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function EmptyContributeState({
  title,
  subtitle,
  onContribute,
}: {
  title: string
  subtitle: string
  onContribute?: () => void
}) {
  const styles = useThemedStyles(makeStyles)
  const { colors } = useTheme()
  return (
    <View style={styles.emptyStateContainer}>
      <MotionView
        from={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        style={styles.emptyIconCircle}
      >
        <MaterialIcons name="search-off" size={48} color={colors.textMuted} />
      </MotionView>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateSubtitle}>{subtitle}</Text>
      {onContribute ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add this product"
          accessibilityHint="Navigates to food contribution to upload photos of this item"
          onPress={() => {
            triggerSelectionHaptic();
            onContribute();
          }}
          style={styles.contributeButton}
        >
          <Text style={styles.contributeButtonText}>Add this product</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

function ResultsBody({
  data,
  onViewMore,
  onAdd,
  addStatuses,
  onContribute,
}: {
  data: unknown
  onViewMore?: (barcode: string) => void
  onAdd?: (item: Record<string, unknown>, index: number) => void
  addStatuses?: Record<number, { state: 'adding' | 'added' | 'error'; message: string }>
  onContribute?: () => void
}) {
  const styles = useThemedStyles(makeStyles)
  const TARGET_ERROR = '404: no products found'

  if (data === null || data === undefined) {
    return (
      <EmptyContributeState
        title="No results to display"
        subtitle="Try searching for another food or scan a barcode"
        onContribute={onContribute}
      />
    )
  }

  if (typeof data === 'string') {
    if (data.trim().toLowerCase() === TARGET_ERROR) {
      return (
        <EmptyContributeState
          title="No matches found"
          subtitle="We couldn't find this product. You can contribute it with a photo."
          onContribute={onContribute}
        />
      )
    }
    return (
      <MotionView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={styles.card}>
        <Text style={styles.messageText}>{data}</Text>
      </MotionView>
    )
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <EmptyContributeState
          title="No matches found"
          subtitle="Try another search, or contribute this product with a clear label photo."
          onContribute={onContribute}
        />
      )
    }

    if (
      data.length === 1 &&
      typeof data[0] === 'string' &&
      data[0].trim().toLowerCase() === TARGET_ERROR
    ) {
      return (
        <EmptyContributeState
          title="No matches found"
          subtitle="Would you like to add this product?"
          onContribute={onContribute}
        />
      )
    }

    return data.map((item, index) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return (
          <ObjectCard
            key={index}
            item={item as Record<string, unknown>}
            index={index}
            onViewMore={onViewMore}
            onAdd={onAdd}
            addStatus={addStatuses?.[index]}
          />
        )
      }

      return (
        <MotionView
          key={index}
          from={{ opacity: 0, scale: 0.9, translateY: 30 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{
            delay: index * 100,
            type: 'spring',
            damping: 12,
            stiffness: 100,
          }}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>Result {index + 1}</Text>
          <Text style={styles.messageText}>{formatValue(item)}</Text>
        </MotionView>
      )
    })
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>
    const nestedMessage = obj.error || obj.detail || obj.message || obj.result

    if (typeof nestedMessage === 'string' && nestedMessage.trim().toLowerCase() === TARGET_ERROR) {
      return (
        <EmptyContributeState
          title="No matches found"
          subtitle="No matching products were found. You can contribute this food."
          onContribute={onContribute}
        />
      )
    }

    return (
      <ObjectCard
        item={obj}
        index={0}
        onViewMore={onViewMore}
        onAdd={onAdd}
        addStatus={addStatuses?.[0]}
      />
    )
  }

  return (
    <MotionView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} style={styles.card}>
      <Text style={styles.messageText}>{formatValue(data)}</Text>
    </MotionView>
  )
}

export default function MultiResponseScreen() {
  const { query, result } = useLocalSearchParams<{ query?: string; result?: string }>()
  const router = useRouter()
  const styles = useThemedStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const { gutter } = useAppLayout()
  const { user } = useAuth()
  const { selectedMealType } = useMealTypePreferences()
  const parsedResult = parseResult(result)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedBarcode, setSelectedBarcode] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<Record<string, unknown> | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const detailRequestIdRef = useRef(0)
  const [addStatuses, setAddStatuses] = useState<
    Record<number, { state: 'adding' | 'added' | 'error'; message: string }>
  >({})

  const openContribute = useCallback(() => {
    const q = typeof query === 'string' ? query : ''
    const looksLikeBarcode = /^\d{8,14}$/.test(q.trim())
    router.push({
      pathname: '/contribute-food',
      params: {
        query: q,
        ...(looksLikeBarcode ? { code: q.trim() } : {}),
      },
    })
  }, [query, router])

  const handleViewMore = useCallback(async (barcode: string) => {
    const requestId = ++detailRequestIdRef.current
    setSelectedBarcode(barcode)
    setModalVisible(true)
    setDetailLoading(true)
    setDetailError(null)
    setDetailData(null)

    try {
      const data = await authenticatedRequest(`/api/barcode/${encodeURIComponent(barcode)}`)
      if (requestId !== detailRequestIdRef.current) return
      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        setDetailData(data as Record<string, unknown>)
      } else {
        setDetailData({ result: data })
      }
    } catch (error) {
      if (requestId !== detailRequestIdRef.current) return
      const message = error instanceof Error ? error.message : 'Unknown error'
      setDetailError(`Request failed: ${message}`)
    } finally {
      if (requestId === detailRequestIdRef.current) setDetailLoading(false)
    }
  }, [])

  const closeDetail = useCallback(() => {
    detailRequestIdRef.current += 1
    setModalVisible(false)
    setDetailLoading(false)
  }, [])

  useEffect(() => () => {
    detailRequestIdRef.current += 1
  }, [])

  const handleQuickAdd = useCallback(
    async (item: Record<string, unknown>, index: number) => {
      if (addStatuses[index]?.state === 'adding') return

      const barcode = getItemBarcode(item)
      if (!barcode) return
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
        await addProductToMeal(user.$id, selectedMealType, barcode, getProductData(item))
        setAddStatuses((current) => ({
          ...current,
          [index]: { state: 'added', message: `Added to ${selectedMealType}.` },
        }))
      } catch (error) {
        console.error('Could not quick-add search result', error)
        setAddStatuses((current) => ({
          ...current,
          [index]: { state: 'error', message: 'Couldn’t add. Try again.' },
        }))
      }
    },
    [addStatuses, selectedMealType, user],
  )

  return (
    <GestureHandlerRootView style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: gutter, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.overlineRow}>
            <Text style={styles.headerLabel}>FOOD SEARCH</Text>
            <View style={styles.overlineRule} />
          </View>
          <Text accessibilityRole="header" style={styles.headerQuery}>
            {query ? `Results for “${query}”` : 'Search results'}
          </Text>
          <Text style={styles.headerDescription}>
            Review the recorded fields, open the full product detail, or add a match to your meal.
          </Text>
        </View>

        <ResultsBody
          data={parsedResult}
          onViewMore={handleViewMore}
          onAdd={(item, index) => void handleQuickAdd(item, index)}
          addStatuses={addStatuses}
          onContribute={openContribute}
        />
      </ScrollView>

      <BarcodeDetailModal
        visible={modalVisible}
        barcode={selectedBarcode}
        data={detailData}
        isLoading={detailLoading}
        error={detailError}
        onClose={closeDetail}
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
    maxWidth: 680,
    alignSelf: 'center',
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    gap: 5,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.borderStrong,
  },
  overlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 190,
  },
  overlineRule: {
    height: StyleSheet.hairlineWidth,
    flex: 1,
    backgroundColor: c.brand,
    opacity: 0.45,
  },
  headerLabel: {
    ...typography.overline,
    color: c.brand,
  },
  headerQuery: {
    ...typography.headlineLarge,
    color: c.text,
  },
  headerDescription: {
    ...typography.body,
    color: c.textMuted,
    maxWidth: 560,
  },
  card: {
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderStrong,
    gap: spacing.md,
  },
  cardHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  cardHeadingText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    ...typography.headline,
    color: c.text,
  },
  barcodeText: {
    ...typography.labelSmall,
    color: c.textMuted,
    marginTop: 3,
  },
  resultNumber: {
    ...typography.metric,
    color: c.textFaint,
    fontSize: 23,
    lineHeight: 27,
  },
  detailsBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  rowLabel: {
    ...typography.labelSmall,
    color: c.textMuted,
    flex: 1,
  },
  rowValue: {
    ...typography.bodySmall,
    color: c.text,
    flex: 1.25,
    textAlign: 'right',
  },
  messageText: {
    ...typography.body,
    color: c.text,
  },
  mutedText: {
    ...typography.bodySmall,
    color: c.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  secondaryAction: {
    minHeight: 46,
    minWidth: 132,
    flexGrow: 1,
    flexBasis: 160,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: borderRadius.pill,
    backgroundColor: c.surface,
    paddingHorizontal: spacing.md,
  },
  secondaryActionText: {
    ...typography.label,
    color: c.accent,
  },
  primaryAction: {
    minHeight: 46,
    minWidth: 132,
    flexGrow: 1,
    flexBasis: 160,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.pill,
    backgroundColor: c.brand,
    paddingHorizontal: spacing.md,
  },
  primaryActionDone: {
    backgroundColor: c.success,
  },
  primaryActionText: {
    ...typography.label,
    color: c.onBrand,
  },
  addStatus: {
    ...typography.labelSmall,
    color: c.success,
  },
  addStatusError: {
    color: c.danger,
  },
  emptyStateContainer: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceAlt,
    marginBottom: spacing.sm,
  },
  emptyStateTitle: {
    ...typography.headline,
    color: c.text,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    ...typography.body,
    color: c.textMuted,
    textAlign: 'center',
    maxWidth: 440,
  },
  contributeButton: {
    minHeight: 48,
    marginTop: spacing.md,
    backgroundColor: c.brand,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    borderRadius: borderRadius.pill,
  },
  contributeButtonText: {
    ...typography.label,
    color: c.onBrand,
  },
  pressed: {
    opacity: 0.72,
  },
});
