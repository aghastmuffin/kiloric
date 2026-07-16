## 2025-05-14 - [Sanitize PII from Profile and Auth Logs]
**Vulnerability:** PII leakage (email, full profile data) and potential credential exposure in console logs.
**Learning:** Development-time logs often inadvertently include full data objects or error responses that contain sensitive user information, which persists in production environments if not explicitly sanitized.
**Prevention:** Avoid logging entire objects that may contain PII. Explicitly pick only non-sensitive fields (like IDs) for logging. Sanitize error objects before logging to avoid leaking raw API responses.

## 2025-05-15 - [Hardened Centralized Error Logging]
**Vulnerability:** Information leakage through unhandled error object logging. Generic `Error` objects or third-party exception objects (like `AppwriteException`) can contain sensitive request/response data, session tokens, or internal stack traces that expose system internals.
**Learning:** Even when a project has a "safe" logging utility, it must be robust enough to handle unexpected error shapes and strictly whitelist allowed properties rather than relying on blacklisting.
**Prevention:** Centralize error logging in a hardened utility that explicitly whitelists properties (e.g., `code`, `type`, `message`) and provides a safe fallback for unknown error types. Avoid passing raw error objects directly to console methods or logging services.
