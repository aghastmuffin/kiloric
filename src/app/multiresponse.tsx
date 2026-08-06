import { authenticatedRequest } from '@/components/apiUtils';
import BarcodeDetailModal from '@/components/BarcodeDetailModal';
<<<<<<< HEAD
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
=======
import { useAuth } from '@/lib/AuthContext';
import { addProductToMeal } from '@/lib/meals';
import { useMealTypePreferences } from '@/lib/MealTypePreferencesContext';
import { spacing, type ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useTheme } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0

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
<<<<<<< HEAD
  return `Result ${index + 1}`;
}

function getItemBarcode(item: Record<string, unknown>): string | null {
  for (const key of BARCODE_KEYS) {
    const value = item[key];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value);
    }
  }
  return null;
}

=======
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

>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
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
<<<<<<< HEAD
=======
  onAdd,
  addStatus,
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
}: {
  item: Record<string, unknown>;
  index: number;
  onViewMore?: (barcode: string) => void;
<<<<<<< HEAD
=======
  onAdd?: (item: Record<string, unknown>, index: number) => void;
  addStatus?: { state: 'adding' | 'added' | 'error'; message: string };
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
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
<<<<<<< HEAD
        <TouchableOpacity style={styles.viewMoreButton} onPress={() => onViewMore(barcode)}>
          <Text style={styles.viewMoreButtonText}>View More</Text>
        </TouchableOpacity>
=======
        <Text style={styles.viewMoreButtonText}>View more →</Text>
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
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

function ResultsBody({
  data,
  onViewMore,
<<<<<<< HEAD
}: {
  data: unknown;
  onViewMore?: (barcode: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const TARGET_ERROR = "404: no products found";

  if (data === null || data === undefined) {
    return <Text style={styles.mutedText}>No results to display.</Text>;
=======
  onAdd,
  addStatuses,
}: {
  data: unknown;
  onViewMore?: (barcode: string) => void;
  onAdd?: (item: Record<string, unknown>, index: number) => void;
  addStatuses?: Record<number, { state: 'adding' | 'added' | 'error'; message: string }>;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const TARGET_ERROR = "404: no products found";

  if (data === null || data === undefined) {
    return (
      <View style={styles.emptyStateContainer}>
        <MotiView
          from={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          style={styles.emptyIconCircle}
        >
          <MaterialIcons name="search-off" size={48} color={colors.textMuted} />
        </MotiView>
        <Text style={styles.emptyStateTitle}>No results to display</Text>
        <Text style={styles.emptyStateSubtitle}>Try searching for another food or scan a barcode</Text>
      </View>
    );
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
  }

  // 1. Check direct string match
  if (typeof data === 'string') {
    if (data.trim().toLowerCase() === TARGET_ERROR) {
<<<<<<< HEAD
      return <Text style={styles.mutedText}>No matches found. You can return home</Text>;
    }
    return (
      <View style={styles.card}>
        <Text style={styles.messageText}>{data}</Text>
      </View>
=======
      return (
        <View style={styles.emptyStateContainer}>
          <MotiView
            from={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            style={styles.emptyIconCircle}
          >
            <MaterialIcons name="search-off" size={48} color={colors.textMuted} />
          </MotiView>
          <Text style={styles.emptyStateTitle}>No matches found</Text>
          <Text style={styles.emptyStateSubtitle}>We couldn't find any products. You can return home and try again.</Text>
        </View>
      );
    }
    return (
      <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={styles.card}>
        <Text style={styles.messageText}>{data}</Text>
      </MotiView>
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
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
            No matches found. Would you like to add this product? (UNIMPLEMENTED)
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
<<<<<<< HEAD
=======
            onAdd={onAdd}
            addStatus={addStatuses?.[index]}
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
          />
        );
      }

      return (
<<<<<<< HEAD
        <View key={index} style={styles.card}>
          <Text style={styles.cardTitle}>Result {index + 1}</Text>
          <Text style={styles.messageText}>{formatValue(item)}</Text>
        </View>
=======
        <MotiView
          key={index}
          from={{ opacity: 0, scale: 0.9, translateY: 30 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{
            delay: index * 100,
            type: 'spring',
            damping: 12,
            stiffness: 100,
            mass: 0.8,
          }}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>Result {index + 1}</Text>
          <Text style={styles.messageText}>{formatValue(item)}</Text>
        </MotiView>
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
      );
    });
  }

  // 3. Check nested object string match
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const nestedMessage = obj.error || obj.detail || obj.message || obj.result;

    if (typeof nestedMessage === 'string' && nestedMessage.trim().toLowerCase() === TARGET_ERROR) {
<<<<<<< HEAD
      return <Text style={styles.mutedText}>No matches found. You can return home</Text>;
    }

    return <ObjectCard item={obj} index={0} onViewMore={onViewMore} />;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.messageText}>{formatValue(data)}</Text>
    </View>
=======
      return (
        <View style={styles.emptyStateContainer}>
          <MotiView
            from={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            style={styles.emptyIconCircle}
          >
            <MaterialIcons name="search-off" size={48} color={colors.textMuted} />
          </MotiView>
          <Text style={styles.emptyStateTitle}>No matches found</Text>
          <Text style={styles.emptyStateSubtitle}>No matching products were found. Try another search!</Text>
        </View>
      );
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
    <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} style={styles.card}>
      <Text style={styles.messageText}>{formatValue(data)}</Text>
    </MotiView>
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
  );
}

export default function MultiResponseScreen() {
  const { query, result } = useLocalSearchParams<{ query?: string; result?: string }>();
  const styles = useThemedStyles(makeStyles);
<<<<<<< HEAD
=======
  const { user } = useAuth();
  const { selectedMealType } = useMealTypePreferences();
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
  const parsedResult = parseResult(result);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
<<<<<<< HEAD
=======
  const [addStatuses, setAddStatuses] = useState<
    Record<number, { state: 'adding' | 'added' | 'error'; message: string }>
  >({});
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0

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
<<<<<<< HEAD
=======

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
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {query ? (
          <View style={styles.header}>
            <Text style={styles.headerLabel}>Search query</Text>
            <Text style={styles.headerQuery}>{query}</Text>
          </View>
        ) : null}

<<<<<<< HEAD
        <ResultsBody data={parsedResult} onViewMore={handleViewMore} />
=======
        <ResultsBody
          data={parsedResult}
          onViewMore={handleViewMore}
          onAdd={(item, index) => void handleQuickAdd(item, index)}
          addStatuses={addStatuses}
        />
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
      </ScrollView>

      <BarcodeDetailModal
        visible={modalVisible}
        barcode={selectedBarcode}
        data={detailData}
        isLoading={detailLoading}
        error={detailError}
        onClose={() => setModalVisible(false)}
      />
<<<<<<< HEAD
    </>
=======
    </GestureHandlerRootView>
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
<<<<<<< HEAD
    padding: 20,
    paddingBottom: 40,
    gap: 16,
=======
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: 48,
    gap: spacing.md,
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
  },
  header: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
<<<<<<< HEAD
  headerLabel: {
=======
  mealChipText: {
    ...typography.labelSmall,
    color: c.accent,
  },
  swipeHint: {
    ...typography.labelSmall,
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
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
<<<<<<< HEAD
  },
  errorCard: {
    borderColor: c.danger,
    backgroundColor: c.dangerSoft,
  },
  cardTitle: {
    color: c.accent,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
=======
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
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
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
<<<<<<< HEAD
    color: c.textMuted,
    fontSize: 14,
    flex: 1,
  },
  rowValue: {
=======
    ...typography.labelSmall,
    color: c.textMuted,
    flex: 1,
  },
  rowValue: {
    ...typography.labelSmall,
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
    color: c.text,
    fontSize: 14,
    fontWeight: '500',
    flex: 1.2,
    textAlign: 'right',
  },
  messageText: {
<<<<<<< HEAD
    color: c.text,
    fontSize: 15,
    lineHeight: 22,
=======
    ...typography.body,
    color: c.text,
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
  },
  errorText: {
    color: c.danger,
  },
  mutedText: {
<<<<<<< HEAD
=======
    ...typography.body,
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
    color: c.textMuted,
    fontSize: 15,
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
});