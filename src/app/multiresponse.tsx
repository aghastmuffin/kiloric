import { authenticatedRequest } from '@/components/apiUtils';
import BarcodeDetailModal from '@/components/BarcodeDetailModal';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
}: {
  item: Record<string, unknown>;
  index: number;
  onViewMore?: (barcode: string) => void;
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
        <TouchableOpacity style={styles.viewMoreButton} onPress={() => onViewMore(barcode)}>
          <Text style={styles.viewMoreButtonText}>View More</Text>
        </TouchableOpacity>
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
}: {
  data: unknown;
  onViewMore?: (barcode: string) => void;
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

    return <ObjectCard item={obj} index={0} onViewMore={onViewMore} />;
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
  const parsedResult = parseResult(result);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

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

        <ResultsBody data={parsedResult} onViewMore={handleViewMore} />
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
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
  headerLabel: {
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
    color: c.textMuted,
    fontSize: 14,
    flex: 1,
  },
  rowValue: {
    color: c.text,
    fontSize: 14,
    fontWeight: '500',
    flex: 1.2,
    textAlign: 'right',
  },
  messageText: {
    color: c.text,
    fontSize: 15,
    lineHeight: 22,
  },
  errorText: {
    color: c.danger,
  },
  mutedText: {
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