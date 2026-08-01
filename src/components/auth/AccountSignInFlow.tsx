import { FontPreferencePicker } from '@/components/FontPreferencePicker'
import { ThemePreferencePicker } from '@/components/ThemePreferencePicker'
import { ThemedSegmentedControl } from '@/components/ThemedSegmentedControl' // Added to handle search tab picker
import { showApiError } from '@/lib/apiErrors'
import { isValidEmail, isValidPassword } from '@/lib/authValidation'
import { getAuthErrorMessage, useAuth } from '@/lib/AuthContext'
import { useSearchPreferences } from '@/lib/SearchPreferencesContext' // Added to power state hooks
import { useTheme } from '@/lib/theme/ThemeContext'
import type { ThemeColors } from '@/lib/theme/tokens'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native'

type SignInStep = 'landing' | 'email' | 'password'

export function AccountSignInFlow() {
    const { signIn } = useAuth()
    const router = useRouter()
    const styles = useThemedStyles(makeStyles)
    const { colors } = useTheme()

    // 1. Hook up the search hooks properly inside this component
    const { defaultSearchMode, setDefaultSearchMode } = useSearchPreferences()
    const [savingPreference, setSavingPreference] = useState(false)

    // 2. Local isolated state for toggling this screen's dropdown menu
    const [settingsExpanded, setSettingsExpanded] = useState(false)

    const [step, setStep] = useState<SignInStep>('landing')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [authError, setAuthError] = useState<string | null>(null)

    async function handleSearchModeChange(mode: 'scan' | 'text_query') {
        if (mode === defaultSearchMode || savingPreference) return
        setSavingPreference(true)
        try {
            await setDefaultSearchMode(mode)
        } finally {
            setSavingPreference(false)
        }
    }

    function goToEmail() {
        setAuthError(null)
        setStep('email')
    }

    function goToPassword() {
        if (!isValidEmail(email)) {
            setAuthError('Enter a valid email address.')
            return
        }
        setAuthError(null)
        setStep('password')
    }

    async function handleSignIn() {
        if (!isValidPassword(password)) {
            setAuthError('Password must be at least 8 characters.')
            return
        }

        setSubmitting(true)
        setAuthError(null)
        try {
            await signIn(email.trim(), password)
        } catch (err) {
            const message = getAuthErrorMessage(err)
            console.error('[auth] sign in failed:', message)
            showApiError(err, 'appwrite')
            setAuthError(message)
        } finally {
            setSubmitting(false)
        }
    }

    function goBack() {
        setAuthError(null)
        if (step === 'password') {
            setStep('email')
            return
        }
        if (step === 'email') {
            setStep('landing')
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                {step === 'landing' ? (
                    <>
                        <Text style={styles.title}>Account</Text>
                        <Text style={styles.subtitle}>
                            Sign in to sync your profile and meals, or create a new account to get started.
                        </Text>

                        {/* Collapsible Local Card component wrapper */}
                        <View style={styles.card}>
                            <Pressable
                                onPress={() => setSettingsExpanded(!settingsExpanded)}
                                style={styles.header}
                            >
                                <Text style={styles.hint}>
                                    {settingsExpanded ? '▲ Compact Settings' : '▼ View Settings'}
                                </Text>
                            </Pressable>

                            {settingsExpanded && (
                                <View style={styles.settingsCardInner}>
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
                            )}
                        </View>

                        <Pressable
                            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                            onPress={goToEmail}
                        >
                            <Text style={styles.buttonText}>Sign in</Text>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [styles.buttonSecondary, pressed && styles.buttonPressed]}
                            onPress={() => router.replace('/onboarding')}
                        >
                            <Text style={styles.buttonSecondaryText}>Create account</Text>
                        </Pressable>
                    </>
                ) : null}

                {step === 'email' ? (
                    <>
                        <Text style={styles.title}>Your email</Text>
                        <Text style={styles.subtitle}>We&apos;ll use this to sign you in on this device.</Text>

                        {authError ? (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorTitle}>Something went wrong</Text>
                                <Text style={styles.errorText}>{authError}</Text>
                            </View>
                        ) : null}

                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder="you@example.com"
                            placeholderTextColor={colors.textFaint}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            maxLength={254}
                            autoFocus
                            style={styles.input}
                        />
                    </>
                ) : null}

                {step === 'password' ? (
                    <>
                        <Text style={styles.title}>Your password</Text>
                        <Text style={styles.subtitle}>{email.trim()}</Text>

                        {authError ? (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorTitle}>Something went wrong</Text>
                                <Text style={styles.errorText}>{authError}</Text>
                            </View>
                        ) : null}

                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Password"
                            placeholderTextColor={colors.textFaint}
                            secureTextEntry
                            autoCapitalize="none"
                            maxLength={128}
                            autoFocus
                            style={styles.input}
                        />
                    </>
                ) : null}
            </ScrollView>

            {step !== 'landing' ? (
                <View style={styles.footer}>
                    <Pressable
                        onPress={goBack}
                        disabled={submitting}
                        style={({ pressed }) => [
                            styles.footerSecondary,
                            pressed && styles.buttonPressed,
                            submitting && styles.buttonDisabled,
                        ]}
                    >
                        <Text style={styles.footerSecondaryText}>Back</Text>
                    </Pressable>
                    <Pressable
                        onPress={step === 'email' ? goToPassword : handleSignIn}
                        disabled={submitting}
                        style={({ pressed }) => [
                            styles.footerPrimary,
                            pressed && styles.buttonPressed,
                            submitting && styles.buttonDisabled,
                        ]}
                    >
                        <Text style={styles.footerPrimaryText}>
                            {submitting ? 'Working…' : step === 'email' ? 'Continue' : 'Sign in'}
                        </Text>
                    </Pressable>
                </View>
            ) : null}
        </KeyboardAvoidingView>
    )
}

const makeStyles = (c: ThemeColors) =>
    StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: c.background,
        },
        container: {
            flexGrow: 1,
            padding: 20,
            paddingBottom: 120,
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
        card: {
            backgroundColor: c.surface,
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: c.border,
        },
        settingsCardInner: {
            marginTop: 10,
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
        buttonPressed: {
            opacity: 0.85,
        },
        buttonDisabled: {
            opacity: 0.5,
        },
        footer: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 24,
            backgroundColor: c.background,
            borderTopWidth: 1,
            borderTopColor: c.border,
            flexDirection: 'row',
            gap: 12,
        },
        footerSecondary: {
            flex: 1,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: c.border,
        },
        footerSecondaryText: {
            color: c.textMuted,
            fontWeight: '600',
            fontSize: 16,
        },
        footerPrimary: {
            flex: 2,
            backgroundColor: c.accent,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
        },
        footerPrimaryText: {
            color: c.onAccent,
            fontWeight: '700',
            fontSize: 16,
        },
        header: {
            paddingVertical: 4,
        },
        hint: {
            color: c.textFaint,
            fontSize: 12,
            marginTop: 4,
            lineHeight: 18,
        },
    })