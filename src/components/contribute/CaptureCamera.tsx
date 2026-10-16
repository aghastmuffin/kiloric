import { Txt, UButton } from '@/components/ds'
import { triggerImpactHaptic } from '@/lib/haptics'
import type { ImageSource } from '@/lib/imageUpload'
import { usePalette } from '@/lib/theme/palette'
import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions, type BarcodeType } from 'expo-camera'
import { useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'

export type CaptureGuide = 'barcode' | 'portrait' | 'landscape'

const PRODUCT_BARCODES: BarcodeType[] = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'itf14']

const GUIDE_BOX: Record<CaptureGuide, { width: `${number}%`; aspectRatio: number }> = {
  barcode: { width: '78%', aspectRatio: 2 },
  portrait: { width: '72%', aspectRatio: 0.78 },
  landscape: { width: '86%', aspectRatio: 1.25 },
}

export function CaptureCamera({
  guide,
  hint,
  height,
  fileName,
  scanBarcodes,
  onCapture,
  onBarcode,
}: {
  guide: CaptureGuide
  hint: string
  height: number
  fileName: string
  scanBarcodes?: boolean
  onCapture: (photo: ImageSource) => void
  onBarcode?: (code: string) => void
}) {
  const c = usePalette()
  const camera = useRef<CameraView>(null)
  const scanned = useRef(false)
  const [permission, requestPermission] = useCameraPermissions()
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [mountError, setMountError] = useState<string | null>(null)

  async function capture() {
    if (!camera.current || !ready || busy) return
    setBusy(true)
    triggerImpactHaptic()
    try {
      const picture = await camera.current.takePictureAsync({ quality: 0.8, shutterSound: false })
      onCapture({ uri: picture.uri, mimeType: 'image/jpeg', fileName })
    } catch (error) {
      setMountError(error instanceof Error ? error.message : 'Could not take the photo.')
    } finally {
      setBusy(false)
    }
  }

  function handleBarcode({ data }: { data: string }) {
    const code = data.trim()
    if (!code || scanned.current) return
    scanned.current = true
    onBarcode?.(code)
    void capture()
  }

  const frame = [styles.frame, { height, backgroundColor: c.inverse }]

  if (!permission) {
    return (
      <View style={[frame, styles.center]}>
        <ActivityIndicator color={c.onInverse} />
      </View>
    )
  }

  if (!permission.granted || mountError) {
    const canAsk = !mountError && permission.canAskAgain
    return (
      <View style={[frame, styles.center, styles.blocked]} testID="camera-blocked">
        <Ionicons name="camera-outline" size={34} color={c.onInverse} />
        <Txt variant="subheading" color={c.onInverse} align="center">
          {mountError ? 'The camera isn’t available' : 'Camera access is off'}
        </Txt>
        <Txt variant="caption" color={c.onInverse} align="center" style={styles.blockedCopy}>
          {canAsk
            ? 'Allow the camera to snap this photo here, or choose one you already have.'
            : 'You can still choose a photo from your library or files below.'}
        </Txt>
        {canAsk ? <UButton label="Allow camera" tone="mint" size="sm" onPress={() => void requestPermission()} testID="allow-camera" /> : null}
      </View>
    )
  }

  const box = GUIDE_BOX[guide]
  return (
    <View style={frame} testID="capture-camera">
      <CameraView
        ref={camera}
        style={StyleSheet.absoluteFill}
        facing="back"
        onCameraReady={() => setReady(true)}
        onMountError={(event) => setMountError(event.message)}
        barcodeScannerSettings={scanBarcodes ? { barcodeTypes: PRODUCT_BARCODES } : undefined}
        onBarcodeScanned={scanBarcodes && onBarcode ? handleBarcode : undefined}
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
        <View style={[styles.guide, { width: box.width, aspectRatio: box.aspectRatio }]}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
        </View>
      </View>
      <View pointerEvents="none" style={styles.hint}>
        <View style={styles.hintPill}>
          <Txt variant="caption" color="#FFFFFF" align="center">
            {hint}
          </Txt>
        </View>
      </View>
      <View style={styles.shutterRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take photo"
          accessibilityState={{ disabled: !ready || busy }}
          disabled={!ready || busy}
          onPress={() => void capture()}
          testID="shutter"
          style={({ pressed }) => [styles.shutter, { opacity: !ready ? 0.5 : pressed ? 0.8 : 1 }]}
        >
          <View style={[styles.shutterInner, { backgroundColor: busy ? c.mintStrong : '#FFFFFF' }]} />
        </Pressable>
      </View>
    </View>
  )
}

const CORNER = 26
const styles = StyleSheet.create({
  frame: { width: '100%', borderRadius: 28, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  blocked: { gap: 10, padding: 28 },
  blockedCopy: { opacity: 0.85, maxWidth: 320 },
  guide: { maxHeight: '70%' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#FFFFFF' },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },
  hint: { position: 'absolute', top: 16, left: 16, right: 16, alignItems: 'center' },
  hintPill: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  shutterRow: { position: 'absolute', bottom: 20, left: 0, right: 0, alignItems: 'center' },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29 },
})
