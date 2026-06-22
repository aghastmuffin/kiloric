import ImageViewer from '@/components/ImageViewer';
import { showApiError } from '@/lib/apiErrors';
import { useAuth } from '@/lib/AuthContext';
import { buildMealInputFromProduct } from '@/lib/mealFromProduct';
import { appendMealBarcode } from '@/lib/mealItemsStorage';
import { createMeal } from '@/lib/meals';
import { useMealTypePreferences } from '@/lib/MealTypePreferencesContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
const PlaceholderImage = require('../../assets/images/dark.svg');

const FIELD_PRIORITY = [
  'product_name',
  'name',
  'brands',
  'brand',
  'calories',
  'energy-kcal',
  'energy_kcal',
  'quantity',
  'serving_size',
  'proteins',
  'protein',
  'carbohydrates',
  'carbs',
  'fat',
  'sugars',
  'salt',
  'fiber',
  'ingredients_text',
  'ingredients',
  'code',
  'barcode',
  'categories',
  'labels',
  'nutriscore_grade',
  'nova_group',
];

type Props = {
  visible: boolean;
  barcode: string | null;
  data: Record<string, unknown> | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onMealAdded?: () => void;
};

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function getNestedValue(data: Record<string, unknown>, key: string): unknown {
  if (key in data) return data[key];

  const nutriments = data.nutriments;
  if (nutriments && typeof nutriments === 'object' && !Array.isArray(nutriments)) {
    const n = nutriments as Record<string, unknown>;
    if (key in n) return n[key];
    if (key === 'calories' && 'energy-kcal' in n) return n['energy-kcal'];
    if (key === 'calories' && 'energy_kcal' in n) return n.energy_kcal;
  }

  return undefined;
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

function sortEntries(entries: [string, unknown][]): [string, unknown][] {
  return [...entries].sort(([keyA], [keyB]) => {
    const indexA = FIELD_PRIORITY.indexOf(keyA);
    const indexB = FIELD_PRIORITY.indexOf(keyB);
    const rankA = indexA === -1 ? FIELD_PRIORITY.length : indexA;
    const rankB = indexB === -1 ? FIELD_PRIORITY.length : indexB;
    if (rankA !== rankB) return rankA - rankB;
    return keyA.localeCompare(keyB);
  });
}

function getPriorityHighlights(data: Record<string, unknown>): { label: string; value: string }[] {
  const highlights: { label: string; value: string }[] = [];
  const seen = new Set<string>();

  for (const key of FIELD_PRIORITY) {
    const value = getNestedValue(data, key);
    if (value === null || value === undefined || value === '') continue;
    if (typeof value === 'object') continue;

    const label = formatLabel(key);
    if (seen.has(label)) continue;
    seen.add(label);
    highlights.push({ label, value: formatValue(value) });
  }

  return highlights;
}

export default function BarcodeDetailModal({
  visible,
  barcode,
  data,
  isLoading,
  error,
  onClose,
  onMealAdded,
}: Props) {
  const { user } = useAuth();
  const { selectedMealType } = useMealTypePreferences();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const [mealAdded, setMealAdded] = useState(false);
  const backdropOpacity = useSharedValue(0);
  const popupOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;

    backdropOpacity.value = 0;
    popupOpacity.value = 0;
    backdropOpacity.value = withTiming(1, { duration: 220 });
    popupOpacity.value = withTiming(1, { duration: 220 });
  }, [visible, backdropOpacity, popupOpacity]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const popupStyle = useAnimatedStyle(() => ({
    opacity: popupOpacity.value,
  }));

  const allEntries = useMemo(() => {
    if (!data) return [];
    return sortEntries(
      Object.entries(data).filter(
        ([, value]) => value !== null && value !== undefined,
      ),
    );
  }, [data]);

  const highlights = useMemo(
    () => (data ? getPriorityHighlights(data) : []),
    [data],
  );

  const handleLoadImage = useCallback(async () => {
    if (!barcode || !data) return;

    setIsLoadingImage(true);
    setImageError(null);

    const url = resolveImageUrl(data, barcode);
    if (!url) {
      setImageError('No image URL available for this product.');
      setIsLoadingImage(false);
      return;
    }

    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) {
        setImageError('Image not found on Open Food Facts.');
        setImageUri(null);
      } else {
        setImageUri(url);
      }
    } catch {
      setImageUri(url);
    } finally {
      setIsLoadingImage(false);
    }
  }, [barcode, data]);

  const handleClose = useCallback(() => {
    setImageUri(null);
    setImageError(null);
    setIsLoadingImage(false);
    setIsAddingMeal(false);
    setMealAdded(false);
    onClose();
  }, [onClose]);

  const canPressAdd = Boolean(data && !isLoading && !error && !mealAdded && !isAddingMeal);

  const handleAddToMeals = useCallback(async () => {
    if (!data) return;

    setIsAddingMeal(true);
    try {
      if (barcode?.trim()) {
        await appendMealBarcode(selectedMealType, barcode);
      }
      setMealAdded(true);
      onMealAdded?.();

      if (user?.$id) {
        const input = buildMealInputFromProduct(user.$id, data, selectedMealType, barcode);
        await createMeal(input);
        router.push('/meals');
        Alert.alert(
          'Added & Synced',
          input.friendlyname
            ? `"${input.friendlyname}" was saved to your meals and synced to Appwrite.`
            : 'This item was saved to your meals and synced to Appwrite.',
          [{ text: 'OK', onPress: handleClose }],
        );
      } else {
        Alert.alert(
          'Added Locally',
          'This item was saved to your local meals. Sign in under the Account tab to sync with Appwrite.',
          [{ text: 'OK', onPress: handleClose }],
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not add meal.';
      showApiError(message, 'appwrite');
      Alert.alert('Could not add meal', message);
    } finally {
      setIsAddingMeal(false);
    }
  }, [barcode, data, handleClose, onMealAdded, selectedMealType, user]);

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={handleClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
        <Animated.View style={[styles.popup, popupStyle]}>
          <Text style={styles.title}>Product details</Text>
          {barcode ? <Text style={styles.subtitle}>Barcode: {barcode}</Text> : null}

          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.mutedText}>Loading comprehensive data…</Text>
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : data ? (
            <View style={styles.body}>
              <ScrollView
                style={styles.dataPanel}
                contentContainerStyle={styles.dataPanelContent}
              >
                <Text style={styles.panelHeading}>All data</Text>
                {allEntries.map(([key, value]) => (
                  <View key={key} style={styles.dataRow}>
                    <Text style={styles.dataLabel}>{formatLabel(key)}</Text>
                    <Text style={styles.dataValue}>{formatValue(value)}</Text>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.summaryPanel}>
                <Text style={styles.panelHeading}>Key facts</Text>
                <ScrollView
                  style={styles.summaryScroll}
                  contentContainerStyle={styles.summaryScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {highlights.length > 0 ? (
                    highlights.map((item) => (
                      <View key={item.label} style={styles.highlightRow}>
                        <Text style={styles.highlightLabel}>{item.label}</Text>
                        <Text style={styles.highlightValue}>{item.value}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.mutedText}>No highlighted fields found.</Text>
                  )}
                </ScrollView>

                <View style={styles.imageSection}>
                  {imageUri ? (
                    <ImageViewer
                      imgSource={{ uri: imageUri }}
                      style={styles.productImage}
                    />
                  ) : (
                    <ImageViewer imgSource={PlaceholderImage} style={styles.productImage} />
                  )}
                  {imageError ? <Text style={styles.imageErrorText}>{imageError}</Text> : null}
                </View>

                <TouchableOpacity
                  style={[styles.yellowButton, isLoadingImage && styles.buttonDisabled]}
                  onPress={handleLoadImage}
                  disabled={isLoadingImage}
                >
                  {isLoadingImage ? (
                    <ActivityIndicator color={colors.onAccent} />
                  ) : (
                    <Text style={styles.yellowButtonText}>Load image from openfoodfacts</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View style={styles.footer}>
            <Pressable style={styles.redButton} onPress={handleClose}>
              <Text style={styles.footerButtonText}>Close</Text>
            </Pressable>
            <Pressable
              style={[
                styles.greenButton,
                !canPressAdd && styles.buttonDisabled,
              ]}
              onPress={handleAddToMeals}
              disabled={!canPressAdd}
            >
              {isAddingMeal ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.footerButtonText}>
                  {mealAdded ? 'Added' : user ? 'Add to meals' : 'Add locally'}
                </Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.overlay,
  },
  popup: {
    backgroundColor: c.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  title: {
    color: c.text,
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  subtitle: {
    color: c.textMuted,
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  body: {
    flexDirection: 'row',
    minHeight: 280,
    maxHeight: 420,
    paddingHorizontal: 12,
    gap: 10,
  },
  dataPanel: {
    flex: 1.2,
    backgroundColor: c.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  dataPanelContent: {
    padding: 12,
    paddingBottom: 20,
  },
  summaryPanel: {
    flex: 1,
    backgroundColor: c.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    padding: 10,
    gap: 8,
  },
  panelHeading: {
    color: c.text,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  dataRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    gap: 4,
  },
  dataLabel: {
    color: c.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  dataValue: {
    color: c.text,
    fontSize: 13,
    lineHeight: 18,
  },
  summaryScroll: {
    maxHeight: 140,
  },
  summaryScrollContent: {
    gap: 6,
    paddingBottom: 4,
  },
  highlightRow: {
    backgroundColor: c.background,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  highlightLabel: {
    color: c.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  highlightValue: {
    color: c.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  imageSection: {
    alignItems: 'center',
    gap: 4,
  },
  productImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  imageErrorText: {
    color: c.danger,
    fontSize: 11,
    textAlign: 'center',
  },
  yellowButton: {
    backgroundColor: c.accent,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginTop: 'auto',
  },
  yellowButtonText: {
    color: c.onAccent,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  redButton: {
    backgroundColor: c.danger,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  greenButton: {
    backgroundColor: c.success,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  footerButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  centered: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  mutedText: {
    color: c.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: c.danger,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
