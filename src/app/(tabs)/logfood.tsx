import { authenticatedRequest } from '@/components/apiUtils';
import { MealTypePicker } from '@/components/MealTypePicker';
import { SearchModeSwapButton } from '@/components/SearchModeSwapButton';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const PlaceholderImage = require('../../../assets/images/dark.svg');

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

function CrossPlatformDropDown({ 
  selectedType, 
  onSelectType 
}: { 
  selectedType: SearchType; 
  onSelectType: (type: SearchType) => void; 
}) {
  const [isVisible, setIsVisible] = useState(false);
  const options: SearchType[] = ['Text', 'Barcode'];
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity onPress={() => setIsVisible(!isVisible)} style={styles.dropdownTrigger}>
        <Text style={styles.dropdownTriggerText}>{selectedType} ▼</Text>
      </TouchableOpacity>

      {isVisible && (
        <>
          <Pressable style={styles.blanket} onPress={() => setIsVisible(false)} />
          
          <View style={styles.floatingMenu}>
            {options.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.dropdownItem,
                  item === selectedType && styles.dropdownItemSelected
                ]}
                onPress={() => {
                  onSelectType(item);
                  setIsVisible(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

export default function Index() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [searchType, setSearchType] = useState<SearchType>('Text');

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

  const handleCameraPress = () => {
        router.push('/cameraview');
  };

  return (
    <View style={styles.container}>

      <View style={styles.headerRow}>
        <Text style={styles.titleText}>Manually Search {searchType === 'Barcode' ? 'for a' : 'for'}</Text>
        <CrossPlatformDropDown selectedType={searchType} onSelectType={setSearchType} />
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
        
        {/* The interactive camera overlay button positioned cleanly inside the row */}
        <TouchableOpacity 
          style={styles.cameraButton} 
          onPress={handleCameraPress}
          activeOpacity={0.7}
        >
          <Text style={styles.cameraIcon}>Scan <Ionicons name={'barcode'} size={24} /> </Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleScanPress}
        disabled={isLoading || !query.trim()}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Please Wait...' : 'Search'}
        </Text>
      </TouchableOpacity>
      
      <MealTypePicker />
      <SearchModeSwapButton current="text_query" />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
    alignItems: 'center',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  image: {
    width: 260,
    height: 260,
    borderRadius: 18,
    maxWidth: '90%', 
  },
  headerRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginTop: 20, 
    marginHorizontal: 20,
    width: '85%',
    maxWidth: 440,
  },
  // Row layout framing both TextInput and the camera icon together safely
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surfaceAlt,
    borderRadius: 12,
    width: '85%',
    maxWidth: 440,
    marginTop: 10,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  // Allows text layout to take up all empty space up to the camera trigger boundaries
  input: {
    flex: 1,
    color: c.text,
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 14,
    fontSize: 16,
  },
  // Hitbox parameters for your overlay action
  cameraButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    fontSize: 18,
  },
  button: {
    backgroundColor: c.accent,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    width: '85%',
    maxWidth: 440,
    alignItems: 'center',
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
    fontSize: 22,
    fontWeight: 'bold',
    color: c.text,
    letterSpacing: -0.3,
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 50,
  },
  dropdownTrigger: {
    backgroundColor: c.surfaceAlt,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  dropdownTriggerText: {
    color: c.accent, 
    fontSize: 22,
    fontWeight: 'bold',
  },
  blanket: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 1,
  },
  floatingMenu: {
    position: 'absolute',
    top: 48,
    right: 0,
    backgroundColor: c.surface,
    borderRadius: 12,
    width: 160,
    paddingVertical: 6,
    paddingHorizontal: 6,
    zIndex: 2,
    borderWidth: 1,
    borderColor: c.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.4)',
      }
    }),
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginVertical: 2,
  },
  dropdownItemSelected: {
    backgroundColor: c.accentSoft,
  },
  dropdownItemText: {
    color: c.text,
    fontSize: 16,
    fontWeight: '500',
  },
});