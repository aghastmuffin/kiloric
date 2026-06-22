import { authenticatedRequest } from '@/components/apiUtils';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type ProductDetails = {
  code?: string | number;
  barcode?: string | number;
  product_name?: string;
  calories?: number | string;
  [key: string]: unknown;
};

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function FactRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.row, highlight && styles.highlightRow]}>
      <Text style={[styles.rowLabel, highlight && styles.highlightLabel]}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.highlightValue]}>{value}</Text>
    </View>
  );
}

export default function FoodDetailScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!code) {
      setError('No product code provided.');
      setIsLoading(false);
      return;
    }

    let isActive = true;

    const loadProduct = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await authenticatedRequest(`/api/product/${encodeURIComponent(code)}`);
        if (!isActive) return;
        setProduct(data as ProductDetails);
      } catch (err) {
        if (!isActive) return;
        const message = err instanceof Error ? err.message : 'Failed to load product details.';
        setError(message);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadProduct();

    return () => {
      isActive = false;
    };
  }, [code]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.mutedText}>Loading nutrition facts…</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Product not found.'}</Text>
      </View>
    );
  }

  const detailEntries = Object.entries(product).filter(
    ([key, value]) =>
      value !== null &&
      value !== undefined &&
      !['product_name', 'calories'].includes(key),
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{product.product_name ?? 'Food item'}</Text>
        {product.calories !== undefined && product.calories !== null ? (
          <View style={styles.calorieBadge}>
            <Text style={styles.calorieValue}>{formatValue(product.calories)}</Text>
            <Text style={styles.calorieLabel}>calories</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Nutrition facts</Text>
        {product.calories !== undefined && product.calories !== null ? (
          <FactRow label="Calories" value={formatValue(product.calories)} highlight />
        ) : (
          <Text style={styles.mutedText}>No calorie data available.</Text>
        )}
      </View>

      {detailEntries.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Product details</Text>
          {detailEntries.map(([key, value]) => (
            <FactRow key={key} label={formatLabel(key)} value={formatValue(value)} />
          ))}
        </View>
      ) : null}
    </ScrollView>
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
  centered: {
    flex: 1,
    backgroundColor: c.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  header: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: c.border,
    gap: 16,
  },
  title: {
    color: c.text,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  calorieBadge: {
    alignSelf: 'flex-start',
    backgroundColor: c.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: c.accent,
  },
  calorieValue: {
    color: c.accent,
    fontSize: 28,
    fontWeight: '800',
  },
  calorieLabel: {
    color: c.textMuted,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
  sectionTitle: {
    color: c.accent,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  highlightRow: {
    borderBottomColor: c.accent,
  },
  rowLabel: {
    color: c.textMuted,
    fontSize: 15,
    flex: 1,
  },
  highlightLabel: {
    color: c.text,
    fontWeight: '600',
  },
  rowValue: {
    color: c.text,
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  highlightValue: {
    color: c.accent,
    fontSize: 18,
    fontWeight: '700',
  },
  mutedText: {
    color: c.textMuted,
    fontSize: 15,
  },
  errorText: {
    color: c.danger,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});
