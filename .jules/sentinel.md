## 2025-05-14 - [Sanitize PII from Profile and Auth Logs]
**Vulnerability:** PII leakage (email, full profile data) and potential credential exposure in console logs.
**Learning:** Development-time logs often inadvertently include full data objects or error responses that contain sensitive user information, which persists in production environments if not explicitly sanitized.
**Prevention:** Avoid logging entire objects that may contain PII. Explicitly pick only non-sensitive fields (like IDs) for logging. Sanitize error objects before logging to avoid leaking raw API responses.

## 2025-05-15 - [Robust Email Regex Input Validation]
**Vulnerability:** Weak input validation allowing malformed emails (e.g. `@.abc`) during authentication or registration.
**Learning:** Naive input validation checks (such as using `.includes('@')` and `.includes('.')`) are insufficient and can lead to malformed database entries, authentication bypasses, or bad UX.
**Prevention:** Always use safe, standard, and non-backtracking regular expressions for validating formats such as emails at the boundaries of the application to prevent ReDoS while ensuring inputs conform to expected schemas.

## 2025-05-16 - [Defense in Depth for Unbounded Inputs]
**Vulnerability:** Denial of Service (DoS) and resource exhaustion vulnerability via unbounded authentication inputs (email and password fields).
**Learning:** Without explicit bounds on input lengths, attackers can submit extremely large payloads. This exhausts memory/CPU at the frontend layer and, more critically, triggers hashing algorithm (e.g., bcrypt/scrypt) slowdowns and database column overflow/processing exhaustion on the backend.
**Prevention:** Implement strict length boundaries at both the frontend layer (via `maxLength` on TextInputs) and the validation layer (limiting emails to 254 characters and passwords to 128 characters) to fail early and securely before resource-intensive operations occur.
