import { SearchModeSwapButton } from '@/components/SearchModeSwapButton';
import { triggerSelectionHaptic } from '@/lib/haptics';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useAppLayout } from '@/lib/theme/layout';
import { borderRadius, spacing, type ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions, type BarcodeType } from 'expo-camera';
import * as Device from 'expo-device';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AppStateStatus,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { gutter, width } = useAppLayout();
  const insets = useSafeAreaInsets();
  const [facing, setFacing] = useState<CameraType>('back');
  const [scanned, setScanned] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();

  const [detailLoading, setDetailLoading] = useState(false);
  const scanSize = Math.max(176, Math.min(280, width - gutter * 2 - spacing.lg));

  // Animated Scan Line
  const scanLineY = useSharedValue(0);

  useEffect(() => {
    scanLineY.value = withRepeat(
      withTiming(scanSize - 4, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [scanLineY, scanSize]);

  const animatedLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  const resetScanState = useCallback(() => {
    setScanned(false);
    setDetailLoading(false);
    setCameraError(null);
    setHandoffError(null);
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

      setHandoffError(null);
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
        setHandoffError('The barcode was read, but the food log could not be opened. Please scan again.');
        setDetailLoading(false);
        setScanned(false);
      }
    },
    [router, scanned],
  );

  const handleExit = useCallback(() => {
    triggerSelectionHaptic();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/logfood');
    }
  }, [router]);

  if (Platform.OS === 'ios' && !Device.isDevice) {
    return (
      <View style={styles.container}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close scanner"
          accessibilityHint="Returns to food log"
          onPress={handleExit}
          style={[styles.closeButton, { top: Math.max(insets.top, spacing.md) }]}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
        <View style={[styles.statePanel, { marginHorizontal: gutter }]}>
          <View style={styles.stateIcon}>
            <Ionicons name="phone-portrait-outline" size={26} color={colors.brand} />
          </View>
          <Text style={styles.stateEyebrow}>BARCODE SCANNER</Text>
          <Text style={styles.stateTitle}>A physical camera is required.</Text>
          <Text style={styles.message}>
            The iOS Simulator cannot scan barcodes. Open this screen on a physical iPhone, Android
            device, or supported web browser.
          </Text>
        </View>
        <SearchModeSwapButton current="scan" />
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close scanner"
          accessibilityHint="Returns to food log"
          onPress={handleExit}
          style={[styles.closeButton, { top: Math.max(insets.top, spacing.md) }]}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
        <View style={[styles.statePanel, { marginHorizontal: gutter }]}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.stateTitle}>Checking camera access</Text>
          <Text style={styles.message}>Preparing the barcode scanner…</Text>
        </View>
        <SearchModeSwapButton current="scan" />
      </View>
    );
  }

  if (!permission.granted) {
    const openSystemSettings = !permission.canAskAgain && Platform.OS !== 'web';
    return (
      <View style={styles.container}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close scanner"
          accessibilityHint="Returns to food log"
          onPress={handleExit}
          style={[styles.closeButton, { top: Math.max(insets.top, spacing.md) }]}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
        <View style={[styles.statePanel, { marginHorizontal: gutter }]}>
          <View style={styles.stateIcon}>
            <Ionicons name="camera-outline" size={27} color={colors.brand} />
          </View>
          <Text style={styles.stateEyebrow}>CAMERA ACCESS</Text>
          <Text style={styles.stateTitle}>Allow camera access to scan.</Text>
          <Text style={styles.message}>
            {openSystemSettings
              ? 'Camera access is blocked. Enable it in system settings, then return here.'
              : 'CalCount uses the camera only to read a barcode in the scanning frame.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void (openSystemSettings ? Linking.openSettings() : requestPermission())}
            style={({ pressed }) => [styles.permissionButton, pressed && styles.pressed]}
          >
            <Text style={styles.permissionButtonText}>
              {openSystemSettings ? 'Open settings' : 'Allow camera'}
            </Text>
          </Pressable>
        </View>
        <SearchModeSwapButton current="scan" />
      </View>
    );
  }

  function toggleCameraFacing() {
    triggerSelectionHaptic();
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
          onCameraReady={() => setCameraError(null)}
          onMountError={({ message }) => setCameraError(message || 'The camera could not start.')}
        />
      ) : (
        <View style={styles.camera} />
      )}

      {/* Focus Box & Scan Line Overlay */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.maskOutter}>
          <View style={styles.maskRow} />
          <View style={[styles.middleRow, { height: scanSize }]}>
            <View style={styles.maskSide} />
            <View style={[styles.scanBox, { width: scanSize, height: scanSize }]}>
              <View style={[styles.corner, styles.topLeft, { borderColor: colors.brand }]} />
              <View style={[styles.corner, styles.topRight, { borderColor: colors.brand }]} />
              <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.brand }]} />
              <View style={[styles.corner, styles.bottomRight, { borderColor: colors.brand }]} />

              <Animated.View style={[styles.scanLine, { backgroundColor: colors.brand }, animatedLineStyle]} />
            </View>
            <View style={styles.maskSide} />
          </View>
          <View style={styles.maskRow} />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close scanner"
        accessibilityHint="Returns to food log"
        onPress={handleExit}
        style={[styles.closeButton, { top: Math.max(insets.top, spacing.md) }]}
      >
        <Ionicons name="close" size={22} color="#FFFFFF" />
      </Pressable>

      <View style={styles.guidance} pointerEvents="none">
        <Text style={styles.guidanceEyebrow}>SCAN A FOOD BARCODE</Text>
        <Text style={styles.guidanceText}>Hold the code inside the frame</Text>
      </View>

      {handoffError ? (
        <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[styles.errorBanner, { left: gutter, right: gutter }]}>
          <Ionicons name="alert-circle-outline" size={19} color={colors.danger} />
          <Text style={styles.errorBannerText}>{handoffError}</Text>
        </View>
      ) : null}

      {cameraError ? (
        <View accessibilityRole="alert" accessibilityViewIsModal style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
          <View style={[styles.errorPanel, { marginHorizontal: gutter }]}>
            <Ionicons name="camera-outline" size={28} color={colors.danger} />
            <Text style={styles.stateTitle}>Camera unavailable</Text>
            <Text style={styles.message}>{cameraError}</Text>
          </View>
        </View>
      ) : null}

      {detailLoading && (
        <View accessibilityLiveRegion="polite" accessibilityViewIsModal style={StyleSheet.absoluteFill}>
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={colors.brand} />
              <Text style={styles.loadingTitle}>Barcode captured</Text>
              <Text style={styles.loadingText}>Opening your food log…</Text>
            </View>
          </View>
        </View>
      )}

      {!cameraError && !detailLoading ? (
      <View style={[styles.buttonContainer, { bottom: Math.max(insets.bottom, spacing.lg) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch between front and back camera"
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={toggleCameraFacing}
        >
          <Ionicons name="camera-reverse-outline" size={20} color={colors.text} />
          <Text style={styles.buttonText}>Flip camera</Text>
        </Pressable>
      </View>
      ) : null}

      <SearchModeSwapButton current="scan" />
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
    closeButton: {
      position: 'absolute',
      left: spacing.lg,
      zIndex: 10,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    statePanel: {
      maxWidth: 480,
      alignSelf: 'stretch',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xl,
    },
    stateIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.brandSoft,
      marginBottom: spacing.xs,
    },
    stateEyebrow: {
      ...typography.overline,
      color: c.brand,
    },
    stateTitle: {
      ...typography.headline,
      color: c.text,
      textAlign: 'center',
    },
    message: {
      ...typography.body,
      textAlign: 'center',
      color: c.textMuted,
      maxWidth: 420,
    },
    permissionButton: {
      minHeight: 48,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.xl,
      borderRadius: borderRadius.pill,
      backgroundColor: c.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    permissionButtonText: {
      ...typography.label,
      color: c.onBrand,
    },
    camera: {
      flex: 1,
      backgroundColor: '#111111',
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
    },
    maskSide: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    scanBox: {
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
    },
    guidance: {
      position: 'absolute',
      top: spacing.lg,
      left: spacing.lg,
      right: spacing.lg,
      zIndex: 2,
      alignItems: 'center',
      gap: 3,
    },
    guidanceEyebrow: {
      ...typography.overline,
      color: '#FFFFFF',
    },
    guidanceText: {
      ...typography.bodySmall,
      color: '#FFFFFF',
      textAlign: 'center',
    },
    errorBanner: {
      position: 'absolute',
      top: 82,
      zIndex: 4,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      backgroundColor: c.surfaceMuted,
      borderWidth: 1,
      borderColor: c.danger,
    },
    errorBannerText: {
      ...typography.bodySmall,
      color: c.danger,
      flex: 1,
    },
    buttonContainer: {
      position: 'absolute',
      zIndex: 3,
      flexDirection: 'row',
      backgroundColor: 'transparent',
      width: '100%',
      paddingHorizontal: spacing.lg,
      justifyContent: 'center',
    },
    button: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: c.surfaceMuted,
      borderWidth: 1,
      borderColor: c.borderStrong,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      minWidth: 160,
      maxWidth: 200,
      borderRadius: borderRadius.pill,
    },
    buttonText: {
      color: c.text,
      ...typography.label,
    },
    loadingOverlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingCard: {
      minWidth: 220,
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderRadius: borderRadius.lg,
      backgroundColor: c.surface,
    },
    loadingTitle: {
      ...typography.headline,
      color: c.text,
      marginTop: spacing.xs,
    },
    loadingText: {
      ...typography.bodySmall,
      color: c.textMuted,
    },
    errorPanel: {
      maxWidth: 440,
      alignSelf: 'stretch',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.xl,
      borderRadius: borderRadius.lg,
      backgroundColor: c.surface,
    },
    pressed: {
      opacity: 0.72,
    },
  });
