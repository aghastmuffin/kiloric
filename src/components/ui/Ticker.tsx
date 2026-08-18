import { useTheme } from '@/lib/theme/ThemeContext'
import { revealTiming } from '@/lib/motion'
import { Ionicons } from '@expo/vector-icons'
import { memo, useEffect, useRef, useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated'

const ANIMATION_DURATION = 6000
const REVEAL_DURATION = 400

type TickerItem = {
  text: string
  icon?: keyof typeof Ionicons.glyphMap
  color?: string
}

type TickerProps = {
  items: TickerItem[]
  style?: object
}

const AnimatedView = Animated.createAnimatedComponent(View)

const TickerItemRow = memo(function TickerItemRow({
  item,
  index,
  colors,
}: {
  item: TickerItem
  index: number
  colors: ReturnType<typeof useTheme>['colors']
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100 + index * 80)
    return () => clearTimeout(timer)
  }, [index])

  if (!visible) return null

  return (
    <View style={styles.itemRow}>
      {item.icon && (
        <Ionicons name={item.icon} size={12} color={item.color ?? colors.success} />
      )}
      <Text style={[styles.itemText, item.color && { color: item.color }]}>
        {item.text}
      </Text>
    </View>
  )
})

export const Ticker = memo(function Ticker({ items, style }: TickerProps) {
  const { colors } = useTheme()
  const progress = useSharedValue(0)
  const [animating, setAnimating] = useState(true)

  useEffect(() => {
    progress.value = withTiming(1, { duration: ANIMATION_DURATION }, (finished) => {
      if (finished) {
        progress.value = 0
        setAnimating(false)
      }
    })
    return () => cancelAnimation(progress)
  }, [progress])

  const containerStyle = useAnimatedStyle(() => ({
    opacity: animating ? 1 : 0,
  }))

  return (
    <AnimatedView style={[styles.container, style, containerStyle]}>
      {items.map((item, index) => (
        <TickerItemRow key={item.text} item={item} index={index} colors={colors} />
      ))}
    </AnimatedView>
  )
})

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 16,
    backgroundColor: 'transparent',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemText: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#6B6966',
  },
})