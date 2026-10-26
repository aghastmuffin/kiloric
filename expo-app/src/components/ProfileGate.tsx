import { useAuth } from '@/lib/AuthContext';
import { isEligibleOnboardingAge } from '@/lib/ageEligibility';
import { isBarredResidency } from '@/lib/residency';
import { clearProfileCache, getProfile, isProfileComplete } from '@/lib/profile';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { UButton } from '@/components/ds/UButton';
import { useRouter } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export let hasSkippedSignIn = false;
export const setHasSkippedSignIn = (val: boolean) => { hasSkippedSignIn = val; };

export function ProfileGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCounter, setRetryCounter] = useState(0);

  const handleRetry = useCallback(() => {
    clearProfileCache();
    setLoadError(null);
    setCheckingProfile(true);
    setRetryCounter((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.$id) {
      setCheckingProfile(false);
      setLoadError(null);
      if (!hasSkippedSignIn) {
        router.replace('/signin');
      }
      return;
    }

    let active = true;
    setCheckingProfile(true);
    setLoadError(null);

    getProfile(user.$id)
      .then((profile) => {
        if (!active) return;
        if (!isProfileComplete(profile)) {
          router.replace('/onboarding');
          return;
        }
        const dateOfBirth = new Date(profile.dateOfBirth);
        if (Number.isNaN(dateOfBirth.getTime()) || !isEligibleOnboardingAge(dateOfBirth)) {
          router.replace('/onboarding');
          return;
        }
        if (isBarredResidency(profile.country)) {
          router.replace('/onboarding');
          return;
        }
        setCheckingProfile(false);
      })
      .catch((err) => {
        if (!active) return;
        setCheckingProfile(false);
        const message = err instanceof Error ? err.message : 'Couldn’t load your account.';
        setLoadError(message);
      });

    return () => {
      active = false;
    };
  }, [authLoading, retryCounter, router, user?.$id]);

  if (authLoading || checkingProfile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.mutedText}>Loading account…</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Couldn’t load your account</Text>
        <Text style={styles.errorSubtext}>{loadError}</Text>
        <UButton
          label="Retry"
          onPress={handleRetry}
          tone="primary"
          size="md"
        />
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
    paddingHorizontal: 24,
  },
  mutedText: {
    color: c.textMuted,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: c.text,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: c.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
});
