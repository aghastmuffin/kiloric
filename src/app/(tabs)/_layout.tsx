import { ProfileGate } from '@/components/ProfileGate';
import { useFontPreferences } from '@/lib/FontPreferencesContext';
import { FONT_FAMILY, MONO_FONT_FAMILY } from '@/lib/fonts';
import { useTheme } from '@/lib/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function TabNavigator() {
  const { activeFontFamily } = useFontPreferences();
  const { colors } = useTheme();
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
        tabBarIconStyle: { marginBottom: -2 },
        tabBarLabelStyle: {
          fontFamily: MONO_FONT_FAMILY,
          fontSize: 9,
          fontWeight: '400',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        },
        tabBarItemStyle: {
          borderRadius: 17,
          marginHorizontal: 3,
          marginVertical: 6,
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
          bottom: 10,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          paddingHorizontal: 6,
          paddingTop: 1,
          paddingBottom: 1,
          borderWidth: StyleSheet.hairlineWidth,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderRadius: 22,
          height: 66,
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
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'You',
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
