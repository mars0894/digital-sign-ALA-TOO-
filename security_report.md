# 🔐 Security Analysis Report
## Ala-Too Digital Signatures Platform
**Date:** April 3, 2026  
**Scope:** Full-stack review — Next.js 16 frontend, Spring Boot 3.3 backend, Docker infrastructure  
**Methodology:** Static code analysis mapped to OWASP Top 10 (2021)

---

## Executive Summary

The platform implements a solid foundational security posture: JWT-based stateless authentication, BCrypt password hashing, parameterized SQL via JPA/Hibernate (SQL injection prevention), and role-based access control. However, **several high and critical weaknesses** were identified that must be addressed before any production deployment.

| Severity | Count |
|----------|-------|
| 🔴 Critical | 4 |
| 🟠 High | 4 |
| 🟡 Medium | 5 |
| 🔵 Low | 4 |
| ℹ️ Info | 3 |
| **Total** | **20** |

---

## 🔴 Critical Findings

### C-1 · Hardcoded Secrets in Source Code & docker-compose
**File:** `docker-compose.yml` (line 56), `application.yml` (lines 17–18, 48–49, 53)  
**OWASP:** A02 – Cryptographic Failures

The JWT secret, database password, and MinIO credentials are hardcoded directly in version-controlled files:

```yaml
# docker-compose.yml – line 56
JWT_SECRET: 404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970

# application.yml – fallback defaults
password: ${DB_PASSWORD:alatoo123}
secret-key: ${S3_SECRET_KEY:admin123}
```

Any developer or attacker with repository access can forge JWT tokens, access the database, or read all stored documents.

**Fix:** Remove all fallback literal values from `application.yml`. Use a secrets manager (HashiCorp Vault, AWS Secrets Manager, or at minimum `.env` files excluded from `.gitignore`). Rotate all credentials immediately.

---

### C-2 · Unauthenticated Document Download Endpoint (IDOR)
**File:** `SecurityConfig.java` (line 52), `DocumentController.java` (line 122–135)  
**OWASP:** A01 – Broken Access Control

The download endpoint is explicitly whitelisted as `permitAll()`:

```java
.requestMatchers("/api/v1/documents/download/**").permitAll()
```

The path after `/download/` is passed directly to `StorageService.getFile()` with **no ownership check**. Any anonymous user who guesses or enumerates a storage key can download any document.

**Fix:** Remove the `permitAll()` for this endpoint. Add `@AuthenticationPrincipal` and validate that the requesting user owns the document whose key is being accessed.

---

### C-3 · Path Traversal in File Download
**File:** `DocumentController.java` (lines 123–125), `StorageService.java` (line 42–43)  
**OWASP:** A03 – Injection

The download controller manually extracts a path from the URI and passes it directly to `Files.readAllBytes()`:

```java
String path = request.getRequestURI().split(".../download/")[1];
// StorageService:
return Files.readAllBytes(Paths.get(storageDir, key));
```

An attacker can request `/api/v1/documents/download/../../application.yml` to read arbitrary files from the server's filesystem.

**Fix:** Sanitize and canonicalize the key before use. Validate that the resolved path starts with the expected storage root:
```java
Path resolved = Paths.get(storageDir).resolve(key).normalize();
if (!resolved.startsWith(Paths.get(storageDir).toAbsolutePath())) {
    throw new SecurityException("Illegal path");
}
```

---

### C-4 · JWT Token Stored in `localStorage` (XSS Theft)
**File:** `frontend/src/lib/auth.ts` (lines 33–36)  
**OWASP:** A02 – Cryptographic Failures / A03 – Injection

The JWT token is saved to `localStorage`, which is accessible to any JavaScript on the page:

```typescript
localStorage.setItem('auth_token', token);
document.cookie = `auth_token=${token}; path=/; max-age=...; SameSite=Strict`;
// ⚠️ NOT HttpOnly — JS can read this cookie too
```

Any XSS vulnerability (including in third-party scripts) will allow full token theft and account takeover.

**Fix:** Store the token exclusively in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie set by the backend. Remove all `localStorage` token storage. The middleware can read the `HttpOnly` cookie server-side without JS access.

---

## 🟠 High Findings

### H-1 · No Rate Limiting on Login / Registration Endpoints
**File:** `AuthController.java`, `SecurityConfig.java`  
**OWASP:** A07 – Identification and Authentication Failures

The `RateLimitingFilter` referenced in logs does not actually exist in the source code (`security/` directory only contains `JwtAuthFilter`, `JwtUtils`, `SecurityConfig`, `CustomUserDetailsService`, `OAuth2LoginSuccessHandler`). Login and registration receive **unlimited requests**, enabling:
- Credential stuffing attacks
- Brute-force password attacks on known accounts

**Fix:** Implement rate limiting (e.g., using Bucket4j with Redis backend) on `/api/v1/auth/login` and `/api/v1/auth/register`. Limit to ~5 attempts per IP per minute with exponential backoff.

---

### H-2 · No File Type Validation on Upload
**File:** `DocumentController.java` (lines 33–45), `DocumentService.java`  
**OWASP:** A03 – Injection / A05 – Security Misconfiguration

The upload endpoint accepts any `MultipartFile` without validating the MIME type or file extension. Although the app passes it through `DocumentConversionService` (Gotenberg), malformed or malicious files could be used to exploit the conversion pipeline or fill disk.

**Fix:** Validate content type before processing:
```java
String contentType = file.getContentType();
List<String> allowed = List.of("application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
if (!allowed.contains(contentType)) {
    throw new IllegalArgumentException("Unsupported file type");
}
```
Also configure a maximum upload file size in `application.yml` (`spring.servlet.multipart.max-file-size`).

---

### H-3 · Document Signing Does Not Verify Ownership
**File:** `SignatureService.java` (lines 39–42)  
**OWASP:** A01 – Broken Access Control

The `signDocument` method fetches a document by ID with no ownership check:

```java
Document document = documentRepository.findById(documentId)
    .orElseThrow(() -> new RuntimeException("Document not found"));
```

Any authenticated user can sign **any** other user's document by supplying its UUID.

**Fix:** Replace with an ownership-aware query:
```java
Document document = documentRepository.findByIdAndOwnerId(documentId, user.getId())
    .orElseThrow(() -> new RuntimeException("Document not found or access denied"));
```

---

### H-4 · OAuth2 Token Exposed as URL Query Parameter
**File:** `OAuth2LoginSuccessHandler.java` (lines 69–71), `frontend/src/app/oauth2/redirect/page.tsx` (line 13)  
**OWASP:** A02 – Cryptographic Failures

The JWT token is passed as a URL query parameter during OAuth2 redirect:

```java
String targetUrl = UriComponentsBuilder.fromUriString("http://localhost:3000/oauth2/redirect")
    .queryParam("token", token)
    .build().toUriString();
```

Tokens in URLs are logged by web servers, proxies, browser history, referrer headers, and analytics. An attacker can harvest these from any of these sources.

**Fix:** Set the JWT as an `HttpOnly` cookie in the response directly from `OAuth2LoginSuccessHandler.onAuthenticationSuccess()` before redirecting, or use a short-lived one-time code exchanged server-to-server.

---

## 🟡 Medium Findings

### M-1 · Security Logs Enabled in Production Configuration
**File:** `application.yml` (lines 57–59)  
**OWASP:** A09 – Security Logging and Monitoring Failures

```yaml
logging:
  level:
    org.springframework.security: DEBUG
    kg.edu.alatoo.sign: DEBUG
```

`DEBUG` logging for Spring Security prints the full filter chain, security decisions, and user email addresses. This is a significant information disclosure risk in production.

**Fix:** Change both to `INFO` in production profiles. Use Spring Profiles (`application-prod.yml`) to separate dev/prod logging levels.

---

### M-2 · `show-sql: true` in Production Configuration
**File:** `application.yml` (line 24)  
**OWASP:** A09 – Security Logging and Monitoring Failures

All Hibernate SQL queries including parameter values are printed to logs. This can expose user emails, document IDs, and other sensitive data in log files.

**Fix:** Set `spring.jpa.show-sql: false` in production. Use P6Spy or a dedicated SQL audit tool with appropriate access controls if query logging is needed.

---

### M-3 · CORS Wildcard Headers Allowed
**File:** `CorsConfig.java` (line 19)

```java
config.setAllowedHeaders(List.of("*"));
```

While origins are correctly restricted, allowing all headers weakens CORS protection and could enable custom header-based attacks.

**Fix:** Enumerate only the headers your API actually uses:
```java
config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With"));
```

---

### M-4 · No HTTP Security Headers on Frontend
**File:** `frontend/next.config.ts`  
**OWASP:** A05 – Security Misconfiguration

The Next.js config is empty — no security headers are configured. Missing headers include:
- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Strict-Transport-Security`
- `Referrer-Policy`
- `Permissions-Policy`

**Fix:** Add security headers to `next.config.ts`:
```typescript
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
  },
];
```

---

### M-5 · Unvalidated `SignatureElement` Fields (Potential ReDoS / Injection)
**File:** `SignRequest.java`, `SignatureService.java` (lines 89, 93, 103)  
**OWASP:** A03 – Injection

The `color`, `fontName`, and `type` fields in `SignatureElement` have no input validation. They are used in PDF rendering logic:

```java
fontColor = java.awt.Color.decode(colorStr);      // Could throw, but no sanitization
selectedFont = Standard14Fonts.FontName.valueOf(fontNameReq); // Enum parse only
```

While current usage is limited to known enum values, `signatureData` (which can be arbitrary text rendered onto a PDF) has `@NotBlank` but no size limit — a very long string could cause PDF rendering issues or denial of service.

**Fix:** Add `@Size(max = 10000)` on `signatureData`, `@Pattern` on `color` (hex regex), and `@Size(max = 100)` on `fontName`.

---

## 🔵 Low Findings

### L-1 · JWT Library Version 0.11.5 is Outdated
**File:** `pom.xml` (lines 81, 86, 92)

JJWT 0.11.5 is not the latest release. The current stable version is 0.12.x which includes fixes and API improvements.

**Fix:** Upgrade to `io.jsonwebtoken:jjwt-api:0.12.6`.

---

### L-2 · Middleware Only Checks Cookie Presence, Not Validity
**File:** `frontend/src/middleware.ts` (lines 13–18)

The Next.js middleware only checks that the `auth_token` cookie exists — it does not validate the JWT signature or expiry. A user with an expired or manually crafted cookie value can bypass the middleware redirect.

**Fix:** This is acceptable since the backend validates the JWT on every API call. However, consider decoding the JWT payload in middleware (without verifying signature, using `jose` library) to check the `exp` claim and redirect early.

---

### L-3 · Redis Has No Authentication
**File:** `docker-compose.yml` (lines 21–25)

Redis is deployed with no password, exposed on port `6379`. Any process on the host network can read or write to Redis.

**Fix:** Add `command: redis-server --requirepass <strong-password>` and set `spring.data.redis.password` accordingly. Do not expose port 6379 publicly.

---

### L-4 · MinIO Admin Credentials Never Changed
**File:** `docker-compose.yml` (lines 34–35)

`MINIO_ROOT_USER: admin` / `MINIO_ROOT_PASSWORD: admin123` are default credentials and are actively exploited in the wild.

**Fix:** Use strong, randomly-generated credentials. Store in environment variables via `.env` file or secrets manager.

---

## ℹ️ Informational

### I-1 · `CrossOrigin(origins = "*")` on Individual Controllers
**File:** `DocumentController.java` (line 24), `SignatureController.java` (line 16), `AuthController.java` (line 28)

Individual `@CrossOrigin(origins = "*")` annotations override the carefully configured `CorsConfig.java`. Remove these annotations to enforce your origin allowlist consistently.

---

### I-2 · User Account Lockout Not Implemented
**File:** `User.java` (lines 76–78)

`isAccountNonLocked()` always returns `true`. There is no mechanism to lock accounts after repeated failed login attempts.

**Fix:** Track failed login attempts (e.g., in Redis with TTL) and set `isAccountNonLocked` to `false` after 10 consecutive failures. Reset on successful login.

---

### I-3 · No HTTPS Enforcement
The application currently runs over plain HTTP (`http://localhost:8081`, `http://localhost:3000`). There is no TLS configuration for either the backend (Tomcat) or any production reverse proxy.

**Fix:** For production, run behind a reverse proxy (NGINX/Traefik) with TLS termination. Add `Strict-Transport-Security` header. Ensure cookies use the `Secure` flag when on HTTPS.

---

## ✅ What Is Already Well-Secured

| Area | Implementation | Assessment |
|------|---------------|------------|
| Password hashing | BCrypt (`BCryptPasswordEncoder`) | ✅ Strong |
| SQL injection prevention | JPA/Hibernate parameterized queries | ✅ Protected |
| Authentication enforcement | Spring Security + JWT filter on all routes | ✅ Good |
| Document ownership (list/get/delete) | `findByIdAndOwnerId()` pattern | ✅ Correct |
| Saved signature ownership | User ID comparison before delete | ✅ Correct |
| Input validation | `@NotBlank`, `@NotNull`, `@Size` on request DTOs | ✅ Partial |
| CSRF | Disabled correctly (stateless JWT API) | ✅ Appropriate |
| OAuth2 Integration | Google OAuth2 via Spring Security | ✅ Standard |
| Database schema | Flyway migrations with referential integrity | ✅ Good |
| CORS origins | Allowlist (localhost + `*.alatoo.edu.kg`) | ✅ Restricted |
| Role-based access | `@EnableMethodSecurity` + roles on User | ✅ Framework present |
| Audit logging | `audit_logs` table records document operations | ✅ Good foundation |

---

## Priority Fix Roadmap

| Priority | Finding | Effort |
|----------|---------|--------|
| 1 | **C-2** – Lock down `/download/**` endpoint | Low |
| 2 | **C-3** – Fix path traversal in storage key | Low |
| 3 | **H-3** – Add ownership check in `signDocument` | Low |
| 4 | **C-4 / H-4** – Move JWT to HttpOnly cookies | Medium |
| 5 | **C-1** – Remove hardcoded secrets | Medium |
| 6 | **H-1** – Implement rate limiting | Medium |
| 7 | **H-2** – Validate uploaded file types | Low |
| 8 | **M-4** – Add HTTP security headers | Low |
| 9 | **M-1 / M-2** – Disable debug logging for production | Low |
| 10 | **L-3 / L-4** – Secure Redis and MinIO | Low |

---

*Report generated by static code analysis. Dynamic testing (penetration testing, DAST) is recommended for a complete security assessment.*
