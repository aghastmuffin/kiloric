import { useAuth } from '@/lib/AuthContext';
import { getProfile, isProfileComplete } from '@/lib/profile';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { useRouter } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export let hasSkippedSignIn = false;
export const setHasSkippedSignIn = (val: boolean) => { hasSkippedSignIn = val; };

export function ProfileGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.$id) {
      setCheckingProfile(false);
      if (!hasSkippedSignIn) {
        router.replace('/signin');
      }
      return;
    }

    let active = true;
    setCheckingProfile(true);

    getProfile(user.$id)
      .then((profile) => {
        if (!active) return;
        if (!isProfileComplete(profile)) {
          router.replace('/onboarding');
        }
      })
      .finally(() => {
        if (active) setCheckingProfile(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, router, user?.$id]);

  if (authLoading || checkingProfile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.mutedText}>Loading account…</Text>
      </View>
    );
  }

  return children;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.background,
    gap: 12,
  },
  mutedText: {
    color: c.textMuted,
  },
});
