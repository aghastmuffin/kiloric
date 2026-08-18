import { MEAL_TYPE_OPTIONS } from '@/lib/meals'
import { useMealTypePreferences } from '@/lib/MealTypePreferencesContext'
import { useTheme } from '@/lib/theme/ThemeContext'
import type { ThemeColors } from '@/lib/theme/tokens'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { triggerSelectionHaptic } from '@/lib/haptics'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/** Permanently affixed meal-type selector (scan tab). */
export function MealTypePicker() {
  const insets = useSafeAreaInsets()
  const { selectedMealType, setSelectedMealType } = useMealTypePreferences()
  const styles = useThemedStyles(makeStyles)
  const { colors } = useTheme()
  const [open, setOpen] = useState(false)
  const bottomOffset =  insets.bottom + 18

  return (
    <View style={[styles.anchor, { bottom: bottomOffset }]}>
      {open ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close meal type menu"
          style={styles.backdrop}
          onPress={() => {
            triggerSelectionHaptic()
            setOpen(false)
          }}
        />
      ) : null}

      {open ? (
        <View style={styles.menu}>
          {MEAL_TYPE_OPTIONS.map((type) => {
            const selected = type === selectedMealType
            return (
              <Pressable
                key={type}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  triggerSelectionHaptic()
                  void setSelectedMealType(type)
                  setOpen(false)
                }}
                style={({ pressed }) => [
                  styles.menuItem,
                  selected && styles.menuItemSelected,
                  pressed && styles.menuItemPressed,
                ]}
              >
                <Text style={[styles.menuItemText, selected && styles.menuItemTextSelected]}>
                  {type}
                </Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Meal type: ${selectedMealType}. Tap to change.`}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          triggerSelectionHaptic()
          setOpen((value) => !value)
        }}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
      >
        <Ionicons name="restaurant-outline" size={18} color={colors.accent} />
        <Text style={styles.triggerText}>{selectedMealType}</Text>
        <Ionicons
          name={open ? 'chevron-down' : 'chevron-up'}
          size={16}
          color={colors.textMuted}
        />
      </Pressable>
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  anchor: {
    position: 'absolute',
    left: 18,
    zIndex: 40,
    alignItems: 'flex-start',
  },
  backdrop: {
    position: 'absolute',
    top: -2000,
    left: -2000,
    right: -2000,
    bottom: -2000,
    zIndex: 1,
  },
  menu: {
    position: 'absolute',
    bottom: 54,
    left: 0,
    minWidth: 148,
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 6,
    zIndex: 2,
    gap: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
      web: { boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.45)' },
    }),
  },
  menuItem: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  menuItemSelected: {
    backgroundColor: c.accentSoft,
  },
  menuItemPressed: {
    opacity: 0.85,
  },
  menuItemText: {
    color: c.text,
    fontSize: 15,
    fontWeight: '500',
  },
  menuItemTextSelected: {
    color: c.accent,
    fontWeight: '700',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    zIndex: 3,
  },
  triggerPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  triggerText: {
    color: c.text,
    fontSize: 15,
    fontWeight: '700',
  },
})
