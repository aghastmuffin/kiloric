import { useAuth } from '@/lib/AuthContext';
import type { ThemeColors } from '@/lib/theme/tokens';
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
          <Link href="/account">Login</Link>
        </View>
      )}
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
    color: c.text,
  },
});
