import { AccountSignInFlow } from '@/components/auth/AccountSignInFlow';
import { FontPreferencePicker } from '@/components/FontPreferencePicker';
import { ThemePreferencePicker } from '@/components/ThemePreferencePicker';
import { ThemedSegmentedControl } from '@/components/ThemedSegmentedControl';
import { showApiError } from '@/lib/apiErrors';
import { useAuth } from '@/lib/AuthContext';
import { getAccessToken } from '@/lib/getAccessToken';
import type { DefaultSearchMode } from '@/lib/searchPreferences';
import { useSearchPreferences } from '@/lib/SearchPreferencesContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import type { Models } from 'react-native-appwrite';

type AppwriteUser = Models.User<Models.Preferences>;

export default function AccountScreen() {
  const { user, loading } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.mutedText}>Restoring session…</Text>
      </View>
    );
  }

  if (!user) {
    return <AccountSignInFlow />;
  }

  return <LoggedInPanel user={user} />;
}

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

export function UserCard({ user, tokenPreview }: { user: AppwriteUser; tokenPreview: string }) {
  const styles = useThemedStyles(makeStyles);
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  return (
    <View style={styles.card}>
      <Pressable onPress={toggle} style={styles.header}>
        <Text style={styles.hint}>
          {expanded ? '▲ Debug Details' : '▼ Debug Details'}
        </Text>
      </Pressable>

      {expanded && (
        <View style={styles.dropdown}>
          <Text style={styles.cardLabel}>User ID</Text>
          <Text style={styles.cardValue}>{user.$id}</Text>

          <Text style={styles.cardLabel}>Email</Text>
          <Text style={styles.cardValue}>{user.email ?? '—'}</Text>

          <Text style={styles.cardLabel}>Access token (preview)</Text>
          <Text style={styles.mono}>{tokenPreview}</Text>

          <Text style={styles.hint}>
            Authorization: <Text style={styles.mono}>Bearer &lt;access_token&gt;</Text>
          </Text>
        </View>
      )}
    </View>
  );
}

function LoggedInPanel({ user }: { user: AppwriteUser }) {
  const { signOut } = useAuth();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { defaultSearchMode, setDefaultSearchMode } = useSearchPreferences();
  const [signingOut, setSigningOut] = useState(false);
  const [tokenPreview, setTokenPreview] = useState('Loading…');
  const [savingPreference, setSavingPreference] = useState(false);

  useEffect(() => {
    getAccessToken().then((token) => {
      setTokenPreview(token ? `${token.slice(0, 24)}…` : '—');
    });
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      showApiError(err, 'appwrite');
    } finally {
      setSigningOut(false);
    }
  }

  async function handleSearchModeChange(mode: DefaultSearchMode) {
    if (mode === defaultSearchMode || savingPreference) return;
    setSavingPreference(true);
    try {
      await setDefaultSearchMode(mode);
    } finally {
      setSavingPreference(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Welcome back, {user.email}!</Text>
      <UserCard user={user} tokenPreview={tokenPreview} />

      <View style={styles.settingsCard}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <Text style={styles.label}>Default search tab</Text>
        <Text style={styles.hint}>
          Choose whether the bottom tab opens camera scan or manual text search.
        </Text>
        <ThemedSegmentedControl
          values={['Camera scan', 'Text search']}
          selectedIndex={defaultSearchMode === 'scan' ? 0 : 1}
          enabled={!savingPreference}
          onChange={(index) =>
            handleSearchModeChange(index === 0 ? 'scan' : 'text_query')
          }
        />

        <ThemePreferencePicker />
        <FontPreferencePicker />
      </View>
      
      <TouchableOpacity
        style={[styles.button, signingOut && styles.buttonDisabled]}
        onPress={() => router.push('/config')}
      >
        <Text style={styles.buttonText}>Edit Information</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.buttonDanger, signingOut && styles.buttonDisabled]}
        onPress={handleSignOut}
        disabled={signingOut}
      >
        <Text style={styles.buttonDangerText}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.background,
    gap: 12,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: c.background,
  },
  errorBox: {
    backgroundColor: c.dangerSoft,
    borderColor: c.danger,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  errorTitle: {
    color: c.danger,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  errorText: {
    color: c.danger,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  title: {
    color: c.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: c.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
  },
  label: {
    color: c.text,
    fontSize: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: c.surfaceAlt,
    color: c.text,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
  button: {
    backgroundColor: c.accent,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonSecondary: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: c.accent,
  },
  buttonDanger: {
    backgroundColor: c.dangerButtonBg,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: c.onAccent,
    fontWeight: '600',
    fontSize: 16,
  },
  buttonSecondaryText: {
    color: c.accent,
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDangerText: {
    color: c.onDanger,
    fontWeight: '600',
    fontSize: 16,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: c.border,
  },
  settingsCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: c.border,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  segmentOption: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
  },
  segmentOptionSelected: {
    borderColor: c.accent,
    backgroundColor: c.accentSoft,
  },
  segmentOptionText: {
    color: c.textMuted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  segmentOptionTextSelected: {
    color: c.accent,
  },
  cardLabel: {
    color: c.textFaint,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 4,
  },
  cardValue: {
    color: c.text,
    fontSize: 16,
  },
  mono: {
    color: c.mono,
    fontFamily: 'Menlo',
    fontSize: 12,
  },
  hint: {
    color: c.textFaint,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  mutedText: {
    color: c.textMuted,
    marginTop: 8,
  },
  resultBox: {
    backgroundColor: c.surface,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
});
