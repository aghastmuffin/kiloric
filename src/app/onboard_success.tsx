import { useTheme } from '@/lib/theme/ThemeContext';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// --- Configuration Constants ---
const NUM_BUILDINGS = Math.ceil(width / 35); 
const NUM_GLOBAL_WINDS = 14; 
const NUM_BURGER_WINDS = 8;  

const random = (min: number, max: number) => Math.random() * (max - min) + min;

// --- Interfaces ---
interface BuildingData {
  id: number;
  height: number;
  width: number;
}

interface WindData {
  id: string;
  left: number;
  topOffset: number;
  height: number;
  speedMultiplier: number;
}

// --- Isolated Sub-Components (Safely handling Hooks) ---

const Building = ({ h, w }: { h: number; w: number }) => {
  const rows = Math.floor(h / 16);
  const windows = Array.from({ length: rows * 2 }).map((_, i) => ({
    top: random(8, h - 12),
    left: random(4, w - 8),
  }));

  return (
    <View style={[styles.building, { height: h, width: w }]}>
      {windows.map((win, i) => (
        <View key={i} style={[styles.window, { top: win.top, left: win.left }]} />
      ))}
    </View>
  );
};

// Moving the loop animation logic inside this component fixes the React Hook violation!
const WindLine = ({ wind, progress, baseOpacity, extraWidth = 0, isCore = false }: { 
  wind: WindData; 
  progress: Animated.SharedValue<number>; 
  baseOpacity: Animated.SharedValue<number>;
  extraWidth?: number;
  isCore?: boolean;
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const currentY = ((wind.topOffset + progress.value * height * wind.speedMultiplier) % height) - 150;
    return {
      opacity: isCore ? baseOpacity.value * 1.4 : baseOpacity.value,
      transform: [{ translateY: currentY }],
    };
  });

  return (
    <Animated.View 
      style={[
        styles.windLine, 
        { 
          left: wind.left, 
          height: wind.height, 
          width: 2 + extraWidth,
          backgroundColor: isCore ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.35)'
        }, 
        animatedStyle
      ]} 
    />
  );
};

// --- Main Component ---
export default function OnboardingAnimation() {
  const router = useRouter();
  const { colors, onboardingColors } = useTheme();
  // Animation Nodes
  const burgerY = useSharedValue(0);
  const burgerScale = useSharedValue(1);
  const buildingY = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  
  const windProgress = useSharedValue(0);
  const windOpacity = useSharedValue(0);

  // Strictly typed states
  const [skyline, setSkyline] = useState<BuildingData[]>([]);
  const [globalWinds, setGlobalWinds] = useState<WindData[]>([]);
  const [burgerWinds, setBurgerWinds] = useState<WindData[]>([]);

  useEffect(() => {
    // Generate Skyline layout
    setSkyline(
      Array.from({ length: NUM_BUILDINGS }).map((_, i) => ({
        id: i,
        height: random(110, 260),
        width: random(28, 42),
      }))
    );

    // Global background winds
    setGlobalWinds(
      Array.from({ length: NUM_GLOBAL_WINDS }).map((_, i) => ({
        id: `g-${i}`,
        left: random(0, width),
        topOffset: random(0, height),
        height: random(70, 140),
        speedMultiplier: random(0.8, 1.3),
      }))
    );

    // Dynamic core winds (Concentrated around burger corridor)
    setBurgerWinds(
      Array.from({ length: NUM_BURGER_WINDS }).map((_, i) => ({
        id: `b-${i}`,
        left: random(width * 0.5 - 45, width * 0.5 + 45),
        topOffset: random(0, height * 0.5),
        height: random(90, 160),
        speedMultiplier: random(1.2, 1.6),
      }))
    );

    // Orchestrate Timelines
    burgerScale.value = withSequence(
      withTiming(0.85, { duration: 200, easing: Easing.ease }),
      withTiming(1.1, { duration: 150, easing: Easing.linear })
    );

    burgerY.value = withDelay(200, 
      withTiming(-height * 0.45, { duration: 1000, easing: Easing.out(Easing.quad) })
    );
    
    buildingY.value = withDelay(250, 
      withTiming(height * 0.55, { duration: 900, easing: Easing.in(Easing.quad) })
    );

    // Wind Streamer Loops
    windOpacity.value = withDelay(500, withTiming(0.35, { duration: 300 }));
    windProgress.value = withDelay(500, 
      withRepeat(
        withTiming(1, { duration: 500, easing: Easing.linear }),
        -1,
        false
      )
    );

    textOpacity.value = withDelay(1100, withTiming(1, { duration: 800 }));
  }, []);

  // Main UI Layer Animated Styles
  const burgerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: burgerY.value }, { scale: burgerScale.value }],
  }));

  const buildingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: buildingY.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* 1. Global Wind Layer */}
      {globalWinds.map((wind) => (
        <WindLine 
          key={wind.id} 
          wind={wind} 
          progress={windProgress} 
          baseOpacity={windOpacity} 
        />
      ))}

      {/* 2. Concentrated Core Wind Layer */}
      {burgerWinds.map((wind) => (
        <WindLine 
          key={wind.id} 
          wind={wind} 
          progress={windProgress} 
          baseOpacity={windOpacity} 
          extraWidth={1} 
          isCore={true}
        />
      ))}

      {/* 3. Hero Burger */}
      <Animated.View style={[styles.burgerContainer, burgerStyle]}>
        <Text style={styles.burgerEmoji}>🍔</Text>
      </Animated.View>

      {/* 4. Falling Silhouette Skyline */}
      <Animated.View style={[styles.citySilhouette, buildingStyle]}>
        {skyline.map((b) => (
          <Building key={b.id} h={b.height} w={b.width} />
        ))}
      </Animated.View>

      {/* 5. Typography Display */}
      <Animated.View style={[styles.textContainer, textStyle]}>
        <Text style={[styles.title, { color: colors.text }]}>You&apos;re all set!</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Your personalized calorie and macro plan is ready.
        </Text>
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          style={({ pressed }) => [
            styles.continueButton,
            { backgroundColor: onboardingColors.accent },
            pressed && styles.continueButtonPressed,
          ]}
        >
          <Text style={[styles.continueButtonText, { color: colors.onAccent }]}>
            Start tracking
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  burgerContainer: {
    position: 'absolute',
    bottom: height * 0.12,
    zIndex: 15,
  },
  burgerEmoji: {
    fontSize: 85,
  },
  citySilhouette: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
    justifyContent: 'center',
    zIndex: 10,
  },
  building: {
    backgroundColor: '#12131a',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    position: 'relative',
    marginHorizontal: 1.5,
  },
  window: {
    position: 'absolute',
    width: 2.5,
    height: 3.5,
    backgroundColor: 'rgba(255, 253, 230, 0.75)',
    borderRadius: 0.5,
  },
  windLine: {
    position: 'absolute',
    top: 0,
    borderRadius: 99,
    zIndex: 2,
  },
  textContainer: {
    position: 'absolute',
    top: '56%',
    alignItems: 'center',
    paddingHorizontal: 30,
    zIndex: 25,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 24,
  },
  continueButton: {
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    shadowColor: '#25c946',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 0,
    elevation: 4,
  },
  continueButtonPressed: {
    transform: [{ translateY: 2 }],
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  continueButtonText: {
    fontWeight: '700',
    fontSize: 16,
  },
});