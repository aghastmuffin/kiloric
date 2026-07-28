import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { MaterialIcons } from '@expo/vector-icons';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function WorkoutsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
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
          <Text style={styles.pageTitle}>Workouts</Text>
          <Text style={styles.pageSubtitle}>Stay active, stay healthy.</Text>
        </View>

        <View style={styles.calendarStrip}>
          {['Mon', 'Tue'].map((day, i) => (
            <TouchableOpacity key={day} style={styles.dayItem}>
              <Text style={styles.dayLabel}>{day}</Text>
              <Text style={styles.dayNumber}>{12 + i}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.dayItem, styles.activeDayItem]}>
            <Text style={styles.activeDayLabel}>Wed</Text>
            <Text style={styles.activeDayNumber}>14</Text>
            <View style={styles.activeDayDot} />
          </TouchableOpacity>
          {['Thu', 'Fri', 'Sat'].map((day, i) => (
            <TouchableOpacity key={day} style={styles.dayItem}>
              <Text style={styles.dayLabel}>{day}</Text>
              <Text style={styles.dayNumber}>{15 + i}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.summarySection}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <MaterialIcons name="timer" size={18} color={colors.accent} />
              <Text style={styles.summaryLabel}>Active Time</Text>
            </View>
            <View style={styles.summaryValueRow}>
              <Text style={styles.summaryValue}>45</Text>
              <Text style={styles.summaryUnit}>min</Text>
            </View>
          </View>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <MaterialIcons name="local-fire-department" size={18} color={colors.streakColor} />
              <Text style={styles.summaryLabel}>Energy Burned</Text>
            </View>
            <View style={styles.summaryValueRow}>
              <Text style={styles.summaryValue}>320</Text>
              <Text style={styles.summaryUnit}>kcal</Text>
            </View>
          </View>
        </View>

        <View style={styles.planSection}>
          <View style={styles.planHeader}>
            <Text style={styles.planTitle}>Today's Plan</Text>
            <TouchableOpacity>
              <Text style={[styles.editButton, { color: colors.accent }]}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listContainer}>
            {/* Completed */}
            <View style={[styles.listItem, styles.listItemDone]}>
              <View style={styles.itemLeft}>
                <View style={styles.iconBoxCompleted}>
                  <MaterialIcons name="directions-run" size={24} color={colors.textMuted} />
                </View>
                <View>
                  <Text style={[styles.itemTitle, styles.textStrike]}>Morning Jog</Text>
                  <Text style={styles.itemSubtitle}>30 min • 250 kcal</Text>
                </View>
              </View>
              <View style={[styles.checkCircle, { backgroundColor: colors.accent }]}>
                <MaterialIcons name="check" size={16} color={colors.onAccent} />
              </View>
            </View>

            {/* Pending 1 */}
            <View style={styles.listItem}>
              <View style={styles.itemLeft}>
                <View style={styles.iconBox}>
                  <MaterialIcons name="fitness-center" size={24} color={colors.text} />
                </View>
                <View>
                  <Text style={styles.itemTitle}>Upper Body Strength</Text>
                  <Text style={styles.itemSubtitle}>45 min • Targeting chest & arms</Text>
                </View>
              </View>
              <View style={styles.emptyCircle} />
            </View>

            {/* Pending 2 */}
            <View style={[styles.listItem, styles.noBorder]}>
              <View style={styles.itemLeft}>
                <View style={styles.iconBox}>
                  <MaterialIcons name="self-improvement" size={24} color={colors.text} />
                </View>
                <View>
                  <Text style={styles.itemTitle}>Evening Yoga</Text>
                  <Text style={styles.itemSubtitle}>20 min • Recovery</Text>
                </View>
              </View>
              <View style={styles.emptyCircle} />
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.addButton, { borderColor: colors.accent }]}>
          <MaterialIcons name="add" size={24} color={colors.accent} />
          <Text style={[styles.addButtonText, { color: colors.accent }]}>Add New Workout</Text>
        </TouchableOpacity>

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
  avatarContainer: {
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
    marginBottom: 24,
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
  calendarStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: c.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  dayItem: {
    width: 40,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  dayLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    color: c.textMuted,
  },
  dayNumber: {
    fontSize: 17,
    fontWeight: '600',
    color: c.text,
  },
  activeDayItem: {
    backgroundColor: c.accent,
    width: 44,
    height: 56,
    shadowColor: c.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  activeDayLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    color: c.onAccent,
    opacity: 0.9,
  },
  activeDayNumber: {
    fontSize: 17,
    fontWeight: '600',
    color: c.onAccent,
  },
  activeDayDot: {
    width: 4,
    height: 4,
    backgroundColor: c.onAccent,
    borderRadius: 2,
    marginTop: 2,
  },
  summarySection: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: c.textMuted,
  },
  summaryValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  summaryValue: {
    fontSize: 34,
    fontWeight: '700',
    color: c.text,
  },
  summaryUnit: {
    fontSize: 15,
    color: c.textMuted,
  },
  planSection: {
    marginBottom: 24,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: c.text,
  },
  editButton: {
    fontSize: 13,
  },
  listContainer: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  listItemDone: {
    backgroundColor: c.accentSoft,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxCompleted: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: c.text,
  },
  textStrike: {
    textDecorationLine: 'line-through',
    color: c.textMuted,
  },
  itemSubtitle: {
    fontSize: 15,
    color: c.textMuted,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.borderStrong,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 99,
    borderWidth: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 300,
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
