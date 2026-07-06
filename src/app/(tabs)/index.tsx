import RadialGauge from "@/components/Gague";
import { useAuth } from "@/lib/AuthContext";
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { useRouter } from 'expo-router'; // Removed unused 'useTheme'
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function Dial() {
    // 1. Move hook inside the component
    const { user } = useAuth();
    const [currentValue, setCurrentValue] = useState(0);

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
        backgroundColor: "#FFFDD0",
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