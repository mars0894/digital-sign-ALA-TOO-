# 🛡 Security Remediation Plan
## Ala-Too Digital Signatures Platform

This plan outlines the step-by-step actions required to secure the application. Tasks are grouped by priority and system layer.

---

## Phase 1: Critical Hotfixes (Immediate Action Required)
These vulnerabilities expose the system to immediate data breaches and unauthorized access.

### 🔴 1.1 Secure Document Download Endpoints (IDOR & Path Traversal)
**Target Files:** `SecurityConfig.java`, `DocumentController.java`, `StorageService.java`
- [ ] **Action 1:** Remove `.requestMatchers("/api/v1/documents/download/**").permitAll()` from `SecurityConfig.java`.
- [ ] **Action 2:** In `DocumentController.java`, update the `downloadDocument` method to require an `@AuthenticationPrincipal User currentUser`.
- [ ] **Action 3:** Update `DocumentService.getFileData()` to accept the `User` and verify that the requested file key belongs to a document owned by that user.
- [ ] **Action 4:** In `StorageService.java`, canonicalize the requested `key` using `Paths.get(storageDir).resolve(key).normalize()` and ensure it starts with the absolute path of `storageDir` to prevent Path Traversal attacks (e.g., `../../`).

### 🔴 1.2 Remove Hardcoded Secrets
**Target Files:** `docker-compose.yml`, `application.yml`
- [ ] **Action 1:** Remove the hardcoded `JWT_SECRET` from `docker-compose.yml`.
- [ ] **Action 2:** Remove default fallback passwords from `application.yml` (e.g., `${DB_PASSWORD:alatoo123}`, `${S3_SECRET_KEY:admin123}`).
- [ ] **Action 3:** Create a `.env.example` file documenting the required secrets.
- [ ] **Action 4:** Require all deployments to provide secrets via a secured `.env` file or secrets manager.

---

## Phase 2: High Priority Hardening
These issues present significant avenues for attack and should be addressed before public deployment.

### 🟠 2.1 Implement Secure Token Storage
**Target Files:** `OAuth2LoginSuccessHandler.java`, `frontend/src/lib/auth.ts`, `frontend/src/middleware.ts`
- [ ] **Action 1:** Refactor backend authentication (both local and OAuth2) to issue the JWT as an `HttpOnly`, `Secure`, `SameSite=Strict` cookie, rather than returning it in the JSON body or URL query parameters.
- [ ] **Action 2:** Refactor `auth.ts` on the frontend to remove all `localStorage.setItem('auth_token', token)` calls.
- [ ] **Action 3:** Ensure the Next.js middleware reads the JWT strictly from the newly secured cookie.

### 🟠 2.2 Fix Unauthorized Document Signing
**Target Files:** `SignatureService.java`
- [ ] **Action 1:** Update `signDocument()` to use `documentRepository.findByIdAndOwnerId()` instead of just `findById()`, ensuring a user cannot sign someone else's document.

### 🟠 2.3 Add Rate Limiting for Authentication
**Target Files:** `AuthController.java` (or add a generic Filter)
- [ ] **Action 1:** Implement a resilient rate limiting mechanism (e.g., using Redis and `Bucket4j`) on `/api/v1/auth/login` and `/api/v1/auth/register` to prevent brute-force and credential stuffing attacks (limit to 5-10 attempts per minute per IP).

### 🟠 2.4 Validate Uploaded Files
**Target Files:** `DocumentController.java`
- [ ] **Action 1:** Validate `file.getContentType()` to ensure it is strictly `application/pdf` or a supported document format before processing.
- [ ] **Action 2:** Check file extensions and enforce file size limits internally to avoid DoS via oversized file uploads.

---

## Phase 3: Medium & Low Priority Defense-in-Depth
Structural improvements and configuration hardening.

### 🟡 3.1 Secure Production Configurations
**Target Files:** `application.yml`, `next.config.ts`, `CorsConfig.java`
- [ ] **Action 1:** Update `application.yml` to set `spring.jpa.show-sql: false` and change `logging.level` for security packages to `INFO` instead of `DEBUG`.
- [ ] **Action 2:** In `next.config.ts`, implement HTTP security headers (`Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`).
- [ ] **Action 3:** Update `CorsConfig.java` to restrict `AllowedHeaders` to explicitly needed headers rather than `*`.

### 🟡 3.2 Add Validation to Signature Elements
**Target Files:** `SignRequest.java`
- [ ] **Action 1:** Add `@Size(max = 10000)` to `signatureData`.
- [ ] **Action 2:** Add regex validation to `color` (e.g., `@Pattern(regexp = "^#[0-9a-fA-F]{6}$")`) and length limits to `fontName` to prevent ReDoS and rendering crashes.

### 🔵 3.3 Infrastructure & Dependency Updates
**Target Files:** `pom.xml`, `docker-compose.yml`
- [ ] **Action 1:** Secure Redis container by passing `--requirepass` in `docker-compose.yml`.
- [ ] **Action 2:** Change default MinIO root credentials.
- [ ] **Action 3:** Upgrade `io.jsonwebtoken` dependencies to version `0.12.6`.
