## 2025-05-14 - [Sanitize PII from Profile and Auth Logs]
**Vulnerability:** PII leakage (email, full profile data) and potential credential exposure in console logs.
**Learning:** Development-time logs often inadvertently include full data objects or error responses that contain sensitive user information, which persists in production environments if not explicitly sanitized.
**Prevention:** Avoid logging entire objects that may contain PII. Explicitly pick only non-sensitive fields (like IDs) for logging. Sanitize error objects before logging to avoid leaking raw API responses.

## 2025-05-15 - [Robust Email Regex Input Validation]
**Vulnerability:** Weak input validation allowing malformed emails (e.g. `@.abc`) during authentication or registration.
**Learning:** Naive input validation checks (such as using `.includes('@')` and `.includes('.')`) are insufficient and can lead to malformed database entries, authentication bypasses, or bad UX.
**Prevention:** Always use safe, standard, and non-backtracking regular expressions for validating formats such as emails at the boundaries of the application to prevent ReDoS while ensuring inputs conform to expected schemas.

## 2026-07-29 - [Defense in Depth for Unbounded Auth Inputs]
**Vulnerability:** Lack of upper-bound constraints on auth inputs (email/password) can expose the client or server to Denial of Service (DoS) attacks via CPU/hashing exhaustion.
**Learning:** Overly long inputs can degrade server performance when running resource-intensive cryptographic hashing (like bcrypt/scrypt) or long regex evaluation.
**Prevention:** Enforce strict, industry-standard input length boundaries (maximum of 254 characters for email, 128 characters for password) at both validation layer and the UI component layer.
