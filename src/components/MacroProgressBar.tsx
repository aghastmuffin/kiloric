import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/lib/theme/ThemeContext';
import { panelTiming } from '@/lib/motion';

type MacroProgressBarProps = {
  progress: number; // 0 to 1
  gradientColors: [string, string];
}

export function MacroProgressBar({ progress, gradientColors }: MacroProgressBarProps) {
  const { colors } = useTheme();
  const gradId = `grad-${gradientColors[0].replace('#', '')}-${gradientColors[1].replace('#', '')}`;
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, panelTiming);
  }, [progress, animatedProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedProgress.value * 100}%`,
    };
  });

  return (
    <View style={[styles.track, { backgroundColor: colors.progressTrail }]}>
      <Animated.View style={[styles.fill, animatedStyle]}>
        <Svg width="100%" height={8}>
          <Defs>
            <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={gradientColors[0]} />
              <Stop offset="100%" stopColor={gradientColors[1]} />
            </LinearGradient>
          </Defs>
          <Rect
            x={0}
            y={0}
            width="100%"
            height={8}
            rx={4}
            ry={4}
            fill={`url(#${gradId})`}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
});
