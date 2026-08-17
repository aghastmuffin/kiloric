import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, CameraType, useCameraPermissions, type BarcodeType } from 'expo-camera';
import * as Device from 'expo-device';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState, useEffect } from 'react';
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

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

  // Animated Scan Line
  const scanLineY = useSharedValue(0);

  useEffect(() => {
    scanLineY.value = withRepeat(
      withTiming(236, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [scanLineY]);

  const animatedLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

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

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      const barcode = data.trim();
      if (!barcode || scanned) return;

      setScanned(true);
      setDetailLoading(true);
      try {
        // Log tab picks this up on focus and shows LogFoodMultiView in-place.
        await AsyncStorage.setItem('saved_barcode', barcode);
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)/logfood');
        }
      } catch (error) {
        console.error('Storage failed', error);
        setDetailLoading(false);
        setScanned(false);
      }
    },
    [router, scanned],
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

      {/* Focus Box & Scan Line Overlay */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <View style={styles.maskOutter}>
          <View style={styles.maskRow} />
          <View style={styles.middleRow}>
            <View style={styles.maskSide} />
            <View style={styles.scanBox}>
              <View style={[styles.corner, styles.topLeft, { borderColor: colors.accent }]} />
              <View style={[styles.corner, styles.topRight, { borderColor: colors.accent }]} />
              <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.accent }]} />
              <View style={[styles.corner, styles.bottomRight, { borderColor: colors.accent }]} />

              <Animated.View style={[styles.scanLine, { backgroundColor: colors.accent }, animatedLineStyle]} />
            </View>
            <View style={styles.maskSide} />
          </View>
          <View style={styles.maskRow} />
        </View>
      </View>

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
    maskOutter: {
      flex: 1,
    },
    maskRow: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    middleRow: {
      flexDirection: 'row',
      height: 240,
    },
    maskSide: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    scanBox: {
      width: 240,
      height: 240,
      position: 'relative',
      backgroundColor: 'transparent',
    },
    corner: {
      position: 'absolute',
      width: 24,
      height: 24,
      borderWidth: 3,
    },
    topLeft: {
      top: 0,
      left: 0,
      borderRightWidth: 0,
      borderBottomWidth: 0,
    },
    topRight: {
      top: 0,
      right: 0,
      borderLeftWidth: 0,
      borderBottomWidth: 0,
    },
    bottomLeft: {
      bottom: 0,
      left: 0,
      borderRightWidth: 0,
      borderTopWidth: 0,
    },
    bottomRight: {
      bottom: 0,
      right: 0,
      borderLeftWidth: 0,
      borderTopWidth: 0,
    },
    scanLine: {
      position: 'absolute',
      left: 6,
      right: 6,
      height: 3,
      opacity: 0.8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 3,
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
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
      maxWidth: 200,
      borderRadius: 8,
      marginLeft: 'auto',
      marginRight: 'auto',
    },
    buttonText: {
      color: c.text,
      fontSize: 16,
      fontWeight: 'bold',
    },
    loadingOverlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      color: c.text,
      marginTop: 12,
      fontSize: 16,
      fontWeight: '600',
    },
  });
