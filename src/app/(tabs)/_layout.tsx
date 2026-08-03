import { ProfileGate } from '@/components/ProfileGate';
import { useFontPreferences } from '@/lib/FontPreferencesContext';
import { SearchPreferencesProvider } from '@/lib/SearchPreferencesContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import { FONT_FAMILY } from '@/lib/fonts';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function TabNavigator() {
  const { activeFontFamily } = useFontPreferences();
  const { colors } = useTheme();
  const navigationFontStyle = activeFontFamily
    ? { fontFamily: activeFontFamily }
    : { fontFamily: FONT_FAMILY };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarActiveBackgroundColor: colors.accentSoft,
        headerStyle: {
          backgroundColor: colors.surfaceMuted,
        },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { ...navigationFontStyle, fontWeight: '600', fontSize: 17 },
        tabBarIconStyle: { marginBottom: -1 },
        tabBarLabelStyle: { ...navigationFontStyle, fontSize: 10, fontWeight: '600' },
        tabBarItemStyle: {
          borderRadius: 12,
          marginHorizontal: 4,
          marginVertical: 5,
        },
        tabBarStyle: {
          backgroundColor: colors.surfaceMuted,
          borderTopColor: colors.border,
          paddingHorizontal: 8,
          paddingTop: 2,
          paddingBottom: 2,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 68,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="logfood"
        options={{
          title: 'Log',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} color={color} size={22}/>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="workouts"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="meds"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="about"
        options={{
          href: null,
          title: 'About',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'information-circle' : 'information-circle-outline'} color={color} size={24}/>
          ),
        }}
      />
      <Tabs.Screen
        name="basepg"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ProfileGate>
        <SearchPreferencesProvider>
          <TabNavigator />
        </SearchPreferencesProvider>
      </ProfileGate>
    </GestureHandlerRootView>
  );
}