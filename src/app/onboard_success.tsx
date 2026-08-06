import { MotionView } from '@/components/MotionView';
import { useTheme } from '@/lib/theme/ThemeContext';
import { typography } from '@/lib/theme/typography';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MILESTONES = [
  { icon: 'nutrition-outline' as const, label: 'Personal targets' },
  { icon: 'analytics-outline' as const, label: 'Daily guidance' },
  { icon: 'sparkles-outline' as const, label: 'Progress rhythm' },
];

export default function OnboardingSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, onboardingColors } = useTheme();
  const orbit = useSharedValue(0);

  useEffect(() => {
    orbit.value = withDelay(
      500,
      withRepeat(
        withTiming(1, { duration: 10000, easing: Easing.linear }),
        -1,
        false,
      ),
    );
  }, [orbit]);

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbit.value * 360}deg` }],
  }));

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: onboardingColors.background,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={[styles.rail, styles.railTop, { backgroundColor: onboardingColors.accentMuted }]} />
      <View style={[styles.rail, styles.railBottom, { backgroundColor: onboardingColors.accent }]} />

      <MotionView
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500 }}
        style={styles.brandRow}
      >
        <View style={[styles.brandMark, { backgroundColor: onboardingColors.accent }]}>
          <Text style={[styles.brandLetter, { color: colors.onAccent }]}>V</Text>
        </View>
        <Text style={[styles.brand, { color: onboardingColors.text }]}>VITALITY</Text>
        <Text style={[styles.issue, { color: onboardingColors.textMuted }]}>PLAN 01</Text>
      </MotionView>

      <View style={styles.hero}>
        <View style={styles.celebration}>
          <MotionView
            from={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 16, delay: 180 }}
            style={[
              styles.outerRoundel,
              {
                borderColor: onboardingColors.accentMuted,
                backgroundColor: onboardingColors.surface,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.orbit,
                { borderColor: onboardingColors.borderSelected },
                orbitStyle,
              ]}
            >
              <View style={[styles.orbitDot, { backgroundColor: onboardingColors.accent }]} />
            </Animated.View>
            <View style={[styles.innerRoundel, { backgroundColor: onboardingColors.accent }]}>
              <Ionicons name="checkmark" size={48} color={colors.onAccent} />
            </View>
          </MotionView>
          <MotionView
            from={{ width: 0 }}
            animate={{ width: 124 }}
            transition={{ type: 'timing', duration: 650, delay: 400 }}
            style={[styles.signalLine, { backgroundColor: onboardingColors.accentMuted }]}
          />
        </View>

        <MotionView
          from={{ opacity: 0, translateY: 18 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, delay: 320 }}
        >
          <Text style={[styles.kicker, { color: onboardingColors.accentMuted }]}>YOUR PLAN IS READY</Text>
          <Text style={[styles.title, { color: onboardingColors.text }]}>
            Everything in{'\n'}good measure.
          </Text>
          <Text style={[styles.subtitle, { color: onboardingColors.textMuted }]}>
            Your personal nutrition plan is set. Begin with one meal, then let consistency
            do the rest.
          </Text>
        </MotionView>

        <View style={[styles.milestoneCard, { backgroundColor: onboardingColors.card, borderColor: onboardingColors.border }]}>
          {MILESTONES.map((item, index) => (
            <MotionView
              key={item.label}
              from={{ opacity: 0, translateX: -10 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'timing', duration: 350, delay: 560 + index * 90 }}
              style={[styles.milestone, index > 0 && { borderLeftColor: onboardingColors.border }]}
            >
              <Ionicons name={item.icon} size={20} color={onboardingColors.accent} />
              <Text style={[styles.milestoneLabel, { color: onboardingColors.text }]}>{item.label}</Text>
            </MotionView>
          ))}
        </View>
      </View>

      <MotionView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 450, delay: 820 }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/(tabs)')}
          style={({ pressed }) => [
            styles.continueButton,
            { backgroundColor: onboardingColors.accent },
            pressed && styles.continueButtonPressed,
          ]}
        >
          <Text style={[styles.continueButtonText, { color: colors.onAccent }]}>Enter Vitality</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.onAccent} />
        </Pressable>
        <Text style={[styles.footerNote, { color: onboardingColors.textMuted }]}>
          YOUR DASHBOARD · READY FOR TODAY
        </Text>
      </MotionView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  rail: {
    position: 'absolute',
    width: 2,
    borderRadius: 2,
    opacity: 0.35,
  },
  railTop: {
    height: 180,
    right: 38,
    top: -22,
    transform: [{ rotate: '24deg' }],
  },
  railBottom: {
    height: 220,
    left: 18,
    bottom: -80,
    transform: [{ rotate: '24deg' }],
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLetter: {
    ...typography.label,
    fontWeight: '700',
  },
  brand: {
    ...typography.label,
    marginLeft: 10,
    letterSpacing: 1.6,
  },
  issue: {
    ...typography.labelSmall,
    marginLeft: 'auto',
  },
  hero: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  celebration: {
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  outerRoundel: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbit: {
    position: 'absolute',
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 1,
  },
  orbitDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    left: 7,
    top: 8,
  },
  innerRoundel: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalLine: {
    height: 3,
    marginTop: 12,
  },
  kicker: {
    ...typography.labelSmall,
    marginBottom: 8,
    letterSpacing: 1.2,
  },
  title: {
    ...typography.display,
    fontSize: 46,
    lineHeight: 50,
  },
  subtitle: {
    ...typography.body,
    maxWidth: 460,
    marginTop: 14,
  },
  milestoneCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 24,
    overflow: 'hidden',
  },
  milestone: {
    flex: 1,
    minHeight: 84,
    paddingHorizontal: 10,
    paddingVertical: 14,
    justifyContent: 'space-between',
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  milestoneLabel: {
    ...typography.labelSmall,
    marginTop: 8,
  },
  continueButton: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    minHeight: 56,
    borderRadius: 8,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  continueButtonPressed: {
    opacity: 0.88,
    transform: [{ translateY: 1 }],
  },
  continueButtonText: {
    ...typography.label,
    fontSize: 16,
  },
  footerNote: {
    ...typography.labelSmall,
    textAlign: 'center',
    marginTop: 12,
  },
});
