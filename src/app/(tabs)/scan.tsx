import { authenticatedRequest } from '@/components/apiUtils';
import BarcodeDetailModal from '@/components/BarcodeDetailModal';
import ImageViewer from '@/components/ImageViewer';
import { MealTypePicker } from '@/components/MealTypePicker';
import { SearchModeSwapButton } from '@/components/SearchModeSwapButton';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';



async function fetchBarcodeData(barcode: string): Promise<string> {
  try {
    const data = await authenticatedRequest(`/api/barcode/${barcode}`);
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return `Request failed: ${message}`;
  }
}

export default function Index() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const [barcodeResult, setBarcodeResult] = useState('No barcode scanned yet');
  const [savedBarcode, setSavedBarcode] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailData, setDetailData] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadStoredData = async () => {
        try {
          const value = await AsyncStorage.getItem('saved_barcode');
          if (!isActive) return;

          if (value === null) {
            setSavedBarcode(null);
            setBarcodeResult('No barcode scanned yet');
            return;
          }

          setSavedBarcode(value);
          setBarcodeResult(`Barcode: ${value}\n\nLoading…`);
          const apiResult = await fetchBarcodeData(value);
          if (isActive) {
            setBarcodeResult(`Barcode: ${value}\n\n${apiResult}`);
          }
        } catch (error) {
          console.error('Reading storage failed', error);
        }
      };

      loadStoredData();

      return () => {
        isActive = false;
      };
    }, []),
  );

  const handleViewMore = useCallback(async () => {
    if (!savedBarcode) return;

    setModalVisible(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);

    try {
      const data = await authenticatedRequest(`/api/barcode/${savedBarcode}`);
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
  }, [savedBarcode]);
//      <Text style={styles.maintext}>Last Scanned Item: {barcodeResult}</Text>C
  return (
    <View style={styles.container}>
      <Text style={styles.maintext}>Visually Scan</Text>
      <Text style={styles.subtitle}>Point your camera at a barcode</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/cameraview')}
      >
        <Text style={styles.buttonText}>Open Camera Scanner</Text>
      </TouchableOpacity>
      {savedBarcode ? (
        <TouchableOpacity style={styles.viewMoreButton} onPress={handleViewMore}>
          <Text style={styles.viewMoreButtonText}>View Macros</Text>
        </TouchableOpacity>
      ) : null}

      <BarcodeDetailModal
        visible={modalVisible}
        barcode={savedBarcode}
        data={detailData}
        isLoading={detailLoading}
        error={detailError}
        onClose={() => setModalVisible(false)}
      />

      <MealTypePicker />
      <SearchModeSwapButton current="scan" />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
    alignItems: 'center',
    paddingTop: 16,
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
  },
  button: {
    backgroundColor: c.accent,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    marginHorizontal: 24,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonText: {
    color: c.onAccent,
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewMoreButton: {
    backgroundColor: c.accentSoft,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
    marginHorizontal: 24,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  viewMoreButtonText: {
    color: c.accent,
    fontSize: 16,
    fontWeight: 'bold',
  },
  maintext: {
    fontSize: 24,
    fontWeight: '700',
    margin: 20,
    color: c.text,
  },
  subtitle: {
    fontSize: 14,
    color: c.textMuted,
    marginBottom: 8,
  },
});
