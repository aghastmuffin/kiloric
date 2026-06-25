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
import { createMeal, updateMeal, getTodayMeals, listHistoricMeals, MEAL_TYPE_OPTIONS, type MealType } from '@/lib/meals';
import { getProductTitle, getQuickProductFacts } from '@/lib/productDisplay';
import { formatServings } from '@/lib/servings';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from "expo-router/react-navigation";
import { useCallback, useState, useEffect, useRef } from 'react';
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
  Animated,
  Dimensions,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type UnifiedMealItem = {
  id: string; // Appwrite $id or a local unique ID
  type: MealType;
  friendlyname: string | null;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  timestamp: number; // For chronological sorting
  isSynced: boolean;
};

type DailySummary = {
  dateLabel: string;
  totalKcal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  meals: UnifiedMealItem[]; // Will be sorted chronologically
};
const TAB_BAR_HEIGHT = Platform.select({ ios: 49, android: 56, default: 56 }) ?? 56;
const SCREEN_WIDTH = Dimensions.get('window').width;

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
        <Text style={styles.factLabel} numberOfLines={1} ellipsizeMode="tail">{label}</Text>
        <Text style={styles.factValue} numberOfLines={1} ellipsizeMode="tail">{value}</Text>
      </View>
  );
}

function MealItemCard({ item, onViewMore, onRemove, onServingsChange, servingsDisabled }: {
  item: MealItemPreview;
  onViewMore: (barcode: string) => void;
  onRemove: () => void;
  onServingsChange: (servings: number) => void;
  servingsDisabled?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const hasFacts = item.facts && item.facts.length > 0;

  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handleRemovePress = () => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: SCREEN_WIDTH, duration: 300, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => { onRemove(); });
  };

  return (
      <Animated.View style={[styles.itemCard, { transform: [{ translateX }], opacity }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.itemTitle} numberOfLines={2} ellipsizeMode="tail">{item.title}</Text>
          {item.servings !== 1 ? <Text style={styles.servingsNote}>Totals for {formatServings(item.servings)} servings</Text> : null}
        </View>

        <View style={styles.factsContainer}>
          {hasFacts ? (
              item.facts.map((fact) => <FactRow key={`${item.barcode}-${fact.label}`} label={fact.label} value={fact.value} />)
          ) : (
              <View style={styles.fallbackBarcodeContainer}>
                <Ionicons name="barcode-outline" size={16} color={styles.mutedText.color} />
                <Text style={styles.fallbackBarcodeText}>Barcode: {item.barcode}</Text>
              </View>
          )}
        </View>

        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>SERVINGS</Text>
          <ServingsPicker servings={item.servings} onChange={onServingsChange} disabled={servingsDisabled} />
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.viewMoreButton} onPress={() => onViewMore(item.barcode)}>
            <Text style={styles.viewMoreButtonText}>View details</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.removeButton} onPress={handleRemovePress}>
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
  );
}

async function buildItemPreview(entry: MealItemEntry): Promise<MealItemPreview> {
  const { barcode, servings } = entry;
  const endpoint = `/api/barcode/${encodeURIComponent(barcode)}`;
  let data: Record<string, unknown> | null = null;

  try {
    const fetched = await authenticatedRequest(endpoint);
    if (fetched && typeof fetched === 'object' && !Array.isArray(fetched)) {
      data = fetched as Record<string, unknown>;
    }
  } catch (error) {
    const cached = await getCachedResponse(endpoint);
    if (cached && typeof cached === 'object' && !Array.isArray(cached)) {
      data = cached as Record<string, unknown>;
    }
  }

  if (data) {
    let actualData = data;
    if ('data' in data && data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
      actualData = data.data as Record<string, unknown>;
    } else if ('product' in data && data.product && typeof data.product === 'object') {
      actualData = data.product as Record<string, unknown>;
    }

    const input = buildMealInputFromProduct('dummy_owner', actualData, 'Breakfast', barcode, servings);
    const displayFacts = [...(getQuickProductFacts(actualData, { servings }) || [])];

    if (input.kcal !== undefined && input.kcal !== null) displayFacts.push({ label: 'Calories', value: `${Math.round(input.kcal)} kcal` });
    if (input.protein !== undefined && input.protein !== null) displayFacts.push({ label: 'Protein', value: `${input.protein.toFixed(1)}g` });
    if (input.carbs !== undefined && input.carbs !== null) displayFacts.push({ label: 'Carbs', value: `${input.carbs.toFixed(1)}g` });
    if (input.fat !== undefined && input.fat !== null) displayFacts.push({ label: 'Fat', value: `${input.fat.toFixed(1)}g` });

    return {
      barcode, servings,
      title: getProductTitle(actualData, barcode),
      facts: displayFacts,
      kcal: input.kcal ?? null, protein: input.protein ?? null, carbs: input.carbs ?? null, fat: input.fat ?? null,
    };
  }

  return { barcode, servings, title: `Barcode: ${barcode}`, facts: [], kcal: null, protein: null, carbs: null, fat: null };
}

function formatDateLabel(date: Date): string {
  const today = new Date();
  const isToday = date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

  return isToday ? 'Today' : date.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric'
  });
}

async function fetchAndGroupMeals(userId: string | undefined): Promise<DailySummary[]> {
  const dailyMap = new Map<string, DailySummary>();

  // 1. Fetch Synced Meals from Appwrite
  if (userId) {
    const [todayMeals, historicMeals] = await Promise.all([
      getTodayMeals(userId).catch(() => []),
      listHistoricMeals(userId, 50).catch(() => []) // Fetch last 50 historical meals
    ]);

    const allSynced = [...todayMeals, ...historicMeals];

    allSynced.forEach(meal => {
      const mealDate = new Date(meal.$createdAt);
      const dateLabel = formatDateLabel(mealDate);

      if (!dailyMap.has(dateLabel)) {
        dailyMap.set(dateLabel, { dateLabel, totalKcal: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, meals: [] });
      }

      const summary = dailyMap.get(dateLabel)!;

      // Add to daily cumulative totals
      summary.totalKcal += meal.kcal || 0;
      summary.totalProtein += meal.protein || 0;
      summary.totalCarbs += meal.carbs || 0;
      summary.totalFat += meal.fat || 0;

      summary.meals.push({
        id: meal.$id,
        type: meal.type as MealType,
        friendlyname: meal.friendlyname || meal.type,
        kcal: meal.kcal,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        timestamp: mealDate.getTime(),
        isSynced: true
      });
    });
  }

  // 2. Fetch Local Pending Meals (Unsynced)
  const localStore = await loadMealBarcodes();
  const pendingDateLabel = formatDateLabel(new Date()); // Local items default to 'Today'

  if (!dailyMap.has(pendingDateLabel)) {
    dailyMap.set(pendingDateLabel, { dateLabel: pendingDateLabel, totalKcal: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, meals: [] });
  }

  const todaySummary = dailyMap.get(pendingDateLabel)!;

  for (const type of MEAL_TYPE_OPTIONS) {
    const items = localStore[type];
    for (const entry of items) {
      const preview = await buildItemPreview(entry); // Your existing function

      todaySummary.totalKcal += preview.kcal || 0;
      todaySummary.totalProtein += preview.protein || 0;
      todaySummary.totalCarbs += preview.carbs || 0;
      todaySummary.totalFat += preview.fat || 0;

      todaySummary.meals.push({
        id: `local-${entry.barcode}-${Date.now()}`,
        type,
        friendlyname: preview.title,
        kcal: preview.kcal,
        protein: preview.protein,
        carbs: preview.carbs,
        fat: preview.fat,
        timestamp: Date.now(), // Treat pending items as "just now"
        isSynced: false
      });
    }
  }

  // 3. Sort Chronologically
  const sortedSummaries = Array.from(dailyMap.values());

  sortedSummaries.forEach(summary => {
    // Sort meals chronologically (Breakfast -> Snacks -> Lunch -> Snacks -> Dinner)
    summary.meals.sort((a, b) => a.timestamp - b.timestamp);
  });

  return sortedSummaries;
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

  const bottomOffset = insets.bottom + 18;

  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);

  const refreshMeals = useCallback(async () => {
    setIsLoading(true);
    try {
      const summaries = await fetchAndGroupMeals(user?.$id);
      setDailySummaries(summaries);
    } catch (err) {
      console.error('[Component Action] Error loading meals:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.$id]);

  useEffect(() => { void refreshMeals(); }, [refreshMeals]);
  useFocusEffect(useCallback(() => { void refreshMeals(); }, [refreshMeals]));

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
      setDetailError(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleMealAdded = useCallback(() => { void refreshMeals(); }, [refreshMeals]);

  const handleRemoveItem = useCallback(async (type: MealType, index: number) => {
    try {
      await removeMealBarcode(type, index);
      const store = await loadMealBarcodes();
      const nextSections = await buildMealSections(store);
      if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSections(nextSections);
    } catch (err) {
      console.error("Failed to remove card item:", err);
    }
  }, []);

  const handleServingsChange = useCallback(async (type: MealType, index: number, servings: number) => {
    await updateMealItemServings(type, index, servings);
    const store = await loadMealBarcodes();
    const nextSections = await buildMealSections(store);
    setSections(nextSections);
  }, []);

  const handleSyncToAppwrite = useCallback(async () => {
    if (!user?.$id) return Alert.alert('Sign in required', 'Please sign in to sync your meals to Appwrite.');
    if (sections.length === 0) return Alert.alert('No meals', 'There are no local meals to sync.');

    // Extract the logic so it can be reliably fired on both Web and Mobile
    const executeSync = async () => {
      setIsSyncing(true);
      let successCount = 0;
      let failCount = 0;

      try {
        // 1. Fetch today's meal collections from your database
        const existingMeals = await getTodayMeals(user.$id).catch(() => []);

        for (const section of sections) {
          try {
            const existingMeal = existingMeals.find((m: any) => m.type === section.type);

            let sectionKcal: number | null = null;
            let sectionProtein: number | null = null;
            let sectionCarbs: number | null = null;
            let sectionFat: number | null = null;
            const sectionBarcodes: string[] = [];

            for (const item of section.items) {
              if (item.kcal !== null) sectionKcal = (sectionKcal ?? 0) + item.kcal;
              if (item.protein !== null) sectionProtein = (sectionProtein ?? 0) + item.protein;
              if (item.carbs !== null) sectionCarbs = (sectionCarbs ?? 0) + item.carbs;
              if (item.fat !== null) sectionFat = (sectionFat ?? 0) + item.fat;
              sectionBarcodes.push(item.barcode);
            }

            if (existingMeal) {
              const updatedData = {
                friendlyname: section.type,
                kcal: sectionKcal !== null ? (existingMeal.kcal ?? 0) + sectionKcal : existingMeal.kcal,
                protein: sectionProtein !== null ? (existingMeal.protein ?? 0) + sectionProtein : existingMeal.protein,
                carbs: sectionCarbs !== null ? (existingMeal.carbs ?? 0) + sectionCarbs : existingMeal.carbs,
                fat: sectionFat !== null ? (existingMeal.fat ?? 0) + sectionFat : existingMeal.fat,
                items: [...(existingMeal.items ?? []), ...sectionBarcodes],
              };
              await updateMeal(existingMeal.$id, updatedData);
            } else {
              await createMeal({
                owner: user.$id,
                friendlyname: section.type,
                type: section.type,
                kcal: sectionKcal,
                protein: sectionProtein,
                carbs: sectionCarbs,
                fat: sectionFat,
                nutrient_density_score: null,
                fluid: null,
                items: sectionBarcodes,
              });
            }
            successCount++;
          } catch (err) {
            console.error(`Failed processing section payload block ${section.type}:`, err);
            failCount++;
          }
        }

        await clearMealBarcodes();
        await refreshMeals();

        if (failCount === 0) Alert.alert('Success', `Successfully synced your meals.`);
        else Alert.alert('Sync complete with updates', `Synced updates successfully. Local cache cleared.`);
      } catch (err) {
        Alert.alert('Sync failed', err instanceof Error ? err.message : 'Sync failure');
      } finally {
        setIsSyncing(false);
      }
    };

    // Environment-safe execution
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('This will sync your logged meals to your account. Local list will be cleared. Continue?');
      if (confirmed) {
        await executeSync();
      }
    } else {
      Alert.alert(
          'Push Meals to Appwrite',
          'This will sync your logged meals to your account. Local list will be cleared. Continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Push', onPress: executeSync }
          ]
      );
    }
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
              <View style={styles.emptyContainer}>
                <Ionicons name="fast-food-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyText}>No meals logged yet. Scan or search for food, then tap Add to meals.</Text>
              </View>
          ) : (
              sections.map((section) => (
                  <View key={section.type} style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name={getSectionIcon(section.type)} size={20} color={colors.accent} />
                      <Text style={styles.sectionTitle}>{section.type} • {curdate}</Text>
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
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 110, gap: 24 },
  centered: { alignItems: 'center', gap: 12, paddingVertical: 64 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 32 },
  emptyText: { color: c.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  section: { gap: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 8, marginBottom: 4 },
  sectionTitle: { color: c.text, fontSize: 18, fontWeight: '700' },
  itemCard: {
    backgroundColor: c.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.border, gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)' }
    }),
  },
  cardHeader: { gap: 2 },
  itemTitle: { color: c.text, fontSize: 17, fontWeight: '600', lineHeight: 22 },
  servingsNote: { color: c.textMuted, fontSize: 13, fontWeight: '500', marginTop: 2 },
  factsContainer: { backgroundColor: c.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  factLabel: { color: c.textMuted, fontSize: 14, flex: 1 },
  factValue: { color: c.text, fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1 },
  fallbackBarcodeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  fallbackBarcodeText: { color: c.textMuted, fontSize: 14, fontWeight: '500' },
  pickerContainer: { gap: 6, marginTop: 2 },
  pickerLabel: { color: c.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  cardActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  viewMoreButton: { flex: 1, backgroundColor: c.surfaceAlt, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  viewMoreButtonText: { color: c.accent, fontSize: 14, fontWeight: '600' },
  removeButton: { flex: 1, backgroundColor: c.surfaceAlt, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: c.danger, alignItems: 'center', justifyContent: 'center' },
  removeButtonText: { color: c.danger, fontSize: 14, fontWeight: '600' },
  mutedText: { color: c.textMuted, fontSize: 15 },
  floatingSyncButton: {
    position: 'absolute', right: 16, height: 54, borderRadius: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingHorizontal: 20, gap: 8, zIndex: 40,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
      web: { boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)' }
    }),
  },
  floatingSyncButtonPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  floatingSyncButtonDisabled: { opacity: 0.6 },
  floatingSyncButtonText: { color: c.accent, fontSize: 16, fontWeight: '600' },
});