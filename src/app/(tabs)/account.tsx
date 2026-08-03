import { AccountSignInFlow } from '@/components/auth/AccountSignInFlow';
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
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
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

type SettingsDropProps = {
  defaultSearchMode: DefaultSearchMode;
  savingPreference: boolean;
  onSearchModeChange: (mode: DefaultSearchMode) => void;
};

export function SettingsDrop({ defaultSearchMode, savingPreference, onSearchModeChange }: SettingsDropProps) {
  const styles = useThemedStyles(makeStyles);
  const [expanded, setExpanded] = useState(false);

  const toggle = () => setExpanded((prev) => !prev);

  return (
      <Animated.View style={styles.card} layout={LinearTransition.springify().damping(18)}>
        <Pressable onPress={toggle} style={styles.header}>
          <View style={styles.settingsHeader}>
            <View>
              <Text style={styles.eyebrow}>PREFERENCES</Text>
              <Text style={styles.sectionTitle}>Settings</Text>
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

        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.identityCopy}>
            <Text style={styles.cardLabel}>CURRENT FOCUS</Text>
            <Text style={styles.goalText}>{goal}</Text>
            {targetSummary ? <Text style={styles.goalMeta}>{targetSummary}</Text> : null}
          </View>
        </View>

        <View style={styles.gameStrip}>
          <View style={styles.gameMetric}>
            <Ionicons name="flame-outline" size={22} color={colors.streakColor} />
            <Text style={styles.gameValue}>{loadingProfile ? '—' : streak}</Text>
            <Text style={styles.gameLabel}>DAY STREAK</Text>
          </View>
          <View style={styles.gameDivider} />
          <View style={styles.gameMetric}>
            <Ionicons name="sparkles-outline" size={22} color={colors.xpAccent} />
            <Text style={styles.gameValue}>{loadingProfile ? '—' : `LV ${xp.level}`}</Text>
            <Text style={styles.gameLabel}>
              {loadingProfile ? 'LOADING' : `${xp.xpInCurrentLevel}/${xp.xpNeeded} XP`}
            </Text>
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
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSoft,
  },
  avatarText: {
    ...typography.headline,
    color: c.accent,
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
  gameStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: c.accent,
    borderRadius: 12,
    marginBottom: 20,
    paddingVertical: 18,
  },
  gameMetric: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  gameDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: c.onAccent,
    opacity: 0.35,
  },
  gameValue: {
    ...typography.headline,
    color: c.onAccent,
  },
  gameLabel: {
    ...typography.labelSmall,
    color: c.onAccent,
    opacity: 0.78,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 12,
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
    padding: 15,
    alignItems: 'center',
  },
  buttonDanger: {
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