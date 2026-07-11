import { AccountSignInFlow } from '@/components/auth/AccountSignInFlow';
import { showApiError } from '@/lib/apiErrors';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import { getProfile, saveProfileFields } from '@/lib/profile';
import { useFocusEffect } from 'expo-router';

export default function AccountScreen() {
  const { user, loading } = useAuth();
  const styles = useThemedStyles(makeStyles);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#f97316" />
        <Text style={styles.mutedText}>Restoring session…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.avatarContainerHeader}>
            <MaterialIcons name="person" size={20} color="#f97316" />
          </View>
          <Text style={styles.headerTitle}>Vitals</Text>
        </View>
        <View style={styles.streakContainer}>
          <Text style={styles.streakText}>🔥 12</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {!user ? (
          <AccountSignInFlow />
        ) : (
          <LoggedInPanel />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LoggedInPanel() {
  const { user, signOut } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  
  const [signingOut, setSigningOut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [program, setProgram] = useState('muscle_gain');

  // Form State
  const [weight, setWeight] = useState('0');
  const [height, setHeight] = useState('0');
  const [age, setAge] = useState('25'); // mocked for UI
  const [gender, setGender] = useState('Not specified'); // mocked for UI
  
  const [targetKcal, setTargetKcal] = useState('2000');
  const [targetProtein, setTargetProtein] = useState('125');
  const [targetCarbs, setTargetCarbs] = useState('225');
  const [targetFat, setTargetFat] = useState('67');
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
        setUsername(profile.username ?? 'User');
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
    }, [loadProfile])
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
      });
      alert('Profile updated successfully!');
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
        <ActivityIndicator color="#f97316" />
      </View>
    );
  }

  return (
    <View style={styles.content}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarWrapper}>
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBi5LX-rFFo5rd3m5_ZpDvbTd0c2wXKTlAFlLA60CrSwDQUjYn4KTMFa-A7AIQNgrqI8dxm7rfWUtBFvXBcxMFOpDaC_qxJP-wQGC5BmcyuKzBeSiEu-FOGp5DmuJGh5YtNFuvaexl1YpR98Eq2Z3NR0hGdw4KW1kZxw9aCNZXygdXixtY2a8ilKHjSvPfc3bNVSnTLA1-gXaDVsf-ct8EGS8FdI-DWl5UjBQFSKIECiY2dN9o6uIQGatWSdFc1xkSkhYjbxIez_341' }}
            style={styles.profileAvatar}
          />
          <Pressable style={styles.editAvatarBtn}>
            <MaterialIcons name="edit" size={16} color="#ffffff" />
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
              <Text style={styles.gridLabel}>GENDER</Text>
              <TextInput style={styles.gridInput} value={gender} onChangeText={setGender} />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>AGE</Text>
              <TextInput style={styles.gridInput} value={age} onChangeText={setAge} keyboardType="numeric" />
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
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '70%' }]} />
            </View>
          </View>
          
          <View style={styles.cardItem}>
            <View style={styles.macroRow}>
              <View style={styles.macroHeader}>
                <Text style={styles.macroName}>Protein (g)</Text>
                <TextInput 
                  style={styles.macroValueInput} 
                  value={targetProtein}
                  onChangeText={setTargetProtein}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.sliderTrack}><View style={[styles.sliderFill, {width: '30%'}]} /></View>
            </View>
            <View style={styles.macroRow}>
              <View style={styles.macroHeader}>
                <Text style={styles.macroName}>Carbs (g)</Text>
                <TextInput 
                  style={styles.macroValueInput} 
                  value={targetCarbs}
                  onChangeText={setTargetCarbs}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.sliderTrack}><View style={[styles.sliderFill, {width: '50%'}]} /></View>
            </View>
            <View style={styles.macroRow}>
              <View style={styles.macroHeader}>
                <Text style={styles.macroName}>Fats (g)</Text>
                <TextInput 
                  style={styles.macroValueInput} 
                  value={targetFat}
                  onChangeText={setTargetFat}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.sliderTrack}><View style={[styles.sliderFill, {width: '20%'}]} /></View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Program Presets</Text>
        <View style={styles.presetGrid}>
          {['Weight Loss', 'Muscle Gain', 'Maintenance', 'Workout Focus'].map((preset) => {
            const isSelected = program === preset.toLowerCase().replace(' ', '_');
            return (
              <Pressable 
                key={preset} 
                style={[styles.presetCard, isSelected && styles.presetCardSelected]}
                onPress={() => setProgram(preset.toLowerCase().replace(' ', '_'))}
              >
                <Text style={[styles.presetText, isSelected && styles.presetTextSelected]}>{preset}</Text>
                {isSelected && <MaterialIcons name="check-circle" size={20} color="#f97316" />}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <View style={styles.card}>
          <Pressable style={[styles.settingsRow, styles.cardItemBorder]}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIcon}>
                <MaterialIcons name="notifications" size={20} color={colors.textMuted} />
              </View>
              <Text style={styles.settingsText}>Notifications</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
          </Pressable>
          
          <Pressable style={[styles.settingsRow, styles.cardItemBorder]}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIcon}>
                <MaterialIcons name="lock" size={20} color={colors.textMuted} />
              </View>
              <Text style={styles.settingsText}>Privacy & Security</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
          </Pressable>

          <View style={styles.settingsRow}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIcon}>
                <MaterialIcons name="dark-mode" size={20} color={colors.textMuted} />
              </View>
              <Text style={styles.settingsText}>Dark Mode</Text>
            </View>
            <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ true: '#f97316' }} />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </Pressable>
        <Pressable 
          style={styles.logoutButton} 
          onPress={handleSignOut} 
          disabled={signingOut}
        >
          <Text style={styles.logoutButtonText}>{signingOut ? 'Logging out...' : 'Log Out'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.background,
    gap: 12,
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
    zIndex: 10,
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
  streakContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
  },
  streakText: {
    color: '#f97316',
    fontWeight: '500',
    fontSize: 13,
  },
  container: {
    flexGrow: 1,
    backgroundColor: c.background,
  },
  content: {
    padding: 20,
    gap: 24,
  },
  profileHeader: {
    alignItems: 'center',
    marginVertical: 16,
  },
  avatarWrapper: {
    marginBottom: 16,
    position: 'relative',
  },
  profileAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: c.surface,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: c.surface,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '600',
    color: c.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 15,
    color: c.textMuted,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: c.text,
    paddingHorizontal: 8,
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
    gap: 4,
  },
  gridItemBorderRight: {
    borderRightWidth: 1,
    borderRightColor: c.border,
  },
  gridItemBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textMuted,
  },
  gridInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  gridInput: {
    fontSize: 17,
    color: '#f97316',
    padding: 0,
  },
  gridUnit: {
    fontSize: 15,
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
  },
  cardItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalLabel: {
    fontSize: 17,
    fontWeight: '500',
    color: c.text,
  },
  goalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  goalInput: {
    fontSize: 17,
    color: '#f97316',
    textAlign: 'right',
    minWidth: 50,
  },
  goalUnit: {
    fontSize: 15,
    color: c.textMuted,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: c.surfaceAlt,
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#f97316',
    borderRadius: 3,
  },
  macroRow: {
    marginBottom: 16,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  macroName: {
    fontSize: 15,
    color: c.text,
  },
  macroValueInput: {
    fontSize: 15,
    fontWeight: '500',
    color: '#f97316',
    textAlign: 'right',
    minWidth: 40,
    padding: 0,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: c.border,
    borderRadius: 2,
  },
  sliderFill: {
    height: '100%',
    backgroundColor: c.borderStrong,
    borderRadius: 2,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetCard: {
    width: '48%',
    backgroundColor: c.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  presetCardSelected: {
    borderColor: '#f97316',
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
  },
  presetText: {
    fontSize: 15,
    fontWeight: '500',
    color: c.text,
  },
  presetTextSelected: {
    color: c.text,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsText: {
    fontSize: 17,
    color: c.text,
  },
  saveButton: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: c.surface,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.border,
    marginTop: 8,
  },
  logoutButtonText: {
    color: c.danger,
    fontSize: 17,
    fontWeight: '500',
  },
  mutedText: {
    color: c.textMuted,
  }
});