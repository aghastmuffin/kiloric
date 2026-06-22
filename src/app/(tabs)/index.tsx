import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function AboutScreen() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.container}>
      <Text style={styles.text} >Welcome to CalCount</Text>
      <Text style={styles.text} onPress={() => router.push('/credits')}>
        Credits
      </Text>
      <Text style={styles.text} onPress={() => router.push('/scan')}>
        Scan
      </Text>
      <Text style={styles.text} onPress={() => router.push('/text_query')}>
        Text Query
      </Text>
      
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
