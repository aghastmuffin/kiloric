import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { MaterialIcons } from '@expo/vector-icons';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Switch } from 'react-native';

export default function AccountScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.avatarContainerHeader}>
            <MaterialIcons name="person" size={20} color="#9d4300" />
          </View>
          <Text style={styles.headerTitle}>Vitals</Text>
        </View>
        <TouchableOpacity style={styles.streakContainer}>
          <Text style={styles.streakText}>🔥 12</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBi5LX-rFFo5rd3m5_ZpDvbTd0c2wXKTlAFlLA60CrSwDQUjYn4KTMFa-A7AIQNgrqI8dxm7rfWUtBFvXBcxMFOpDaC_qxJP-wQGC5BmcyuKzBeSiEu-FOGp5DmuJGh5YtNFuvaexl1YpR98Eq2Z3NR0hGdw4KW1kZxw9aCNZXygdXixtY2a8ilKHjSvPfc3bNVSnTLA1-gXaDVsf-ct8EGS8FdI-DWl5UjBQFSKIECiY2dN9o6uIQGatWSdFc1xkSkhYjbxIez_341' }}
              style={styles.profileAvatar}
            />
            <TouchableOpacity style={styles.editAvatarBtn}>
              <MaterialIcons name="edit" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>Sarah Jenkins</Text>
          <Text style={styles.profileEmail}>sarah.jenkins@example.com</Text>
        </View>

        {/* Personal Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <View style={styles.card}>
            <View style={styles.gridRow}>
              <View style={[styles.gridItem, styles.gridItemBorderRight, styles.gridItemBorderBottom]}>
                <Text style={styles.gridLabel}>Weight</Text>
                <View style={styles.gridInputRow}>
                  <TextInput style={styles.gridInput} value="68" keyboardType="numeric" />
                  <Text style={styles.gridUnit}>kg</Text>
                </View>
              </View>
              <View style={[styles.gridItem, styles.gridItemBorderBottom]}>
                <Text style={styles.gridLabel}>Height</Text>
                <View style={styles.gridInputRow}>
                  <TextInput style={styles.gridInput} value="172" keyboardType="numeric" />
                  <Text style={styles.gridUnit}>cm</Text>
                </View>
              </View>
            </View>
            <View style={styles.gridRow}>
              <View style={[styles.gridItem, styles.gridItemBorderRight]}>
                <Text style={styles.gridLabel}>Gender</Text>
                <TextInput style={styles.gridInput} value="Female" />
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Age</Text>
                <TextInput style={styles.gridInput} value="28" keyboardType="numeric" />
              </View>
            </View>
          </View>
        </View>

        {/* Nutrition Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition Goals</Text>
          <View style={styles.card}>
            <View style={[styles.cardItem, styles.cardItemBorder]}>
              <View style={styles.goalRow}>
                <Text style={styles.goalLabel}>Daily Calories</Text>
                <View style={styles.goalInputRow}>
                  <TextInput style={styles.goalInput} value="2100" keyboardType="numeric" />
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
                  <Text style={styles.macroName}>Protein (30%)</Text>
                  <Text style={styles.macroValue}>158g</Text>
                </View>
                <View style={styles.sliderTrack}><View style={[styles.sliderFill, {width: '30%'}]} /></View>
              </View>
              <View style={styles.macroRow}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroName}>Carbs (50%)</Text>
                  <Text style={styles.macroValue}>263g</Text>
                </View>
                <View style={styles.sliderTrack}><View style={[styles.sliderFill, {width: '50%'}]} /></View>
              </View>
              <View style={styles.macroRow}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroName}>Fats (20%)</Text>
                  <Text style={styles.macroValue}>47g</Text>
                </View>
                <View style={styles.sliderTrack}><View style={[styles.sliderFill, {width: '20%'}]} /></View>
              </View>
            </View>
          </View>
        </View>

        {/* Program Presets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Program Presets</Text>
          <View style={styles.presetGrid}>
            {['Weight Loss', 'Muscle Gain', 'Maintenance', 'Workout Focus'].map((preset) => {
              const isSelected = preset === 'Muscle Gain';
              return (
                <TouchableOpacity 
                  key={preset} 
                  style={[styles.presetCard, isSelected && styles.presetCardSelected]}
                >
                  <Text style={[styles.presetText, isSelected && styles.presetTextSelected]}>{preset}</Text>
                  {isSelected && <MaterialIcons name="check-circle" size={20} color="#f97316" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <View style={styles.card}>
            <TouchableOpacity style={[styles.settingsRow, styles.cardItemBorder]}>
              <View style={styles.settingsRowLeft}>
                <View style={styles.settingsIcon}>
                  <MaterialIcons name="notifications" size={20} color={colors.textMuted} />
                </View>
                <Text style={styles.settingsText}>Notifications</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.settingsRow, styles.cardItemBorder]}>
              <View style={styles.settingsRowLeft}>
                <View style={styles.settingsIcon}>
                  <MaterialIcons name="lock" size={20} color={colors.textMuted} />
                </View>
                <Text style={styles.settingsText}>Privacy & Security</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.settingsRow}>
              <View style={styles.settingsRowLeft}>
                <View style={styles.settingsIcon}>
                  <MaterialIcons name="dark-mode" size={20} color={colors.textMuted} />
                </View>
                <Text style={styles.settingsText}>Dark Mode</Text>
              </View>
              <Switch value={false} trackColor={{ true: '#f97316' }} />
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.background,
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
  streakContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
  },
  streakText: {
    color: '#9d4300',
    fontWeight: '500',
    fontSize: 13,
  },
  content: {
    padding: 20,
    gap: 24,
    paddingBottom: 40,
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
  card: {
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
    textTransform: 'uppercase',
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
    padding: 0,
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
  macroValue: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textMuted,
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
  actionsSection: {
    gap: 16,
    marginTop: 16,
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
  },
  logoutButtonText: {
    color: c.danger,
    fontSize: 17,
    fontWeight: '500',
  },
});