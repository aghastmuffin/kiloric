import { authenticatedRequest } from '@/components/apiUtils';
import { MealTypePicker } from '@/components/MealTypePicker';
import { useTheme } from '@/lib/theme/ThemeContext';
import { borderRadius, spacing, type ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

type SearchType = 'Text' | 'Barcode';
const SEARCH_HELPERS = ['Chicken breast', 'Greek yogurt', 'Banana'];

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
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [searchType, setSearchType] = useState<SearchType>('Text');
  const [recentQueries, setRecentQueries] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      AsyncStorage.getItem('saved_barcode')
        .then((barcode) => {
          if (!active || !barcode?.trim()) return;
          setQuery(barcode.trim());
          setSearchType('Barcode');
          return AsyncStorage.removeItem('saved_barcode');
        })
        .catch((error) => console.error('Could not load scanned barcode', error));

      return () => {
        active = false;
      };
    }, []),
  );

  const handleTextResponse = useCallback(
    (data: string) => {
      router.push({
        pathname: '/multiresponse',
        params: { query, result: data },
      });
    },
    [query, router],
  );

  const handleScanPress = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    setIsLoading(true);
    let result = '';

    if (searchType === 'Barcode') {
      result = await fetchBarcodeManual(trimmedQuery);
    } else {
      result = await fetchQuery(trimmedQuery);
    }

    setIsLoading(false);
    setRecentQueries((current) => [
      trimmedQuery,
      ...current.filter((item) => item !== trimmedQuery),
    ].slice(0, 3));
    handleTextResponse(result);
  };

  const handleCameraPress = () => {
        router.push('/cameraview');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>FOOD LOG</Text>
        <Text style={styles.titleText}>What are you eating?</Text>
        <Text style={styles.subtitle}>
          Search foods by name or scan a package barcode.
        </Text>

        <View style={styles.modeRow}>
          {(['Text', 'Barcode'] as SearchType[]).map((type) => {
            const selected = searchType === type;
            return (
              <Pressable
                key={type}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setSearchType(type)}
                style={({ pressed }) => [
                  styles.modeChip,
                  selected && styles.modeChipSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name={type === 'Text' ? 'search-outline' : 'barcode-outline'}
                  size={17}
                  color={selected ? colors.onAccent : colors.textMuted}
                />
                <Text style={[styles.modeChipText, selected && styles.modeChipTextSelected]}>
                  {type}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            accessibilityLabel={searchType === 'Barcode' ? 'Barcode' : 'Food search'}
            autoCapitalize={searchType === 'Text' ? 'sentences' : 'none'}
            keyboardType={searchType === 'Barcode' ? 'number-pad' : 'default'}
            placeholder={searchType === 'Barcode' ? 'Enter a barcode' : 'Search foods'}
            placeholderTextColor={colors.textFaint}
            returnKeyType="search"
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => void handleScanPress()}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan barcode with camera"
            style={({ pressed }) => [styles.cameraButton, pressed && styles.pressed]}
            onPress={handleCameraPress}
          >
            <Ionicons name="barcode-outline" size={22} color={colors.onAccent} />
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            (isLoading || !query.trim()) && styles.buttonDisabled,
            pressed && styles.pressed,
          ]}
          onPress={() => void handleScanPress()}
          disabled={isLoading || !query.trim()}
        >
          <Text style={styles.buttonText}>{isLoading ? 'Searching…' : 'Search foods'}</Text>
        </Pressable>

        <View style={styles.helpers}>
          <Text style={styles.helperLabel}>
            {recentQueries.length > 0 ? 'RECENT THIS SESSION' : 'TRY A SEARCH'}
          </Text>
          <View style={styles.helperChips}>
            {(recentQueries.length > 0 ? recentQueries : SEARCH_HELPERS).map((helper) => (
              <Pressable
                key={helper}
                onPress={() => {
                  setQuery(helper);
                  setSearchType('Text');
                }}
                style={({ pressed }) => [styles.helperChip, pressed && styles.pressed]}
              >
                <Text style={styles.helperChipText}>{helper}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
      <MealTypePicker />
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 140,
  },
  eyebrow: {
    ...typography.labelSmall,
    color: c.success,
    marginBottom: spacing.sm,
  },
  titleText: {
    ...typography.headlineLarge,
    color: c.text,
  },
  subtitle: {
    ...typography.body,
    color: c.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  modeChipSelected: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  modeChipText: {
    ...typography.label,
    color: c.textMuted,
  },
  modeChipTextSelected: {
    color: c.onAccent,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: c.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.borderStrong,
    overflow: 'hidden',
    paddingLeft: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: c.text,
    paddingVertical: 15,
  },
  cameraButton: {
    alignSelf: 'stretch',
    minWidth: 58,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.accent,
  },
  button: {
    backgroundColor: c.accent,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    ...typography.label,
    color: c.onAccent,
    fontWeight: '700',
  },
  helpers: {
    marginTop: spacing.xl,
  },
  helperLabel: {
    ...typography.labelSmall,
    color: c.textMuted,
    marginBottom: spacing.sm,
  },
  helperChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  helperChip: {
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: borderRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  helperChipText: {
    ...typography.labelSmall,
    color: c.text,
  },
  pressed: {
    opacity: 0.75,
  },
});