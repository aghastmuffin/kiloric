import { authenticatedRequest } from '@/components/apiUtils';
import BarcodeDetailModal from '@/components/BarcodeDetailModal';
import { ServingsPicker } from '@/components/ServingsPicker';
import { getCachedResponse } from '@/lib/apiCache';
import { useAuth } from '@/lib/AuthContext';
import { buildMealInputFromProduct } from '@/lib/mealFromProduct';
import {
  clearMealBarcodes,
  loadMealBarcodes,
  removeMealBarcode,
  updateMealItemServings,
  type MealBarcodesStore,
  type MealItemEntry,
} from '@/lib/mealItemsStorage';
import { createMeal, MEAL_TYPE_OPTIONS, type MealType } from '@/lib/meals';
import { getProductTitle, getQuickProductFacts } from '@/lib/productDisplay';
import { formatServings } from '@/lib/servings';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from "expo-router/react-navigation";
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Typical tab bar height above the home-indicator safe area. */
const TAB_BAR_HEIGHT = Platform.select({ ios: 49, android: 56, default: 56 }) ?? 56;

type MealItemPreview = {
  barcode: string;
  servings: number;
  title: string;
  facts: { label: string; value: string }[];
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

type MealSection = {
  type: MealType;
  items: MealItemPreview[];
};

function FactRow({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.factRow}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

function MealItemCard({
  item,
  onViewMore,
  onRemove,
  onServingsChange,
  servingsDisabled,
}: {
  item: MealItemPreview;
  onViewMore: (barcode: string) => void;
  onRemove: () => void;
  onServingsChange: (servings: number) => void;
  servingsDisabled?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.itemCard}>
      <Text style={styles.itemTitle}>{item.title}</Text>
      {item.servings !== 1 ? (
        <Text style={styles.servingsNote}>
          Totals for {formatServings(item.servings)} servings
        </Text>
      ) : null}
      {item.facts.length > 0 ? (
        item.facts.map((fact) => (
          <FactRow key={`${item.barcode}-${fact.label}`} label={fact.label} value={fact.value} />
        ))
      ) : (
        <Text style={styles.mutedText}>Barcode: {item.barcode}</Text>
      )}
      <ServingsPicker
        servings={item.servings}
        onChange={onServingsChange}
        disabled={servingsDisabled}
      />
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.viewMoreButton} onPress={() => onViewMore(item.barcode)}>
          <Text style={styles.viewMoreButtonText}>View details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

async function buildItemPreview(entry: MealItemEntry): Promise<MealItemPreview> {
  const { barcode, servings } = entry;
  const endpoint = `/api/barcode/${encodeURIComponent(barcode)}`;
  let data: Record<string, unknown> | null = null;

  const cached = await getCachedResponse(endpoint);
  if (cached && typeof cached === 'object' && !Array.isArray(cached)) {
    data = cached as Record<string, unknown>;
  }

  if (!data) {
    try {
      const fetched = await authenticatedRequest(endpoint);
      if (fetched && typeof fetched === 'object' && !Array.isArray(fetched)) {
        data = fetched as Record<string, unknown>;
      }
    } catch {
      // Offline or auth failure — fall back to barcode label.
    }
  }

  if (data) {
    const input = buildMealInputFromProduct('dummy_owner', data, 'Breakfast', barcode, servings);
    return {
      barcode,
      servings,
      title: getProductTitle(data, barcode),
      facts: getQuickProductFacts(data, { servings }),
      kcal: input.kcal ?? null,
      protein: input.protein ?? null,
      carbs: input.carbs ?? null,
      fat: input.fat ?? null,
    };
  }

  return {
    barcode,
    servings,
    title: barcode,
    facts: [],
    kcal: null,
    protein: null,
    carbs: null,
    fat: null,
  };
}

async function buildMealSections(store: MealBarcodesStore): Promise<MealSection[]> {
  const sections: MealSection[] = [];

  for (const type of MEAL_TYPE_OPTIONS) {
    const items = store[type];
    if (items.length === 0) continue;

    const previews = await Promise.all(items.map((entry) => buildItemPreview(entry)));
    sections.push({ type, items: previews });
  }

  return sections;
}

function getSectionIcon(type: MealType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'Breakfast': return 'sunny-outline';
    case 'Lunch': return 'restaurant-outline';
    case 'Dinner': return 'moon-outline';
    case 'Snack': return 'cafe-outline';
    default: return 'help-circle-outline';
  }
}

export default function MealsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const [sections, setSections] = useState<MealSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const bottomOffset = TAB_BAR_HEIGHT + insets.bottom + 14;

  const refreshMeals = useCallback(async () => {
    setIsLoading(true);
    try {
      const store = await loadMealBarcodes();
      const nextSections = await buildMealSections(store);
      setSections(nextSections);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshMeals();
    }, [refreshMeals]),
  );

  const handleViewMore = useCallback(async (barcode: string) => {
    setSelectedBarcode(barcode);
    setModalVisible(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);

    const endpoint = `/api/barcode/${encodeURIComponent(barcode)}`;
    const cached = await getCachedResponse(endpoint);
    if (cached && typeof cached === 'object' && !Array.isArray(cached)) {
      setDetailData(cached as Record<string, unknown>);
      setDetailLoading(false);
      return;
    }

    try {
      const data = await authenticatedRequest(endpoint);
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

  const handleMealAdded = useCallback(() => {
    void refreshMeals();
  }, [refreshMeals]);

  const handleRemoveItem = useCallback(async (type: MealType, index: number) => {
    setIsLoading(true);
    try {
      await removeMealBarcode(type, index);
      const store = await loadMealBarcodes();
      const nextSections = await buildMealSections(store);
      setSections(nextSections);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleServingsChange = useCallback(async (type: MealType, index: number, servings: number) => {
    await updateMealItemServings(type, index, servings);
    const store = await loadMealBarcodes();
    const nextSections = await buildMealSections(store);
    setSections(nextSections);
  }, []);

  const handleSyncToAppwrite = useCallback(async () => {
    if (!user?.$id) {
      Alert.alert('Sign in required', 'Please sign in under the Account tab to sync your meals to Appwrite.');
      return;
    }

    if (sections.length === 0) {
      Alert.alert('No meals', 'There are no local meals to sync.');
      return;
    }

    Alert.alert(
      'Push Meals to Appwrite',
      'This will sync all your local logged meals to your Appwrite account. Once pushed, your local list will be cleared. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Push',
          onPress: async () => {
            setIsSyncing(true);
            let successCount = 0;
            let failCount = 0;

            try {
              for (const section of sections) {
                for (const item of section.items) {
                  const barcode = item.barcode;
                  const endpoint = `/api/barcode/${encodeURIComponent(barcode)}`;
                  let data: Record<string, unknown> | null = null;
                  
                  // Try to fetch or retrieve cached data
                  try {
                    const cached = await getCachedResponse(endpoint);
                    if (cached && typeof cached === 'object' && !Array.isArray(cached)) {
                      data = cached as Record<string, unknown>;
                    }
                    if (!data) {
                      const fetched = await authenticatedRequest(endpoint);
                      if (fetched && typeof fetched === 'object' && !Array.isArray(fetched)) {
                        data = fetched as Record<string, unknown>;
                      }
                    }
                  } catch (err) {
                    console.warn(`Could not resolve details for barcode ${barcode}:`, err);
                  }

                  try {
                    if (data) {
                      const input = buildMealInputFromProduct(
                        user.$id,
                        data,
                        section.type,
                        barcode,
                        item.servings,
                      );
                      await createMeal(input);
                    } else {
                      // Fallback payload if API details couldn't be loaded
                      await createMeal({
                        owner: user.$id,
                        friendlyname: `Barcode: ${barcode}`,
                        type: section.type,
                        kcal: null,
                        protein: null,
                        carbs: null,
                        fat: null,
                        nutrient_density_score: null,
                        items: [barcode],
                      });
                    }
                    successCount++;
                  } catch (err) {
                    console.error(`Failed to push meal ${barcode}:`, err);
                    failCount++;
                  }
                }
              }

              // Reset local storage
              await clearMealBarcodes();
              await refreshMeals();

              if (failCount === 0) {
                Alert.alert(
                  'Success',
                  `Successfully synced all ${successCount} items to Appwrite.`
                );
              } else {
                Alert.alert(
                  'Sync Complete',
                  `Synced ${successCount} items. Failed to sync ${failCount} items. Local list cleared.`
                );
              }
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Unknown sync error';
              Alert.alert('Sync failed', message);
            } finally {
              setIsSyncing(false);
            }
          }
        }
      ]
    );
  }, [user, sections, refreshMeals]);

  const hasItems = sections.length > 0;
  const curdate = new Date(Date.now()).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {isLoading && !isSyncing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.mutedText}>Loading meals…</Text>
          </View>
        ) : !hasItems ? (
          <Text style={styles.mutedText}>
            No meals logged yet. Scan or search for food, then tap Add to meals.
          </Text>
        ) : (
          sections.map((section) => (
            <View key={section.type} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name={getSectionIcon(section.type)} size={20} color={colors.accent} />
                <Text style={styles.sectionTitle}>{section.type} of {curdate}</Text>
              </View>
              {section.items.map((item, index) => (
                <MealItemCard
                  key={`${section.type}-${item.barcode}-${index}`}
                  item={item}
                  onViewMore={handleViewMore}
                  onRemove={() => handleRemoveItem(section.type, index)}
                  onServingsChange={(servings) => handleServingsChange(section.type, index, servings)}
                  servingsDisabled={isLoading || isSyncing}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {hasItems && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Push meals to Appwrite"
          onPress={handleSyncToAppwrite}
          disabled={isSyncing}
          style={({ pressed }) => [
            styles.floatingSyncButton,
            { bottom: bottomOffset },
            pressed && styles.floatingSyncButtonPressed,
            isSyncing && styles.floatingSyncButtonDisabled,
          ]}
        >
          {isSyncing ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.floatingSyncButtonText}>Logging...</Text>
            </View>
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={24} color={colors.accent} />
              <Text style={styles.floatingSyncButtonText}>Log Meal</Text>
            </>
          )}
        </Pressable>
      )}

      <BarcodeDetailModal
        visible={modalVisible}
        barcode={selectedBarcode}
        data={detailData}
        isLoading={detailLoading}
        error={detailError}
        onClose={() => setModalVisible(false)}
        onMealAdded={handleMealAdded}
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
    paddingBottom: 100, // accommodate the floating button at bottom
    gap: 20,
  },
  centered: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 48,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingBottom: 6,
  },
  sectionTitle: {
    color: c.text,
    fontSize: 20,
    fontWeight: '700',
  },
  itemCard: {
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    gap: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
      }
    }),
  },
  itemTitle: {
    color: c.accent,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  servingsNote: {
    color: c.textMuted,
    fontSize: 13,
    marginTop: -4,
    marginBottom: 8,
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  factLabel: {
    color: c.textMuted,
    fontSize: 14,
    flex: 1,
  },
  factValue: {
    color: c.text,
    fontSize: 14,
    fontWeight: '500',
    flex: 1.2,
    textAlign: 'right',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  viewMoreButton: {
    flex: 1,
    backgroundColor: c.surfaceAlt,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewMoreButtonText: {
    color: c.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  removeButton: {
    flex: 1,
    backgroundColor: c.surfaceAlt,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: c.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  mutedText: {
    color: c.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingVertical: 24,
  },
  floatingSyncButton: {
    position: 'absolute',
    right: 18,
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 40,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.45)',
      }
    }),
  },
  floatingSyncButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  floatingSyncButtonDisabled: {
    opacity: 0.6,
  },
  floatingSyncButtonText: {
    color: c.accent,
    fontSize: 15,
    fontWeight: '700',
  },
});
