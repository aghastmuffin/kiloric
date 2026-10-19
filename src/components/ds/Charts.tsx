import { fonts, usePalette } from '@/lib/theme/palette'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg'

export function ProgressRing({
  progress,
  size = 160,
  stroke = 16,
  color,
  track,
  children,
  accessibilityLabel,
}: {
  progress: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  children?: ReactNode
  accessibilityLabel?: string
}) {
  const c = usePalette()
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0))
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={track ?? c.ringTrack} strokeWidth={stroke} fill="none" />
        {clamped > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color ?? c.primary}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - clamped)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  )
}

/** Horizontal bar; `base` is what's already counted, `extra` is drawn in full color on top. */
export function MacroBar({
  color,
  soft,
  base,
  extra = 0,
  height = 10,
  label,
}: {
  color: string
  soft: string
  base: number
  extra?: number
  height?: number
  label?: string
}) {
  const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
  const baseWidth = clamp(base)
  const extraWidth = clamp(base + extra) - baseWidth
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamp(base + extra) * 100) }}
      style={[styles.barTrack, { height, borderRadius: height / 2, backgroundColor: soft }]}
    >
      <View
        style={{
          width: `${baseWidth * 100}%`,
          backgroundColor: color,
          opacity: extra > 0 ? 0.45 : 1,
          borderTopLeftRadius: height / 2,
          borderBottomLeftRadius: height / 2,
          borderTopRightRadius: extra > 0 ? 0 : height / 2,
          borderBottomRightRadius: extra > 0 ? 0 : height / 2,
        }}
      />
      {extraWidth > 0 ? (
        <View
          style={{
            width: `${extraWidth * 100}%`,
            backgroundColor: color,
            borderTopRightRadius: height / 2,
            borderBottomRightRadius: height / 2,
            borderTopLeftRadius: baseWidth > 0 ? 0 : height / 2,
            borderBottomLeftRadius: baseWidth > 0 ? 0 : height / 2,
          }}
        />
      ) : null}
    </View>
  )
}

export function LineChart({
  values,
  labels,
  height = 150,
  accessibilityLabel,
}: {
  values: number[]
  labels: string[]
  height?: number
  accessibilityLabel: string
}) {
  const c = usePalette()
  const [width, setWidth] = useState(0)
  const pad = 8
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values.map((value, index) => ({
    x: values.length === 1 ? width / 2 : pad + (index / (values.length - 1)) * (width - pad * 2),
    y: pad + (1 - (value - min) / span) * (height - pad * 2 - 10) + 5,
  }))
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')
  const area = points.length > 1 ? `${line} L${points[points.length - 1].x},${height} L${points[0].x},${height} Z` : ''
  const last = points[points.length - 1]
  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <View style={{ height }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 && values.length > 0 ? (
          <Svg width={width} height={height}>
            <Line x1={0} x2={width} y1={height * 0.3} y2={height * 0.3} stroke={c.gridLine} strokeWidth={1} />
            <Line x1={0} x2={width} y1={height * 0.65} y2={height * 0.65} stroke={c.gridLine} strokeWidth={1} />
            {area ? <Path d={area} fill={c.mint} opacity={0.75} /> : null}
            {points.length > 1 ? <Path d={line} stroke={c.primary} strokeWidth={3} fill="none" strokeLinejoin="round" /> : null}
            {last ? <Circle cx={last.x} cy={last.y} r={6} fill={c.primary} stroke={c.card} strokeWidth={2.5} /> : null}
          </Svg>
        ) : null}
      </View>
      <View style={styles.axis}>
        {labels.map((label, index) => (
          <Text key={`${label}-${index}`} style={[styles.axisText, { color: c.inkMuted }]}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  )
}

export type BarDatum = { label: string; value: number; highlight?: boolean }

export function BarChart({
  data,
  goal,
  height = 130,
  accessibilityLabel,
}: {
  data: BarDatum[]
  goal: number
  height?: number
  accessibilityLabel: string
}) {
  const c = usePalette()
  const [width, setWidth] = useState(0)
  const max = Math.max(goal * 1.12, ...data.map((item) => item.value), 1)
  const gap = width > 500 ? 18 : 12
  const barWidth = data.length > 0 ? (width - gap * (data.length - 1)) / data.length : 0
  const goalY = height - (goal / max) * height
  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <View style={{ height }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {data.map((item, index) => {
              const barHeight = Math.max(item.value > 0 ? 6 : 0, (item.value / max) * height)
              const over = goal > 0 && item.value > goal * 1.05
              const fill = item.highlight ? c.mintStrong : over ? c.over : c.primary
              const x = index * (barWidth + gap)
              return (
                <Rect
                  key={`${item.label}-${index}`}
                  x={x}
                  y={height - barHeight}
                  width={barWidth}
                  height={barHeight}
                  rx={Math.min(8, barWidth / 4)}
                  fill={fill}
                />
              )
            })}
            {goal > 0 ? (
              <Line x1={0} x2={width} y1={goalY} y2={goalY} stroke={c.inkFaint} strokeWidth={1.5} strokeDasharray="5 5" />
            ) : null}
          </Svg>
        ) : null}
      </View>
      <View style={[styles.barLabels, { gap }]}>
        {data.map((item, index) => (
          <Text
            key={`${item.label}-${index}`}
            style={[
              styles.barLabel,
              { color: item.highlight ? c.ink : c.inkMuted, fontFamily: item.highlight ? fonts.bold : fonts.medium },
            ]}
          >
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  barTrack: { flexDirection: 'row', overflow: 'hidden', width: '100%' },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  axisText: { fontFamily: fonts.medium, fontSize: 13 },
  barLabels: { flexDirection: 'row', marginTop: 10 },
  barLabel: { flex: 1, textAlign: 'center', fontSize: 13 },
})
