import { ProfileGate } from '@/components/ProfileGate';
import { useFontPreferences } from '@/lib/FontPreferencesContext';
import { FONT_FAMILY, MONO_FONT_FAMILY } from '@/lib/fonts';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useAppLayout } from '@/lib/theme/layout';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabNavigator() {
  const { activeFontFamily } = useFontPreferences();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { compact } = useAppLayout();
  const navigationFontStyle = {
    fontFamily: activeFontFamily ?? FONT_FAMILY,
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarActiveBackgroundColor: colors.brandSoft,
        headerStyle: {
          backgroundColor: colors.surfaceMuted,
        },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { ...navigationFontStyle, fontWeight: '600', fontSize: 17 },
        tabBarHideOnKeyboard: true,
        tabBarAllowFontScaling: true,
        tabBarIconStyle: { marginBottom: -1 },
        tabBarLabelStyle: {
          fontFamily: MONO_FONT_FAMILY,
          fontSize: compact ? 10 : 11,
          lineHeight: 14,
          fontWeight: '500',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        },
        tabBarItemStyle: {
          minHeight: 52,
          borderRadius: 16,
          marginHorizontal: 2,
          marginVertical: 5,
        },
        tabBarStyle: {
          position: 'absolute',
          width: '92%',
          maxWidth: 560,
          ...Platform.select({
            web: {
              left: '50%',
              transform: [{ translateX: '-50%' }],
            } as never,
            default: {
              left: '4%',
              right: '4%',
            },
          }),
          bottom: Math.max(insets.bottom, 8),
          backgroundColor: colors.surface,
          borderColor: colors.border,
          paddingHorizontal: 6,
          paddingTop: 1,
          paddingBottom: 1,
          borderWidth: StyleSheet.hairlineWidth,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderRadius: 20,
          height: 64,
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.10,
          shadowRadius: 18,
          elevation: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarAccessibilityLabel: 'Today, dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="logfood"
        options={{
          title: 'Log',
          tabBarAccessibilityLabel: 'Log food and meals',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarAccessibilityLabel: 'Stats and progress',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'You',
          tabBarAccessibilityLabel: 'Your account and settings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={22} />
          ),
        }}
      />
      {/* Feature routes kept off the tab bar; opened from Dashboard / Log / Account. */}
      <Tabs.Screen name="meals" options={{ href: null }} />
      <Tabs.Screen name="workouts" options={{ href: null }} />
      <Tabs.Screen name="meds" options={{ href: null }} />
      <Tabs.Screen name="searchrewrite" options={{ href: null }} />
      <Tabs.Screen name="about" options={{ href: null, title: 'About' }} />
      <Tabs.Screen name="basepg" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ProfileGate>
        <TabNavigator />
      </ProfileGate>
    </GestureHandlerRootView>
  );
}
