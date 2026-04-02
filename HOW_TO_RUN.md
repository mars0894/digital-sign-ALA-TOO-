# Ala-Too Digital Signature - Lifecycle Guide

This guide explains how to properly start and stop the Ala-Too Digital Signature platform locally for development.

## 🚀 How to Start the App

The application consists of three main parts: Docker Infrastructure (database, caching, file storage, pdf generator), the Java Spring Boot Backend, and the Next.js Frontend.

### 1. Start Docker Infrastructure
Make sure **Docker Desktop** is open and running on your machine.
In the terminal, run the following command from the root of the project to spin up the sidecar services in the background:
```powershell
docker compose up -d alatoo-db alatoo-cache alatoo-s3 alatoo-gotenberg
```

### 2. Start the Backend
Wait a few seconds for the database to fully initialize, then run the startup script from the root directory. This will boot up the Java Spring application on `http://localhost:8081`.
```powershell
.\run_backend.bat
```
*(Make sure your `.env` file is properly populated with the correct variables like `DB_USERNAME`, `DB_PASSWORD`, etc.)*

### 3. Start the Frontend
Open a **new terminal tab/window**, navigate to the `frontend` folder, and start the Next.js development server:
```powershell
cd frontend
npm run dev
```
Once it's ready, the frontend will be accessible at `http://localhost:3000`.

---

## 🛑 How to Stop the App

It is important to properly shut down the components to prevent port allocations from hanging (like the `port 8081 already in use` error).

### 1. Stop the Frontend
In the terminal tab running `npm run dev`, simply press `Ctrl + C`, and hit `Y` if prompted to terminate the batch job.

### 2. Stop the Backend
In the terminal running `.\run_backend.bat`, press `Ctrl + C`. You will be prompted with `Terminate batch job (Y/N)?`. Type `Y` and hit Enter.

> **Troubleshooting Hung Ports:** 
> If the backend crashed or didn't exit cleanly, Windows might hold onto port `8081`. To force-kill any zombie processes clinging to that port, use this PowerShell command:
> ```powershell
> Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
> ```

### 3. Stop Docker Infrastructure
To gracefully stop the database and sidecar containers (this will *preserve* your data since volumes persist), run:
```powershell
docker compose stop
```
*Note: If you want to completely tear down the containers and the network (whilst still keeping named volumes/data), you can use `docker compose down`.*
