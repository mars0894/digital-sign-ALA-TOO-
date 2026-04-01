# 🖋️ Ala-Too Digital Signature Platform (Noir Edition)

[![Security Status](https://img.shields.io/badge/Security-Hardened-brightgreen?style=for-the-badge&logo=springsecurity)](https://github.com/mars0894/digital-sign-ALA-TOO-/blob/Noir.version/security_audit_report.md)
[![Features](https://img.shields.io/badge/Version-Noir-black?style=for-the-badge&logo=github)](https://github.com/mars0894/digital-sign-ALA-TOO-/tree/Noir.version)

Welcome to the **Noir Edition** of the Ala-Too Digital Signature platform—a mission-critical, enterprise-grade document ecosystem specifically designed for **Ala-Too International University**. 

This branch isn't just an update; it's a complete architectural overhaul. Compared to the foundational version, the **Noir Edition** introduces a state-of-the-art security perimeter, industry-leading file integrity controls, and an advanced real-time collaboration engine.

---

## 🏆 Why Choose the Noir Version?

The **Noir Edition** is the only version of the platform built for production-ready security. It addresses every core vulnerability in the early prototype while introducing a premium feature set focused on high-speed institutional workflows.

| Feature Area | Foundation (Main) | **Noir Edition** (Hardened) |
| :--- | :--- | :--- |
| **Identity Protection** | Basic JWT in LocalStorage | **HttpOnly + Secure + SameSite Cookies** (XSS Defended) |
| **File Integrity** | Extension-based Trusts | **Hardware Magic-Byte Scan (Apache Tika)** |
| **Real-Time Sync** | ❌ None | **Live Cursors & WebSockets (STOMP)** |
| **Collaboration** | Single User Only | **Multi-User Permission Tiers** (Collaborators Mode) |
| **Conversion Pipeline** | Basic PDF support | **Full Office-to-PDF Conversion (Gotenberg)** |
| **DoS Resilience** | ❌ Vulnerable to Large Payloads | **Uncapped CPU Timeout & Request Thresholds** |
| **Audit Logs** | ❌ None | **Forensic User Action Tracking** |

---

## 👥 Spotlight: Collaborators Mode (Beta)

The **Noir Edition** introduces the most requested feature: **Collaborators Mode**. This allows users to work on a single document simultaneously without overwriting each other's work.

- **STOMP WebSocket Synchronization:** All movements, signatures, and deletions are broadcast to active collaborators in milliseconds. 
- **Live User Presence:** See exactly who is on the document page with live status indicators and real-time cursors.
- **Hierarchy of Permission:** Managers can delegate document access with surgical precision:
  - **OWNER**: Absolute control, can delete/sign/share.
  - **MANAGER**: Can share and edit the document structure.
  - **EDITOR**: Can add signature fields and move elements.
  - **VIEWER**: Can only view the document and see live signing updates.

---

## 🛡️ Superior Security: The Noir Perimeter

The platform has been rebuilt around a **Defense-in-Depth** security model to neutralize common web attacks:

### 🚀 Attack Mitigation
- **XSS & Session Hijacking:** By moving the JWT to an **HttpOnly** cookie, we prevent all client-side scripts from reading the user's session token.
- **BOLA (Broken Object Level Authorization):** Every database query is intercepted and validated against the calling user's permissions. You can't guess a document UUID; you must *own* it or be *invited* to it.
- **Magic Byte Validation:** Our backend uses **Apache Tika** to strip open every upload. We verify the file's raw binary signature before it even touches the disk. 
- **CSRF Defense:** We use a `CsrfCookieFilter` to synchronize tokens between the backend and frontend headers (`X-XSRF-TOKEN`), effectively blocking malicious form submissions.

---

## 🎨 Professional Next-Gen UI (Frontend)

Built with **Next.js 16 (App Router)** for maximum SEO and performance:
- **Responsive Dashboard:** A dark-mode ready, premium-themed dashboard optimized for all screen sizes.
- **Animated PDF Interactions:** Smooth UI transitions for signing, placing text, and resizing vector elements.
- **Instant Previews:** High-speed document rendering with the native PDF viewer engine.

---

## ⚙️ Hardened Powerhouse (Backend)

The **Noir Edition** leverages a high-performance stack:
- **Java 21 & Spring Boot 3.3:** Taking full advantage of virtual threads and the latest security patches.
- **Gotenberg Microservice:** Industry-standard Office document conversion that runs in a secure, isolated container.
- **PostgreSQL + Flyway:** Atomic, verifiable database migrations ensuring 100% data integrity during updates.
- **Bucket4j Rate Limiting:** Built-in protection against brute-force login attempts and API scrapers.

---

## 🚀 Getting Started

1.  **Clone the Repo:** `git clone https://github.com/mars0894/digital-sign-ALA-TOO-.git`
2.  **Switch to Noir:** `git checkout Noir.version`
3.  **Local Deploy:** 
    - Launch the Backend: `./mvnw spring-boot:run`
    - Launch the Frontend: `npm run dev`
4.  **Production Deploy:** Use the provided `docker-compose.prod.yml` for an optimized, Nginx-proxied stack.

---
**Developed for Ala-Too International University | 2026**
