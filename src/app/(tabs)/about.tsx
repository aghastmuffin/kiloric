import { useAuth } from '@/lib/AuthContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { spacing } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function AboutScreen() {
  const { user } = useAuth();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.container}>
      {user ? (
        <Text style={styles.text}>Logged in as {user.email}</Text>
      ) : (
        <View>
          <Text style={styles.text}>Not logged in</Text>
          <Link href="/account" style={styles.link}>Login</Link>
        </View>
      )}
      <Link href="/privacy-policy" style={styles.link}>Privacy Policy</Link>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    ...typography.body,
    color: c.text,
  },
  link: {
    ...typography.label,
    color: c.brand,
    minHeight: 44,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
});
