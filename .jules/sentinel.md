## 2025-05-14 - [Sanitize PII from Profile and Auth Logs]
**Vulnerability:** PII leakage (email, full profile data) and potential credential exposure in console logs.
**Learning:** Development-time logs often inadvertently include full data objects or error responses that contain sensitive user information, which persists in production environments if not explicitly sanitized.
**Prevention:** Avoid logging entire objects that may contain PII. Explicitly pick only non-sensitive fields (like IDs) for logging. Sanitize error objects before logging to avoid leaking raw API responses.

## 2025-05-15 - [Robust Email Regex Input Validation]
**Vulnerability:** Weak input validation allowing malformed emails (e.g. `@.abc`) during authentication or registration.
**Learning:** Naive input validation checks (such as using `.includes('@')` and `.includes('.')`) are insufficient and can lead to malformed database entries, authentication bypasses, or bad UX.
**Prevention:** Always use safe, standard, and non-backtracking regular expressions for validating formats such as emails at the boundaries of the application to prevent ReDoS while ensuring inputs conform to expected schemas.

## 2025-05-16 - [Enforce Strict Email and Password Input Length Restrictions]
**Vulnerability:** Resource Exhaustion and bcrypt-based hashing CPU/Database Denial of Service (DoS).
**Learning:** Accepting unbounded input lengths for authentication forms (such as email and password fields) exposes the application to resource exhaustion. Malicious clients can submit extremely large strings, which consumes excessive CPU cycles during regex validation or expensive password hashing algorithms (e.g. bcrypt/scrypt) and loads large objects into database systems, causing server or local app crashes.
**Prevention:** Enforce defense-in-depth validation by applying strict `maxLength` boundaries at both the client UI layer (using `maxLength` on TextInputs) and the business logic validation layer (RFC 5321/5322 restricts email to 254 chars; restrict password to a maximum of 128 chars).
