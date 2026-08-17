import { AccountSignInFlow } from '@/components/auth/AccountSignInFlow';
import { ApiBackendPreferencePicker } from '@/components/ApiBackendPreferencePicker';
import { FontPreferencePicker } from '@/components/FontPreferencePicker';
import { ThemePreferencePicker } from '@/components/ThemePreferencePicker';
import { ThemedSegmentedControl } from '@/components/ThemedSegmentedControl';
import { showApiError } from '@/lib/apiErrors';
import { useAuth } from '@/lib/AuthContext';
import { calculateStreak, calculateXP } from '@/lib/gamification';
import { getTodayMeals, listHistoricMeals, type MealDocument } from '@/lib/meals';
import { getProfile, type ProfileDocument } from '@/lib/profile';
import type { DefaultSearchMode } from '@/lib/searchPreferences';
import { useSearchPreferences } from '@/lib/SearchPreferencesContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import {
  formatWeightImperial,
  formatWeightMetric,
  normalizeStoredTargetWeightKg,
  parseDisplayUnitsPreference,
} from '@/lib/units';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
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
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
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
      <Animated.View style={styles.card}>
        <Pressable onPress={toggle} style={styles.header}>
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
        </Pressable>

        {expanded && (
            <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                style={styles.settingsCard}
            >
              <Text style={styles.label}>Preferred food search</Text>
              <Text style={styles.hint}>
                Choose the method you prefer when starting a food log.
              </Text>
              <ThemedSegmentedControl
                  values={['Camera', 'Text']}
                  selectedIndex={defaultSearchMode === 'scan' ? 0 : 1}
                  enabled={!savingPreference}
                  onChange={(index) =>
                      onSearchModeChange(index === 0 ? 'scan' : 'text_query')
                  }
              />

              <ThemePreferencePicker />
              <FontPreferencePicker />
              <ApiBackendPreferencePicker />
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
  const { colors } = useTheme();
  const [signingOut, setSigningOut] = useState(false);
  const [profile, setProfile] = useState<ProfileDocument | null>(null);
  const [todayMeals, setTodayMeals] = useState<MealDocument[]>([]);
  const [historicMeals, setHistoricMeals] = useState<MealDocument[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadingProfile(true);
      Promise.all([
        getProfile(user.$id),
        getTodayMeals(user.$id),
        listHistoricMeals(user.$id, 100),
      ])
        .then(([nextProfile, today, history]) => {
          if (!active) return;
          setProfile(nextProfile);
          setTodayMeals(today);
          setHistoricMeals(history);
        })
        .catch((error) => console.warn('[Account] profile summary load failed', error))
        .finally(() => {
          if (active) setLoadingProfile(false);
        });
      return () => {
        active = false;
      };
    }, [user.$id]),
  );

  const totals = useMemo(
    () => ({
      kcal: todayMeals.reduce((sum, meal) => sum + (meal.kcal ?? 0), 0),
      protein: todayMeals.reduce((sum, meal) => sum + (meal.protein ?? 0), 0),
      fluid: todayMeals.reduce((sum, meal) => sum + (meal.fluid ?? 0), 0),
    }),
    [todayMeals],
  );
  const kcalTarget = profile?.target_kcal ?? 2000;
  const proteinTarget = profile?.target_protein ?? 120;
  const streak = calculateStreak([...todayMeals, ...historicMeals]);
  const xp = calculateXP({
    meals: todayMeals.length,
    water: Math.floor(totals.fluid / 250),
    calorieTargetHit: totals.kcal >= kcalTarget * 0.9 && totals.kcal <= kcalTarget * 1.1,
    proteinTargetHit: totals.protein >= proteinTarget,
  });
  const displayName = profile?.username?.trim() || user.name?.trim() || user.email.split('@')[0];
  const goal = profile?.goal_plain?.replace(/ · units:(metric|imperial)$/, '').trim()
    || 'Build a consistent, balanced routine';
  const displayUnits = parseDisplayUnitsPreference(profile?.goal_plain, profile?.country);
  const targetWeightKg = profile
    ? normalizeStoredTargetWeightKg(profile.country, profile.target_weight, profile.height)
    : null;
  const targetWeight = targetWeightKg == null
    ? null
    : (displayUnits === 'imperial'
      ? formatWeightImperial(targetWeightKg)
      : formatWeightMetric(targetWeightKg));
  const targetSummary = [
    profile?.target_kcal ? `${profile.target_kcal.toLocaleString()} kcal` : null,
    profile?.target_protein ? `${profile.target_protein}g protein` : null,
    targetWeight ? `${targetWeight} target` : null,
  ].filter(Boolean).join(' · ');

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

        <SettingsDrop
            defaultSearchMode={defaultSearchMode}
            savingPreference={savingPreference}
            onSearchModeChange={onSearchModeChange}
        />

        <TouchableOpacity
            style={[styles.button, signingOut && styles.buttonDisabled]}
            onPress={() => router.push('/config')}
        >
          <Ionicons name="create-outline" size={18} color={colors.onAccent} />
          <Text style={styles.buttonText}>Edit profile & goals</Text>
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
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    padding: 24,
    paddingBottom: 48,
    backgroundColor: c.background,
  },
  panel: {
    width: '100%',
  },
  eyebrow: {
    ...typography.labelSmall,
    color: c.textFaint,
  },
  title: {
    ...typography.headlineLarge,
    color: c.text,
    marginTop: 4,
  },
  subtitle: {
    ...typography.body,
    color: c.textMuted,
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
  },
  sectionTitle: {
    ...typography.headline,
    color: c.text,
    marginTop: 2,
  },
  settingsCard: {
    marginTop: 18,
    paddingTop: 16,
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
  button: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    backgroundColor: c.accent,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    shadowColor: c.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonDanger: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    backgroundColor: c.dangerButtonBg,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...typography.label,
    color: c.onAccent,
  },
  buttonDangerText: {
    ...typography.label,
    color: c.onDanger,
  },
  mutedText: {
    ...typography.body,
    color: c.textMuted,
    marginTop: 8,
  },
});
