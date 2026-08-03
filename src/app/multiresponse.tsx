import { authenticatedRequest } from '@/components/apiUtils';
import BarcodeDetailModal from '@/components/BarcodeDetailModal';
import { SwipeableRow } from '@/components/SwipeableRow';
import { useAuth } from '@/lib/AuthContext';
import { addProductToMeal } from '@/lib/meals';
import { useMealTypePreferences } from '@/lib/MealTypePreferencesContext';
import { borderRadius, spacing, type ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
  const productData = getProductData(item);
  const entries = Object.entries(productData)
    .filter(([key, value]) => !TITLE_KEYS.includes(key) && typeof value !== 'object')
    .slice(0, 4);

  const card = (
    <Pressable
      accessibilityRole={barcode && onViewMore ? 'button' : undefined}
      accessibilityLabel={barcode && onViewMore ? `View more about ${title}` : undefined}
      disabled={!barcode || !onViewMore}
      onPress={() => barcode && onViewMore?.(barcode)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHeading}>
        <View style={styles.cardHeadingText}>
          <Text style={styles.cardTitle}>{title}</Text>
          {barcode ? <Text style={styles.barcodeText}>{barcode}</Text> : null}
        </View>
        {addStatus?.state === 'adding' ? (
          <ActivityIndicator size="small" />
        ) : null}
      </View>
      {entries.length > 0
        ? entries.map(([key, value]) => (
            <ResultRow key={key} label={formatLabel(key)} value={formatValue(value)} />
          ))
        : <Text style={styles.noDetailsText}>No additional details</Text>}
      {addStatus ? (
        <Text
          style={[
            styles.feedbackText,
            addStatus.state === 'error' && styles.feedbackError,
          ]}
        >
          {addStatus.message}
        </Text>
      ) : null}
      {barcode && onViewMore ? (
        <Text style={styles.viewMoreButtonText}>View more →</Text>
      ) : null}
    </Pressable>
  );

  if (!barcode || !onAdd) return card;

  return (
    <SwipeableRow
      swipeLeft={{
        label: 'Add to meal',
        icon: 'add-circle-outline',
        onPress: () => onAdd(item, index),
      }}
    >
      {card}
    </SwipeableRow>
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

function ResultsBody({
  data,
  onViewMore,
  onAdd,
  addStatuses,
}: {
  data: unknown;
  onViewMore?: (barcode: string) => void;
  onAdd?: (item: Record<string, unknown>, index: number) => void;
  addStatuses?: Record<number, { state: 'adding' | 'added' | 'error'; message: string }>;
}) {
  const styles = useThemedStyles(makeStyles);
  const TARGET_ERROR = "404: no products found";

  if (data === null || data === undefined) {
    return <Text style={styles.mutedText}>No results to display.</Text>;
  }

  // 1. Check direct string match
  if (typeof data === 'string') {
    if (data.trim().toLowerCase() === TARGET_ERROR) {
      return <Text style={styles.mutedText}>No matches found. You can return home</Text>;
    }
    return (
      <View style={styles.card}>
        <Text style={styles.messageText}>{data}</Text>
      </View>
    );
  }

  // 2. Check array wrapped string match
  if (Array.isArray(data)) {
    if (
      data.length === 1 && 
      typeof data[0] === 'string' && 
      data[0].trim().toLowerCase() === TARGET_ERROR
    ) {
      return (
        <View style={[styles.card, styles.errorCard]}>
          <Text style={[styles.messageText, styles.errorText]}>
            No matches found for this search.
          </Text>
        </View>
      );
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
        );
      }

      return (
        <View key={index} style={styles.card}>
          <Text style={styles.cardTitle}>Result {index + 1}</Text>
          <Text style={styles.messageText}>{formatValue(item)}</Text>
        </View>
      );
    });
  }

  // 3. Check nested object string match
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const nestedMessage = obj.error || obj.detail || obj.message || obj.result;

    if (typeof nestedMessage === 'string' && nestedMessage.trim().toLowerCase() === TARGET_ERROR) {
      return <Text style={styles.mutedText}>No matches found. You can return home</Text>;
    }

    return (
      <ObjectCard
        item={obj}
        index={0}
        onViewMore={onViewMore}
        onAdd={onAdd}
        addStatus={addStatuses?.[0]}
      />
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.messageText}>{formatValue(data)}</Text>
    </View>
  );
}

export default function MultiResponseScreen() {
  const { query, result } = useLocalSearchParams<{ query?: string; result?: string }>();
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const { selectedMealType } = useMealTypePreferences();
  const parsedResult = parseResult(result);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [addStatuses, setAddStatuses] = useState<
    Record<number, { state: 'adding' | 'added' | 'error'; message: string }>
  >({});

  const handleViewMore = useCallback(async (barcode: string) => {
    setSelectedBarcode(barcode);
    setModalVisible(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);

    try {
      const data = await authenticatedRequest(`/api/barcode/${barcode}`);
      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        setDetailData(data as Record<string, unknown>);
      } else {
        setDetailData({ result: data });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setDetailError(`Request failed: ${message}`);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleQuickAdd = useCallback(async (
    item: Record<string, unknown>,
    index: number,
  ) => {
    if (addStatuses[index]?.state === 'adding') return;

    const barcode = getItemBarcode(item);
    if (!barcode) return;
    if (!user?.$id) {
      setAddStatuses((current) => ({
        ...current,
        [index]: { state: 'error', message: 'Sign in to add foods.' },
      }));
      return;
    }

    setAddStatuses((current) => ({
      ...current,
      [index]: { state: 'adding', message: `Adding to ${selectedMealType}…` },
    }));
    try {
      await addProductToMeal(
        user.$id,
        selectedMealType,
        barcode,
        getProductData(item),
      );
      setAddStatuses((current) => ({
        ...current,
        [index]: { state: 'added', message: `Added to ${selectedMealType}.` },
      }));
    } catch (error) {
      console.error('Could not quick-add search result', error);
      setAddStatuses((current) => ({
        ...current,
        [index]: { state: 'error', message: 'Couldn’t add. Try again.' },
      }));
    }
  }, [addStatuses, selectedMealType, user]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>SEARCH RESULTS</Text>
        <Text style={styles.screenTitle}>
          {query ? `Matches for “${query}”` : 'Food matches'}
        </Text>
        <View style={styles.helperRow}>
          <View style={styles.mealChip}>
            <Text style={styles.mealChipText}>Adding to {selectedMealType}</Text>
          </View>
          <Text style={styles.swipeHint}>Swipe left to quick add</Text>
        </View>

        <ResultsBody
          data={parsedResult}
          onViewMore={handleViewMore}
          onAdd={(item, index) => void handleQuickAdd(item, index)}
          addStatuses={addStatuses}
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
    </GestureHandlerRootView>
  );
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
  eyebrow: {
    ...typography.labelSmall,
    color: c.success,
  },
  screenTitle: {
    ...typography.headline,
    color: c.text,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  mealChip: {
    borderRadius: borderRadius.pill,
    backgroundColor: c.accentSoft,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  mealChipText: {
    ...typography.labelSmall,
    color: c.accent,
  },
  swipeHint: {
    ...typography.labelSmall,
    color: c.textMuted,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
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
    gap: spacing.md,
    paddingVertical: spacing.sm,
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
  noDetailsText: {
    ...typography.body,
    color: c.textMuted,
    paddingVertical: spacing.sm,
  },
  feedbackText: {
    ...typography.labelSmall,
    color: c.success,
    marginTop: spacing.md,
  },
  feedbackError: {
    color: c.danger,
  },
  viewMoreButtonText: {
    ...typography.label,
    color: c.accent,
    fontWeight: '700',
    marginTop: spacing.md,
  },
});