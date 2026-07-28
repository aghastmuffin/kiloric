import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { MaterialIcons } from '@expo/vector-icons';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function MedsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.profileAvatarFallback}>
            <MaterialIcons name="person" size={18} color={colors.textMuted} />
          </View>
        </View>
        <Text style={styles.headerTitle}>CalCount</Text>
        <TouchableOpacity style={styles.streakContainer}>
          <Text style={[styles.streakText, { color: colors.streakColor }]}>7</Text>
          <MaterialIcons name="local-fire-department" size={20} color={colors.streakColor} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Medication</Text>
          <Text style={styles.pageSubtitle}>Today, Oct 24</Text>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Daily Adherence</Text>
            <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
              <Text style={[styles.badgeText, { color: colors.accent }]}>66% COMPLETED</Text>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '66%', backgroundColor: colors.accent }]} />
          </View>
          <Text style={styles.progressLabel}>2 of 3 taken</Text>
        </View>

        <View style={styles.timelineSection}>
          {/* Morning Group */}
          <View style={styles.timeGroup}>
            <View style={styles.groupHeader}>
              <MaterialIcons name="light-mode" size={18} color={colors.textMuted} />
              <Text style={styles.groupTitle}>MORNING</Text>
            </View>

            <View style={styles.listContainer}>
              {/* Item 1 Taken */}
              <View style={[styles.listItem, styles.listItemTaken]}>
                <View style={[styles.checkboxTaken, { backgroundColor: colors.accent }]}>
                  <MaterialIcons name="check" size={16} color={colors.onAccent} />
                </View>
                <View style={styles.itemMain}>
                  <Text style={[styles.itemTitle, styles.textStrike]}>Lisinopril</Text>
                  <Text style={styles.itemSubtitle}>10mg • 1 pill</Text>
                </View>
                <Text style={styles.itemTime}>8:00 AM</Text>
              </View>

              {/* Item 2 Taken */}
              <View style={[styles.listItem, styles.listItemTaken, styles.noBorder]}>
                <View style={[styles.checkboxTaken, { backgroundColor: colors.accent }]}>
                  <MaterialIcons name="check" size={16} color={colors.onAccent} />
                </View>
                <View style={styles.itemMain}>
                  <Text style={[styles.itemTitle, styles.textStrike]}>Vitamin D3</Text>
                  <Text style={styles.itemSubtitle}>2000 IU • 1 pill</Text>
                </View>
                <Text style={styles.itemTime}>8:00 AM</Text>
              </View>
            </View>
          </View>

          {/* Afternoon Group */}
          <View style={styles.timeGroup}>
            <View style={styles.groupHeader}>
              <MaterialIcons name="schedule" size={18} color={colors.textMuted} />
              <Text style={styles.groupTitle}>AFTERNOON</Text>
            </View>

            <View style={[styles.activeCard, { borderColor: colors.accentSoft }]}>
              <View style={[styles.activeIndicator, { backgroundColor: colors.accent }]} />
              <View style={styles.activeContent}>
                <View style={styles.itemLeft}>
                  <View style={styles.checkboxEmpty} />
                  <View style={styles.itemMain}>
                    <Text style={styles.itemTitle}>Metformin</Text>
                    <Text style={styles.itemSubtitle}>
                      500mg • 1 pill <Text style={[styles.errorText, { color: colors.danger }]}>Overdue (2:00 PM)</Text>
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.accent }]} activeOpacity={0.8}>
                  <Text style={[styles.actionButtonText, { color: colors.onAccent }]}>Mark as Taken</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
  headerLeft: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.surfaceAlt,
    overflow: 'hidden',
  },
  profileAvatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: c.text,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakText: {
    fontWeight: '500',
    fontSize: 13,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 24,
  },
  titleSection: {
    marginTop: 16,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: c.text,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 17,
    color: c.textMuted,
    marginTop: 8,
  },
  progressCard: {
    backgroundColor: c.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    gap: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: c.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: c.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 13,
    color: c.textMuted,
    textAlign: 'right',
  },
  timelineSection: {
    gap: 24,
  },
  timeGroup: {
    gap: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupTitle: {
    fontSize: 13,
    color: c.textMuted,
    letterSpacing: 1,
    fontWeight: '500',
  },
  listContainer: {
    backgroundColor: c.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    gap: 16,
  },
  listItemTaken: {
    opacity: 0.7,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  checkboxTaken: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.borderStrong,
  },
  itemMain: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: c.text,
  },
  textStrike: {
    textDecorationLine: 'line-through',
  },
  itemSubtitle: {
    fontSize: 15,
    color: c.textMuted,
  },
  itemTime: {
    fontSize: 13,
    color: c.textMuted,
  },
  activeCard: {
    backgroundColor: c.surface,
    borderRadius: 8,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
    elevation: 2,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  activeContent: {
    padding: 16,
    paddingLeft: 20,
    flexDirection: 'column',
    gap: 12,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontWeight: '500',
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 99,
    alignItems: 'center',
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  }
});
