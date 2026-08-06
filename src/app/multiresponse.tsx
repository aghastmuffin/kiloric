import { authenticatedRequest } from '@/components/apiUtils';
import BarcodeDetailModal from '@/components/BarcodeDetailModal';
import { MotionView } from '@/components/MotionView';
import { useAuth } from '@/lib/AuthContext';
import { addProductToMeal } from '@/lib/meals';
import { useMealTypePreferences } from '@/lib/MealTypePreferencesContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import { spacing, type ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
  const title = getItemTitle(item, index);
  const barcode = getItemBarcode(item);
  const entries = Object.entries(item).filter(([key]) => !TITLE_KEYS.includes(key));

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {entries.length > 0 ? (
        entries.map(([key, value]) => (
          <ResultRow key={key} label={formatLabel(key)} value={formatValue(value)} />
        ))
      ) : (
        <Text style={styles.mutedText}>No additional details</Text>
      )}
      {barcode && onViewMore ? (
        <Text style={styles.viewMoreButtonText}>View more →</Text>
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
        <Pressable style={styles.contributeButton} onPress={onContribute} accessibilityRole="button">
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
  const { user } = useAuth()
  const { selectedMealType } = useMealTypePreferences()
  const parsedResult = parseResult(result)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedBarcode, setSelectedBarcode] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<Record<string, unknown> | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
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
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {query ? (
          <View style={styles.header}>
            <Text style={styles.headerLabel}>Search query</Text>
            <Text style={styles.headerQuery}>{query}</Text>
          </View>
        ) : null}

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
        onClose={() => setModalVisible(false)}
      />
    </>
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
    maxWidth: 620,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: 48,
    gap: spacing.md,
  },
  header: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
  headerLabel: {
    ...typography.labelSmall,
    color: c.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  mealChipText: {
    ...typography.labelSmall,
    color: c.accent,
  },
  swipeHint: {
    ...typography.labelSmall,
    color: c.textMuted,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  headerQuery: {
    color: c.text,
    fontSize: 20,
    fontWeight: '600',
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    })
  },
  cardPressed: {
    opacity: 0.8,
  },
  errorCard: {
    borderColor: c.danger,
    backgroundColor: c.dangerSoft,
  },
  cardHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardHeadingText: {
    flex: 1,
  },
  cardTitle: {
    ...typography.bodyLarge,
    color: c.text,
    fontWeight: '700',
  },
  barcodeText: {
    ...typography.labelSmall,
    color: c.textMuted,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  rowLabel: {
    ...typography.labelSmall,
    color: c.textMuted,
    flex: 1,
  },
  rowValue: {
    ...typography.labelSmall,
    color: c.text,
    fontSize: 14,
    fontWeight: '500',
    flex: 1.2,
    textAlign: 'right',
  },
  messageText: {
    ...typography.body,
    color: c.text,
  },
  errorText: {
    color: c.danger,
  },
  mutedText: {
    ...typography.body,
    color: c.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  viewMoreButton: {
    backgroundColor: c.surfaceAlt,
    padding: 12,
    borderRadius: 8,
    marginTop: 14,
    borderWidth: 1,
    borderColor: c.accent,
    alignItems: 'center',
  },
  viewMoreButtonText: {
    color: c.accent,
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
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
  },
  contributeButton: {
    marginTop: spacing.md,
    backgroundColor: c.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: 8,
  },
  contributeButtonText: {
    ...typography.label,
    color: c.onAccent,
    fontWeight: '700',
  },
});