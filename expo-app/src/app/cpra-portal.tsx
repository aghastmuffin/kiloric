import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAuth } from '@/lib/AuthContext';
import {
  exportUserData,
  getDoNotSellSharePreference,
  getLimitSensitiveDataPreference,
  setDoNotSellSharePreference,
  setLimitSensitiveDataPreference,
  submitPrivacyRequest,
  type CpraPrivacyRequestType,
  type CpraRequestConfirmation,
  type UserDataExport,
} from '@/lib/cpraCompliance';
import { triggerNotificationHaptic, triggerSelectionHaptic } from '@/lib/haptics';
import { useAppLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeContext';
import { borderRadius, spacing, type ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CpraPortalScreen() {
  const { user, loading: authLoading, deleteAccount } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { gutter } = useAppLayout();

  const [doNotSell, setDoNotSell] = useState(true);
  const [limitSensitive, setLimitSensitive] = useState(true);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  // Export State
  const [exporting, setExporting] = useState(false);
  const [exportedData, setExportedData] = useState<UserDataExport | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Deletion State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Privacy Request Form State
  const [requestType, setRequestType] = useState<CpraPrivacyRequestType>('export_data');
  const [email, setEmail] = useState(user?.email || '');
  const [notes, setNotes] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<CpraRequestConfirmation | null>(null);

  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user?.email, email]);

  useEffect(() => {
    let active = true;
    Promise.all([getDoNotSellSharePreference(), getLimitSensitiveDataPreference()])
      .then(([dns, limit]) => {
        if (!active) return;
        setDoNotSell(dns);
        setLimitSensitive(limit);
      })
      .finally(() => {
        if (active) setLoadingPrefs(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleToggleDoNotSell(val: boolean) {
    triggerSelectionHaptic();
    setDoNotSell(val);
    await setDoNotSellSharePreference(val);
  }

  async function handleToggleLimitSensitive(val: boolean) {
    triggerSelectionHaptic();
    setLimitSensitive(val);
    await setLimitSensitiveDataPreference(val);
  }

  async function handleGenerateExport() {
    if (!user?.$id) return;
    triggerSelectionHaptic();
    setExporting(true);
    setExportError(null);
    try {
      const data = await exportUserData(user.$id);
      setExportedData(data);
      triggerNotificationHaptic('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate data export.';
      setExportError(msg);
      triggerNotificationHaptic('error');
    } finally {
      setExporting(false);
    }
  }

  async function handleCopyExportJson() {
    if (!exportedData) return;
    triggerSelectionHaptic();
    const jsonStr = JSON.stringify(exportedData, null, 2);
    // On web or environments with navigator.clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(jsonStr);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 3000);
      triggerNotificationHaptic('success');
    }
  }

  async function handleDeleteAccountConfirm() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      setDeleteModalVisible(false);
      triggerNotificationHaptic('success');
      router.replace('/(tabs)/account');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Account deletion failed.';
      setDeleteError(msg);
      triggerNotificationHaptic('error');
    } finally {
      setDeleting(false);
    }
  }

  async function handleSubmitForm() {
    if (!user?.$id) {
      setRequestError('You must be signed in to submit a privacy request.');
      return;
    }
    triggerSelectionHaptic();
    setSubmittingRequest(true);
    setRequestError(null);
    setConfirmation(null);
    try {
      const res = await submitPrivacyRequest({
        userId: user.$id,
        email: email.trim() || user.email,
        requestType,
        notes,
      });
      setConfirmation(res);
      setNotes('');
      triggerNotificationHaptic('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed.';
      setRequestError(msg);
      triggerNotificationHaptic('error');
    } finally {
      setSubmittingRequest(false);
    }
  }

  if (authLoading || loadingPrefs) {
    return (
      <View
        accessible
        accessibilityLabel="Loading Privacy Portal"
        accessibilityState={{ busy: true }}
        style={styles.centered}
      >
        <ActivityIndicator color={colors.brand} />
        <Text style={styles.loadingText}>Loading Privacy Portal…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + spacing.md, paddingHorizontal: gutter },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          CPRA & CCPA Privacy Portal
        </Text>
        <Text style={styles.subtitle}>
          California Consumer Privacy Act (CCPA) & California Privacy Rights Act (CPRA) statutory
          rights control center.
        </Text>
      </View>

      {/* Notice at Collection Summary */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.brand} />
          <Text style={styles.cardTitle}>Notice at Collection</Text>
        </View>
        <Text style={styles.cardBody}>
          kiloric collects account identifiers (email, username), sensitive health metrics (body
          weight, height, BMR, TDEE), meal logs, and app settings strictly to calculate nutrition
          targets and deliver tracking services.
        </Text>
        <View style={styles.highlightBadge}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.highlightText}>
            kiloric NEVER sells or shares your personal data with third parties or data brokers.
          </Text>
        </View>
      </View>

      {/* Preferences Section: Do Not Sell / Share & Limit Sensitive Use */}
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Your Statutory Rights & Controls
        </Text>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.rowLeft}>
              <Ionicons name="ban-outline" size={20} color={colors.accent} />
              <View style={styles.flex1}>
                <Text style={styles.cardTitle}>Do Not Sell or Share My Personal Info</Text>
                <Text style={styles.cardSubtext}>
                  Statutory right to opt-out of data sale or cross-context behavioral sharing.
                </Text>
              </View>
            </View>
            <Switch
              value={doNotSell}
              onValueChange={(val) => void handleToggleDoNotSell(val)}
              trackColor={{ false: colors.border, true: colors.brand }}
              thumbColor={colors.surfaceMuted}
              accessibilityLabel="Do Not Sell or Share My Personal Info toggle"
              disabled
            />
          </View>
          <Text style={styles.statusBadge}>
            Status: {doNotSell ? 'Opted-Out (Active)' : 'Standard Protection'}  
            (Note: I will not engage in selling information on a moral basis. You cannot change this setting to allow me to sell information. I still must legally provide this menu, however.)
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.rowLeft}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.accent} />
              <View style={styles.flex1}>
                <Text style={styles.cardTitle}>Limit Use of Sensitive Personal Info</Text>
                <Text style={styles.cardSubtext}>
                  Restricts processing of body weight, height, BMR, and TDEE strictly to essential app features.
                </Text>
              </View>
            </View>
            <Switch
              value={limitSensitive}
              onValueChange={(val) => void handleToggleLimitSensitive(val)}
              trackColor={{ false: colors.border, true: colors.brand }}
              thumbColor={colors.surfaceMuted}
              accessibilityLabel="Limit Use of Sensitive Personal Information toggle"
              disabled
            />
          </View>
          <Text style={styles.statusBadge}>
            Status: {limitSensitive ? 'Restricted to Core Service' : 'Standard Protection'} 
            (see above note)
          </Text>
        </View>
      </View>

      {/* Right to Access / Export Data */}
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Right to Access & Portability
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardBody}>
            Instantly export a structured, machine-readable JSON copy of all personal data held in
            your kiloric account (profile, meals, water, tasks, workout history).
          </Text>
          {exportError ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {exportError}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Generate Data Export JSON"
            onPress={() => void handleGenerateExport()}
            disabled={exporting || !user}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            {exporting ? (
              <ActivityIndicator color={colors.surfaceMuted} size="small" />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color={colors.surfaceMuted} />
                <Text style={styles.primaryButtonText}>Generate Data Export (JSON)</Text>
              </>
            )}
          </Pressable>

          {exportedData ? (
            <View style={styles.exportPreviewContainer}>
              <View style={styles.exportPreviewHeader}>
                <Text style={styles.exportPreviewTitle}>Data Export Ready</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Copy JSON to clipboard"
                  onPress={() => void handleCopyExportJson()}
                  style={({ pressed }) => [styles.copyButton, pressed && styles.pressed]}
                >
                  <Ionicons
                    name={copiedJson ? 'checkmark-outline' : 'copy-outline'}
                    size={15}
                    color={colors.brand}
                  />
                  <Text style={styles.copyButtonText}>{copiedJson ? 'Copied!' : 'Copy JSON'}</Text>
                </Pressable>
              </View>
              <ScrollView nestedScrollEnabled style={styles.jsonScrollView}>
                <Text selectable style={styles.jsonText}>
                  {JSON.stringify(exportedData, null, 2)}
                </Text>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </View>

      {/* Right to Delete Data */}
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Right to Erasure / Account Deletion
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardBody}>
            Permanently delete your kiloric account and all associated profile, meal, water, task,
            and physical tracking documents.
          </Text>
          {deleteError ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {deleteError}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete account and personal data"
            onPress={() => setDeleteModalVisible(true)}
            disabled={!user || deleting}
            style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.dangerButtonText}>Delete Account & Personal Data</Text>
          </Pressable>
        </View>
      </View>

      {/* Submit Formal Privacy Request Form */}
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Submit Formal Privacy Request (if you forget your password or otherwise lose access to your account) Expect 10 business days for a response until we get more volunteers.
        </Text>
        <View style={styles.card}>
          <Text style={styles.formLabel}>Request Type</Text>
          <View style={styles.typeSelectorRow}>
            {(
              [
                { type: 'export_data', label: 'Access / Export Data' },
                { type: 'delete_account', label: 'Delete Account Data' },
                { type: 'correct_data', label: 'Correct Information' },
                { type: 'opt_out_sale', label: 'Do Not Sell/Share' },
                { type: 'limit_sensitive_data', label: 'Limit Sensitive Data' },
              ] as const
            ).map((item) => {
              const selected = requestType === item.type;
              return (
                <Pressable
                  key={item.type}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    triggerSelectionHaptic();
                    setRequestType(item.type);
                  }}
                  style={({ pressed }) => [
                    styles.typeChip,
                    selected && styles.typeChipSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.formLabel}>Contact Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="your_email@example.com"
            placeholderTextColor={colors.textFaint}
            style={styles.textInput}
          />

          <Text style={styles.formLabel}>Additional Notes / Request Details (Optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            placeholder="Provide specific details about your privacy request…"
            placeholderTextColor={colors.textFaint}
            style={[styles.textInput, styles.textArea]}
          />

          {requestError ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {requestError}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Submit Privacy Request"
            onPress={() => void handleSubmitForm()}
            disabled={submittingRequest || !user}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            {submittingRequest ? (
              <ActivityIndicator color={colors.surfaceMuted} size="small" />
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color={colors.surfaceMuted} />
                <Text style={styles.primaryButtonText}>Submit Privacy Request</Text>
              </>
            )}
          </Pressable>

          {confirmation ? (
            <View accessibilityLiveRegion="polite" style={styles.confirmationCard}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
                <Text style={styles.confirmationTitle}>Request Registered</Text>
              </View>
              <Text style={styles.confirmationText}>
                <Text style={styles.bold}>Request ID:</Text> {confirmation.requestId}
              </Text>
              <Text style={styles.confirmationText}>
                <Text style={styles.bold}>Type:</Text> {confirmation.requestType}
              </Text>
              <Text style={styles.confirmationText}>{confirmation.message}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <ConfirmDialog
        visible={deleteModalVisible}
        title="Delete account & all data?"
        message="Account access will be revoked immediately and all profile, meal, water, task, and workout records will be permanently purged within 30 calendar days under CCPA/CPRA rules."
        confirmLabel="Confirm Deletion"
        cancelLabel="Cancel"
        destructive
        loading={deleting}
        onConfirm={() => void handleDeleteAccountConfirm()}
        onCancel={() => {
          if (!deleting) setDeleteModalVisible(false);
        }}
      />
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: c.background,
      gap: spacing.sm,
    },
    loadingText: {
      ...typography.body,
      color: c.textMuted,
    },
    container: {
      flexGrow: 1,
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',
      paddingBottom: 120,
      backgroundColor: c.background,
      gap: spacing.xl,
    },
    header: {
      gap: spacing.xs,
    },
    title: {
      ...typography.headlineLarge,
      color: c.text,
    },
    subtitle: {
      ...typography.bodySmall,
      color: c.textMuted,
    },
    section: {
      gap: spacing.md,
    },
    sectionTitle: {
      ...typography.headline,
      color: c.text,
      fontSize: 18,
    },
    card: {
      backgroundColor: c.surfaceMuted,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      gap: spacing.sm,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    cardTitle: {
      ...typography.body,
      color: c.text,
      fontWeight: '600',
    },
    cardSubtext: {
      ...typography.bodySmall,
      color: c.textMuted,
      marginTop: 2,
    },
    cardBody: {
      ...typography.body,
      color: c.text,
      lineHeight: 20,
    },
    highlightBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      padding: spacing.sm,
      backgroundColor: c.accentSoft,
      borderRadius: borderRadius.sm,
      marginTop: spacing.xs,
    },
    highlightText: {
      ...typography.bodySmall,
      color: c.success,
      fontWeight: '600',
      flex: 1,
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
    },
    flex1: {
      flex: 1,
    },
    statusBadge: {
      ...typography.labelTiny,
      color: c.brand,
      fontWeight: '600',
      marginTop: spacing.xs,
    },
    primaryButton: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: c.brand,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
    },
    primaryButtonText: {
      ...typography.label,
      color: c.surfaceMuted,
      fontWeight: '600',
    },
    dangerButton: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: c.danger,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      backgroundColor: c.dangerSoft,
    },
    dangerButtonText: {
      ...typography.label,
      color: c.danger,
      fontWeight: '600',
    },
    pressed: {
      opacity: 0.8,
    },
    errorText: {
      ...typography.bodySmall,
      color: c.danger,
    },
    exportPreviewContainer: {
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: c.background,
      borderRadius: borderRadius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      gap: spacing.sm,
    },
    exportPreviewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    exportPreviewTitle: {
      ...typography.label,
      color: c.text,
      fontWeight: '600',
    },
    copyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.brand,
    },
    copyButtonText: {
      ...typography.labelSmall,
      color: c.brand,
    },
    jsonScrollView: {
      maxHeight: 220,
      backgroundColor: c.surfaceAlt,
      borderRadius: borderRadius.sm,
      padding: spacing.xs,
    },
    jsonText: {
      ...typography.labelSmall,
      fontSize: 11,
      color: c.text,
    },
    formLabel: {
      ...typography.labelSmall,
      color: c.text,
      fontWeight: '600',
      marginTop: spacing.xs,
    },
    typeSelectorRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    typeChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.background,
    },
    typeChipSelected: {
      backgroundColor: c.brand,
      borderColor: c.brand,
    },
    typeChipText: {
      ...typography.labelSmall,
      color: c.text,
    },
    typeChipTextSelected: {
      color: c.surfaceMuted,
      fontWeight: '600',
    },
    textInput: {
      ...typography.body,
      color: c.text,
      backgroundColor: c.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      minHeight: 44,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    confirmationCard: {
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: c.accentSoft,
      borderRadius: borderRadius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.success,
      gap: spacing.xs,
    },
    confirmationTitle: {
      ...typography.label,
      color: c.success,
      fontWeight: '600',
    },
    confirmationText: {
      ...typography.bodySmall,
      color: c.text,
    },
    bold: {
      fontWeight: '600',
    },
  });
