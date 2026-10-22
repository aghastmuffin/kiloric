# Kiloric Privacy Policy & Data Retention Policy

**Last Updated:** October 21, 2026  
**Effective Date:** October 21, 2026  
**Service:** Kiloric  
**Website:** [https://kiloric.co](https://kiloric.co)  
**Provider:** Taeson Co. ("we", "us", or "our")  
**Contact / Data Privacy Email:** `data_privacy@taeson.co`

---

## Part 1: Privacy Policy

### 1. Introduction & Overview
Welcome to **Kiloric** ("Service", "App"), operated by **Taeson Co.** We respect your privacy and are committed to protecting your personal information and health/wellness data. This Privacy Policy explains what information we collect, how we use it, how we store and protect it, and the rights you have concerning your data under applicable data protection laws (including GDPR, UK GDPR, and CCPA/CPRA).

---

### 2. Information We Collect

We collect information directly from you when you register, complete onboarding, configure your settings, log nutrition/water data, or interact with our features:

1. **Account & Authentication Information**
   - Email address, name/display name, and encrypted authentication credentials (managed via our backend service, Appwrite).
2. **Profile & Demographic Information**
   - Biological sex, date of birth / age, country/region, and account roles.
3. **Physical & Health Metrics**
   - Height, current body weight, target body weight, weight log history, and calculated metrics (such as Basal Metabolic Rate and Total Daily Energy Expenditure).
4. **Fitness, Diet & Nutrition Goals**
   - Fitness goals (e.g., weight loss, maintenance, muscle gain), goal pace, calculated and custom caloric targets, macronutrient targets (protein, carbohydrates, fats), water intake targets, and dietary style preferences.
5. **Daily Tracking & Activity Data**
   - Meal logs, food entries, timestamped nutritional intake (calories, macros, micronutrients), and water consumption records.
6. **User Contributed Content & Media**
   - Custom food items, nutrition labels, and uploaded food images submitted for food logging or community contribution.
7. **App Preferences & Technical Metadata**
   - Display units (Metric / Imperial), theme preferences (Dark / Light / System), typography settings, search preferences, client device identifiers, operating system version, crash reports, and application logs.

---

### 3. How We Use Your Information

We process your data for the following purposes:
- **Service Delivery & Core Functionality:** To calculate personalized nutritional plans, daily energy budgets, macro breakdowns, and track progress toward your goals.
- **Account Management & Authentication:** To authenticate your identity, secure your account, and manage your user profile.
- **Personalization:** To remember your theme, typography, unit system preferences, and search modes across sessions.
- **Food Database Improvements:** To parse and verify community-contributed food items and nutrition labels.
- **Service Reliability & Security:** To monitor performance, detect abuse, troubleshoot crashes, and enforce terms of service.
- **Legal Compliance:** To comply with applicable statutory obligations and protect our legal rights.

*We do **not** sell, rent, or monetize your personal health data to data brokers or third-party advertisers.*

---

### 4. Third-Party Service Providers & Sub-processors

We share data only with trusted service providers necessary to operate the App:
- **Backend & Database Hosting (Appwrite):** User accounts, database records, and media storage are hosted on our dedicated Appwrite infrastructure (`appwrite.calcount.taeson.co`).
- **Nutrition & Food Database APIs:** External food search APIs (such as Open Food Facts, USDA FoodData Central) to look up product nutrition facts. Queries sent to these APIs contain product search strings or barcodes, not your personal health profile.
- **Crash Reporting & Telemetry (e.g., Sentry):** Error and diagnostic logs to diagnose app crashes and ensure stability.

---

### 5. Your Rights & How to Request Data Updates or Deletion

Depending on your jurisdiction, you have the following rights regarding your personal data:
- **Right of Access & Portability:** Request a copy of the personal data we hold about you in a structured, machine-readable format.
- **Right to Rectification / Update:** Request corrections or updates to inaccurate or incomplete personal data.
- **Right to Erasure / Deletion ("Right to be Forgotten"):** Request permanent deletion of your account and all associated health, meal, and profile records.
- **Right to Restrict or Object to Processing:** Object to or restrict certain data processing activities.
- **Right to Withdraw Consent:** Withdraw previously granted consent for specific processing operations at any time.

#### How to Submit a Privacy Request

Signed-in users can start account deletion directly from **You → Settings → Delete account**. Account access is removed immediately and the remaining deletion process is completed within 30 days.

To request a data export, an update, or help with deletion:

1. Send an email to **`data_privacy@taeson.co`**.
2. Include **`Kiloric`** in the subject line (for example, `Kiloric - Data Export Request`).
3. **Body Details:** Please include the email address associated with your Kiloric account so we can verify your identity before processing the request.

We will acknowledge receipt within 5 business days and fulfill verified requests within 30 calendar days (or within timelines required by applicable law).

---

## Part 2: Data Retention Policy

### 1. Retention Principles
Taeson Co. retains your personal data only for as long as necessary to fulfill the purposes described in this policy, maintain active service functionality, resolve disputes, and comply with legal obligations.

### 2. Retention Schedules by Data Category

| Data Category | Retention Period | Deletion / Anonymization Trigger |
| :--- | :--- | :--- |
| **Account & Profile Data** (Name, email, birthdate, sex, country) | Retained for the lifetime of the active account | Deleted within 30 days of account deletion request or user-initiated deletion |
| **Physical Metrics & Target Records** (Height, weight history, targets) | Retained for the lifetime of the active account to power historical progress graphs | Deleted within 30 days of account deletion request |
| **Meal & Nutrition Logs** (Food entries, water intake, daily logs) | Retained while the account remains active | Deleted within 30 days of account deletion request |
| **User-Uploaded Food Photos** | Retained while associated food entries exist | Deleted upon meal log deletion or account termination |
| **Community Contributed Foods** (Public food items & nutrition label facts) | Anonymized and retained in the public food database | User identity detached immediately upon account deletion; factual food data retained |
| **Server & Security Logs** (Access logs, IP addresses, audit logs) | 90 days rolling retention | Automatically purged after 90 days |
| **Crash & Error Telemetry** | 30–90 days | Automatically purged based on telemetry provider retention policies |
| **Inactive Accounts** | 24 months of total inactivity | Notified via email prior to deletion; purged if no response |

### 3. Deletion and Purge Procedures
When an account deletion request is processed:
1. **Primary Database Records:** All profile documents, goal records, weight logs, meal logs, and water records associated with the user ID are permanently purged from Appwrite databases.
2. **File Storage:** All images and files uploaded by the user in Appwrite storage buckets are permanently removed.
3. **Authentication Record:** Account access is blocked immediately. The authentication record is then hard-deleted through the server-side Appwrite Users API within 30 days.
4. **Backups:** Residual data in automated system backups will be overwritten in accordance with standard backup rotation cycles (not exceeding 30 days).

---

## Part 3: Data Security

We implement industry-standard administrative, technical, and physical safeguards to protect your personal and nutritional data:
- **Encryption in Transit:** All network communication is encrypted using Transport Layer Security (TLS 1.2+ / HTTPS).
- **Encryption at Rest:** User credentials and sensitive database records are encrypted at rest.
- **Access Control:** Access to backend servers and customer data is restricted to authorized personnel on a strict need-to-know basis with multi-factor authentication (MFA).

---

## Part 4: Children's Privacy
Kiloric is an adult-only service and requires every user to be at least 18 years old. Eligibility is checked before account creation and whenever the saved date of birth changes. We do not knowingly collect personal data from anyone under 18. If we learn that an ineligible person created an account, we will block access and promptly delete the associated information.

---

## Part 5: Changes to This Policy
We may update our Privacy Policy and Data Retention Policy from time to time. When significant changes are made, we will notify users through in-app notifications or via the email address associated with your account, and update the "Last Updated" date at the top of this document.

---

## Part 6: Contact Information

For any inquiries, requests for data deletion, or updates on your user data, please contact:

- **Email:** [`data_privacy@taeson.co`](mailto:data_privacy@taeson.co)
- **Subject Requirement:** Must include **`Kiloric`** in the subject line (e.g., `Kiloric - Data Privacy Request`), to ensure the security of our customer base, the same email must issue this request, OR proof of ownership must be provided.
- **Organization:** Taeson Co.
- IN COMPLIANCE WITH REIGONAL FEDERAL LAW TAESONCO'S SERVICES ARE NOT AVAILABLE IN THE FOLLOWING COUNTRIES: KOREA, REPUBLIC OF; RUSSIA, FEDERATION; NAM, SOCIALIST REPUBLIC OF VIET; KOREA, DEMOCRATIC PEOPLE'S REPUBLIC OF; BRAZIL, FEDERAL REPUBLIC OF; ARABIA, KINGDOM OF SAUDI; CHINA, REPUBLIC OF.