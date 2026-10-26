import { FontPreferencePicker } from '@/components/FontPreferencePicker';
import { setHasSkippedSignIn } from '@/components/ProfileGate';
import { ThemePreferencePicker } from '@/components/ThemePreferencePicker';
import { getAuthErrorMessage, useAuth } from '@/lib/AuthContext';
import { showApiError } from '@/lib/apiErrors';
import { isValidEmail, isValidIdentity, isValidPassword } from '@/lib/authValidation';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SignInStep = 'landing' | 'email' | 'password'

export function AccountSignInFlow() {
    const { signIn, sendPasswordReset } = useAuth()
    const router = useRouter()
    const pathname = usePathname()
    const styles = useThemedStyles(makeStyles)
    const { colors } = useTheme()
    const insets = useSafeAreaInsets()
    const { width, fontScale } = useWindowDimensions()
    const stackActions = width < 390 || fontScale > 1.25
    const isStandalone = pathname === '/signin'

    const [settingsExpanded, setSettingsExpanded] = useState(false)

    const [step, setStep] = useState<SignInStep>('landing')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [sendingReset, setSendingReset] = useState(false)
    const [authError, setAuthError] = useState<string | null>(null)

    function goToEmail() {
        setAuthError(null)
        setStep('email')
    }

    function goToPassword() {
        if (!isValidIdentity(email)) {
            setAuthError('Enter a valid email address or username.')
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
            const signedIn = await signIn(email.trim(), password)
            if (!signedIn) {
                setAuthError('Sign in did not complete successfully. Please try again.')
                return
            }

            router.replace('/(tabs)')
        } catch (err) {
            const message = getAuthErrorMessage(err)
            console.error('[auth] sign in failed:', message)
            showApiError(err, 'appwrite')
            setAuthError(message)
        } finally {
            setSubmitting(false)
        }
    }

    async function handleForgotPassword() {
        if (!isValidEmail(email) || sendingReset) {
            setAuthError('Enter a valid email address before requesting a reset link.')
            return
        }
        setSendingReset(true)
        setAuthError(null)
        try {
            await sendPasswordReset(email.trim())
            setAuthError('Check your inbox for a password reset link. The link is valid for one hour.')
        } catch (err) {
            setAuthError(getAuthErrorMessage(err))
        } finally {
            setSendingReset(false)
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
            <ScrollView
                contentContainerStyle={[
                    styles.container,
                    {
                        paddingTop: isStandalone ? Math.max(insets.top + 20, 28) : 0,
                        paddingBottom: step === 'landing'
                            ? Math.max(insets.bottom + 32, 48)
                            : isStandalone
                                ? insets.bottom + (stackActions ? 188 : 116)
                                : 24,
                    },
                ]}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={isStandalone}
                showsVerticalScrollIndicator={false}
            >
                {step === 'landing' ? (
                    <>
                        <View style={styles.heroMark}>
                            <View style={styles.heroRule} />
                            <Text style={styles.heroMarkText}>kiloric</Text>
                        </View>
                        <Text style={styles.eyebrow}>FOOD & NUTRITION</Text>
                        <Text accessibilityRole="header" style={styles.title}>Welcome to kiloric</Text>
                        <Text style={styles.subtitle}>
                            Log meals and understand your nutrition in one place. kiloric is for adults
                            18 and older; eligibility is checked before account creation.
                        </Text>

                        <Pressable
                            accessibilityRole="button"
                            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                            onPress={goToEmail}
                        >
                            <Ionicons name="log-in-outline" size={18} color={colors.onBrand} />
                            <Text style={styles.buttonText}>Sign in</Text>
                        </Pressable>

                        <Pressable
                            accessibilityRole="button"
                            style={({ pressed }) => [styles.buttonSecondary, pressed && styles.buttonPressed]}
                            onPress={() => router.replace('/onboarding')}
                        >
                            <Text style={styles.buttonSecondaryText}>Create account</Text>
                        </Pressable>

                        <Pressable
                            accessibilityRole="button"
                            style={({ pressed }) => [styles.buttonSkip, pressed && styles.buttonPressed]}
                            onPress={() => {
                                setHasSkippedSignIn(true)
                                router.replace('/')
                            }}
                        >
                            <Text style={styles.buttonSkipText}>Skip for now</Text>
                        </Pressable>

                        <Pressable
                            accessibilityRole="link"
                            onPress={() => router.push('/privacy-policy')}
                            style={({ pressed }) => [styles.buttonSkip, pressed && styles.buttonPressed]}
                        >
                            <Text style={styles.buttonSkipText}>Privacy policy and data use</Text>
                        </Pressable>

                        <View style={styles.card}>
                            <Pressable
                                accessibilityLabel="Sign-in preferences"
                                accessibilityRole="button"
                                accessibilityState={{ expanded: settingsExpanded }}
                                onPress={() => setSettingsExpanded((current) => !current)}
                                style={styles.header}
                            >
                                <View style={styles.settingsHeaderRow}>
                                    <View style={styles.settingsHeaderLeft}>
                                        <View style={styles.settingsIconBadge}>
                                            <Ionicons name="options-outline" size={17} color={colors.accent} />
                                        </View>
                                        <View>
                                            <Text style={styles.settingsKicker}>BEFORE YOU BEGIN</Text>
                                            <Text style={styles.sectionTitle}>App preferences</Text>
                                        </View>
                                    </View>
                                    <Ionicons
                                        name={settingsExpanded ? 'chevron-up' : 'chevron-down'}
                                        size={19}
                                        color={colors.textMuted}
                                    />
                                </View>
                            </Pressable>

                            {settingsExpanded && (
                                <View style={styles.settingsCardInner}>
                                    <ThemePreferencePicker />
                                    <View style={styles.preferenceDivider} />
                                    <FontPreferencePicker />
                                </View>
                            )}
                        </View>
                    </>
                ) : null}

                {step === 'email' ? (
                    <>
                        <Text style={styles.eyebrow}>SIGN IN · 01</Text>
                        <Text accessibilityRole="header" style={styles.title}>Your email</Text>
                        <Text style={styles.subtitle}>We&apos;ll use this to sign you in on this device.</Text>

                        {authError ? (
                            <View accessibilityRole="alert" style={styles.errorBox}>
                                <Text style={styles.errorTitle}>Something went wrong</Text>
                                <Text style={styles.errorText}>{authError}</Text>
                            </View>
                        ) : null}

                        <Text style={styles.label}>Email or Username</Text>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder="you@example.com or username"
                            placeholderTextColor={colors.textFaint}
                            autoCapitalize="none"
                            keyboardType="default"
                            maxLength={254}
                            autoFocus
                            accessibilityLabel="Email address"
                            autoComplete="email"
                            textContentType="emailAddress"
                            style={styles.input}
                        />
                        <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ disabled: sendingReset }}
                            disabled={sendingReset}
                            onPress={() => void handleForgotPassword()}
                            style={({ pressed }) => [styles.recoveryLink, pressed && styles.buttonPressed]}
                        >
                            <Text style={styles.recoveryLinkText}>
                                {sendingReset ? 'Sending reset link…' : 'Forgot password?'}
                            </Text>
                        </Pressable>
                    </>
                ) : null}

                {step === 'password' ? (
                    <>
                        <Text style={styles.eyebrow}>SIGN IN · 02</Text>
                        <Text accessibilityRole="header" style={styles.title}>Your password</Text>
                        <Text style={styles.subtitle}>{email.trim()}</Text>

                        {authError ? (
                            <View accessibilityRole="alert" style={styles.errorBox}>
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
                            accessibilityLabel="Password"
                            autoComplete="current-password"
                            textContentType="password"
                            style={styles.input}
                        />
                    </>
                ) : null}
            </ScrollView>

            {step !== 'landing' ? (
                <View
                    style={[
                        styles.footer,
                        !isStandalone && styles.footerInline,
                        { paddingBottom: isStandalone ? Math.max(insets.bottom, 16) : 12 },
                    ]}
                >
                    <View style={[styles.footerContent, stackActions && styles.footerContentStacked]}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ disabled: submitting }}
                            onPress={goBack}
                            disabled={submitting}
                            style={({ pressed }) => [
                                styles.footerSecondary,
                                stackActions && styles.footerButtonStacked,
                                pressed && styles.buttonPressed,
                                submitting && styles.buttonDisabled,
                            ]}
                        >
                            <Text style={styles.footerSecondaryText}>Back</Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ disabled: submitting, busy: submitting }}
                            onPress={step === 'email' ? goToPassword : handleSignIn}
                            disabled={submitting}
                            style={({ pressed }) => [
                                styles.footerPrimary,
                                stackActions && styles.footerButtonStacked,
                                pressed && styles.buttonPressed,
                                submitting && styles.buttonDisabled,
                            ]}
                        >
                            <View style={styles.buttonContent}>
                                {submitting ? <ActivityIndicator color={colors.onBrand} size="small" /> : null}
                                <Text style={styles.footerPrimaryText}>
                                    {submitting ? 'Signing in…' : step === 'email' ? 'Continue' : 'Sign in'}
                                </Text>
                            </View>
                        </Pressable>
                    </View>
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
            width: '100%',
            maxWidth: 620,
            alignSelf: 'center',
            paddingHorizontal: 20,
        },
        heroMark: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginBottom: 28,
        },
        heroRule: {
            width: 40,
            height: 2,
            backgroundColor: c.brand,
        },
        heroMarkText: {
            ...typography.overline,
            color: c.textMuted,
        },
        eyebrow: {
            ...typography.overline,
            color: c.brand,
            marginBottom: 8,
        },
        title: {
            ...typography.display,
            color: c.text,
            marginBottom: 10,
        },
        subtitle: {
            ...typography.body,
            color: c.textMuted,
            marginBottom: 28,
            maxWidth: 540,
        },
        sectionTitle: {
            ...typography.headline,
            fontSize: 20,
            lineHeight: 26,
            color: c.text,
        },
        settingsHeaderRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        settingsHeaderLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        settingsIconBadge: {
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: c.borderStrong,
        },
        settingsKicker: {
            ...typography.overline,
            color: c.textFaint,
        },
        label: {
            ...typography.body,
            fontWeight: '600',
            color: c.text,
            marginBottom: 6,
        },
        input: {
            backgroundColor: c.surface,
            color: c.text,
            ...typography.body,
            borderRadius: 6,
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: c.border,
        },
        card: {
            marginTop: 32,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderColor: c.border,
        },
        settingsCardInner: {
            paddingTop: 18,
            paddingBottom: 20,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: c.border,
        },
        errorBox: {
            backgroundColor: c.dangerSoft,
            borderColor: c.danger,
            borderLeftWidth: 3,
            paddingLeft: 14,
            paddingVertical: 4,
            marginBottom: 20,
        },
        errorTitle: {
            color: c.danger,
            ...typography.label,
            marginBottom: 6,
        },
        errorText: {
            color: c.danger,
            ...typography.bodySmall,
        },
        button: {
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: c.brand,
            borderRadius: 999,
            minHeight: 48,
            paddingHorizontal: 16,
            alignItems: 'center',
            marginTop: 8,
        },
        buttonSecondary: {
            borderRadius: 999,
            minHeight: 48,
            paddingHorizontal: 15,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 12,
            borderWidth: 1.5,
            borderColor: c.accent,
        },
        buttonText: {
            ...typography.label,
            color: c.onBrand,
        },
        buttonSecondaryText: {
            ...typography.label,
            color: c.accent,
        },
        buttonSkip: {
            minHeight: 44,
            paddingHorizontal: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 4,
        },
        buttonSkipText: {
            ...typography.bodySmall,
            color: c.textMuted,
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
            backgroundColor: c.background,
            borderTopWidth: 1,
            borderTopColor: c.border,
        },
        footerContent: {
            width: '100%',
            maxWidth: 620,
            alignSelf: 'center',
            flexDirection: 'row',
            gap: 12,
        },
        footerInline: {
            position: 'relative',
            marginTop: 24,
        },
        footerContentStacked: {
            flexDirection: 'column-reverse',
        },
        footerButtonStacked: {
            flex: 0,
            width: '100%',
        },
        footerSecondary: {
            flex: 1,
            borderRadius: 8,
            paddingVertical: 14,
            minHeight: 48,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: c.border,
        },
        footerSecondaryText: {
            ...typography.label,
            color: c.textMuted,
        },
        footerPrimary: {
            flex: 2,
            backgroundColor: c.brand,
            borderRadius: 999,
            paddingVertical: 14,
            minHeight: 48,
            alignItems: 'center',
            justifyContent: 'center',
        },
        footerPrimaryText: {
            ...typography.label,
            color: c.onBrand,
        },
        buttonContent: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
        },
        header: {
            minHeight: 68,
            justifyContent: 'center',
            paddingVertical: 8,
        },
        hint: {
            ...typography.bodySmall,
            color: c.textFaint,
            marginTop: 4,
        },
        recoveryLink: {
            minHeight: 44,
            alignSelf: 'flex-start',
            justifyContent: 'center',
            marginTop: -8,
        },
        recoveryLinkText: {
            ...typography.label,
            color: c.brand,
        },
        preferenceDivider: {
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: c.border,
            marginVertical: 12,
        },
    })
