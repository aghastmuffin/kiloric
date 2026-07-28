import { authenticatedRequest } from '@/components/apiUtils';
import { MealTypePicker } from '@/components/MealTypePicker';
import { SearchModeSwapButton } from '@/components/SearchModeSwapButton';
import { ThemedSegmentedControl } from '@/components/ThemedSegmentedControl';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { useAuth } from '@/lib/AuthContext';
import { listRecentFoods, recentFoodsUserKey, recordRecentQuery, type RecentFoodEntry } from '@/lib/recentFoods';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { MotiView } from 'moti';
import { Image } from 'expo-image';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import BarcodeDetailModal from '@/components/BarcodeDetailModal';

type SearchType = 'Text' | 'Barcode';

const TITLE_KEYS = ['name', 'title', 'food_name', 'product_name', 'description', 'label'];
const BARCODE_KEYS = ['code', 'barcode', 'barcode_id', 'upc', 'ean'];
const TARGET_ERROR = "404: no products found";

function getNestedValue(data: Record<string, unknown>, key: string): unknown {
  if (key in data) return data[key];

  const nutriments = data.nutriments;
  if (nutriments && typeof nutriments === 'object' && !Array.isArray(nutriments)) {
    const n = nutriments as Record<string, unknown>;
    if (key in n) return n[key];
    if (key === 'calories' && 'energy-kcal' in n) return n['energy-kcal'];
    if (key === 'calories' && 'energy_kcal' in n) return n.energy_kcal;
    if (key === 'protein' && 'proteins' in n) return n.proteins;
    if (key === 'carbs' && 'carbohydrates' in n) return n.carbohydrates;
  }

  return undefined;
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

function getCompactMacros(item: Record<string, unknown>): string {
  const kcal = getNestedValue(item, 'calories') ?? getNestedValue(item, 'energy-kcal') ?? getNestedValue(item, 'energy_kcal');
  const protein = getNestedValue(item, 'protein') ?? getNestedValue(item, 'proteins');
  const carbs = getNestedValue(item, 'carbs') ?? getNestedValue(item, 'carbohydrates');
  const fat = getNestedValue(item, 'fat');

  const parts: string[] = [];
  if (kcal !== undefined && kcal !== null) {
    parts.push(`${Math.round(Number(kcal))} kcal`);
  }
  if (protein !== undefined && protein !== null) {
    parts.push(`P: ${Number(protein).toFixed(1)}g`);
  }
  if (carbs !== undefined && carbs !== null) {
    parts.push(`C: ${Number(carbs).toFixed(1)}g`);
  }
  if (fat !== undefined && fat !== null) {
    parts.push(`F: ${Number(fat).toFixed(1)}g`);
  }

  return parts.length > 0 ? parts.join(' • ') : 'No nutritional facts available';
}

function getOpenFoodFactsImagePath(barcode: string): string {
  const digits = barcode.replace(/\D/g, '');
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 3) {
    parts.push(digits.slice(i, i + 3));
  }
  return parts.join('/');
}

function resolveImageUrl(data: Record<string, unknown>, barcode: string): string | null {
  const candidates = [
    data.image_url,
    data.image_front_url,
    data.image_front_small_url,
    data.image,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.startsWith('http')) {
      return candidate;
    }
  }

  const images = data.images;
  if (images && typeof images === 'object' && !Array.isArray(images)) {
    const front = (images as Record<string, unknown>).front;
    if (front && typeof front === 'object' && !Array.isArray(front)) {
      const display = (front as Record<string, unknown>).display;
      if (typeof display === 'string' && display.startsWith('http')) {
        return display;
      }
    }
  }

  const path = getOpenFoodFactsImagePath(barcode);
  return `https://images.openfoodfacts.org/images/products/${path}/front.jpg`;
}

function isNoProductsError(data: unknown): boolean {
  if (!data) return false;

  if (typeof data === 'string') {
    return data.trim().toLowerCase() === TARGET_ERROR;
  }

  if (Array.isArray(data)) {
    return (
      data.length === 1 &&
      typeof data[0] === 'string' &&
      data[0].trim().toLowerCase() === TARGET_ERROR
    );
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const nestedMessage = obj.error || obj.detail || obj.message || obj.result;
    if (typeof nestedMessage === 'string' && nestedMessage.trim().toLowerCase() === TARGET_ERROR) {
      return true;
    }
  }

  return false;
}

function getResultsArray(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (isNoProductsError(data)) return [];

  if (Array.isArray(data)) {
    return data.filter((item): item is Record<string, unknown> =>
      item !== null && typeof item === 'object' && !Array.isArray(item)
    );
  }

  if (typeof data === 'object') {
    return [data as Record<string, unknown>];
  }

  if (typeof data === 'string' && data.trim().toLowerCase() !== TARGET_ERROR) {
    return [{ message: data }];
  }

  return [];
}

function parseResult(raw: string | undefined): unknown {
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function LazyImage({ uri, style }: { uri: string | null; style: any }) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const styles = useThemedStyles(makeStyles);

  useEffect(() => {
    if (!uri) {
      setImageUri(null);
      return;
    }

    const timer = setTimeout(() => {
      setImageUri(uri);
    }, 120);

    return () => clearTimeout(timer);
  }, [uri]);

  if (!imageUri) {
    return (
      <View style={[style, styles.lazyImagePlaceholder]}>
        <Ionicons name="fast-food-outline" size={20} style={styles.lazyImageIcon} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: imageUri }}
      style={style}
      contentFit="cover"
      transition={150}
      priority="low"
    />
  );
}

function ResultRowItem({
  item,
  index,
  onPress,
}: {
  item: Record<string, unknown>;
  index: number;
  onPress: (barcode: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const title = getItemTitle(item, index);
  const barcode = getItemBarcode(item);
  const brand = (getNestedValue(item, 'brands') ?? getNestedValue(item, 'brand') ?? '') as string;
  const compactMacros = getCompactMacros(item);

  const imageUri = barcode ? resolveImageUrl(item, barcode) : null;

  return (
    <TouchableOpacity
      style={styles.rowItem}
      onPress={() => barcode && onPress(barcode)}
      disabled={!barcode}
      activeOpacity={0.7}
    >
      <LazyImage uri={imageUri} style={styles.rowImage} />
      <View style={styles.rowContent}>
        <View style={styles.rowTopLine}>
          <Text style={styles.rowBrand} numberOfLines={1}>
            {brand.trim() ? brand.trim() : 'Generic / Unknown'}
          </Text>
          {barcode ? <Text style={styles.rowBarcode} numberOfLines={1}>{barcode}</Text> : null}
        </View>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.rowMacros} numberOfLines={1}>{compactMacros}</Text>
      </View>
    </TouchableOpacity>
  );
}

async function fetchQuery(query: string): Promise<string> {
  try {
    const data = await authenticatedRequest(`/api/fuzzy/${encodeURIComponent(query)}`);
    return typeof data === 'string' ? data : JSON.stringify(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return `Request failed: ${message}`;
  }
}

async function fetchBarcodeManual(query: string): Promise<string> {
  try {
    const data = await authenticatedRequest(`/api/barcode/${encodeURIComponent(query)}`);
    return typeof data === 'string' ? data : JSON.stringify(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return `Request failed: ${message}`;
  }
}

export default function Index() {
  const params = useLocalSearchParams<{ q?: string }>();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [searchType, setSearchType] = useState<SearchType>('Text');
  const [recents, setRecents] = useState<RecentFoodEntry[]>([]);

  // Search results and detail modal states
  const [resultData, setResultData] = useState<unknown | null>(null);
  const [errorState, setErrorState] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Load recent searches
  const loadRecents = useCallback(() => {
    listRecentFoods(recentFoodsUserKey(user?.$id))
      .then(setRecents)
      .catch((err) => console.error('[logfood] recents load failed', err));
  }, [user?.$id]);

  useEffect(() => {
    loadRecents();
  }, [loadRecents]);

  const handleScanPressWithQuery = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setErrorState(null);
    setResultData(null);

    try {
      let result = '';

      if (searchType === 'Barcode') {
        result = await fetchBarcodeManual(searchQuery.trim());
      } else {
        result = await fetchQuery(searchQuery.trim());
      }

      const parsed = parseResult(result);
      setResultData(parsed);

      // Record successful query/search to recents
      await recordRecentQuery(recentFoodsUserKey(user?.$id), searchQuery.trim());
      // Reload recents
      loadRecents();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrorState(`Search failed: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, [searchType, user, loadRecents]);

  useEffect(() => {
    if (typeof params.q === 'string' && params.q.trim()) {
      const qVal = params.q.trim();
      setQuery(qVal);
      // Trigger search automatically if we get query from params
      void handleScanPressWithQuery(qVal);
    }
  }, [params.q, handleScanPressWithQuery]);

  const handleRowPress = useCallback(async (barcode: string) => {
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

  const handleScanPress = useCallback(() => {
    void handleScanPressWithQuery(query);
  }, [handleScanPressWithQuery, query]);

  const selectRecent = useCallback((text: string) => {
    setQuery(text);
    void handleScanPressWithQuery(text);
  }, [handleScanPressWithQuery]);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 50 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 18, stiffness: 120 }}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <Text style={styles.titleText}>Log Food Search</Text>
          <Text style={styles.subtitleText}>Search by entering text description or a barcode</Text>
        </View>

        {/* Segmented control for search type */}
        <View style={styles.segmentedContainer}>
          <ThemedSegmentedControl
            values={['Text', 'Barcode']}
            selectedIndex={searchType === 'Text' ? 0 : 1}
            onChange={(index) => {
              setSearchType(index === 0 ? 'Text' : 'Barcode');
              setResultData(null);
              setErrorState(null);
            }}
            style={{ width: '100%', height: 44 }}
          />
        </View>

        {/* Outer row wrapper acting as the visual input background/border */}
        <View style={styles.inputContainer}>
          <TextInput
            placeholder={searchType === 'Barcode' ? "Enter barcode string..." : "Enter query..."}
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (!text.trim()) {
                setResultData(null);
                setErrorState(null);
              }
            }}
          />
        </View>

        {/* Recent Searches horizontal strip - only show if there are no search results and no loading */}
        {recents.length > 0 && !resultData && !isLoading && !errorState && (
          <View style={styles.recentsContainer}>
            <Text style={styles.recentsTitle}>Recent Searches</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentsScroll}
            >
              {recents.map((item, idx) => (
                <TouchableOpacity
                  key={item.id + idx}
                  style={styles.recentChip}
                  onPress={() => selectRecent(item.query || item.title)}
                >
                  <Text style={styles.recentChipText}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Search Button / Shimmer Loader */}
        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <SkeletonBlock height={54} borderRadius={24} style={{ marginTop: 20 }} />
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.button, (!query.trim()) && styles.buttonDisabled]}
            onPress={handleScanPress}
            disabled={!query.trim()}
          >
            <Text style={styles.buttonText}>Search</Text>
          </TouchableOpacity>
        )}

        {/* Error message or Search Results Section */}
        {errorState ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorState}</Text>
          </View>
        ) : null}

        {resultData ? (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsSectionTitle}>Search Results</Text>
            {isNoProductsError(resultData) ? (
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyIconCircle}>
                  <MaterialIcons name="search-off" size={48} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyStateTitle}>No matches found</Text>
                <Text style={styles.emptyStateSubtitle}>Try searching for another food or scan a barcode</Text>
              </View>
            ) : (
              <View style={styles.resultsList}>
                {getResultsArray(resultData).map((item, index) => {
                  if (item.message) {
                    return (
                      <View key={index} style={styles.messageCard}>
                        <Text style={styles.messageText}>{String(item.message)}</Text>
                      </View>
                    );
                  }
                  return (
                    <ResultRowItem
                      key={index}
                      item={item}
                      index={index}
                      onPress={handleRowPress}
                    />
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        {/* Extra bottom spacing so content can be scrolled fully above absolute positioned elements */}
        <View style={{ height: 120 }} />
      </ScrollView>

      <MealTypePicker />
      <SearchModeSwapButton current="text_query" />

      <BarcodeDetailModal
        visible={modalVisible}
        barcode={selectedBarcode}
        data={detailData}
        isLoading={detailLoading}
        error={detailError}
        onClose={() => setModalVisible(false)}
      />
    </MotiView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  scrollContainer: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
    width: '85%',
    maxWidth: 440,
  },
  segmentedContainer: {
    width: '85%',
    maxWidth: 440,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surfaceAlt,
    borderRadius: 24,
    width: '85%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    color: c.text,
    paddingHorizontal: 18,
    paddingVertical: 18,
    fontSize: 16,
  },
  recentsContainer: {
    width: '85%',
    maxWidth: 440,
    marginTop: 15,
    alignItems: 'flex-start',
  },
  recentsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentsScroll: {
    gap: 8,
    paddingRight: 20,
  },
  recentChip: {
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  recentChipText: {
    color: c.text,
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    backgroundColor: c.accent,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: 20,
    width: '85%',
    maxWidth: 440,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: c.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    })
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: c.onAccent,
    fontSize: 16,
    fontWeight: 'bold',
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: c.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitleText: {
    fontSize: 14,
    color: c.textMuted,
    textAlign: 'center',
  },
  skeletonContainer: {
    width: '85%',
    maxWidth: 440,
  },
  errorContainer: {
    width: '85%',
    maxWidth: 440,
    backgroundColor: c.dangerSoft,
    borderWidth: 1,
    borderColor: c.danger,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  errorText: {
    color: c.danger,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultsContainer: {
    width: '90%',
    maxWidth: 460,
    marginTop: 24,
  },
  resultsSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  resultsList: {
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  lazyImagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lazyImageIcon: {
    color: c.textMuted,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    backgroundColor: c.surface,
  },
  rowImage: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  rowContent: {
    flex: 1,
    marginLeft: 12,
    gap: 2,
  },
  rowTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowBrand: {
    color: c.text,
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  rowBarcode: {
    color: c.textFaint,
    fontSize: 11,
  },
  rowTitle: {
    color: c.text,
    fontSize: 14,
    fontWeight: '500',
  },
  rowMacros: {
    color: c.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  messageCard: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    color: c.text,
    fontSize: 15,
    textAlign: 'center',
  },
  // Illustrated Empty State
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 4,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.text,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 240,
  },
});
