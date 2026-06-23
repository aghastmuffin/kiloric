import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { useRouter } from 'expo-router';
import {Pressable, StyleSheet, Text, View} from 'react-native';

export default function AboutScreen() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.container}>
      <Text style={styles.text} >Welcome to CalCount</Text>
        <Pressable onPress={() => router.push('/scan')}>
      <Text style={styles.text} >
        Scan
      </Text>
        </Pressable>
        <Pressable onPress={() => router.push('/text_query')}>
      <Text style={styles.text}>
        Text Query
      </Text>
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
