import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedProps,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RadialGaugeProps {
    value: number;
    max?: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
    backgroundColor?: string;
}

export default function RadialGauge({
                                        value,
                                        max = 100,
                                        size = 200,
                                        strokeWidth = 20,
                                        color = '#3498db',
                                        backgroundColor = '#ecf0f1',
                                    }: RadialGaugeProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * Math.PI; // Half-circle

    const animatedValue = useSharedValue(0);

    useEffect(() => {
        animatedValue.value = withTiming(value, {
            duration: 1000,
            easing: Easing.out(Easing.ease),
        });
    }, [value]);

    const animatedProps = useAnimatedProps(() => {
        const percentage = Math.max(0, Math.min(animatedValue.value, max)) / max;
        const strokeDashoffset = circumference - circumference * percentage;
        return { strokeDashoffset };
    });

    return (
        <View style={[styles.container, { width: size, height: size / 2 }]}>
            <Svg width={size} height={size / 2}>
                <G rotation="-180" origin={`${size / 2}, ${size / 2}`}>
                    {/* Background Arc */}
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={backgroundColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        fill="transparent"
                        strokeLinecap="round"
                    />
                    {/* Foreground Value Arc */}
                    <AnimatedCircle
                        cx={size / 2}
                        cy={size / 2}
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
                <Text style={styles.valueText}>{Math.round(value)}</Text>
                <Text style={styles.maxText}>/ {max}</Text>
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
