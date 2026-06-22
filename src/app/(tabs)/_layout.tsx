import { StyleSheet } from 'react-native';
import { ProfileGate } from '@/components/ProfileGate';
import { useFontPreferences } from '@/lib/FontPreferencesContext';
import { SearchPreferencesProvider, useSearchPreferences } from '@/lib/SearchPreferencesContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';


function TabNavigator() {
  const { defaultSearchMode } = useSearchPreferences();
  const { activeFontFamily } = useFontPreferences();
  const { colors } = useTheme();
  const showScanTab = defaultSearchMode === 'scan';
  const navigationFontStyle = activeFontFamily
    ? { fontFamily: activeFontFamily }
    : undefined;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        headerStyle: {
          backgroundColor: colors.surfaceMuted,
        },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { ...navigationFontStyle, fontWeight: '600' as const, fontSize: 17 },
        tabBarIconStyle: { marginBottom: -2 },
        tabBarLabelStyle: { ...navigationFontStyle, fontSize: 11, fontWeight: '600' as const },
        tabBarStyle: {
          backgroundColor: colors.surfaceMuted,
          borderTopColor: colors.border,
          paddingTop: 6,
          paddingBottom: 4,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home-sharp' : 'home-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          href: showScanTab ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'camera' : 'camera-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="text_query"
        options={{
          title: 'Manual Search',
          href: showScanTab ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: 'Meals',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'fast-food' : 'fast-food-outline'} color={color} size={24}/>
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
        name="about"
        options={{
          title: 'About',
          href: null,
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
    <ProfileGate>
      <SearchPreferencesProvider>
        <TabNavigator />
      </SearchPreferencesProvider>
    </ProfileGate>
  );
}
