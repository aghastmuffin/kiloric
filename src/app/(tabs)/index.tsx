import RadialGauge from "@/components/Gague";
import { useAuth } from "@/lib/AuthContext";
import { getTodayMeals } from "@/lib/meals";
import { getProfile } from "@/lib/profile";
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { useRouter, useFocusEffect } from 'expo-router'; // Removed unused 'useTheme'
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
    const router = useRouter();
    const styles = useThemedStyles(makeStyles);
    const PlaceholderImage = require('../../../assets/images/dark.svg');

    return (
        <View style={styles.container}>
            <View style={styles.infoholder}>
                <View style={styles.infoholderItem}>
                    <Dial />
                </View>
            </View>
            <Text style={styles.text}>Welcome to CalCount</Text>

            <Pressable onPress={() => router.push('/scan')}>
                <Text style={styles.text}>Scan</Text>
            </Pressable>

            <Pressable onPress={() => router.push('/text_query')}>
                <Text style={styles.text}>Text Query</Text>
            </Pressable>

            <Pressable
                style={{ position: 'absolute', right: 20, bottom: 20 }}
                onPress={() => router.push('/credits')}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="View credits"
                accessibilityHint="Opens the credits and contributors screen"
            >
                <Text style={styles.text}>Credits</Text>
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
    },
    infoholder: {
        display: 'flex',
        position: 'absolute',
        top: 0,
        marginLeft: 10,
        marginTop: 10,
        border: 1,
        borderColor: "#00000000",
        borderRadius: 10,
    },
    infoholderItem: {
        backgroundColor: c.surface,
        borderRadius: 10,
        marginBottom: 10,
        padding: 10,
    },
    text: {
        color: c.accent,
        fontSize: 16,
        paddingVertical: 6,
    },
});