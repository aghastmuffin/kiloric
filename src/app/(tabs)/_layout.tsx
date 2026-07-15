import { ProfileGate } from '@/components/ProfileGate';
import { useFontPreferences } from '@/lib/FontPreferencesContext';
import { SearchPreferencesProvider } from '@/lib/SearchPreferencesContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

function TabNavigator() {
  const { activeFontFamily } = useFontPreferences();
  const { colors } = useTheme();

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
        headerTitleStyle: { ...navigationFontStyle, fontWeight: '600', fontSize: 17 },
        tabBarIconStyle: { marginBottom: -2 },
        tabBarLabelStyle: { ...navigationFontStyle, fontSize: 11, fontWeight: '600' },
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
        name="logfood"
        options={{
          title: 'Log',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: 'Meals',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'fast-food' : 'fast-food-outline'} color={color} size={24} />
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
          href: null,
          title: 'About',
        }}
      />
      <Tabs.Screen
        name="basepg"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="meds"
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
