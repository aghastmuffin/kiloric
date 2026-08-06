import { MotionView } from '@/components/MotionView'
import { useTheme } from '@/lib/theme/ThemeContext'
import { StyleSheet } from 'react-native'

type SkeletonBlockProps = {
  width?: number | `${number}%`
  height?: number
  borderRadius?: number
  style?: object
}

export function SkeletonBlock({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonBlockProps) {
  const { colors } = useTheme()
  return (
    <MotionView
      from={{ opacity: 0.3 }}
      animate={{ opacity: 0.8 }}
      transition={{
        type: 'timing',
        duration: 800,
        loop: true,
      }}
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.border,
        },
        style,
      ]}
    />
  )
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
})
