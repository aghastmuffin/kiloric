import { AccountSignInFlow } from '@/components/auth/AccountSignInFlow';
import { FontPreferencePicker } from '@/components/FontPreferencePicker';
import { ThemePreferencePicker } from '@/components/ThemePreferencePicker';
import { showApiError } from '@/lib/apiErrors';
import { useAuth } from '@/lib/AuthContext';
import { calculateAge } from '@/lib/nutrition';
import { getProfile, saveProfileFields } from '@/lib/profile';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function AccountScreen() {
  const { user, loading } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.mutedText}>Restoring session…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.avatarContainerHeader}>
            <MaterialIcons name="person" size={20} color={colors.accent} />
          </View>
          <Text style={styles.headerTitle}>Vitals</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {!user ? <AccountSignInFlow /> : <LoggedInPanel />}
      </ScrollView>
    </SafeAreaView>
  );
}

function LoggedInPanel() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  const [signingOut, setSigningOut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState('muscle_gain');

  const [weight, setWeight] = useState('0');
  const [height, setHeight] = useState('0');
  const [age, setAge] = useState('—');
  const [targetKcal, setTargetKcal] = useState('2000');
  const [targetProtein, setTargetProtein] = useState('125');
  const [targetCarbs, setTargetCarbs] = useState('225');
  const [targetFat, setTargetFat] = useState('67');
  const [dailyFluid, setDailyFluid] = useState('2500');
  const [username, setUsername] = useState('');

  const loadProfile = useCallback(async () => {
    if (!user?.$id) return;
    setLoading(true);
    try {
      const profile = await getProfile(user.$id);
      if (profile) {
        setWeight(profile.weight?.toString() ?? '0');
        setHeight(profile.height?.toString() ?? '0');
        setTargetKcal(profile.target_kcal?.toString() ?? '2000');
        setTargetProtein(profile.target_protein?.toString() ?? '125');
        setTargetCarbs(profile.target_carbs?.toString() ?? '225');
        setTargetFat(profile.target_fat?.toString() ?? '67');
        setDailyFluid(profile.daily_fluid?.toString() ?? '2500');
        setUsername(profile.username ?? 'User');
        if (profile.dateOfBirth) {
          setAge(String(calculateAge(new Date(profile.dateOfBirth))));
        }
      } else {
        setUsername('User');
      }
    } catch (err) {
      showApiError(err, 'appwrite');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  async function handleSave() {
    if (!user?.$id) return;
    setSaving(true);
    try {
      await saveProfileFields(user.$id, {
        weight: parseFloat(weight) || 0,
        height: parseFloat(height) || 0,
        target_kcal: parseInt(targetKcal, 10) || 0,
        target_protein: parseInt(targetProtein, 10) || 0,
        target_carbs: parseInt(targetCarbs, 10) || 0,
        target_fat: parseInt(targetFat, 10) || 0,
        daily_fluid: parseInt(dailyFluid, 10) || 0,
      });
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (err) {
      showApiError(err, 'appwrite');
    } finally {
      setSaving(false);
    }
  }

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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const proteinPct =
    Number(targetKcal) > 0
      ? Math.round(((Number(targetProtein) * 4) / Number(targetKcal)) * 100)
      : 0;
  const carbsPct =
    Number(targetKcal) > 0 ? Math.round(((Number(targetCarbs) * 4) / Number(targetKcal)) * 100) : 0;
  const fatPct =
    Number(targetKcal) > 0 ? Math.round(((Number(targetFat) * 9) / Number(targetKcal)) * 100) : 0;

  return (
    <View style={styles.content}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarWrapper}>
          <View style={styles.profileAvatarFallback}>
            <MaterialIcons name="person" size={48} color={colors.textMuted} />
          </View>
          <Pressable
            style={[styles.editAvatarBtn, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/config')}
          >
            <MaterialIcons name="edit" size={16} color={colors.onAccent} />
          </Pressable>
        </View>
        <Text style={styles.profileName}>{username}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Details</Text>
        <View style={styles.gridContainer}>
          <View style={styles.gridRow}>
            <View style={[styles.gridItem, styles.gridItemBorderRight, styles.gridItemBorderBottom]}>
              <Text style={styles.gridLabel}>WEIGHT</Text>
              <View style={styles.gridInputRow}>
                <TextInput
                  style={styles.gridInput}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                />
                <Text style={styles.gridUnit}>kg</Text>
              </View>
            </View>
            <View style={[styles.gridItem, styles.gridItemBorderBottom]}>
              <Text style={styles.gridLabel}>HEIGHT</Text>
              <View style={styles.gridInputRow}>
                <TextInput
                  style={styles.gridInput}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                />
                <Text style={styles.gridUnit}>cm</Text>
              </View>
            </View>
          </View>
          <View style={styles.gridRow}>
            <View style={[styles.gridItem, styles.gridItemBorderRight]}>
              <Text style={styles.gridLabel}>AGE</Text>
              <Text style={styles.gridInput}>{age}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>WATER</Text>
              <View style={styles.gridInputRow}>
                <TextInput
                  style={styles.gridInput}
                  value={dailyFluid}
                  onChangeText={setDailyFluid}
                  keyboardType="numeric"
                />
                <Text style={styles.gridUnit}>ml</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nutrition Goals</Text>
        <View style={styles.card}>
          <View style={[styles.cardItem, styles.cardItemBorder]}>
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>Daily Calories</Text>
              <View style={styles.goalInputRow}>
                <TextInput
                  style={styles.goalInput}
                  value={targetKcal}
                  onChangeText={setTargetKcal}
                  keyboardType="numeric"
                />
                <Text style={styles.goalUnit}>kcal</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardItem}>
            <View style={styles.macroRow}>
              <View style={styles.macroHeader}>
                <Text style={styles.macroName}>Protein ({proteinPct}%)</Text>
                <TextInput
                  style={styles.macroValueInput}
                  value={targetProtein}
                  onChangeText={setTargetProtein}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.sliderTrack}>
                <View
                  style={[
                    styles.sliderFill,
                    { width: `${Math.min(100, proteinPct)}%`, backgroundColor: colors.accent },
                  ]}
                />
              </View>
            </View>
            <View style={styles.macroRow}>
              <View style={styles.macroHeader}>
                <Text style={styles.macroName}>Carbs ({carbsPct}%)</Text>
                <TextInput
                  style={styles.macroValueInput}
                  value={targetCarbs}
                  onChangeText={setTargetCarbs}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.sliderTrack}>
                <View
                  style={[
                    styles.sliderFill,
                    { width: `${Math.min(100, carbsPct)}%`, backgroundColor: colors.accent },
                  ]}
                />
              </View>
            </View>
            <View style={styles.macroRow}>
              <View style={styles.macroHeader}>
                <Text style={styles.macroName}>Fats ({fatPct}%)</Text>
                <TextInput
                  style={styles.macroValueInput}
                  value={targetFat}
                  onChangeText={setTargetFat}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.sliderTrack}>
                <View
                  style={[
                    styles.sliderFill,
                    { width: `${Math.min(100, fatPct)}%`, backgroundColor: colors.accent },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Program Presets</Text>
        <View style={styles.presetGrid}>
          {['Weight Loss', 'Muscle Gain', 'Maintenance'].map((preset) => {
            const key = preset.toLowerCase().replace(' ', '_');
            const isSelected = program === key;
            return (
              <Pressable
                key={preset}
                style={[styles.presetCard, isSelected && styles.presetCardSelected]}
                onPress={() => setProgram(key)}
              >
                <Text style={[styles.presetText, isSelected && { color: colors.accent }]}>{preset}</Text>
                {isSelected ? <MaterialIcons name="check-circle" size={20} color={colors.accent} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.card}>
          <View style={styles.settingsBlock}>
            <ThemePreferencePicker />
            <FontPreferencePicker />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Pressable
          style={[styles.saveButton, { backgroundColor: colors.accent }, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={[styles.saveButtonText, { color: colors.onAccent }]}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/config')}>
          <Text style={[styles.secondaryButtonText, { color: colors.accent }]}>Edit full profile</Text>
        </Pressable>
        <Pressable style={styles.logoutButton} onPress={handleSignOut} disabled={signingOut}>
          <Text style={styles.logoutButtonText}>{signingOut ? 'Logging out…' : 'Log Out'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.background,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.background,
    },
    mutedText: {
      color: c.textMuted,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      backgroundColor: c.background,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    avatarContainerHeader: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: c.text,
    },
    container: {
      flexGrow: 1,
      backgroundColor: c.background,
    },
    content: {
      padding: 20,
      gap: 24,
      paddingBottom: 40,
    },
    profileHeader: {
      alignItems: 'center',
      marginVertical: 8,
    },
    avatarWrapper: {
      marginBottom: 16,
      position: 'relative',
    },
    profileAvatarFallback: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: c.surfaceAlt,
      borderWidth: 2,
      borderColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editAvatarBtn: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: c.background,
    },
    profileName: {
      fontSize: 24,
      fontWeight: '700',
      color: c.text,
    },
    profileEmail: {
      fontSize: 15,
      color: c.textMuted,
      marginTop: 4,
    },
    section: {
      gap: 12,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      paddingHorizontal: 4,
    },
    gridContainer: {
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    gridRow: {
      flexDirection: 'row',
    },
    gridItem: {
      flex: 1,
      padding: 16,
      gap: 8,
    },
    gridItemBorderRight: {
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: c.border,
    },
    gridItemBorderBottom: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    gridLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textMuted,
      letterSpacing: 0.5,
    },
    gridInputRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
    },
    gridInput: {
      fontSize: 22,
      fontWeight: '600',
      color: c.text,
      padding: 0,
      minWidth: 48,
    },
    gridUnit: {
      fontSize: 14,
      color: c.textMuted,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    cardItem: {
      padding: 16,
      gap: 12,
    },
    cardItemBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    goalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    goalLabel: {
      fontSize: 16,
      color: c.text,
      fontWeight: '500',
    },
    goalInputRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
    },
    goalInput: {
      fontSize: 18,
      fontWeight: '700',
      color: c.text,
      textAlign: 'right',
      minWidth: 64,
      padding: 0,
    },
    goalUnit: {
      fontSize: 13,
      color: c.textMuted,
    },
    macroRow: {
      gap: 8,
      marginBottom: 8,
    },
    macroHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    macroName: {
      fontSize: 14,
      color: c.text,
    },
    macroValueInput: {
      fontSize: 15,
      fontWeight: '600',
      color: c.text,
      textAlign: 'right',
      minWidth: 48,
      padding: 0,
    },
    sliderTrack: {
      height: 6,
      backgroundColor: c.border,
      borderRadius: 3,
      overflow: 'hidden',
    },
    sliderFill: {
      height: '100%',
      borderRadius: 3,
    },
    presetGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    presetCard: {
      flexGrow: 1,
      minWidth: '45%',
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    presetCardSelected: {
      borderColor: c.accent,
      backgroundColor: c.accentSoft,
    },
    presetText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.text,
    },
    settingsBlock: {
      padding: 16,
      gap: 12,
    },
    saveButton: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '700',
    },
    secondaryButton: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: '600',
    },
    logoutButton: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: c.dangerButtonBg,
    },
    logoutButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: c.onDanger,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
  });
