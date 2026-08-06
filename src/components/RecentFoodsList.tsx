import { authenticatedRequest } from '@/components/apiUtils'
import BarcodeDetailModal from '@/components/BarcodeDetailModal'
import { showApiError } from '@/lib/apiErrors'
import { useAuth } from '@/lib/AuthContext'
import {
  listRecentFoods,
  recentFoodsUserKey,
  type RecentFoodEntry,
} from '@/lib/recentFoods'
import { useTheme } from '@/lib/theme/ThemeContext'
import type { ThemeColors } from '@/lib/theme/tokens'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'

function formatRelativeTime(iso: string): string {
  const used = new Date(iso).getTime()
  if (!Number.isFinite(used)) return ''
  const diffMs = Date.now() - used
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function RecentRow({
  item,
  onPress,
}: {
  item: RecentFoodEntry
  onPress: (item: RecentFoodEntry) => void
}) {
  const styles = useThemedStyles(makeStyles)
  const { colors } = useTheme()

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`Re-open ${item.title}`}
    >
      <View style={styles.rowIcon}>
        <Ionicons
          name={item.barcode ? 'barcode-outline' : 'search-outline'}
          size={22}
          color={colors.accent}
        />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.rowMeta}>
          {item.kcal != null
            ? `${Math.round(item.kcal)} kcal`
            : item.barcode
              ? 'Scanned item'
              : 'Text search'}
          {' · '}
          {formatRelativeTime(item.usedAt)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  )
}

/** Recent searches/foods list with re-open behavior. Embedded in the Log screen. */
export function RecentFoodsList() {
  const { user } = useAuth()
  const router = useRouter()
  const styles = useThemedStyles(makeStyles)
  const { colors } = useTheme()
  const userKey = recentFoodsUserKey(user?.$id)

  const [items, setItems] = useState<RecentFoodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [modalBarcode, setModalBarcode] = useState<string | null>(null)
  const [modalData, setModalData] = useState<Record<string, unknown> | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await listRecentFoods(userKey))
    } finally {
      setLoading(false)
    }
  }, [userKey])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  const openBarcode = useCallback(async (barcode: string) => {
    setModalBarcode(barcode)
    setModalData(null)
    setModalError(null)
    setModalLoading(true)
    setModalVisible(true)

    try {
      const data = await authenticatedRequest(`/api/barcode/${encodeURIComponent(barcode)}`)
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('No product data returned.')
      }
      setModalData(data as Record<string, unknown>)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load product.'
      setModalError(message)
      showApiError(error, 'oracle')
    } finally {
      setModalLoading(false)
    }
  }, [])

  const handlePress = useCallback(
    async (item: RecentFoodEntry) => {
      if (opening) return
      setOpening(true)
      try {
        if (item.barcode) {
          await openBarcode(item.barcode)
          return
        }
        if (item.query) {
          setModalVisible(false)
          await AsyncStorage.setItem('saved_barcode', item.query)
          router.push('/(tabs)/logfood')
        }
      } catch (error) {
        showApiError(error, 'oracle')
      } finally {
        setOpening(false)
      }
    },
    [opening, openBarcode, router],
  )

  const closeModal = useCallback(() => {
    setModalVisible(false)
    setModalBarcode(null)
    setModalData(null)
    setModalError(null)
    void load()
  }, [load])

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Ionicons name="time-outline" size={16} color={colors.textMuted} />
        <Text style={styles.headerText}>Recents</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            Foods you search or scan will land here for one-tap repeats.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RecentRow item={item} onPress={handlePress} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <BarcodeDetailModal
        visible={modalVisible}
        barcode={modalBarcode}
        data={modalData}
        isLoading={modalLoading}
        error={modalError}
        onClose={closeModal}
        onMealAdded={load}
      />
    </View>
  )
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      alignSelf: 'stretch',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 4,
      paddingBottom: 8,
    },
    headerText: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.textMuted,
    },
    listContent: {
      paddingBottom: 24,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: colors.surface,
    },
    rowPressed: {
      opacity: 0.85,
    },
    rowIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    rowBody: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    rowMeta: {
      fontSize: 13,
      color: colors.textMuted,
    },
    separator: {
      height: 8,
    },
    centered: {
      paddingVertical: 24,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
  })
