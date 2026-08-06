import RadialGauge from "@/components/Gague";
import { useAuth } from "@/lib/AuthContext";
import { getTodayMeals } from "@/lib/meals";
import { getProfile } from "@/lib/profile";
import { triggerSelectionHaptic } from "@/lib/haptics";
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export function Dial() {
    const { user } = useAuth();
    const [currentValue, setCurrentValue] = useState(0);
    const [maxVal, setMaxVal] = useState(2000);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            if (!user?.$id) {
                setLoading(false);
                return;
            }
            let active = true;
            setLoading(true);

            Promise.all([
                getTodayMeals(user.$id),
                getProfile(user.$id)
            ]).then(([meals, profile]) => {
                if (!active) return;
                const totalKcal = meals.reduce((sum, meal) => sum + (meal.kcal || 0), 0);
                setCurrentValue(totalKcal);
                if (profile?.target_kcal) {
                    setMaxVal(profile.target_kcal);
                } else {
                    setMaxVal(2000);
                }
            }).catch((err) => {
                console.warn("[Dial] failed to fetch today's data:", err);
            }).finally(() => {
                if (active) setLoading(false);
            });

            return () => {
                active = false;
            };
        }, [user])
    );

    if (!user?.$id) return null;

    if (loading) {
        return (
            <View style={dialStyles.centered}>
                <ActivityIndicator size="small" color="#3498db" />
            </View>
        );
    }

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <RadialGauge value={currentValue} max={maxVal} />
        </View>
    );
}

const dialStyles = StyleSheet.create({
    centered: {
        height: 100,
        width: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default function AboutScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const styles = useThemedStyles(makeStyles);

    const handlePress = (path: "/cameraview" | "/(tabs)/logfood" | "/credits") => {
        triggerSelectionHaptic();
        router.push(path);
    };

    return (
        <View style={styles.container}>
            {user?.$id ? (
                <View style={styles.infoholder}>
                    <Dial />
                </View>
            ) : null}

            <Text style={styles.welcomeText}>Welcome to CalCount</Text>

            <View style={styles.buttonGroup}>
                <Pressable
                    onPress={() => handlePress('/cameraview')}
                    accessibilityRole="button"
                    accessibilityLabel="Scan barcode"
                    accessibilityHint="Opens camera to scan food barcodes and log nutrition automatically"
                    style={({ pressed }) => [
                        styles.button,
                        pressed && styles.buttonPressed
                    ]}
                >
                    <Ionicons name="barcode-outline" size={20} color="#ffd33d" />
                    <Text style={styles.buttonText}>Scan Barcode</Text>
                </Pressable>

                <Pressable
                    onPress={() => handlePress('/(tabs)/logfood')}
                    accessibilityRole="button"
                    accessibilityLabel="Search foods"
                    accessibilityHint="Search food database by name or search terms"
                    style={({ pressed }) => [
                        styles.button,
                        pressed && styles.buttonPressed
                    ]}
                >
                    <Ionicons name="search-outline" size={20} color="#ffd33d" />
                    <Text style={styles.buttonText}>Search Foods</Text>
                </Pressable>
            </View>

            <Pressable
                onPress={() => handlePress('/credits')}
                accessibilityRole="button"
                accessibilityLabel="Credits and easter eggs"
                accessibilityHint="Learn about the creators of CalCount"
                style={({ pressed }) => [
                    styles.creditsButton,
                    pressed && styles.creditsButtonPressed
                ]}
            >
                <Ionicons name="sparkles-outline" size={14} color="#ffd33d" style={{ marginRight: 4 }} />
                <Text style={styles.creditsText}>Credits</Text>
            </Pressable>
        </View>
    );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: c.background,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        gap: 16,
    },
    infoholder: {
        backgroundColor: c.surface,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: c.border,
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    welcomeText: {
        color: c.text,
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 12,
    },
    buttonGroup: {
        width: '100%',
        maxWidth: 280,
        gap: 12,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: c.surface,
        borderWidth: 1.5,
        borderColor: c.border,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 1,
    },
    buttonPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.98 }],
        borderColor: c.accent,
        backgroundColor: c.accentSoft,
    },
    buttonText: {
        color: c.text,
        fontSize: 16,
        fontWeight: '600',
    },
    creditsButton: {
        position: 'absolute',
        bottom: 24,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    creditsButtonPressed: {
        opacity: 0.6,
    },
    creditsText: {
        color: c.textMuted,
        fontSize: 14,
        textDecorationLine: 'underline',
    },
});
