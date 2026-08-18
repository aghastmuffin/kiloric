import { typography } from '@/lib/theme/typography';
import { borderRadius, spacing, type ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const SECTION_GAP = spacing.xl;
const PARAGRAPH_GAP = spacing.md;

export default function PrivacyPolicyScreen() {
  const styles = useThemedStyles(makeStyles);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.subtitle}>
          Last Updated: August 17, 2026 · Effective Date: August 17, 2026
        </Text>
      </View>

      <View style={styles.meta}>
        <Text style={styles.bodyText}>
          <Text style={styles.strong}>Service:</Text> CalCount
        </Text>
        <Text style={styles.bodyText}>
          <Text style={styles.strong}>Provider:</Text> Taeson Co.
        </Text>
        <Text style={styles.bodyText}>
          <Text style={styles.strong}>Contact / Data Privacy Email:</Text>{' '}
          data_privacy@taeson.co
        </Text>
      </View>

      <Section title="Part 1: Privacy Policy">
        <Heading>1. Introduction & Overview</Heading>
        <Paragraph>
          Welcome to CalCount (&quot;Service&quot;, &quot;App&quot;), operated by Taeson Co. We
          respect your privacy and are committed to protecting your personal
          information and health/wellness data. This Privacy Policy explains
          what information we collect, how we use it, how we store and protect
          it, and the rights you have concerning your data under applicable
          data protection laws (including GDPR, UK GDPR, and CCPA/CPRA).
        </Paragraph>

        <Heading>2. Information We Collect</Heading>
        <Paragraph>
          We collect information directly from you when you register, complete
          onboarding, configure your settings, log nutrition/water data, or
          interact with our features:
        </Paragraph>
        <BulletList
          items={[
            {
              title: 'Account & Authentication Information',
              description:
                'Email address, name/display name, and encrypted authentication credentials (managed via our backend service, Appwrite).',
            },
            {
              title: 'Profile & Demographic Information',
              description:
                'Biological sex, date of birth / age, country/region, and account roles.',
            },
            {
              title: 'Physical & Health Metrics',
              description:
                'Height, current body weight, target body weight, weight log history, and calculated metrics (such as Basal Metabolic Rate and Total Daily Energy Expenditure).',
            },
            {
              title: 'Fitness, Diet & Nutrition Goals',
              description:
                'Fitness goals (e.g., weight loss, maintenance, muscle gain), goal pace, calculated and custom caloric targets, macronutrient targets (protein, carbohydrates, fats), water intake targets, and dietary style preferences.',
            },
            {
              title: 'Daily Tracking & Activity Data',
              description:
                'Meal logs, food entries, timestamped nutritional intake (calories, macros, micronutrients), and water consumption records.',
            },
            {
              title: 'User Contributed Content & Media',
              description:
                'Custom food items, nutrition labels, and uploaded food images submitted for food logging or community contribution.',
            },
            {
              title: 'App Preferences & Technical Metadata',
              description:
                'Display units (Metric / Imperial), theme preferences (Dark / Light / System), typography settings, search preferences, client device identifiers, operating system version, crash reports, and application logs.',
            },
          ]}
        />

        <Heading>3. How We Use Your Information</Heading>
        <Paragraph>
          We process your data for the following purposes:
        </Paragraph>
        <BulletList
          items={[
            {
              title: 'Service Delivery & Core Functionality',
              description:
                'To calculate personalized nutritional plans, daily energy budgets, macro breakdowns, and track progress toward your goals.',
            },
            {
              title: 'Account Management & Authentication',
              description:
                'To authenticate your identity, secure your account, and manage your user profile.',
            },
            {
              title: 'Personalization',
              description:
                'To remember your theme, typography, unit system preferences, and search modes across sessions.',
            },
            {
              title: 'Food Database Improvements',
              description:
                'To parse and verify community-contributed food items and nutrition labels.',
            },
            {
              title: 'Service Reliability & Security',
              description:
                'To monitor performance, detect abuse, troubleshoot crashes, and enforce terms of service.',
            },
            {
              title: 'Legal Compliance',
              description:
                'To comply with applicable statutory obligations and protect our legal rights.',
            },
          ]}
        />
        <Paragraph>
          We do <Text style={styles.strong}>not</Text> sell, rent, or monetize
          your personal health data to data brokers or third-party
          advertisers.
        </Paragraph>

        <Heading>4. Third-Party Service Providers & Sub-processors</Heading>
        <Paragraph>
          We share data only with trusted service providers necessary to
          operate the App:
        </Paragraph>
        <BulletList
          items={[
            {
              title: 'Backend & Database Hosting (Appwrite)',
              description:
                'User accounts, database records, and media storage are hosted on our dedicated Appwrite infrastructure (appwrite.calcount.taeson.co).',
            },
            {
              title: 'Nutrition & Food Database APIs',
              description:
                'External food search APIs (such as Open Food Facts, USDA FoodData Central) to look up product nutrition facts. Queries sent to these APIs contain product search strings or barcodes, not your personal health profile.',
            },
            {
              title: 'Crash Reporting & Telemetry (e.g., Sentry)',
              description:
                'Error and diagnostic logs to diagnose app crashes and ensure stability.',
            },
          ]}
        />

        <Heading>5. Your Rights & How to Request Data Updates or Deletion</Heading>
        <Paragraph>
          Depending on your jurisdiction, you have the following rights
          regarding your personal data:
        </Paragraph>
        <BulletList
          items={[
            {
              title: 'Right of Access & Portability',
              description:
                'Request a copy of the personal data we hold about you in a structured, machine-readable format.',
            },
            {
              title: 'Right to Rectification / Update',
              description:
                'Request corrections or updates to inaccurate or incomplete personal data.',
            },
            {
              title: 'Right to Erasure / Deletion',
              description:
                'Request permanent deletion of your account and all associated health, meal, and profile records.',
            },
            {
              title: 'Right to Restrict or Object to Processing',
              description:
                'Object to or restrict certain data processing activities.',
            },
            {
              title: 'Right to Withdraw Consent',
              description:
                'Withdraw previously granted consent for specific processing operations at any time.',
            },
          ]}
        />

        <Heading level={3}>How to Submit a Privacy Request</Heading>
        <Paragraph>
          To request data deletion, an update on your personal data, or to
          exercise any other privacy right:
        </Paragraph>
        <NumberedList
          items={[
            'Send an email to data_privacy@taeson.co.',
            'Subject Line Requirement: Your email subject line must explicitly specify the name of the service: CalCount (e.g., "CalCount - Data Deletion Request" or "CalCount - Personal Data Update Request").',
            'Body Details: Please include the email address associated with your CalCount account so we can verify your identity before processing the request.',
          ]}
        />
        <Paragraph>
          We will acknowledge receipt within 5 business days and fulfill
          verified requests within 30 calendar days (or within timelines
          required by applicable law).
        </Paragraph>
      </Section>

      <Section title="Part 2: Data Retention Policy">
        <Heading>1. Retention Principles</Heading>
        <Paragraph>
          Taeson Co. retains your personal data only for as long as necessary
          to fulfill the purposes described in this policy, maintain active
          service functionality, resolve disputes, and comply with legal
          obligations.
        </Paragraph>

        <Heading>2. Retention Schedules by Data Category</Heading>
        <RetentionTable />

        <Heading>3. Deletion and Purge Procedures</Heading>
        <Paragraph>
          When an account deletion request is processed:
        </Paragraph>
        <NumberedList
          items={[
            'Primary Database Records: All profile documents, goal records, weight logs, meal logs, and water records associated with the user ID are permanently purged from Appwrite databases.',
            'File Storage: All images and files uploaded by the user in Appwrite storage buckets are permanently removed.',
            'Authentication Record: The user authentication record is deleted from Appwrite Auth.',
            'Backups: Residual data in automated system backups will be overwritten in accordance with standard backup rotation cycles (not exceeding 30 days).',
          ]}
        />
      </Section>

      <Section title="Part 3: Data Security">
        <Paragraph>
          We implement industry-standard administrative, technical, and
          physical safeguards to protect your personal and nutritional data:
        </Paragraph>
        <BulletList
          items={[
            {
              title: 'Encryption in Transit',
              description:
                'All network communication is encrypted using Transport Layer Security (TLS 1.2+ / HTTPS).',
            },
            {
              title: 'Encryption at Rest',
              description:
                'User credentials and sensitive database records are encrypted at rest.',
            },
            {
              title: 'Access Control',
              description:
                'Access to backend servers and customer data is restricted to authorized personnel on a strict need-to-know basis with multi-factor authentication (MFA).',
            },
          ]}
        />
      </Section>

      <Section title="Part 4: Children's Privacy">
        <Paragraph>
          CalCount is not intended for use by children under the age of 13 (or
          under 16 in the European Economic Area / UK). We do not knowingly
          collect personal data from children. If we become aware that a child
          has provided us with personal data, we will promptly delete such
          information.
        </Paragraph>
      </Section>

      <Section title="Part 5: Changes to This Policy">
        <Paragraph>
          We may update our Privacy Policy and Data Retention Policy from time
          to time. When significant changes are made, we will notify users
          through in-app notifications or via the email address associated
          with your account, and update the &quot;Last Updated&quot; date at the top
          of this document.
        </Paragraph>
      </Section>

      <Section title="Part 6: Contact Information">
        <Paragraph>
          For any inquiries, requests for data deletion, or updates on your
          user data, please contact:
        </Paragraph>
        <BulletList
          items={[
            {
              title: 'Email',
              description: 'data_privacy@taeson.co',
            },
            {
              title: 'Subject Requirement',
              description:
                'Must include "CalCount" in the subject line (e.g., "CalCount - Data Privacy Request")',
            },
            {
              title: 'Organization',
              description: 'Taeson Co.',
            },
          ]}
        />
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Heading({
  children,
  level = 2,
}: {
  children: React.ReactNode;
  level?: 2 | 3;
}) {
  const styles = useThemedStyles(makeStyles);

  return (
    <Text style={level === 2 ? styles.heading : styles.subheading}>
      {children}
    </Text>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.bodyText}>{children}</Text>;
}

function BulletList({
  items,
}: {
  items: { title: string; description: string }[];
}) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <View key={index} style={styles.listItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.listItemText}>
            <Text style={styles.strong}>{item.title}:</Text> {item.description}
          </Text>
        </View>
      ))}
    </View>
  );
}

function NumberedList({ items }: { items: string[] }) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <View key={index} style={styles.listItem}>
          <Text style={styles.bullet}>{index + 1}.</Text>
          <Text style={styles.listItemText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function RetentionTable() {
  const styles = useThemedStyles(makeStyles);

  const rows = [
    {
      category: 'Account & Profile Data',
      details: 'Name, email, birthdate, sex, country',
      retention: 'Lifetime of the active account',
      trigger: 'Deleted within 30 days of account deletion request',
    },
    {
      category: 'Physical Metrics & Target Records',
      details: 'Height, weight history, targets',
      retention: 'Lifetime of the active account',
      trigger: 'Deleted within 30 days of account deletion request',
    },
    {
      category: 'Meal & Nutrition Logs',
      details: 'Food entries, water intake, daily logs',
      retention: 'While the account remains active',
      trigger: 'Deleted within 30 days of account deletion request',
    },
    {
      category: 'User-Uploaded Food Photos',
      details: 'Photos attached to food entries',
      retention: 'While associated food entries exist',
      trigger: 'Deleted upon meal log deletion or account termination',
    },
    {
      category: 'Community Contributed Foods',
      details: 'Public food items & nutrition label facts',
      retention: 'Anonymized and retained in the public food database',
      trigger: 'User identity detached immediately upon account deletion',
    },
    {
      category: 'Server & Security Logs',
      details: 'Access logs, IP addresses, audit logs',
      retention: '90 days rolling retention',
      trigger: 'Automatically purged after 90 days',
    },
    {
      category: 'Crash & Error Telemetry',
      details: 'Diagnostic error data',
      retention: '30–90 days',
      trigger: 'Automatically purged based on telemetry provider retention policies',
    },
    {
      category: 'Inactive Accounts',
      details: 'Accounts with no activity',
      retention: '24 months of total inactivity',
      trigger: 'Notified via email prior to deletion; purged if no response',
    },
  ];

  return (
    <View style={styles.table}>
      {rows.map((row, index) => (
        <View
          key={index}
          style={[
            styles.tableRow,
            index === rows.length - 1 && styles.tableRowLast,
          ]}
        >
          <View style={[styles.tableCell, styles.tableCellWide]}>
            <Text style={styles.tableCellTitle}>{row.category}</Text>
            <Text style={styles.tableCellDetail}>{row.details}</Text>
          </View>
          <Text style={[styles.tableCell, styles.tableCellText]}>
            {row.retention}
          </Text>
          <Text style={[styles.tableCell, styles.tableCellText]}>
            {row.trigger}
          </Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xl * 2,
    },
    header: {
      marginBottom: SECTION_GAP,
    },
    title: {
      ...typography.headline,
      color: c.text,
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.body,
      color: c.textMuted,
    },
    meta: {
      marginBottom: SECTION_GAP,
      gap: spacing.xs,
    },
    section: {
      marginBottom: SECTION_GAP,
    },
    sectionTitle: {
      ...typography.headline,
      color: c.text,
      fontSize: 22,
      marginBottom: spacing.md,
    },
    heading: {
      ...typography.body,
      color: c.text,
      fontWeight: '600',
      fontSize: 18,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    subheading: {
      ...typography.body,
      color: c.text,
      fontWeight: '600',
      fontSize: 16,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    bodyText: {
      ...typography.body,
      color: c.text,
      marginBottom: PARAGRAPH_GAP,
    },
    strong: {
      fontWeight: '600',
    },
    list: {
      marginBottom: PARAGRAPH_GAP,
      gap: spacing.sm,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    bullet: {
      ...typography.body,
      color: c.textMuted,
      width: 20,
    },
    listItemText: {
      ...typography.body,
      color: c.text,
      flex: 1,
      flexWrap: 'wrap',
    },
    table: {
      marginBottom: PARAGRAPH_GAP,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
    },
    tableRow: {
      flexDirection: 'column',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      padding: spacing.sm,
      gap: spacing.xs,
    },
    tableRowLast: {
      borderBottomWidth: 0,
    },
    tableCell: {
      ...typography.body,
      color: c.text,
    },
    tableCellWide: {
      width: '100%',
    },
    tableCellTitle: {
      ...typography.body,
      color: c.text,
      fontWeight: '600',
    },
    tableCellDetail: {
      ...typography.body,
      color: c.textMuted,
      fontSize: 14,
    },
    tableCellText: {
      ...typography.body,
      color: c.text,
    },
  });
