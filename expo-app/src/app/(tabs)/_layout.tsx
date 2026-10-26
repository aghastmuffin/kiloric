import { FEATURES } from '@/lib/features'
import { ShellContext, WIDE_BREAKPOINT, type ShellInfo } from '@/components/ds'
import { ProfileGate } from '@/components/ProfileGate'
import { useAuth } from '@/lib/AuthContext'
import { loadStreak } from '@/lib/data/overview'
import { fonts, usePalette } from '@/lib/theme/palette'
import { Ionicons } from '@expo/vector-icons'
import { usePathname } from 'expo-router'
import { TabList, Tabs, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui'
import { useEffect, useMemo, useState, type ComponentProps } from 'react'
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type IconName = ComponentProps<typeof Ionicons>['name']

type NavItem = { name: string; label: string; sidebarLabel: string; icon: IconName; activeIcon: IconName }

const ALL_NAV: NavItem[] = [
  { name: 'index', label: 'Today', sidebarLabel: 'Today', icon: 'home-outline', activeIcon: 'home' },
  { name: 'plan', label: 'Plan', sidebarLabel: 'Meal plan', icon: 'calendar-outline', activeIcon: 'calendar' },
  { name: 'logfood', label: 'Log', sidebarLabel: 'Food log', icon: 'restaurant-outline', activeIcon: 'restaurant' },
  { name: 'train', label: 'Train', sidebarLabel: 'Workouts', icon: 'barbell-outline', activeIcon: 'barbell' },
  { name: 'progress', label: 'Progress', sidebarLabel: 'Progress', icon: 'trending-up-outline', activeIcon: 'trending-up' },
]

const NAV: NavItem[] = ALL_NAV.filter((item) => item.name !== 'train' || FEATURES.workouts)

const BAR_HEIGHT = 74

type NavButtonProps = TabTriggerSlotProps & { item: NavItem; variant: 'bar' | 'sidebar' }

function NavButton({ item, variant, isFocused, ...props }: NavButtonProps) {
  const c = usePalette()
  const color = isFocused ? c.primary : c.inkMuted
  if (variant === 'sidebar') {
    return (
      <Pressable
        {...props}
        accessibilityRole="tab"
        accessibilityState={{ selected: !!isFocused }}
        style={({ pressed }) => [
          styles.sideItem,
          { backgroundColor: isFocused ? c.mint : pressed ? c.chip : 'transparent' },
        ]}
      >
        <Ionicons name={isFocused ? item.activeIcon : item.icon} size={20} color={isFocused ? c.ink : c.inkMuted} />
        <Text style={[styles.sideLabel, { color: c.ink, fontFamily: isFocused ? fonts.bold : fonts.medium }]}>
          {item.sidebarLabel}
        </Text>
      </Pressable>
    )
  }
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: !!isFocused }}
      style={styles.barItem}
    >
      <Ionicons name={isFocused ? item.activeIcon : item.icon} size={24} color={color} />
      <Text style={[styles.barLabel, { color, fontFamily: isFocused ? fonts.bold : fonts.medium }]}>{item.label}</Text>
    </Pressable>
  )
}

function AddButton(props: TabTriggerSlotProps) {
  const c = usePalette()
  const { isFocused, ...rest } = props
  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityLabel="Log food"
      accessibilityState={{ selected: !!isFocused }}
      style={styles.barItem}
    >
      <View style={[styles.addCircle, { backgroundColor: c.primary, borderColor: isFocused ? c.mint : c.card }]}>
        <Ionicons name="add" size={32} color={c.onPrimary} />
      </View>
    </Pressable>
  )
}

function BottomBar() {
  const c = usePalette()
  const insets = useSafeAreaInsets()
  const today = NAV.find((item) => item.name === 'index')!
  const plan = NAV.find((item) => item.name === 'plan')!
  const right = NAV.filter((item) => item.name === 'train' || item.name === 'progress')
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        { backgroundColor: c.card, borderTopColor: c.line, paddingBottom: Math.max(insets.bottom, 8), height: BAR_HEIGHT + insets.bottom },
      ]}
    >
      {[today, plan].map((item) => (
        <TabTrigger key={item.name} name={item.name} asChild>
          <NavButton item={item} variant="bar" />
        </TabTrigger>
      ))}
      <TabTrigger name="logfood" asChild>
        <AddButton />
      </TabTrigger>
      {right.map((item) => (
        <TabTrigger key={item.name} name={item.name} asChild>
          <NavButton item={item} variant="bar" />
        </TabTrigger>
      ))}
    </View>
  )
}

function Sidebar() {
  const c = usePalette()
  const { user } = useAuth()
  const pathname = usePathname()
  const [streak, setStreak] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    let active = true
    loadStreak(user.$id)
      .then((value) => {
        if (active) setStreak(value)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [user, pathname])

  return (
    <View style={[styles.sidebar, { backgroundColor: c.card, borderRightColor: c.line }]}>
      <View style={styles.brand}>
        <View style={[styles.logo, { backgroundColor: c.primary }]}>
          <Text style={[styles.logoText, { color: c.onPrimary }]}>C</Text>
        </View>
        <Text style={[styles.brandText, { color: c.ink }]}>kiloric</Text>
      </View>
      <View accessibilityRole="tablist" style={styles.sideNav}>
        {NAV.map((item) => (
          <TabTrigger key={item.name} name={item.name} asChild>
            <NavButton item={item} variant="sidebar" />
          </TabTrigger>
        ))}
      </View>
      <View style={styles.flex} />
      <TabTrigger name="account" asChild>
        <NavButton
          item={{ name: 'account', label: 'Account', sidebarLabel: 'Account', icon: 'person-circle-outline', activeIcon: 'person-circle' }}
          variant="sidebar"
        />
      </TabTrigger>
      {streak != null && streak > 0 ? (
        <View style={[styles.streak, { backgroundColor: c.peach }]}>
          <Ionicons name="flame-outline" size={20} color={c.peachInk} />
          <View>
            <Text style={[styles.streakTitle, { color: c.peachInk }]}>
              {streak} day streak
            </Text>
            <Text style={[styles.streakBody, { color: c.peachInk }]}>Logged every day</Text>
          </View>
        </View>
      ) : null}
    </View>
  )
}

function Shell() {
  const c = usePalette()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const wide = width >= WIDE_BREAKPOINT
  const shell = useMemo<ShellInfo>(
    () => ({ wide, bottomClearance: wide ? 0 : BAR_HEIGHT + insets.bottom }),
    [wide, insets.bottom],
  )

  return (
    <Tabs style={styles.flex}>
      <ShellContext.Provider value={shell}>
        <View style={[styles.frame, { backgroundColor: c.bg }]}>
          {wide ? <Sidebar /> : null}
          <View style={styles.flex}>
            <TabSlot style={styles.flex} />
          </View>
          {wide ? null : <BottomBar />}
        </View>
      </ShellContext.Provider>
      <TabList style={styles.hidden}>
        <TabTrigger name="index" href="/" />
        <TabTrigger name="plan" href="/plan" />
        <TabTrigger name="logfood" href="/logfood" />
        <TabTrigger name="train" href="/train" />
        <TabTrigger name="progress" href="/progress" />
        <TabTrigger name="account" href="/account" />
      </TabList>
    </Tabs>
  )
}

export default function TabLayout() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <ProfileGate>
        <Shell />
      </ProfileGate>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hidden: { display: 'none' },
  frame: { flex: 1, flexDirection: 'row' },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 6,
  },
  barItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 56 },
  barLabel: { fontSize: 13, lineHeight: 16 },
  addCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    marginTop: -22,
  },
  sidebar: { width: 248, borderRightWidth: 1, paddingHorizontal: 16, paddingVertical: 28, gap: 8 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, marginBottom: 24 },
  logo: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontFamily: fonts.heavy, fontSize: 16 },
  brandText: { fontFamily: fonts.heavy, fontSize: 20, letterSpacing: -0.4 },
  sideNav: { gap: 4 },
  sideItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, height: 46, borderRadius: 14 },
  sideLabel: { fontSize: 16 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, marginTop: 8 },
  streakTitle: { fontFamily: fonts.bold, fontSize: 15 },
  streakBody: { fontFamily: fonts.medium, fontSize: 13 },
})
