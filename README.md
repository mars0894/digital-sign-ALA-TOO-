# 🖋️ Ala-Too Digital Signature Platform (Noir Edition)

[![Security Status](https://img.shields.io/badge/Security-Hardened-brightgreen?style=for-the-badge&logo=springsecurity)](https://github.com/mars0894/digital-sign-ALA-TOO-/blob/Noir.version/security_audit_report.md)
[![Build Status](https://img.shields.io/badge/Version-Noir-black?style=for-the-badge&logo=github)](https://github.com/mars0894/digital-sign-ALA-TOO-/tree/Noir.version)

A mission-critical, enterprise-grade digital signature and document collaboration ecosystem developed for **Ala-Too International University**. Built with **Spring Boot 3 (Java 21)** and **Next.js 16**, the platform focuses on robust file integrity, real-time synchronization, and industry-standard security.

---

## ✨ Primary Features

### 🔐 Ironclad Authentication & Identity
- **2FA (Two-Factor Authentication):** Mandatory email-based secondary verification for all account-level transitions.
- **Enterprise SSO:** Native support for **Google** and **Microsoft** OAuth2 login flows.
- **Cookie-Based Sessions:** Transitioned away from vulnerable `localStorage` to **HttpOnly**, **Secure**, and **SameSite=Strict** cookies, neutralizing automated XSS session theft.

### 📄 Intelligent Document Management
- **Universal Conversion:** Built-in pipeline for converting Word (`.docx`), Excel (`.xlsx`), and common Image formats to standardized PDF via **Gotenberg**.
- **Vector-Level Signing:** High-precision PDF signature injection using **Apache PDFBox**, supporting custom coordinate positioning and dynamic scaling.
- **Secure Storage:** Hybrid storage support (Local Disk/AWS S3) with cryptographic tokenization for public access links.

### 👥 Real-Time Collaboration (Live)
- **STOMP WebSockets:** Instant structural updates and cursors during shared signing sessions.
- **Granular Sharing:** Permission-based collaboration access (Owner, Editor, Manager, Viewer).
- **Notification Engine:** Live in-dashboard notifications for document shares, signature requests, and system alerts.

---

## 🛡️ The "Noir" Security Architecture

The platform's security posture is built on a **Defense-in-Depth** model designed to mitigate the **OWASP Top 10** vulnerabilities.

### 🚀 Attack Mitigation Strategy
```mermaid
graph TD
    A[Public Web Traffic] -->|HSTS / HTTPS / CSP| B(Edge Security)
    B -->|Rate Limiter (Bucket4j)| C(Spring Security Gateway)
    C -->|CSRF XSRF-TOKEN Sync| D(Auth Controller)
    D -->|JWT Authentication| E(Business Logic Layer)
    E -->|BOLA/IDOR Permission Filter| F(Database / Storage)
    G[Incoming Payloads] -->|Apache Tika (Magic Bytes)| E
    H[Conversion Pipeline] -->|DoS Timeout Controls| I(Gotenberg Container)
```

### 🔒 Core Security Paradigms
- **Broken Object Level Authorization (BOLA):** Every document access point requires explicit `DocumentCollaboratorRepository` validation. It is impossible to "guess" a document ID and perform actions without authorized ownership.
- **SQL Injection Prevention:** 100% reliance on **Spring Data JPA** and **Hibernate Criteria API** to ensure zero raw SQL query leakage.
- **Payload Integrity:** Every uploaded file is scanned using **Apache Tika**. Even if a file name is `report.pdf`, the system will reject it if the underlying binary signature indicates an executable or script.
- **DoS Resistance:** Strict **Tomcat multipart caps** (20MB) and **RestTemplate timeouts** prevent "Zip Bomb" payloads from crashing the server nodes.

---

## 🏗️ Technical Stack

- **Backend:** Java 21, Spring Boot 3.3, Spring Security, Spring WebSocket (STOMP), JPA Hibernate, Flyway.
- **Frontend:** Next.js 16 (App Router), TypeScript, TailwindCSS, Lucide Icons, Framer Motion.
- **Integrations:** Redis (Caching), Gotenberg (PDF Conversion), Apache PDFBox (PDF Processing), Apache Tika (MIME Detection).

---

## 🚀 Getting Started

### 📦 Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/mars0894/digital-sign-ALA-TOO-.git
    git checkout Noir.version
    ```
2.  Setup environment variables (see `.env.example`).
3.  Launch the backend service:
    ```bash
    cd backend
    ./mvnw spring-boot:run
    ```
4.  Launch the frontend dashboard:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

---

## 📈 Security Audit Results
The platform has been audited against standard penetration testing payloads. See the full [Security Audit Report](file:///C:/Users/vasil/.gemini/antigravity/brain/0e65705f-121b-49d8-9463-a5e4a38c13d6/security_audit_report.md) for detailed results on **SQLi**, **XSS**, and **IDOR** remediation.

---

## 👨‍💻 Contributing
This project is developed under the **Noir Security Standard**. All pull requests must include a corresponding security impact assessment and pass automated linting checks.

---
**Developed for Ala-Too International University | 2026**
