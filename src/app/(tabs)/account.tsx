import { AccountSignInFlow } from '@/components/auth/AccountSignInFlow';
import { FontPreferencePicker } from '@/components/FontPreferencePicker';
import { ThemePreferencePicker } from '@/components/ThemePreferencePicker';
import { ThemedSegmentedControl } from '@/components/ThemedSegmentedControl';
import { showApiError } from '@/lib/apiErrors';
import { useAuth } from '@/lib/AuthContext';
import { getAccessToken } from '@/lib/getAccessToken';
import type { DefaultSearchMode } from '@/lib/searchPreferences';
import { useSearchPreferences } from '@/lib/SearchPreferencesContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
<<<<<<< HEAD
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
=======
import {
  formatWeightImperial,
  formatWeightMetric,
  normalizeStoredTargetWeightKg,
  parseDisplayUnitsPreference,
} from '@/lib/units';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
<<<<<<< HEAD
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
=======
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
import type { Models } from 'react-native-appwrite';

type AppwriteUser = Models.User<Models.Preferences>;

export default function AccountScreen() {
  const { user, loading } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { defaultSearchMode, setDefaultSearchMode } = useSearchPreferences();
  const [savingPreference, setSavingPreference] = useState(false);

  async function handleSearchModeChange(mode: DefaultSearchMode) {
    if (mode === defaultSearchMode || savingPreference) return;
    setSavingPreference(true);
    try {
      await setDefaultSearchMode(mode);
    } finally {
      setSavingPreference(false);
    }
  }

  if (loading) {
    return (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.mutedText}>Restoring session…</Text>
        </View>
    );
  }

  return (
      <ScrollView contentContainerStyle={styles.container}>
        {!user ? (
            <AccountSignInFlow />
        ) : (
            <LoggedInPanel
                user={user}
                defaultSearchMode={defaultSearchMode}
                savingPreference={savingPreference}
                onSearchModeChange={handleSearchModeChange}
            />
        )}
      </ScrollView>
  );
}

<<<<<<< HEAD
export function UserCard({ user, tokenPreview }: { user: AppwriteUser; tokenPreview: string }) {
  const styles = useThemedStyles(makeStyles);
  const [expanded, setExpanded] = useState(false);

  const toggle = () => setExpanded((prev) => !prev);

  return (
      <Animated.View style={styles.card} layout={LinearTransition.springify().damping(18)}>
        <Pressable onPress={toggle} style={styles.header}>
          <Text style={styles.hint}>
            {expanded ? '▲ Debug Details' : '▼ Debug Details'}
          </Text>
        </Pressable>

        {expanded && (
            <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                style={styles.dropdown}
            >
              <Text style={styles.cardLabel}>User ID</Text>
              <Text style={styles.cardValue}>{user.$id}</Text>

              <Text style={styles.cardLabel}>Email</Text>
              <Text style={styles.cardValue}>{user.email ?? '—'}</Text>

              <Text style={styles.cardLabel}>Access token (preview)</Text>
              <Text style={styles.mono}>{tokenPreview}</Text>

              <Text style={styles.hint}>
                Authorization: <Text style={styles.mono}>Bearer &lt;access_token&gt;</Text>
              </Text>
            </Animated.View>
        )}
      </Animated.View>
=======
function XPProgressBar({ progress }: { progress: number }) {
  const styles = useThemedStyles(makeStyles);
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withDelay(
      280,
      withTiming(Math.max(0, Math.min(1, progress)), {
        duration: 850,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [fill, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fill.value * 100}%`,
  }));

  return (
    <View style={styles.xpTrack}>
      <Animated.View style={[styles.xpFill, fillStyle]} />
    </View>
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
  );
}

type SettingsDropProps = {
  defaultSearchMode: DefaultSearchMode;
  savingPreference: boolean;
  onSearchModeChange: (mode: DefaultSearchMode) => void;
};

export function SettingsDrop({ defaultSearchMode, savingPreference, onSearchModeChange }: SettingsDropProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const toggle = () => setExpanded((prev) => !prev);

  return (
      <Animated.View style={styles.card} layout={LinearTransition.springify().damping(18)}>
        <Pressable onPress={toggle} style={styles.header}>
<<<<<<< HEAD
          <Text style={styles.hint}>
            {expanded ? '▲ Compact Settings' : '▼ View Settings'}
          </Text>
=======
          <View style={styles.settingsHeader}>
            <View style={styles.settingsHeaderLeft}>
              <View style={styles.settingsIconBadge}>
                <Ionicons name="options-outline" size={18} color={colors.accent} />
              </View>
              <View>
                <Text style={styles.eyebrow}>PREFERENCES</Text>
                <Text style={styles.sectionTitle}>Settings</Text>
              </View>
            </View>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              style={styles.settingsIcon}
            />
          </View>
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
        </Pressable>

        {expanded && (
            <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                style={styles.settingsCard}
            >
              <Text style={styles.sectionTitle}>Settings</Text>
              <Text style={styles.label}>Default search tab</Text>
              <Text style={styles.hint}>
                Choose whether the bottom tab opens camera scan or manual text search.
              </Text>
              <ThemedSegmentedControl
                  values={['Camera scan', 'Text search']}
                  selectedIndex={defaultSearchMode === 'scan' ? 0 : 1}
                  enabled={!savingPreference}
                  onChange={(index) =>
                      onSearchModeChange(index === 0 ? 'scan' : 'text_query')
                  }
              />

              <ThemePreferencePicker />
              <FontPreferencePicker />
            </Animated.View>
        )}
      </Animated.View>
  );
}

type LoggedInPanelProps = {
  user: AppwriteUser;
  defaultSearchMode: DefaultSearchMode;
  savingPreference: boolean;
  onSearchModeChange: (mode: DefaultSearchMode) => void;
};

function LoggedInPanel({ user, defaultSearchMode, savingPreference, onSearchModeChange }: LoggedInPanelProps) {
  const { signOut } = useAuth();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const [signingOut, setSigningOut] = useState(false);
  const [tokenPreview, setTokenPreview] = useState('Loading…');

  useEffect(() => {
    getAccessToken().then((token) => {
      setTokenPreview(token ? `${token.slice(0, 24)}…` : '—');
    });
  }, []);

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

  return (
<<<<<<< HEAD
      <View>
        <Text style={styles.title}>Welcome back, {user.email}!</Text>
        <UserCard user={user} tokenPreview={tokenPreview} />
=======
      <View style={styles.panel}>
        <Text style={styles.eyebrow}>YOUR VITALITY</Text>
        <Text style={styles.title}>{displayName}</Text>
        <Text style={styles.subtitle}>{user.email}</Text>

        <View style={styles.playerCard}>
          <View style={styles.identityRow}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>
                  {loadingProfile ? 'LV —' : `LV ${xp.level}`}
                </Text>
              </View>
            </View>
            <View style={styles.identityCopy}>
              <Text style={styles.cardLabel}>CURRENT FOCUS</Text>
              <Text style={styles.goalText}>{goal}</Text>
              {targetSummary ? <Text style={styles.goalMeta}>{targetSummary}</Text> : null}
            </View>
          </View>

          <View style={styles.xpSection}>
            <View style={styles.xpHeader}>
              <View style={styles.xpHeaderLeft}>
                <Ionicons name="sparkles" size={13} color={colors.xpAccent} />
                <Text style={styles.xpLabel}>DAILY XP</Text>
              </View>
              <Text style={styles.xpValue}>
                {loadingProfile ? '…' : `${xp.xpInCurrentLevel} / ${xp.xpNeeded} XP`}
              </Text>
            </View>
            <XPProgressBar
              progress={loadingProfile ? 0 : xp.xpInCurrentLevel / xp.xpNeeded}
            />
            <Text style={styles.xpHint}>
              Earn XP by logging meals, drinking water and hitting your targets.
            </Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statTile}>
            <View style={[styles.statIconWrap, styles.statIconStreak]}>
              <Ionicons name="flame" size={19} color={colors.streakColor} />
            </View>
            <Text style={styles.statValue}>{loadingProfile ? '—' : streak}</Text>
            <Text style={styles.statLabel}>DAY STREAK</Text>
          </View>
          <View style={styles.statTile}>
            <View style={[styles.statIconWrap, styles.statIconMeals]}>
              <Ionicons name="restaurant" size={17} color={colors.success} />
            </View>
            <Text style={styles.statValue}>{loadingProfile ? '—' : todayMeals.length}</Text>
            <Text style={styles.statLabel}>MEALS TODAY</Text>
          </View>
          <View style={styles.statTile}>
            <View style={[styles.statIconWrap, styles.statIconKcal]}>
              <Ionicons name="flash" size={18} color={colors.accent} />
            </View>
            <Text style={styles.statValue}>
              {loadingProfile ? '—' : Math.round(totals.kcal).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>KCAL TODAY</Text>
          </View>
        </View>
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0

        <SettingsDrop
            defaultSearchMode={defaultSearchMode}
            savingPreference={savingPreference}
            onSearchModeChange={onSearchModeChange}
        />

        <TouchableOpacity
            style={[styles.button, signingOut && styles.buttonDisabled]}
            onPress={() => router.push('/config')}
        >
          <Text style={styles.buttonText}>Edit Information</Text>
        </TouchableOpacity>

        <TouchableOpacity
            style={[styles.buttonDanger, signingOut && styles.buttonDisabled]}
            onPress={handleSignOut}
            disabled={signingOut}
        >
          <Ionicons name="log-out-outline" size={17} color={colors.onDanger} />
          <Text style={styles.buttonDangerText}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
        </TouchableOpacity>
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
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: c.background,
  },
  errorBox: {
    backgroundColor: c.dangerSoft,
    borderColor: c.danger,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  errorTitle: {
    color: c.danger,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  errorText: {
    color: c.danger,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  title: {
    color: c.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: c.textMuted,
<<<<<<< HEAD
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
=======
    marginTop: 2,
    marginBottom: 24,
  },
  playerCard: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    alignItems: 'center',
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSoft,
    borderWidth: 2,
    borderColor: c.accent,
  },
  avatarText: {
    ...typography.headline,
    color: c.accent,
  },
  levelBadge: {
    marginTop: -10,
    backgroundColor: c.accent,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    shadowColor: c.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  levelBadgeText: {
    ...typography.labelSmall,
    fontSize: 10,
    color: c.onAccent,
  },
  identityCopy: {
    flex: 1,
  },
  cardLabel: {
    ...typography.labelSmall,
    color: c.textFaint,
    marginBottom: 4,
  },
  goalText: {
    ...typography.bodyLarge,
    color: c.text,
  },
  goalMeta: {
    ...typography.labelSmall,
    color: c.textMuted,
    marginTop: 6,
  },
  xpSection: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    gap: 8,
  },
  xpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  xpHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  xpLabel: {
    ...typography.labelSmall,
    color: c.textMuted,
  },
  xpValue: {
    ...typography.labelSmall,
    color: c.text,
  },
  xpTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: c.progressTrail,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: c.xpAccent,
    shadowColor: c.xpAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  xpHint: {
    ...typography.labelSmall,
    fontSize: 11,
    color: c.textFaint,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statIconStreak: {
    backgroundColor: 'rgba(190, 202, 182, 0.22)',
  },
  statIconMeals: {
    backgroundColor: 'rgba(102, 113, 96, 0.14)',
  },
  statIconKcal: {
    backgroundColor: c.accentSoft,
  },
  statValue: {
    ...typography.headline,
    fontSize: 22,
    lineHeight: 28,
    color: c.text,
  },
  statLabel: {
    ...typography.labelSmall,
    fontSize: 10,
    color: c.textMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  header: {
    paddingVertical: 2,
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
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
  },
  sectionTitle: {
    color: c.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
  },
  label: {
    color: c.text,
    fontSize: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: c.surfaceAlt,
    color: c.text,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
  button: {
    backgroundColor: c.accent,
<<<<<<< HEAD
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonSecondary: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: c.accent,
=======
    borderRadius: 999,
    padding: 16,
    alignItems: 'center',
    shadowColor: c.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 3,
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
  },
  buttonDanger: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    backgroundColor: c.dangerButtonBg,
    borderRadius: 999,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: c.onAccent,
    fontWeight: '600',
    fontSize: 16,
  },
  buttonSecondaryText: {
    color: c.accent,
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDangerText: {
    color: c.onDanger,
    fontWeight: '600',
    fontSize: 16,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden' // Important for smooth clipping during animation
  },
  settingsCard: {
    marginTop: 10,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  segmentOption: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
  },
  segmentOptionSelected: {
    borderColor: c.accent,
    backgroundColor: c.accentSoft,
  },
  segmentOptionText: {
    color: c.textMuted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  segmentOptionTextSelected: {
    color: c.accent,
  },
  cardLabel: {
    color: c.textFaint,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 4,
  },
  cardValue: {
    color: c.text,
    fontSize: 16,
  },
  mono: {
    color: c.mono,
    fontFamily: 'Menlo',
    fontSize: 12,
  },
  hint: {
    color: c.textFaint,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  mutedText: {
    color: c.textMuted,
    marginTop: 8,
  },
<<<<<<< HEAD
  resultBox: {
    backgroundColor: c.surface,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  header: {
    paddingVertical: 4,
  },
  dropdown: {
    marginTop: 10,
  }
});
=======
});
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
