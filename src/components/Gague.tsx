import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedProps,
    useSharedValue,
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
    backgroundColor?: string;
    textColor?: string;
    mutedColor?: string;
}

export default function RadialGauge({
                                        value,
                                        max = 100,
                                        size = 200,
                                        strokeWidth = 20,
                                        color = '#3498db',
                                        backgroundColor = '#ecf0f1',
                                        textColor = '#2c3e50',
                                        mutedColor = '#7f8c8d',
                                    }: RadialGaugeProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * Math.PI; // Half-circle

    const animatedValue = useSharedValue(0);

    useEffect(() => {
        animatedValue.value = withTiming(value, {
            duration: 1000,
            easing: Easing.out(Easing.ease),
        });
    }, [animatedValue, value]);

    const animatedProps = useAnimatedProps(() => {
        const percentage = Math.max(0, Math.min(animatedValue.value, max)) / max;
        const strokeDashoffset = circumference - circumference * percentage;
        return { strokeDashoffset };
    });

    const center = size / 2;

    return (
        <View
            style={[styles.container, { width: size, height: size / 2 }]}
            accessible={true}
            accessibilityLabel={`Calorie progress: ${Math.round(value)} out of ${max} calories`}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max, now: Math.round(value) }}
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
                        stroke={color}
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
                <Text style={[styles.valueText, { color: textColor }]}>{Math.round(value)}</Text>
                <Text style={[styles.maxText, { color: mutedColor }]}>/ {max} kcal</Text>
            </View>
        </View>
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
        color: '#2c3e50',
    },
    maxText: {
        fontSize: 14,
        color: '#7f8c8d',
    },
});