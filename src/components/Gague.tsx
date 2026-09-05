import { celebrationSpring } from '@/lib/motion';
import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G as NativeG } from 'react-native-svg';

// Safely fall back to standard HTML 'g' string component if running on web
const G = Platform.OS === 'web' ? 'g' : NativeG;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RadialGaugeProps {
    value: number;
    max?: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
    /** Stroke color override when progress reaches 100% */
    successColor?: string;
    backgroundColor?: string;
    textColor?: string;
    mutedColor?: string;
    label?: string;
    unit?: string;
}

export default function RadialGauge({
                                        value,
                                        max = 2000,
                                        size = 200,
                                        strokeWidth = 20,
                                        color = '#3498db',
                                        successColor,
                                        backgroundColor = '#ecf0f1',
                                        textColor = '#2c3e50',
                                        mutedColor = '#7f8c8d',
                                        label = 'Calorie progress',
                                        unit = 'kcal',
                                    }: RadialGaugeProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * Math.PI; // Half-circle
    const progress = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
    const complete = progress >= 1;
    const activeColor = complete && successColor ? successColor : color;

    const animatedValue = useSharedValue(0);
    const scaleValue = useSharedValue(1);
    const prevComplete = useRef(complete);

    useEffect(() => {
        animatedValue.value = withTiming(value, {
            duration: 1000,
            easing: Easing.out(Easing.ease),
        });
    }, [animatedValue, value]);

    useEffect(() => {
        if (complete && !prevComplete.current) {
            scaleValue.value = withSpring(1.06, celebrationSpring, (finished) => {
                if (finished) {
                    scaleValue.value = withSpring(1, celebrationSpring);
                }
            });
        }
        prevComplete.current = complete;
    }, [complete, scaleValue]);

    const animatedProps = useAnimatedProps(() => {
        const percentage = Math.max(0, Math.min(animatedValue.value, max)) / max;
        const strokeDashoffset = circumference - circumference * percentage;
        return { strokeDashoffset };
    });

    const animatedContainerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scaleValue.value }],
    }));

    const center = size / 2;
    const roundedValue = Math.round(value);
    const accessibilityText = `${label}: ${roundedValue} out of ${max} ${unit}`;

    return (
        <Animated.View
            style={[styles.container, { width: size, height: size / 2 }, animatedContainerStyle]}
            accessible={true}
            accessibilityLabel={accessibilityText}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max, now: roundedValue }}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={roundedValue}
            aria-valuetext={accessibilityText}
        >
            <Svg width={size} height={size / 2}>
                {/* Using modern cross-platform transform attributes:
                  Web uses standard SVG string transforms; Native uses individual properties.
                */}
                <G 
                    {...(Platform.OS === 'web' 
                        ? { transform: `rotate(-180 ${center} ${center})` } 
                        : { rotation: -180, originX: center, originY: center }
                    )}
                >
                    {/* Background Arc */}
                    <Circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke={backgroundColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        fill="transparent"
                        strokeLinecap="round"
                    />
                    {/* Foreground Value Arc */}
                    <AnimatedCircle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke={activeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        fill="transparent"
                        strokeLinecap="round"
                        animatedProps={animatedProps}
                    />
                </G>
            </Svg>
            {/* Center Value Text */}
            <View style={styles.textContainer}>
                <Text style={[styles.valueText, { color: textColor }]}>{roundedValue}</Text>
                <Text style={[styles.maxText, { color: mutedColor }]}>/ {max} {unit}</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    valueText: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    maxText: {
        fontSize: 14,
    },
});
