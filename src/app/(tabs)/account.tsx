import { ApiBackendPreferencePicker } from '@/components/ApiBackendPreferencePicker';
import { AccountSignInFlow } from '@/components/auth/AccountSignInFlow';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ThemePreferencePicker } from '@/components/ThemePreferencePicker';
import { showApiError } from '@/lib/apiErrors';
import { useAuth } from '@/lib/AuthContext';
import { resolveGoalState } from '@/lib/goals';
import { triggerSelectionHaptic } from '@/lib/haptics';
import { getProfile, type ProfileDocument } from '@/lib/profile';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useAppLayout } from '@/lib/theme/layout';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import {
    formatWeightImperial,
    formatWeightMetric,
    parseDisplayUnitsPreference,
} from '@/lib/units';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import type { Models } from 'react-native-appwrite';
import Animated, {
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AppwriteUser = Models.User<Models.Preferences>;

export default function AccountScreen() {
  const { user, loading } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { gutter } = useAppLayout();
  if (loading) {
    return (
        <View
          accessible
          accessibilityLabel="Restoring account session"
          accessibilityState={{ busy: true }}
          style={styles.centered}
        >
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>Restoring session…</Text>
        </View>
    );
  }

  return (
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 20, paddingHorizontal: gutter }]}
        showsVerticalScrollIndicator={false}
      >
        {!user ? (
            <AccountSignInFlow />
        ) : (
            <LoggedInPanel user={user} />
        )}
        <Text style={styles.versionText}>
          Version {process.env.APP_VERSION ?? '1.0.0'}
          {process.env.APP_BUILD_NUMBER ? ` · build ${process.env.APP_BUILD_NUMBER}` : ''}
        </Text>
        <Pressable
          accessibilityRole="link"
          accessibilityHint="Opens the legal and privacy policy"
          onPress={() => router.push('/privacy-policy')}
          style={({ pressed }) => [styles.footerLink, pressed && styles.headerPressed]}
        >
          <Text style={styles.footerLinkText}>Legal & privacy</Text>
          <Ionicons name="arrow-forward" size={15} color={colors.brand} />
        </Pressable>
        {user ? (
          <Pressable
            accessibilityRole="link"
            accessibilityHint="Opens an email request for a copy of your CalCount data"
            onPress={() => void Linking.openURL('mailto:data_privacy@taeson.co?subject=CalCount%20-%20Data%20Export%20Request')}
            style={({ pressed }) => [styles.footerLink, pressed && styles.headerPressed]}
          >
            <Text style={styles.footerLinkText}>Request data export</Text>
            <Ionicons name="download-outline" size={15} color={colors.brand} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="link"
          accessibilityHint="Opens credits and acknowledgements"
          onPress={() => router.push('/credits')}
          style={({ pressed }) => [styles.footerLink, pressed && styles.headerPressed]}
        >
          <Text style={styles.footerLinkText}>Credits & acknowledgements</Text>
          <Ionicons name="arrow-forward" size={15} color={colors.brand} />
        </Pressable>
      </ScrollView>
  );
}

export function SettingsDrop() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const chevronRotation = useSharedValue(0);

  useEffect(() => {
    chevronRotation.value = withTiming(expanded ? 180 : 0, { duration: 200 });
  }, [expanded, chevronRotation]);

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const toggle = () => {
    triggerSelectionHaptic();
    setExpanded((prev) => !prev);
  };

  return (
      <Animated.View style={styles.preferencesSection}>
        <Pressable
          onPress={toggle}
          style={({ pressed }) => [styles.preferencesHeader, pressed && styles.headerPressed]}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          accessibilityState={{ expanded }}
          accessibilityHint="Toggles preference and theme settings menu"
        >
          <View style={styles.settingsHeader}>
            <View style={styles.settingsHeaderLeft}>
              <View style={styles.settingsIconBadge}>
                <Ionicons name="options-outline" size={18} color={colors.accent} />
              </View>
              <View>
                <Text style={styles.eyebrow}>PREFERENCES</Text>
                <Text accessibilityRole="header" style={styles.sectionTitle}>Settings</Text>
              </View>
            </View>
            <Animated.View style={chevronAnimatedStyle}>
              <Ionicons
                name="chevron-down"
                size={20}
                style={styles.settingsIcon}
              />
            </Animated.View>
          </View>
        </Pressable>

        {expanded && (
            <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                style={styles.settingsBody}
            >
              <ThemePreferencePicker />
              {__DEV__ ? <ApiBackendPreferencePicker /> : null}
            </Animated.View>
        )}
      </Animated.View>
  );
}

function LoggedInPanel({ user }: { user: AppwriteUser }) {
  const { deleteAccount, signOut } = useAuth();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [signingOut, setSigningOut] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileDocument | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      void reloadKey;
      let active = true;
      setLoadingProfile(true);
      setProfileError(null);
      getProfile(user.$id)
        .then((nextProfile) => {
          if (!active) return;
          setProfile(nextProfile);
        })
        .catch((error) => {
          console.warn('[Account] profile summary load failed', error);
          if (active) {
            setProfileError('We could not load your profile summary. Check your connection and try again.');
          }
        })
        .finally(() => {
          if (active) setLoadingProfile(false);
        });
      return () => {
        active = false;
      };
    }, [reloadKey, user.$id]),
  );

  const displayName = profile?.username?.trim() || user.name?.trim() || user.email.split('@')[0];
  const goal = profile?.goal_plain?.replace(/ · units:(metric|imperial)$/, '').trim()
    || 'No current focus saved yet.';
  const displayUnits = parseDisplayUnitsPreference(profile?.goal_plain, profile?.country);
  const goalState = profile ? resolveGoalState(profile) : null;
  const targetWeightKg = goalState?.targetWeightKg ?? null;
  const targetWeight = targetWeightKg == null
    ? null
    : (displayUnits === 'imperial'
      ? formatWeightImperial(targetWeightKg)
      : formatWeightMetric(targetWeightKg));
  const goalMetrics = [
    {
      label: 'Daily energy',
      value: profile?.target_kcal ? `${profile.target_kcal.toLocaleString()} kcal` : 'Not set',
    },
    {
      label: 'Daily protein',
      value: profile?.target_protein ? `${profile.target_protein}g` : 'Not set',
    },
    {
      label: 'Goal weight',
      value: targetWeight ?? 'Not set',
    },
  ];

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      showApiError(err, 'appwrite');
    } finally {
      setSigningOut(false);
    }
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      setDeleteDialogVisible(false);
    } catch (err) {
      setDeleteError('We couldn’t delete your account right now. Please try again or contact data_privacy@taeson.co.');
      showApiError(err, 'appwrite');
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
      <View style={styles.panel}>
        <View style={styles.identityHeader}>
          <View style={styles.identityCopy}>
            <Text accessibilityRole="header" style={styles.title}>{displayName}</Text>
            <Text style={styles.subtitle}>{user.email}</Text>
          </View>
          <View
            accessible
            accessibilityLabel={`${displayName} profile`}
            accessibilityRole="image"
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.goalsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeadingCopy}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Your goals</Text>
            </View>
          </View>

          {loadingProfile ? (
            <View
              accessible
              accessibilityLabel="Loading profile goals"
              accessibilityState={{ busy: true }}
              style={styles.inlineState}
            >
              <ActivityIndicator color={colors.brand} size="small" />
              <Text style={styles.stateText}>Loading your current goals…</Text>
            </View>
          ) : profileError ? (
            <View accessibilityLiveRegion="polite" style={styles.profileError}>
              <Ionicons name="cloud-offline-outline" size={20} color={colors.danger} />
              <View style={styles.profileErrorCopy}>
                <Text style={styles.profileErrorTitle}>Profile summary unavailable</Text>
                <Text style={styles.profileErrorText}>{profileError}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry loading profile summary"
                onPress={() => setReloadKey((key) => key + 1)}
                style={({ pressed }) => [styles.retryButton, pressed && styles.headerPressed]}
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.focusLabel}>Goal</Text>
              <Text style={styles.goalText}>{goal}</Text>
              <View style={styles.goalMetricRow}>
                {goalMetrics.map((metric) => (
                  <View
                    key={metric.label}
                    accessible
                    accessibilityLabel={`${metric.label}: ${metric.value}`}
                    style={styles.goalMetric}
                  >
                    <Text style={styles.goalMetricValue}>{metric.value}</Text>
                    <Text style={styles.goalMetricLabel}>{metric.label}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityHint="Opens profile and nutrition goal settings"
            accessibilityState={{ disabled: signingOut }}
            disabled={signingOut}
            onPress={() => router.push('/config')}
            style={({ pressed }) => [
              styles.editButton,
              pressed && styles.headerPressed,
              signingOut && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.editButtonText}>Goals & body</Text>
            <Ionicons name="arrow-forward" size={17} color={colors.brand} />
          </Pressable>
        </View>

        <SettingsDrop />

        {deleteError ? <Text accessibilityRole="alert" style={styles.deleteError}>{deleteError}</Text> : null}
        <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            onPress={() => setDeleteDialogVisible(true)}
            disabled={signingOut || deletingAccount}
            style={({ pressed }) => [styles.deleteAccountButton, pressed && styles.headerPressed]}
        >
          <Ionicons name="trash-outline" size={17} color={colors.danger} />
          <Text style={styles.buttonDangerText}>Delete account</Text>
        </Pressable>

        <Pressable
            accessibilityRole="button"
            accessibilityLabel={signingOut ? 'Signing out' : 'Sign out'}
            accessibilityState={{ disabled: signingOut }}
            onPress={handleSignOut}
            disabled={signingOut}
            style={({ pressed }) => [
              styles.buttonDanger,
              pressed && styles.headerPressed,
              signingOut && styles.buttonDisabled,
            ]}
        >
          <Ionicons name="log-out-outline" size={17} color={colors.danger} />
          <Text style={styles.buttonDangerText}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
        </Pressable>

        <ConfirmDialog
          visible={deleteDialogVisible}
          title="Delete your account?"
          message="Your profile and account access will be removed immediately. Remaining service records are permanently purged within 30 days under the privacy policy. This cannot be undone."
          confirmLabel="Delete account"
          cancelLabel="Keep account"
          destructive
          loading={deletingAccount}
          onConfirm={() => void handleDeleteAccount()}
          onCancel={() => {
            if (!deletingAccount) setDeleteDialogVisible(false);
          }}
        />
      </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.background,
    gap: 12,
  },
  stateText: {
    ...typography.body,
    color: c.textMuted,
  },
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingBottom: 112,
    backgroundColor: c.background,
  },
  panel: {
    width: '100%',
    gap: 28,
  },
  eyebrow: {
    ...typography.overline,
    color: c.brand,
    fontSize: 10,
  },
  title: {
    ...typography.headlineLarge,
    color: c.text,
    marginTop: 4,
  },
  subtitle: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: 3,
  },
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 2,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.brandSoft,
    borderWidth: 1,
    borderColor: c.brand,
  },
  avatarText: {
    ...typography.metric,
    color: c.brand,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  goalsSection: {
    gap: 18,
    paddingVertical: 22,
    borderTopWidth: 1,
    borderTopColor: c.borderStrong,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeadingCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  sectionTitle: {
    ...typography.metric,
    color: c.text,
  },
  focusLabel: {
    ...typography.overline,
    color: c.textFaint,
    fontSize: 9,
    marginBottom: -10,
  },
  goalText: {
    ...typography.metric,
    color: c.text,
    maxWidth: 590,
  },
  goalMetricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  goalMetric: {
    flexGrow: 1,
    flexBasis: 120,
    minHeight: 70,
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 10,
    paddingRight: 12,
  },
  goalMetricValue: {
    ...typography.numeric,
    color: c.text,
  },
  goalMetricLabel: {
    ...typography.labelTiny,
    color: c.textFaint,
  },
  editButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  editButtonText: {
    ...typography.label,
    color: c.brand,
  },
  inlineState: {
    minHeight: 118,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  profileError: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: c.dangerSoft,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.danger,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.danger,
  },
  profileErrorCopy: {
    flex: 1,
    minWidth: 180,
    gap: 2,
  },
  profileErrorTitle: {
    ...typography.label,
    color: c.danger,
  },
  profileErrorText: {
    ...typography.bodySmall,
    color: c.textMuted,
  },
  retryButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  retryText: {
    ...typography.label,
    color: c.danger,
  },
  preferencesSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderStrong,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    overflow: 'hidden',
  },
  preferencesHeader: {
    minHeight: 64,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  headerPressed: {
    backgroundColor: c.accentSoft,
    opacity: 0.8,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSoft,
  },
  settingsIcon: {
    color: c.textMuted,
  },
  settingsBody: {
    paddingTop: 18,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  label: {
    ...typography.body,
    color: c.text,
    fontWeight: '600',
  },
  hint: {
    ...typography.labelSmall,
    color: c.textFaint,
    marginTop: 4,
    marginBottom: 10,
  },
  savingText: {
    ...typography.labelTiny,
    color: c.textMuted,
    marginTop: 8,
  },
  buttonDanger: {
    minHeight: 48,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  deleteAccountButton: {
    minHeight: 48,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: c.danger,
  },
  deleteError: {
    ...typography.bodySmall,
    color: c.danger,
    backgroundColor: c.dangerSoft,
    padding: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonDangerText: {
    ...typography.label,
    color: c.danger,
  },
  versionText: {
    ...typography.labelTiny,
    color: c.textFaint,
    marginTop: 40,
    marginBottom: 8,
  },
  footerLink: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  footerLinkText: {
    ...typography.label,
    color: c.text,
  },
});
