import { authenticatedRequest } from '@/components/apiUtils';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, CameraType, useCameraPermissions, type BarcodeType } from 'expo-camera';
import * as Device from 'expo-device';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  AppState,
  Button,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  type AppStateStatus,
} from 'react-native';

const BARCODE_TYPES: BarcodeType[] = [
  'aztec',
  'ean13',
  'ean8',
  'qr',
  'pdf417',
  'upc_e',
  'datamatrix',
  'code39',
  'code93',
  'itf14',
  'codabar',
  'code128',
  'upc_a',
];

export default function CameraScannerScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [facing, setFacing] = useState<CameraType>('back');
  const [scanned, setScanned] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();

  const [detailLoading, setDetailLoading] = useState(false);

  const resetScanState = useCallback(() => {
    setScanned(false);
    setDetailLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      resetScanState();

      const syncCameraEnabled = (appState: AppStateStatus) => {
        setCameraEnabled(appState === 'active');
      };

      syncCameraEnabled(AppState.currentState);
      const subscription = AppState.addEventListener('change', syncCameraEnabled);

      return () => {
        subscription.remove();
        setCameraEnabled(false);
      };
    }, [resetScanState]),
  );

  const lookupBarcode = useCallback(async (barcode: string) => {
    setDetailLoading(true);

    try {
      const data = await authenticatedRequest(`/api/barcode/${encodeURIComponent(barcode)}`);
      const stringData = typeof data === 'string' ? data : JSON.stringify(data);
      router.push({
        pathname: '/multiresponse',
        params: { query: barcode, result: stringData },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      router.push({
        pathname: '/multiresponse',
        params: { query: barcode, result: JSON.stringify({ error: message }) },
      });
    } finally {
      setDetailLoading(false);
    }
  }, [router]);

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      const barcode = data.trim();
      if (!barcode || scanned) return;

      setScanned(true);
      try {
        await AsyncStorage.setItem('saved_barcode', barcode);
      } catch (error) {
        console.error('Storage failed', error);
      }
      await lookupBarcode(barcode);
    },
    [lookupBarcode, scanned],
  );



  if (Platform.OS === 'ios' && !Device.isDevice) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          Barcode scanning is not available on the iOS Simulator. Use a physical iPhone or test on
          web/Android.
        </Text>
      </View>
    );
  }

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" color={colors.accent} />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }

  return (
    <View style={styles.container}>
      {cameraEnabled ? (
        <CameraView
          style={styles.camera}
          facing={facing}
          active={cameraEnabled && !detailLoading}
          barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
          onBarcodeScanned={scanned || detailLoading ? undefined : handleBarcodeScanned}
        />
      ) : (
        <View style={styles.camera} />
      )}

      {detailLoading && (
        <View style={StyleSheet.absoluteFillObject}>
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Looking up barcode...</Text>
          </View>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
          <Text style={styles.buttonText}>Flip Camera</Text>
        </TouchableOpacity>
      </View>


    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      backgroundColor: c.background,
    },
    message: {
      textAlign: 'center',
      paddingBottom: 10,
      paddingHorizontal: 24,
      color: c.text,
    },
    camera: {
      flex: 1,
    },
    buttonContainer: {
      position: 'absolute',
      bottom: 64,
      flexDirection: 'row',
      backgroundColor: 'transparent',
      width: '100%',
      paddingHorizontal: 64,
    },
    button: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: '#414141',
      opacity: 0.4,
      padding: 12,
      maxWidth: 200,
      borderRadius: 8,
      marginLeft: 'auto',
      marginRight: 'auto',
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      opacity: 1,
      fontWeight: 'bold',
    },
    loadingOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      color: 'white',
      marginTop: 12,
      fontSize: 16,
      fontWeight: '600',
    },
  });
