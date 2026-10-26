# Data Collection, Processing & Audit Schedule

**Entity:** Taeson NORTH AMERICA Ltd. Liability Co. / TAESON SAN FRANCISCO HOLDINGS LLC
**Product:** kiloric
**Next Privacy & Compliance Audit:** Scheduled for October 25th, 2026

---

## 1. Data Collection Categories & Sources

| Category | Primary Collection Source | Purpose | Secondary Processing |
| --- | --- | --- | --- |
| Account Credentials | User input at registration / sign-in | Identity authentication & account security | Password hashes stored securely via server backend |
| Demographic Data | User input during onboarding / profile settings | App eligibility verification and user profile setup | Strictly non-commercial |
| Body & Physical Metrics | User input in profile settings / weight logs | BMR, TDEE, and progress trend calculations | Used solely for in-app metrics calculations |
| Nutrition & Meal Logs | User activity in food log / camera scanner | Daily calorie and macro tracking | Summarized for stats and trend displays |
| Contributed Food Items | User submissions in food contribution form | Community food database facts | Anonymized to decouple user identity |
| Diagnostic Telemetry | Automated app error triggers | App stability and crash troubleshooting | Retained for 30–90 days in diagnostic systems |

---

## 2. Retention Schedules & Purge Rules

1. **Active Account Data**:
   Profiles, meal entries, water logs, tasks, and physical metrics are retained while the user account is active.
2. **Account Deletion Request**:
   Upon deletion request, user account access is disabled immediately. All primary records (profile, meals, water, tasks, custom contributions) are hard-deleted from Kiloric API databases within 30 calendar days.
3. **Backup Rotation Cycles**:
   System backup snapshots containing residual data are completely overwritten and purged within 30 calendar days.
4. **Inactive Accounts**:
   Accounts with zero user activity for 24 consecutive months are flagged for automated purge warnings. If unconfirmed after 30 days notice, the account and records are permanently deleted.

---

## 3. Annual Compliance Audit Procedures

kiloric undergoes regular internal data protection audits:
- **Audit Cadence**: Annual formal compliance audit (Next: October 25th, 2026).
- **Scope**:
  - Verification that no data sales or cross-context behavioral sharing occurred.
  - Verification of 30-day purge enforcement for deletion requests.
  - Review of data minimization and security controls.
  - Verification of CPRA/CCPA portal submission channels and turnaround times.
