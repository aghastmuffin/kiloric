import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { useRouter } from 'expo-router'; // Removed unused 'useTheme'
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ImageViewer from "@/components/ImageViewer";
import RadialGauge from "@/components/Gague";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";

export function Dial() {
    // 1. Move hook inside the component
    const { user } = useAuth();
    const [currentValue, setCurrentValue] = useState(50);

    return (
        <View>
            {/* Now 'user' will be correctly populated from context */}
            {user?.$id ? (
                <RadialGauge value={currentValue} max={100} />
            ) : null}
        </View>
    );
}

export default function AboutScreen() {
    const router = useRouter();
    const styles = useThemedStyles(makeStyles);
    const PlaceholderImage = require('../../../assets/images/dark.svg');

    return (
        <View style={styles.container}>
            <Dial />
            <View style={{ justifyContent: 'center', alignItems: 'center', paddingVertical: 24 }}>
                <ImageViewer
                    imgSource={PlaceholderImage}
                    style={{ width: 260, height: 260, borderRadius: 18 }}
                />
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
    text: {
        color: c.accent,
        fontSize: 16,
        paddingVertical: 6,
    },
});