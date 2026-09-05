## 2025-05-14 - [Sanitize PII from Profile and Auth Logs]
**Vulnerability:** PII leakage (email, full profile data) and potential credential exposure in console logs.
**Learning:** Development-time logs often inadvertently include full data objects or error responses that contain sensitive user information, which persists in production environments if not explicitly sanitized.
**Prevention:** Avoid logging entire objects that may contain PII. Explicitly pick only non-sensitive fields (like IDs) for logging. Sanitize error objects before logging to avoid leaking raw API responses.

## 2025-05-15 - [Robust Email Regex Input Validation]
**Vulnerability:** Weak input validation allowing malformed emails (e.g. `@.abc`) during authentication or registration.
**Learning:** Naive input validation checks (such as using `.includes('@')` and `.includes('.')`) are insufficient and can lead to malformed database entries, authentication bypasses, or bad UX.
**Prevention:** Always use safe, standard, and non-backtracking regular expressions for validating formats such as emails at the boundaries of the application to prevent ReDoS while ensuring inputs conform to expected schemas.

## 2025-05-16 - [Email and Password Length Constraints Validation]
**Vulnerability:** Denial of Service (DoS) and CPU/resource exhaustion attacks via unbounded authentication input strings (e.g., extremely long email/password payloads submitted to the hashing or database layers).
**Learning:** Standard input validations without length ceilings allow huge payloads to reach the encryption or database engine layer, where expensive cryptographic hashing operations (like bcrypt/Argon2) or regular expression tests can exhaust resources and hang the service thread.
**Prevention:** Enforce defense in depth by applying strict length constraints on inputs at both the UI boundary layer (`maxLength` on text inputs) and the validation engine layer (e.g., max 254 characters for emails compliant with RFC 5321, and max 128 characters for passwords).

## 2025-05-16 - [Secure In-Memory Cache Purging on Session Change]
**Vulnerability:** Session staining and PII/token leakage due to persistent in-memory module-level variables (JWT token and profile data) surviving logout and session updates.
**Learning:** In single-page applications or hybrid frameworks (like React Native/Expo), module-level memory is not automatically cleared upon session termination (sign out). Without explicit purges, subsequent users or background actions can access stale JWTs and cached user profile data.
**Prevention:** Hook into the core session persistence and clearing handlers (`persistAppwriteSession` and `clearAppwriteSession`) to systematically purge all active JWT and profile caches to guarantee absolute data containment.

## 2026-08-06 - [Broken Object Level Authorization / IDOR on Profile Mutations]
**Vulnerability:** Potential Broken Object Level Authorization (BOLA) or Insecure Direct Object Reference (IDOR) on database operations, allowing an authenticated session to create, patch, or overwrite another user's profile documents if they knew or guessed the target `userId`.
**Learning:** Relying purely on client-side application state routing or query parameters without confirming that the requested target identifier matches the authenticated session's token identity introduces severe horizontal privilege escalation risks.
**Prevention:** Strictly enforce a central ownership assertion (`assertAuthenticatedUserId`) at the service layer boundaries for all state-mutating requests to guarantee users can only affect their own records.

## 2026-08-07 - [Broken Object Level Authorization / IDOR on Meal Mutations]
**Vulnerability:** Missing authorization validation on meal document updates (`updateMeal`) and product relocations (`moveProductBetweenMeals`), permitting an authenticated user to overwrite or mutate meals belonging to other users if they supplied the target meal resource ID.
**Learning:** Failing to confirm database document resource ownership at the service layer before executing updates can lead to horizontal privilege escalation, enabling malicious or unauthorized users to tamper with or mutate other users' meal data.
**Prevention:** Assert that the active session's user ID matches the owner ID of the fetched meal document (`existingMeal.owner === sessionUserId`) prior to applying mutations or relocations.

## 2026-08-08 - [Broken Object Level Authorization / IDOR on Water Log Deletion]
**Vulnerability:** Missing document resource ownership verification on deleting water entries (`deleteWaterEntry`), allowing an authenticated user to delete another user's water log if they knew or guessed the document ID.
**Learning:** Invoking document deletion endpoints directly with a document ID without verifying that the record's `owner` field matches the authenticated session user ID creates a horizontal privilege escalation vulnerability.
**Prevention:** Retrieve the target document first using `databases.getDocument` and strictly assert that `entry.owner === sessionUserId` before executing `databases.deleteDocument`.

## 2026-08-08 - [Broken Object Level Authorization / IDOR on Task Mutations]
**Vulnerability:** Missing document ownership assertion in `setTaskDone` and `deleteTask` allowed authenticated users to modify or delete tasks belonging to other users if they supplied the target `taskId`.
**Learning:** Performing document-level updates/deletions relying solely on client-provided IDs without first retrieving the document and comparing its `userId` (owner) property against the active session's ID introduces severe BOLA/IDOR vulnerabilities.
**Prevention:** Always retrieve the target document using a dedicated getter (e.g. `getTask`) and verify that `document.userId === sessionUserId` before executing mutating operations.

## 2026-08-09 - [Broken Object Level Authorization / IDOR on Account Data Purge]
**Vulnerability:** Missing authorization validation in `purgeAccountData` allowed any authenticated user to trigger deletion of another user's account documents, contributions, and profile by specifying their `userId`.
**Learning:** High-impact data purging functions must assert active session user ID ownership at the entry point of the function before listing or deleting owned database documents.
**Prevention:** Call `await assertAuthenticatedUserId(userId)` at the beginning of data purging routines to guarantee only the resource owner can trigger deletion of their account records.

## 2026-08-10 - [Broken Object Level Authorization / IDOR on Meal Reads]
**Vulnerability:** `getTodayMeals` and `listHistoricMeals` accepted a target `userId` and queried/returned meal documents without verifying that the requested `userId` matched the active authenticated session's user ID.
**Learning:** Read operations (such as `getTodayMeals` or `listHistoricMeals`) can expose confidential user data (e.g., food logs and nutrition history) if session identity validation is omitted before evaluating cache hits or executing database queries.
**Prevention:** Enforce active session ownership assertions (`assertActiveSession()`) before returning cached or database-queried records across all read and write methods.
