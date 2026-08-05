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
