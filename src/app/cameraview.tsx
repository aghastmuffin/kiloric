import { CameraView, CameraType, useCameraPermissions, type BarcodeType } from 'expo-camera';
import { useState, useCallback } from 'react';
import {
  AppState,
  Button,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type AppStateStatus,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Device from 'expo-device';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';

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
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [facing, setFacing] = useState<CameraType>('back');
  const [scanned, setScanned] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useFocusEffect(
    useCallback(() => {
      setScanned(false);

      const syncCameraEnabled = (appState: AppStateStatus) => {
        setCameraEnabled(appState === 'active');
      };

      syncCameraEnabled(AppState.currentState);
      const subscription = AppState.addEventListener('change', syncCameraEnabled);

      return () => {
        subscription.remove();
        setCameraEnabled(false);
      };
    }, []),
  );

  const handleBarcodeScanned = useCallback(async ({ data }: { data: string }) => {
    setScanned(true);
    try {
      await AsyncStorage.setItem('saved_barcode', data);
    } catch (error) {
      console.error('Storage failed', error);
    }
    router.back();
  }, [router]);

  if (Platform.OS === 'ios' && !Device.isDevice) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          Barcode scanning is not available on the iOS Simulator. Use a physical iPhone or test on web/Android.
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
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  return (
      <View style={styles.container}>
        {cameraEnabled ? (
          <CameraView
            style={styles.camera}
            facing={facing}
            active={cameraEnabled}
            barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          />
        ) : (
          <View style={styles.camera} />
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
            <Text style={styles.buttonText}>Flip Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
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
});