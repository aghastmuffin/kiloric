import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { View, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';

export default function NotFoundScreen() {
  const styles = useThemedStyles(makeStyles);
  return (
    <>
      <Stack.Screen options={{ title: 'Page Not Found' }} />
      <View style={styles.container}>
        <Link href="/" style={styles.button}>
          Return to dashboard
        </Link>
      </View>
    </>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
    justifyContent: 'center',
    alignItems: 'center',
  },

  button: {
    ...typography.label,
    color: c.onBrand,
    backgroundColor: c.brand,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
});
