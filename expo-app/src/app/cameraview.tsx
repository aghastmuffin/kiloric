import { SearchModeSwapButton } from '@/components/SearchModeSwapButton';
import { triggerSelectionHaptic } from '@/lib/haptics';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useAppLayout } from '@/lib/theme/layout';
import { borderRadius, spacing, type ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
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
  TextInput,
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

function ManualBarcodeForm({
  value,
  onChangeText,
  onSubmit,
  autoFocus = false,
  lightTheme = false,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  autoFocus?: boolean;
  lightTheme?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={manualStyles.container}>
      <Text style={[manualStyles.label, { color: lightTheme ? colors.textMuted : 'rgba(255, 255, 255, 0.8)' }]}>
        Manual barcode entry
      </Text>
      <View style={manualStyles.inputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder="e.g. 0123456789012"
          placeholderTextColor={lightTheme ? colors.textMuted : '#999999'}
          keyboardType="number-pad"
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Manual barcode number input"
          accessibilityHint="Type the barcode digits from product packaging"
          style={[
            manualStyles.input,
            {
              backgroundColor: lightTheme ? colors.surfaceMuted : 'rgba(0, 0, 0, 0.6)',
              color: lightTheme ? colors.text : '#FFFFFF',
              borderColor: lightTheme ? colors.borderStrong : 'rgba(255, 255, 255, 0.3)',
            },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Look up barcode"
          onPress={onSubmit}
          disabled={!value.trim()}
          style={({ pressed }) => [
            manualStyles.submitButton,
            { backgroundColor: colors.brand, opacity: !value.trim() ? 0.4 : pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="arrow-forward" size={20} color={colors.onBrand} />
        </Pressable>
      </View>
    </View>
  );
}

const manualStyles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 380,
    marginTop: spacing.sm,
    gap: 4,
  },
  label: {
    ...typography.labelSmall,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
  submitButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

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
  const [manualBarcode, setManualBarcode] = useState('');
  const [showManual, setShowManual] = useState(false);
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

  // Detect web platform missing camera devices
  useEffect(() => {
    if (Platform.OS === 'web' && permission?.granted) {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
        navigator.mediaDevices
          .enumerateDevices()
          .then((devices) => {
            const hasVideo = devices.some((d) => d.kind === 'videoinput');
            if (!hasVideo) {
              setCameraError('No camera found. Type the barcode instead.');
            }
          })
          .catch(() => {});
      }
    }
  }, [permission?.granted]);

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      const barcode = data.trim();
      if (!barcode || scanned) return;

      setHandoffError(null);
      setScanned(true);
      setDetailLoading(true);
      try {
        router.replace({ pathname: '/review-log', params: { barcode, source: 'scan' } });
      } catch (error) {
        console.error('Could not open review screen', error);
        setHandoffError('The barcode was read, but the food log could not be opened. Please scan again.');
        setDetailLoading(false);
        setScanned(false);
      }
    },
    [router, scanned],
  );

  const handleManualSubmit = useCallback(
    (codeToSubmit?: string) => {
      const barcode = (codeToSubmit ?? manualBarcode).trim();
      if (!barcode) return;
      triggerSelectionHaptic();
      router.replace({ pathname: '/review-log', params: { barcode, source: 'scan' } });
    },
    [manualBarcode, router],
  );

  const handleExit = useCallback(() => {
    triggerSelectionHaptic();
    router.replace('/(tabs)/logfood');
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
            <Ionicons name="barcode-outline" size={26} color={colors.brand} />
          </View>
          <Text style={styles.stateEyebrow}>BARCODE SCANNER</Text>
          <Text style={styles.stateTitle}>No camera found. Type the barcode instead.</Text>
          <Text style={styles.message}>
            The iOS Simulator cannot scan barcodes. Type the barcode number below to look up the item.
          </Text>
          <ManualBarcodeForm
            value={manualBarcode}
            onChangeText={setManualBarcode}
            onSubmit={() => handleManualSubmit()}
            autoFocus
            lightTheme
          />
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
              ? 'Camera access is blocked. Enable it in settings, or type the barcode number below.'
              : 'Allow camera access to scan, or type the barcode number below.'}
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

          <ManualBarcodeForm
            value={manualBarcode}
            onChangeText={setManualBarcode}
            onSubmit={() => handleManualSubmit()}
            lightTheme
          />
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
          onMountError={({ message }) => {
            const raw = message || '';
            if (
              raw.includes('NotFoundError') ||
              raw.includes('Requested device not found') ||
              raw.includes('DevicesNotFoundError')
            ) {
              setCameraError('No camera found. Type the barcode instead.');
            } else {
              setCameraError(raw || 'No camera found. Type the barcode instead.');
            }
          }}
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
            <Ionicons name="barcode-outline" size={32} color={colors.brand} />
            <Text style={styles.stateTitle}>No camera found. Type the barcode instead.</Text>
            <Text style={styles.message}>
              {cameraError.includes('No camera') ? cameraError : `Camera issue: ${cameraError}`}
            </Text>
            <ManualBarcodeForm
              value={manualBarcode}
              onChangeText={setManualBarcode}
              onSubmit={() => handleManualSubmit()}
              autoFocus
              lightTheme
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Return to food log"
              onPress={handleExit}
              style={styles.exitLink}
            >
              <Text style={styles.exitLinkText}>Return to food log</Text>
            </Pressable>
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
          {showManual ? (
            <View style={styles.activeManualCard}>
              <View style={styles.activeManualHeader}>
                <Text style={styles.activeManualTitle}>Type barcode digits</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close manual barcode input"
                  onPress={() => setShowManual(false)}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={20} color={colors.text} />
                </Pressable>
              </View>
              <ManualBarcodeForm
                value={manualBarcode}
                onChangeText={setManualBarcode}
                onSubmit={() => handleManualSubmit()}
                autoFocus
                lightTheme
              />
            </View>
          ) : (
            <View style={styles.activeActionRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Switch between front and back camera"
                style={({ pressed }) => [styles.button, pressed && styles.pressed]}
                onPress={toggleCameraFacing}
              >
                <Ionicons name="camera-reverse-outline" size={20} color={colors.text} />
                <Text style={styles.buttonText}>Flip camera</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Type barcode number manually"
                style={({ pressed }) => [styles.button, pressed && styles.pressed]}
                onPress={() => {
                  triggerSelectionHaptic();
                  setShowManual(true);
                }}
              >
                <Ionicons name="keypad-outline" size={20} color={colors.text} />
                <Text style={styles.buttonText}>Type barcode</Text>
              </Pressable>
            </View>
          )}
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
      marginTop: spacing.xs,
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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 3,
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
      width: '100%',
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
    },
    activeActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
    },
    button: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: c.surfaceMuted,
      borderWidth: 1,
      borderColor: c.borderStrong,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minWidth: 140,
      borderRadius: borderRadius.pill,
    },
    buttonText: {
      color: c.text,
      ...typography.label,
    },
    activeManualCard: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: c.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    activeManualHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    activeManualTitle: {
      ...typography.headline,
      color: c.text,
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
    exitLink: {
      marginTop: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    exitLinkText: {
      ...typography.label,
      color: c.brand,
    },
    pressed: {
      opacity: 0.72,
    },
  });
