# Ala-Too Project: VS Code Setup & Run Guide

This guide will walk you through the necessary steps to set up and run the entire Ala-Too Digital Signature platform directly within Visual Studio Code.

## Prerequisites & Recommended Extensions

To get the best experience in VS Code, install the following extensions from the Extensions view (`Ctrl+Shift+X`):

1. **Docker** (by Microsoft) - For easily managing your database, cache, and S3 containers.
2. **Extension Pack for Java** (by Microsoft) - Essential for reading, compiling, and running the Java Spring Boot backend.
3. **Spring Boot Extension Pack** (by VMware) - Makes running and configuring the application much easier.

---

## Step 1: Start the Infrastructure (Database, Redis, MinIO)

Before starting the application, the underlying services must be running via Docker.

**Option A: Using the Docker Extension (Recommended)**
1. Open the Explorer view (`Ctrl+Shift+E`).
2. Right-click on the `docker-compose.yml` file in the root folder.
3. Select **Compose Up**. You'll see a terminal open and the services will start in the background.

**Option B: Using the VS Code Terminal**
1. Open a new terminal inside VS Code by going to **Terminal > New Terminal** (or pressing `` Ctrl+` ``).
2. Ensure you are in the root directory (`digital-sign-ALA-TOO-`).
3. Run the following command:
   ```bash
   docker-compose up -d
   ```

> [!TIP]
> You can verify the containers are up by navigating to the **Docker** icon in the sidebar. You should see `alatoo-db`, `alatoo-cache`, and `alatoo-s3` marked as running.

---

## Step 2: Run the Spring Boot Backend

The backend listens on port `8080`. You have two primary ways to run it:

**Option A: Using VS Code's Java Debugger (Recommended for Development)**
1. In the Explorer, navigate to:  
   `backend/src/main/java/kg/edu/alatoo/sign/DigitalSignApplication.java`
2. Open the file. Look for the `main` method class signature.
3. You will see small inline buttons above the method that say **Run | Debug**.
4. Click **Run** (or Debug, if you want to place breakpoints). The VS Code debug console will open, and you'll see the Spring Boot logo pop up. 

**Option B: Using the Provided Script**
1. Open a new terminal (`Terminal > New Terminal`).
2. Type and run the batch script provided in your root directory:
   ```powershell
   .\run_backend.bat
   ```

---

## Step 3: Run the Next.js Frontend

The frontend development server provides hot-reloading and runs on port `3000`.

1. Open a **New Terminal** (`Terminal > New Terminal`). You can keep the backend terminal running and simply click the `+` icon in the terminal panel to open a side-by-side terminal.
2. Navigate into the frontend folder:
   ```bash
   cd frontend
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Once it prints `Ready in ...ms`, you can quickly open it by holding `Ctrl` and clicking on the `http://localhost:3000` link in the terminal.

---

## Troubleshooting

> [!WARNING]
> **Flyway Migration Checksum Error**
> If your backend crashes during startup with a Flyway mismatch on `V4__create_saved_signatures.sql`, it means a SQL file was modified after you started the database previously.
> 
> **To Fix without losing data:**
> In a VS Code terminal, run: `docker exec alatoo-db psql -U alatoo -d alatoosign -c "UPDATE flyway_schema_history SET checksum=-478898076 WHERE version='4';"` 
> 
> *Alternatively*, you can right-click the `docker-compose.yml`, choose **Compose Down**, and delete the `alatoo-db` volume in the Docker sidebar to start fresh.

> [!NOTE]
> **Ports Already in Use**
> If Next.js fails to start, make sure you don't already have another terminal instance (or command prompt window) secretly running the application. You can kill hanging Node instances directly from the VS Code terminal.
