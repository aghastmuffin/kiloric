import { authenticatedRequest } from '@/components/apiUtils';
import { MealTypePicker } from '@/components/MealTypePicker';
import { SearchModeSwapButton } from '@/components/SearchModeSwapButton';
import { ThemedSegmentedControl } from '@/components/ThemedSegmentedControl';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { useAuth } from '@/lib/AuthContext';
import { listRecentFoods, recentFoodsUserKey, type RecentFoodEntry } from '@/lib/recentFoods';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { MotiView } from 'moti';

type SearchType = 'Text' | 'Barcode';

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
  const params = useLocalSearchParams<{ q?: string }>();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [searchType, setSearchType] = useState<SearchType>('Text');
  const [recents, setRecents] = useState<RecentFoodEntry[]>([]);

  useEffect(() => {
    if (typeof params.q === 'string' && params.q.trim()) {
      setQuery(params.q.trim());
    }
  }, [params.q]);

  // Load recent searches
  const loadRecents = useCallback(() => {
    listRecentFoods(recentFoodsUserKey(user?.$id))
      .then(setRecents)
      .catch((err) => console.error('[logfood] recents load failed', err));
  }, [user?.$id]);

  useEffect(() => {
    loadRecents();
  }, [loadRecents]);

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
    if (!query.trim()) return;

    setIsLoading(true);
    let result = '';

    if (searchType === 'Barcode') {
      result = await fetchBarcodeManual(query.trim());
    } else {
      result = await fetchQuery(query.trim());
    }

    setIsLoading(false);
    handleTextResponse(result);
  };

  const selectRecent = (text: string) => {
    setQuery(text);
  };

  return (
    <MotiView
      from={{ opacity: 0, translateY: 50 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 18, stiffness: 120 }}
      style={styles.container}
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
          onChange={(index) => setSearchType(index === 0 ? 'Text' : 'Barcode')}
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
          onChangeText={setQuery}
        />
      </View>

      {/* Recent Searches horizontal strip */}
      {recents.length > 0 && (
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

      <MealTypePicker />
      <SearchModeSwapButton current="text_query" />
    </MotiView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
    alignItems: 'center',
    paddingTop: 20,
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
  // Row layout framing TextInput together safely
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
  // Allows text layout to take up all empty space
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
});