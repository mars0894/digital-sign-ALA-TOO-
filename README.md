<div align="center">

<a href="#">
  <img src="https://raw.githubusercontent.com/abhisheknaiidu/abhisheknaiidu/master/code.gif" width="100%" height="auto" alt="Code Animation">
</a>

<br/>

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Outfit&weight=700&size=36&pause=1000&color=3b82f6&center=true&vCenter=true&width=800&lines=Ala-Too+Digital+Signature+Platform;Secure+Enterprise+Document+Signing;Built+with+Spring+Boot+%26+Next.js;Multilingual.+Fast.+Reliable.)](https://git.io/typing-svg)

<p align="center">
  <b>A state-of-the-art secure platform that modernizes documentation workflow, document signing, and digital audits.</b>
</p>

<!-- Technology Badges -->
<p align="center">
  <img src="https://img.shields.io/badge/Java_21-ED8B00?style=for-the-badge&logo=java&logoColor=white" alt="Java"/>
  <img src="https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white" alt="Spring"/>
  <img src="https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis"/>
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
</p>

</div>

---

## ✨ Features 

<img align="right" src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Locked%20With%20Key.png" alt="Security Feature" width="120" />

### 🔏 Advanced Document Signing Workspace
- Native PDF.js integration handling binary blob workflows securely.
- Draw signatures smoothly using an advanced HTML-canvas signature pad with anti-aliasing.
- Support for typewritten stamp texts, images, and Vault document management.

### 🌐 Trilingual Internalization (i18n)
Full platform support out-of-the-box for:
* **English (EN)** 🇺🇸 
* **Russian (RU)** 🇷🇺 
* **Kyrgyz (KG)** 🇰🇬 
Flawless locale matching across dashboard metrics and document lifecycle events.

### 🛡️ Iron-Clad Security Architecture
- Rate limits mapped to `Redis` preventing brute force attacks.
- Strict authentication barriers requiring JWT tokens combined with OAuth2.
- Secure headers standard preventing Cross-Site Scripting (XSS), CSRF blocks, and MIME-sniffing exploits.

### 📊 Real-time Interactive Dashboards
Monitor your application states instantly! See true values representing Pending Signatures, Drafts, and Completed Documents dynamically updated based on continuous state logic filtering out soft-deleted data.

---

## 🏗️ Architecture Stack

### Backend Engine
Powered by **Java 21** and **Spring Boot 3.3.x**, communicating via REST API paradigms. The persistence tier is managed by **Hibernate ORM** scaling vertically into a **PostgreSQL 15** Instance. **Flyway** natively handles DB schema migrations reliably. Background tasks are delegated through **Redis**. PDFs generation dynamically depends on a remote **Gotenberg** integration serving isolated containers. Everything communicates through a hardened **MinIO (S3-compatible)** object store holding safe, private blobs.

### Frontend Engine
Powered by **Next.js 15** running on the latest App-Router paradigm coupled organically with **React 19**. Stylized natively using premium **Tailwind CSS v4** styling tokens mapped into dark mode contexts.

---

## 🚀 Quick Start Guide

> For a robust troubleshooting overview, check our dedicated `HOW_TO_RUN.md` file.

**Step 1: Container Orchestration**  
Spawn the underlying dependencies directly using Docker Compose:
```bash
docker compose up -d alatoo-db alatoo-cache alatoo-s3 alatoo-gotenberg
```

**Step 2: Fire up your engines**  
Make sure your `.env` secrets file exists with `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, etc.

<div align="center">
  <table>
    <tr>
      <td align="center"><b>Backend (Windows)</b></td>
      <td align="center"><b>Frontend (Unix/Windows)</b></td>
    </tr>
    <tr>
      <td>
<pre>
.\run_backend.bat
</pre>
      </td>
      <td>
<pre>
cd frontend
npm install
npm run dev
</pre>
      </td>
    </tr>
  </table>
</div>

The frontend will be eagerly listening on [http://localhost:3000](http://localhost:3000) and mapping directly to the backend listening exclusively on port `8081`.

---

## 👨‍💻 Project Directory Structure

```text
📂 digital-sign-ALA-TOO-/
├── ⚙️ .env                   # Environment Secrets 
├── 🐳 docker-compose.yml     # Containerized Stack Orchestration
├── 📖 HOW_TO_RUN.md          # Comprehensive Runbook
│
├── 📂 backend/               # Spring Boot Application
│   ├── 🐋 Dockerfile
│   ├── ☕ pom.xml
│   └── 📂 src/main/java/kg/edu/alatoo/sign
│        ├── 🔑 controllers/  # API Entrypoints
│        ├── 💾 repositories/ # PostgreSQL ORM Logic
│        ├── 🛡️ security/     # JWT, Rate Limiters & Auth handlers
│        └── 🧠 services/     # Business & State logic
│
└── 📂 frontend/              # Next.js UI Application
    ├── 📦 package.json
    └── 📂 src/
         ├── 📱 app/          # App Router & Views
         └── 🧩 components/   # Isolated UI Modules
```

---

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=3b82f6&height=150&section=footer" />
</p>
