import { ApiErrorProvider } from '@/lib/ApiErrorContext';
import { ApiBackendPreferencesProvider } from '@/lib/ApiBackendPreferencesContext';
import { AuthProvider } from '@/lib/AuthContext';
import { FontPreferencesProvider, useFontPreferences } from '@/lib/FontPreferencesContext';
import { FONT_FAMILY, fontAssets } from '@/lib/fonts';
import { MealTypePreferencesProvider } from '@/lib/MealTypePreferencesContext';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-url-polyfill/auto';

SplashScreen.preventAutoHideAsync();

function buildNavigationTheme(
  base: Theme,
  colors: ThemeColors,
  activeFontFamily: string,
): Theme {
  const themed: Theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.surfaceMuted,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
  };

  const font = (fontWeight: '400' | '500' | '600' | '700') => ({
    fontFamily: activeFontFamily,
    fontWeight,
  });

  return {
    ...themed,
    fonts: {
      regular: font('400'),
      medium: font('500'),
      bold: font('600'),
      heavy: font('700'),
    },
  };
}

function RootNavigation() {
  const { activeFontFamily } = useFontPreferences();
  const { colors, scheme } = useTheme();
  const resolvedFontFamily = activeFontFamily ?? FONT_FAMILY;

  const navigationTheme = useMemo(
    () =>
      buildNavigationTheme(
        scheme === 'light' ? DefaultTheme : DarkTheme,
        colors,
        resolvedFontFamily,
      ),
    [scheme, colors, resolvedFontFamily],
  );

  const navigationFontStyle = { fontFamily: resolvedFontFamily };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
      <ApiErrorProvider>
        <ApiBackendPreferencesProvider>
          <AuthProvider>
            <MealTypePreferencesProvider>
              <Stack screenOptions={{ headerTitleStyle: navigationFontStyle }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="cameraview"
                  options={{ headerShown: true, headerTitle: "Scan Barcode", unmountOnBlur: true }}
                />
                <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
                <Stack.Screen name="onboard_success" options={{ headerShown: false, gestureEnabled: false }} />
                <Stack.Screen name="Additions" options={{ headerShown: false }} />
                <Stack.Screen name="config" options={{ headerShown: true, headerTitle: "Profile" }} />
                <Stack.Screen name="multiresponse" options={{ headerShown: true, headerTitle: "Results" }} />
                <Stack.Screen
                  name="contribute-food"
                  options={{ headerShown: true, headerTitle: "Add missing food" }}
                />
                <Stack.Screen name="fooddetail" options={{ headerShown: true, headerTitle: "Food Details" }} />
                <Stack.Screen name="present_n_save" options={{ headerShown: true, headerTitle: "Confirm Selection" }} />
              </Stack>
            </MealTypePreferencesProvider>
          </AuthProvider>
        </ApiBackendPreferencesProvider>
      </ApiErrorProvider>
    </ThemeProvider>
  );
}

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <FontPreferencesProvider customFontLoaded={fontsLoaded && !fontError}>
          <RootNavigation />
        </FontPreferencesProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

export default RootLayout;